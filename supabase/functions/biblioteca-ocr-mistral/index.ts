import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// (modelo do refino definido abaixo — gateway rejeita aliases "-latest")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  livro_id: string;
  livro_tabela: string;
  pdf_url: string;
  titulo?: string;
  force?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let raw: any = null;
  try {
    raw = (await req.json()) as any;
    const action = raw?.action ?? "ocr";

    // Router: ações adicionais empacotadas nesta função para respeitar o limite de edge functions.
    if (action === "refino") return await handleRefino(raw);
    if (action === "worker") return await handleWorker();

    // Padrão: OCR (comportamento existente, retro-compatível)
    const body = raw as Body;
    const { livro_id, livro_tabela, pdf_url, force, titulo } = body;
    if (!livro_id || !livro_tabela || !pdf_url) {
      return json({ error: "livro_id, livro_tabela e pdf_url são obrigatórios" }, 400);
    }

    // A abertura do leitor não pode ficar presa esperando OCR+upload+refino.
    // Disparamos a extração em background e respondemos 2xx rapidamente; o app
    // acompanha o progresso pela tabela em realtime/polling.
    if (raw?.inline !== true) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: existing } = await supabase
        .from("biblioteca_leitura_nativa")
        .select("status,conteudo_md,conteudo_md_refinado,refino_status,updated_at")
        .eq("livro_tabela", livro_tabela)
        .eq("livro_id", livro_id)
        .maybeSingle();

      const leituraRefinadaPronta =
        existing?.status === "pronto" &&
        existing?.refino_status === "pronto" &&
        existing?.conteudo_md_refinado;

      if (leituraRefinadaPronta && !force) {
        return json({ status: "pronto", cached: true });
      }

      const heartbeat = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const refinoVivo =
        existing?.refino_status === "processando" && Date.now() - heartbeat < 90 * 1000;

      // Se o refino travou (worker morto pelo runtime: sem heartbeat há 90s),
      // reiniciamos em vez de deixar o overlay congelado para sempre.
      const precisaApenasRefino =
        existing?.conteudo_md &&
        existing?.refino_status !== "pronto" &&
        !refinoVivo &&
        !force;

      if (refinoVivo) {
        return json({ status: "processando", accepted: true, etapa: "refino" }, 202);
      }

      if (precisaApenasRefino) {
        await supabase
          .from("biblioteca_leitura_nativa")
          .update({
            status: "processando",
            etapa: "Refinando com IA (limpeza + destaques)",
            progresso: 5,
            total_etapas: 6,
            refino_status: "processando",
            refino_erro: null,
            erro_detalhe: null,
          })
          .eq("livro_tabela", livro_tabela)
          .eq("livro_id", livro_id);

        const task = invokeSelf({ action: "refino", livro_id, livro_tabela, force: true })
          .catch(async (e) => {
            await supabase
              .from("biblioteca_leitura_nativa")
              .update({
                refino_status: "erro",
                refino_erro: String(e?.message ?? e).slice(0, 500),
                status: "pronto",
                etapa: "Finalizado sem refino",
                progresso: 6,
                total_etapas: 6,
              })
              .eq("livro_tabela", livro_tabela)
              .eq("livro_id", livro_id);
          });

        // @ts-ignore - EdgeRuntime é global no Supabase Edge Functions
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(task);
        }

        return json({ status: "processando", accepted: true, etapa: "refino" }, 202);
      }

      const updatedAt = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const emAndamentoRecente = existing?.status === "processando" && Date.now() - updatedAt < 2 * 60 * 1000;

      if (!emAndamentoRecente) {
        await supabase.from("biblioteca_leitura_nativa").upsert(
          {
            livro_id,
            livro_tabela,
            status: "processando",
            etapa: "Preparando extração em segundo plano",
            progresso: 0,
            total_etapas: 6,
            erro_detalhe: null,
          },
          { onConflict: "livro_tabela,livro_id" }
        );

        const task = invokeSelf({ ...body, inline: true })
          .then(async (r) => {
            if (!r.ok) {
              let detalhe = "";
              try {
                const t = await r.text();
                const j = JSON.parse(t);
                detalhe = String(j?.error ?? j?.message ?? t ?? "");
              } catch { /* ignore */ }
              await supabase
                .from("biblioteca_leitura_nativa")
                .update({
                  status: "erro",
                  erro_detalhe: (detalhe
                    ? detalhe
                    : `Falha na extração em segundo plano (${r.status}). Tente novamente.`).slice(0, 500),
                })
                .eq("livro_tabela", livro_tabela)
                .eq("livro_id", livro_id);
            }
          })
          .catch(async (e) => {
            await supabase
              .from("biblioteca_leitura_nativa")
              .update({ status: "erro", erro_detalhe: String(e?.message ?? e).slice(0, 500) })
              .eq("livro_tabela", livro_tabela)
              .eq("livro_id", livro_id);
          });

        // @ts-ignore - EdgeRuntime é global no Supabase Edge Functions
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(task);
        }
      }

      return json({ status: "processando", accepted: true }, 202);
    }


    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Cache
    const existing = await supabase
      .from("biblioteca_leitura_nativa")
      .select("*")
      .eq("livro_tabela", livro_tabela)
      .eq("livro_id", livro_id)
      .maybeSingle();

    if (
      existing.data &&
      existing.data.status === "pronto" &&
      existing.data.refino_status === "pronto" &&
      existing.data.conteudo_md_refinado &&
      !force
    ) {
      return json({ status: "pronto", cached: true });
    }

    const setEtapa = async (etapa: string, progresso: number, total_etapas = 6) => {
      await supabase.from("biblioteca_leitura_nativa").upsert(
        { livro_id, livro_tabela, status: "processando", etapa, progresso, total_etapas, erro_detalhe: null },
        { onConflict: "livro_tabela,livro_id" }
      );
    };


    await setEtapa("Iniciando", 0);

    // ============================================================
    // 1) Baixar o PDF (resolvendo URLs do Google Drive)
    // ============================================================
    await setEtapa("Baixando o PDF do livro", 1);
    const directUrl = resolveDrivePdfUrl(pdf_url);
    console.log("[ocr] baixando pdf de", directUrl);

    const pdfResp = await fetch(directUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DireitoPrime/1.0)",
        Accept: "application/pdf,*/*",
      },
    });
    if (!pdfResp.ok) {
      throw new Error(`Falha ao baixar PDF (${pdfResp.status})`);
    }
    let pdfBytes = new Uint8Array(await pdfResp.arrayBuffer());
    const contentType = pdfResp.headers.get("content-type") || "";

    // Se o Drive devolveu HTML (aviso de vírus/tamanho), tenta rota alternativa
    if (!looksLikePdf(pdfBytes) || contentType.includes("text/html")) {
      const altUrl = tryDriveAltUrl(pdf_url);
      if (altUrl && altUrl !== directUrl) {
        console.log("[ocr] fallback drive", altUrl);
        const r2 = await fetch(altUrl, { redirect: "follow" });
        if (r2.ok) {
          const bytes2 = new Uint8Array(await r2.arrayBuffer());
          if (looksLikePdf(bytes2)) pdfBytes = bytes2;
        }
      }
    }

    if (!looksLikePdf(pdfBytes)) {
      throw new Error(
        "O link não devolveu um PDF válido. Verifique se o arquivo está compartilhado publicamente no Google Drive."
      );
    }

    console.log("[ocr] pdf baixado", pdfBytes.byteLength, "bytes");

    // ============================================================
    // 2) Upload do PDF para a Files API do Mistral
    // ============================================================
    await setEtapa("Enviando o PDF ao Mistral OCR", 2);
    console.log("[ocr] uploading pdf to mistral files api");
    const form = new FormData();
    form.append("purpose", "ocr");
    form.append(
      "file",
      new Blob([pdfBytes], { type: "application/pdf" }),
      `${(titulo || livro_id).replace(/[^a-z0-9-_ ]/gi, "_").slice(0, 60)}.pdf`
    );

    let upResp: Response | null = null;
    let upErrText = "";
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        upResp = await fetch("https://api.mistral.ai/v1/files", {
          method: "POST",
          headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
          body: form,
        });
        if (upResp.ok) break;
        upErrText = await upResp.text();
        // 401/403 = credencial ruim, não adianta repetir
        if (upResp.status === 401 || upResp.status === 403) {
          throw new Error(
            `A chave do Mistral (MISTRAL_API_KEY) está inválida ou expirada (${upResp.status}). Atualize o segredo e tente de novo.`
          );
        }
        // 5xx / 429 = transiente, repete com backoff
        if (upResp.status >= 500 || upResp.status === 429) {
          console.warn(`[ocr] mistral upload ${upResp.status}, tentativa ${attempt}/4`);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw new Error(`Mistral upload ${upResp.status}: ${upErrText.slice(0, 400)}`);
      } catch (e) {
        if (attempt === 4) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("inválida ou expirada")) throw e;
        console.warn(`[ocr] mistral upload falhou (tentativa ${attempt}/4):`, msg);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (!upResp || !upResp.ok) {
      throw new Error(
        `O serviço de OCR do Mistral está instável no momento (${upResp?.status ?? "sem resposta"}). Tente novamente em alguns minutos.`
      );
    }
    const upJson = await upResp.json();
    const fileId = upJson.id;
    if (!fileId) throw new Error("Mistral não retornou file id");
    console.log("[ocr] mistral file id", fileId);

    // Signed URL para o OCR consumir.
    // A Files API do Mistral às vezes retorna 404 logo após o upload
    // (o arquivo ainda está sendo indexado). Fazemos retry com backoff.
    let documentUrl = "";
    let lastErr = "";
    for (let attempt = 1; attempt <= 6; attempt++) {
      const signedResp = await fetch(
        `https://api.mistral.ai/v1/files/${fileId}/url?expiry=24`,
        { headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` } }
      );
      if (signedResp.ok) {
        const signedJson = await signedResp.json();
        documentUrl = signedJson.url;
        break;
      }
      lastErr = `${signedResp.status}: ${(await signedResp.text()).slice(0, 300)}`;
      console.log(`[ocr] signed url tentativa ${attempt} falhou → ${lastErr}`);
      // 404 = arquivo ainda não indexado; qualquer erro → aguarda e tenta de novo
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    if (!documentUrl) {
      throw new Error(`Mistral signed url ${lastErr}`);
    }

    // ============================================================
    // 3) Chamar OCR — em lotes pequenos (evita OOM do isolate ao
    //    receber respostas grandes com imagens em base64)
    // ============================================================
    await setEtapa("Extraindo texto e imagens (pode levar até 1 min)", 3);

    // Reduzido de 1000 → 50 páginas por chamada. Respostas com
    // include_image_base64=true crescem muito rápido e estouram o limite
    // de memória/CPU do worker, matando o isolate sem log de erro.
    const PAGE_LIMIT = 20;
    // Processamos cada lote inline (extrai markdown + sobe imagens) e
    // descartamos o base64 imediatamente, para não acumular memória.
    let combinedMd = "";
    const sumario: { titulo: string; nivel: number; page: number }[] = [];
    let processedPages = 0;

    let offset = 0;
    let hasMore = true;
    let totalKnown: number | null = null;

    while (hasMore) {
      const pageIndexes = Array.from({ length: PAGE_LIMIT }, (_, k) => offset + k);
      console.log("[ocr] mistral batch offset", offset);
      const t0 = Date.now();
      const ocrResp = await fetchWithRetry(
        "https://api.mistral.ai/v1/ocr",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MISTRAL_API_KEY}`,
          },
          body: JSON.stringify({
            model: "mistral-ocr-latest",
            document: { type: "document_url", document_url: documentUrl },
            include_image_base64: true,
            pages: pageIndexes,
          }),
        },
        { retries: 3, timeoutMs: 90_000, label: `mistral-ocr[${offset}]` }
      );

      if (!ocrResp.ok) {
        const errTxt = await ocrResp.text();
        console.error("[ocr] mistral erro", ocrResp.status, errTxt);
        if (errTxt.includes("document_parser_too_many_pages") && offset === 0) {
          throw new Error(
            "Este PDF é grande demais para o OCR. Faça upload de uma versão dividida em volumes menores."
          );
        }
        if (offset > 0) {
          console.warn("[ocr] parando lote", offset, "após erro:", errTxt.slice(0, 200));
          break;
        }
        throw new Error(`Mistral OCR ${ocrResp.status}: ${errTxt.slice(0, 400)}`);
      }

      const ocrData = await ocrResp.json();
      const batch: any[] = ocrData.pages || [];
      if (batch.length === 0) { hasMore = false; break; }
      console.log(`[ocr] lote offset=${offset} páginas=${batch.length} em ${Date.now() - t0}ms`);


      if (typeof ocrData?.document_annotation?.pages_count === "number") {
        totalKnown = ocrData.document_annotation.pages_count;
      }

      // Processa cada página do lote imediatamente
      for (let k = 0; k < batch.length; k++) {
        const page = batch[k];
        const pageNum = processedPages + 1;
        let md: string = page.markdown || "";

        const imgs: any[] = page.images || [];
        for (const img of imgs) {
          const b64 = img.image_base64 || img.imageBase64;
          if (!b64) continue;
          const id = img.id || `img-${pageNum}-${Math.random().toString(36).slice(2, 8)}`;
          try {
            const bytes = base64ToBytes(stripDataUrl(b64));
            const path = `${livro_tabela}/${livro_id}/${id}`;
            const up = await supabase.storage
              .from("biblioteca-ocr")
              .upload(path, bytes, { contentType: "image/png", upsert: true });
            if (!up.error) {
              const signed = await supabase.storage
                .from("biblioteca-ocr")
                .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
              const url = signed.data?.signedUrl;
              if (url) {
                md = md.replaceAll(`(${id})`, `(${url})`);
                md = md.replaceAll(`](${id})`, `](${url})`);
              }
            }
          } catch (e) {
            console.warn("[ocr] falha upload imagem", e);
          }
          // libera base64 desta imagem
          img.image_base64 = undefined;
          img.imageBase64 = undefined;
        }

        const pageClass = classificarPaginaLivro(md, pageNum);
        const headingRe = /^(#{1,3})\s+(.+)$/gm;
        let m: RegExpExecArray | null;
        while ((m = headingRe.exec(md))) {
          const t = m[2].trim().replace(/\*+/g, '').replace(/_{2,}/g, '').trim();
          if (!aceitarHeadingComoCandidato(t, m[1].length, pageNum, pageClass)) continue;
          sumario.push({ nivel: m[1].length, titulo: t, page: pageNum });
        }

        combinedMd += `\n\n<!-- page:${pageNum} -->\n\n` + md;
        processedPages++;
      }

      const batchCount = batch.length;

      await supabase
        .from("biblioteca_leitura_nativa")
        .update({
          etapa: `Extraindo página ${processedPages}${totalKnown ? " de " + totalKnown : ""}`,
          total_paginas: processedPages,
        })
        .eq("livro_tabela", livro_tabela)
        .eq("livro_id", livro_id);

      // libera lote da memória depois de guardar o tamanho real recebido
      batch.length = 0;

      if (batchCount < PAGE_LIMIT) {
        hasMore = false;
      } else {
        offset += PAGE_LIMIT;
        if (totalKnown !== null && offset >= totalKnown) hasMore = false;
      }
    }

    await setEtapa(`Organizando ${processedPages} páginas`, 4);
    const pages = { length: processedPages } as any; // compat com uso abaixo

    // ============================================================
    // 5) Salvar OCR bruto (leitura já disponível) e disparar refino
    // ============================================================
    await supabase
      .from("biblioteca_leitura_nativa")
      .update({
        conteudo_md: combinedMd,
        sumario_json: sumario,
        total_paginas: pages.length,
        // NÃO marcamos "pronto" ainda — o overlay precisa exibir as etapas
        // "Refinando com IA" e "Finalizando". O refino abaixo é quem finaliza.
        status: "processando",
        etapa: "Refinando com IA (limpeza + destaques)",
        progresso: 5,
        total_etapas: 6,
        refino_status: "processando",
        erro_detalhe: null,
      })
      .eq("livro_tabela", livro_tabela)
      .eq("livro_id", livro_id);


    // Limpa arquivo do Mistral (best-effort)
    fetch(`https://api.mistral.ai/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
    }).catch(() => {});

    // Este fluxo inline já roda em background (disparado pelo handler público).
    // Por isso aguardamos o refino aqui: evita que o worker responda antes das
    // etapas "Refinando" e "Finalizando" serem gravadas no banco.
    await handleRefino({ action: "refino", livro_id, livro_tabela, force: true });

    return json({ status: "pronto", total_paginas: pages.length });

  } catch (e: any) {
    console.error("[ocr] fatal", e);
    try {
      const b = raw as Body;
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      await supabase
        .from("biblioteca_leitura_nativa")
        .update({ status: "erro", erro_detalhe: String(e?.message || e).slice(0, 500) })
        .eq("livro_tabela", b.livro_tabela)
        .eq("livro_id", b.livro_id);
    } catch (_) {}
    return json({ error: String(e?.message || e) }, 500);
  }
});

// ==============================================================
// Helpers
// ==============================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripDataUrl(s: string): string {
  const idx = s.indexOf(",");
  if (s.startsWith("data:") && idx > 0) return s.slice(idx + 1);
  return s;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/**
 * Faz fetch com timeout duro (AbortController) e retry com backoff exponencial
 * para 429/5xx e falhas de rede. Usa em todas as chamadas externas críticas.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; timeoutMs?: number; label?: string } = {}
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const label = opts.label ?? "http";
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
    try {
      const resp = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      // 429/5xx → retry; outros erros HTTP são devolvidos pra o chamador decidir
      if (resp.status === 429 || (resp.status >= 500 && resp.status < 600)) {
        const body = await resp.text().catch(() => "");
        lastErr = `${label} ${resp.status}: ${body.slice(0, 200)}`;
        console.warn(`[retry] ${label} tentativa ${attempt}/${retries} status ${resp.status}`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.min(15_000, 1500 * 2 ** (attempt - 1))));
          continue;
        }
        // devolve a resposta ao chamador para tratamento explícito
        return new Response(body, { status: resp.status, headers: resp.headers });
      }
      return resp;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[retry] ${label} tentativa ${attempt}/${retries} erro:`, (e as any)?.message ?? e);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.min(15_000, 1500 * 2 ** (attempt - 1))));
        continue;
      }
    }
  }
  throw new Error(`${label} falhou após ${retries} tentativas: ${String(lastErr)}`);
}



function looksLikePdf(bytes: Uint8Array): boolean {
  // %PDF-
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/** Converte URL de visualização do Google Drive em URL de download direto do PDF. */
function resolveDrivePdfUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("drive.google.com") && !u.hostname.includes("docs.google.com")) {
      return url;
    }
    // /file/d/{ID}/view  ou  /file/d/{ID}/preview
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    let id = m?.[1];
    // ?id=xxx
    if (!id) id = u.searchParams.get("id") || undefined;
    if (!id) return url;
    return `https://drive.google.com/uc?export=download&id=${id}`;
  } catch {
    return url;
  }
}

function tryDriveAltUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    const id = m?.[1] || u.searchParams.get("id");
    if (!id) return null;
    // Rota alternativa via googleusercontent
    return `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0&confirm=t`;
  } catch {
    return null;
  }
}

// ============================================================
// REFINO GEMINI (empacotado nesta função)
// ============================================================
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// O gateway rejeita aliases "-latest" (400 invalid model). Ids da allowlist:
const MODEL_FAST = "google/gemini-2.5-flash-lite";
const MODEL_PRO = "google/gemini-2.5-flash";

interface RefinoBody { action: "refino"; livro_id: string; livro_tabela: string; force?: boolean; }

async function handleRefino(body: RefinoBody) {
  const { livro_id, livro_tabela, force } = body;
  if (!livro_id || !livro_tabela) return json({ error: "livro_id e livro_tabela obrigatórios" }, 400);
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: row, error } = await supabase
    .from("biblioteca_leitura_nativa").select("*")
    .eq("livro_tabela", livro_tabela).eq("livro_id", livro_id).maybeSingle();
  if (error) throw error;
  if (!row) return json({ error: "Leitura nativa não encontrada. Rode o OCR primeiro." }, 404);
  if (!row.conteudo_md) return json({ error: "conteudo_md vazio" }, 400);
  if (row.refino_status === "pronto" && !force) return json({ status: "pronto", cached: true });

  const setEtapa = (etapa: string) =>
    supabase.from("biblioteca_leitura_nativa")
      .update({
        status: "processando",
        refino_status: "processando",
        etapa,
        progresso: 5,
        total_etapas: 6,
        refino_erro: null,
      })
      .eq("livro_tabela", livro_tabela).eq("livro_id", livro_id);

  try {
    await setEtapa("Refino: preparando páginas");
    const raw = String(row.conteudo_md);
    const markedPages = raw.split(/<!--\s*page:\d+\s*-->/g).map((p) => p.trim()).filter(Boolean);
    const rawPages = markedPages.length > 1
      ? markedPages
      : raw.split(/\n---+\n/g).map((p) => p.trim()).filter(Boolean);
    const pages = rawPages.length > 1 ? rawPages : [raw];

    await setEtapa("Refino: identificando capítulos");
    // Amostra em três pontos (início/meio/fim) para o sumário canônico —
    // livros com índice no fim ou preliminares longas não ficam com "Conteúdo" único.
    const amostragem = amostrarPaginas(pages);
    const pageClasses = pages.map((p, i) => classificarPaginaLivro(p, i + 1));
    const paginasNaoCapitulo = pageClasses
      .filter((p) => p.kind !== "conteudo")
      .map((p) => p.page);
    const sumarioExtraido = Array.isArray(row.sumario_json) ? (row.sumario_json as any[]) : [];
    const sumarioExtraidoFiltrado = filtrarCandidatosSumario(sumarioExtraido, pageClasses);
    const sumario = validarERepararSumario(
      await gerarSumarioCanonico(amostragem, pages.length, sumarioExtraidoFiltrado),
      pages,
      sumarioExtraidoFiltrado,
      pageClasses,
    );
    const prelim = new Set<number>(
      unirPaginas(sumario.preliminaresPaginas ?? [], paginasNaoCapitulo, pages.length)
    );
    const preliminaresMd = pages.map((p, i) => prelim.has(i + 1) ? p : null).filter(Boolean).join("\n\n---\n\n");

    // Estado de progresso — atualizado por dois lotes concorrentes.
    const cleaned: string[] = new Array(pages.length);
    let refinadas = 0;
    const total = pages.length;
    const startedAt = Date.now();
    // Refinamento PÁGINA POR PÁGINA: o modelo recebe uma página de cada vez,
    // junto do contexto do livro (título + sumário), e devolve markdown limpo.
    const BATCH = 1;
    const CONCURRENCY = 8;
    // Orçamento de tempo do refino: acima disso o worker do Edge é morto pelo
    // runtime e a leitura ficava "congelada" em `processando` para sempre
    // (ex.: livro de 275 páginas parando na 157). Ao estourar o orçamento,
    // paramos de chamar a IA e usamos o texto do OCR nas páginas restantes,
    // garantindo que o livro SEMPRE finalize.
    const REFINO_BUDGET_MS = 150_000;
    const ctxRefino = {
      livro: String(row.titulo || ""),
      capitulos: (sumario.capitulos || []).map((c) => limparTituloCapituloFinal(c.titulo)).filter(Boolean).slice(0, 40),
    };
    await setEtapa(`Refinando página 1 de ${total} · faltam ${Math.max(0, total - 1)}`);

    // Constrói fila de lotes
    const jobs: Array<{ inicio: number; lote: string[] }> = [];
    for (let i = 0; i < total; i += BATCH) {
      jobs.push({ inicio: i + 1, lote: pages.slice(i, i + BATCH) });
    }

    let cursor = 0;
    let orcamentoEstourado = false;
    const runners = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= jobs.length) return;
        const { inicio, lote } = jobs[idx];
        if (Date.now() - startedAt > REFINO_BUDGET_MS) {
          // Sem tempo para IA: mantém a página bruta do OCR.
          if (!orcamentoEstourado) {
            orcamentoEstourado = true;
            console.warn(`[refino] orçamento de tempo estourado na página ${inicio}; restante fica sem IA`);
          }
          for (let j = 0; j < lote.length; j++) cleaned[inicio - 1 + j] = lote[j];
          refinadas = Math.min(total, refinadas + lote.length);
          continue;
        }
        let out = await limparLote(lote, inicio, ctxRefino);
        // Se o lote inteiro voltou "cru" (limparLote falhou silenciosamente),
        // divide pela metade e tenta de novo antes de aceitar a versão original.
        const igualCru = out.every((v, k) => v === lote[k]);
        if (igualCru && lote.length > 2) {
          const mid = Math.floor(lote.length / 2);
          const [a, b] = await Promise.all([
            limparLote(lote.slice(0, mid), inicio, ctxRefino),
            limparLote(lote.slice(mid), inicio + mid, ctxRefino),
          ]);
          out = [...a, ...b];
        }
        for (let j = 0; j < out.length; j++) cleaned[inicio - 1 + j] = out[j];
        refinadas = Math.min(total, refinadas + lote.length);
        const restantes = Math.max(0, total - refinadas);
        const elapsed = (Date.now() - startedAt) / 1000;
        const rate = refinadas / Math.max(1, elapsed); // páginas/s
        const eta = rate > 0 ? Math.round(restantes / rate) : null;
        const etaTxt = eta && eta > 0 ? ` · ~${formatEta(eta)}` : "";
        await setEtapa(`Refinando página ${refinadas} de ${total} · faltam ${restantes}${etaTxt}`);
      }
    });
    await Promise.all(runners);

    // Garante que nenhuma página fique vazia (falha isolada da IA).
    for (let i = 0; i < total; i++) if (!cleaned[i]) cleaned[i] = pages[i];

    // Costura + limpeza em memória (rápido, sem I/O)
    const stitched = costurarPaginas(cleaned);
    for (let i = 0; i < stitched.length; i++) {
      cleaned[i] = sanitizarPaginaRefinada((stitched[i] || "").replace(/<!--\s*continua\s*-->/gi, "").trim());
    }
    console.log(`[refino] sanitize-v2 aplicado em ${cleaned.length} páginas`);


    // Montagem de capítulos em memória — sem UPDATEs intermediários.
    // IMPORTANTE (Fase 3): páginas marcadas como preliminares/índice original NÃO entram
    // no conteúdo de nenhum capítulo — evita o "índice do livro" reaparecer nas páginas.
    const capitulos: any[] = [];
    for (let idx = 0; idx < sumario.capitulos.length; idx++) {
      const c = sumario.capitulos[idx];
      const inicio = clampNum(c.pagina_inicio, 1, pages.length);
      const fim = clampNum(c.pagina_fim ?? pages.length, inicio, pages.length);
      const partes: string[] = [];
      for (let p = inicio; p <= fim; p++) {
        if (prelim.has(p)) continue; // exclui preliminares/índice
        let md = cleaned[p - 1];
        if (!md) continue;
        // Na primeira página do capítulo, o título repetido logo abaixo da capa é ruído.
        if (p === inicio) md = removerTituloDuplicado(md, c.titulo);
        if (!md) continue;
        // marcador de página do OCR — o leitor usa isto para paginar
        partes.push(`<!-- page:${p} -->\n\n${md}`);
      }
      const conteudo = partes.join("\n\n");
      // Descarta capítulos-fantasma (título vindo do SUMÁRIO impresso sem página real de conteúdo).
      // Sem isso o leitor mostra só a capa e "pula" para o próximo capítulo.
      if (!temTextoUtil(conteudo)) {
        console.warn(`[refino] descartando capítulo vazio "${c.titulo}" (páginas ${inicio}-${fim})`);
        continue;
      }
      const numero = capitulos.length + 1;
      const tituloLimpo = limparTituloCapituloFinal(c.titulo) || `Capítulo ${numero}`;
      capitulos.push({
        numero, titulo: tituloLimpo,
        capa_md: montarCapaCapitulo({ numero, titulo: tituloLimpo, epigrafe: c.epigrafe,
          totalPaginas: fim - inicio + 1, totalPalavras: conteudo.split(/\s+/).length }),
        paginas: [inicio, fim], conteudo_md: conteudo,
      });
    }
    if (!capitulos.length) {
      console.warn("[refino] nenhum capítulo válido após validação; criando fallback por conteúdo real");
      const partes: string[] = [];
      let inicioFallback: number | null = null;
      let fimFallback: number | null = null;
      for (let p = 1; p <= cleaned.length; p++) {
        if (prelim.has(p)) continue;
        const md = cleaned[p - 1];
        if (!temTextoUtil(md)) continue;
        if (inicioFallback === null) inicioFallback = p;
        fimFallback = p;
        partes.push(`<!-- page:${p} -->\n\n${md}`);
      }
      const conteudoFallback = partes.join("\n\n");
      if (inicioFallback !== null && fimFallback !== null && temTextoUtil(conteudoFallback, 120)) {
        capitulos.push({
          numero: 1,
          titulo: "Conteúdo",
          capa_md: montarCapaCapitulo({
            numero: 1,
            titulo: "Conteúdo",
            totalPaginas: fimFallback - inicioFallback + 1,
            totalPalavras: conteudoFallback.split(/\s+/).length,
          }),
          paginas: [inicioFallback, fimFallback],
          conteudo_md: conteudoFallback,
        });
      }
    }

    const conteudoFinal = capitulos.map((c) => `${c.capa_md}\n\n${c.conteudo_md}`).join("\n\n---\n\n");

    // Um único UPDATE final: grava conteúdo + marca refino/status como pronto
    await supabase.from("biblioteca_leitura_nativa").update({
      conteudo_md_refinado: conteudoFinal,
      capitulos_json: capitulos,
      preliminares_md: preliminaresMd || null,
      refino_status: "pronto", refino_erro: null,
      refino_updated_at: new Date().toISOString(),
      refino_modelo: `${MODEL_FAST}+${MODEL_PRO}`,
      status: "pronto",
      etapa: "Concluído",
      progresso: 6,
      total_etapas: 6,
    }).eq("livro_tabela", livro_tabela).eq("livro_id", livro_id);

    console.log(`[refino] concluído em ${((Date.now() - startedAt) / 1000).toFixed(1)}s · ${total} páginas · ${capitulos.length} capítulos`);
    return json({ status: "pronto", capitulos: capitulos.length, paginas: pages.length });
  } catch (e: any) {
    // Refino falhou — libera o leitor com o conteúdo bruto do OCR
    // para o usuário não ficar preso no overlay.
    console.error("[refino] falha:", e?.message ?? e);
    await supabase.from("biblioteca_leitura_nativa")
      .update({
        refino_status: "erro",
        refino_erro: String(e?.message ?? e).slice(0, 500),
        status: "pronto",
        etapa: "Concluído sem refino",
        progresso: 6,
        total_etapas: 6,
      })
      .eq("livro_tabela", livro_tabela).eq("livro_id", livro_id);
    return json({ error: String(e?.message ?? e) }, 500);
  }
}

function formatEta(sec: number): string {
  if (sec < 60) return `${sec}s restantes`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}min restantes` : `${m}min${s}s restantes`;
}

function amostrarPaginas(pages: string[]): string {
  const n = pages.length;
  const take = new Set<number>();
  // início: primeiras 12
  for (let i = 0; i < Math.min(12, n); i++) take.add(i);
  // meio: 4 páginas em torno do centro
  const mid = Math.floor(n / 2);
  for (let i = Math.max(0, mid - 2); i < Math.min(n, mid + 2); i++) take.add(i);
  // fim: últimas 4
  for (let i = Math.max(0, n - 4); i < n; i++) take.add(i);
  const idxs = Array.from(take).sort((a, b) => a - b);
  return idxs.map((i) => `<<P${i + 1}>>\n${truncateStr(pages[i], 3500)}`).join("\n\n");
}

async function confirmarPersistencia(
  supabase: any,
  livro_tabela: string,
  livro_id: string,
  campo: string,
  maxTentativas = 4
) {
  for (let i = 0; i < maxTentativas; i++) {
    const { data } = await supabase
      .from("biblioteca_leitura_nativa")
      .select(campo)
      .eq("livro_tabela", livro_tabela)
      .eq("livro_id", livro_id)
      .maybeSingle();
    if (data && (data as any)[campo]) return true;
    await delay(300);
  }
  return false;
}



function truncateStr(s: string, n: number) { return s.length > n ? s.slice(0, n) + "\n…[truncado]" : s; }
function clampNum(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function chatGemini(model: string, system: string, user: string, jsonMode = false) {
  const body: any = {
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.2,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const resp = await fetchWithRetry(
    GATEWAY_URL,
    {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY!,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "supabase-edge-function",
      },
      body: JSON.stringify(body),
    },
    { retries: 3, timeoutMs: 45_000, label: `gemini[${model}]` }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 400)}`);
  const d = await resp.json();
  return d?.choices?.[0]?.message?.content ?? "";
}


interface SumarioCanonico {
  capitulos: Array<{ numero?: number; titulo: string; pagina_inicio: number; pagina_fim?: number; epigrafe?: string }>;
  preliminaresPaginas?: number[];
}

type PageClassificacao = {
  page: number;
  kind: "capa" | "indice" | "preliminar" | "conteudo";
  reason: string;
};

function classificarPaginaLivro(md: string, page: number): PageClassificacao {
  const linhas = String(md || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const primeiras = linhas.slice(0, 30);
  const texto = normalizarTexto(linhas.join("\n"));
  const headingLines = linhas.filter((l) => /^#{1,6}\s+/.test(l));
  const bodyText = linhas
    .filter((l) => !/^#{1,6}\s+/.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (isPaginaIndiceOriginal(md)) return { page, kind: "indice", reason: "sumario_impresso" };

  const temCabecalhoPreliminar = primeiras.some((l) =>
    /^#{0,6}\s*(sum[áa]rio|[íi]ndice|table of contents|apresenta[cç][ãa]o|pref[áa]cio|ficha catalogr[áa]fica|dedicat[óo]ria|agradecimentos)\b/i.test(l),
  );
  if (temCabecalhoPreliminar) return { page, kind: "preliminar", reason: "cabecalho_preliminar" };

  // Capa/folha de rosto: início do PDF, pouco texto corrido e título grande isolado.
  const poucosParagrafos = bodyText.length < 220;
  const soTitulos = headingLines.length > 0 && bodyText.length < 120;
  const pareceCapa = page <= 2 && (soTitulos || (poucosParagrafos && linhas.length <= 12)) &&
    !/\b(art\.?|cap[ií]tulo|se[cç][ãa]o|lei|constitui[cç][aã]o|or[cç]amento|controle|princ[ií]pio)\b.{40,}/i.test(md);
  if (pareceCapa) return { page, kind: "capa", reason: "inicio_sem_texto_corrido" };

  if (page <= 3 && texto.includes("todos os direitos reservados")) {
    return { page, kind: "preliminar", reason: "creditos_editoriais" };
  }

  return { page, kind: "conteudo", reason: "texto_util" };
}

function aceitarHeadingComoCandidato(tituloRaw: string, nivel: number, page: number, pageClass: PageClassificacao): boolean {
  const titulo = limparTituloCandidato(tituloRaw);
  if (!titulo) return false;
  if (pageClass.kind !== "conteudo") return false;
  if (!tituloCapituloAceitavel(titulo, page, [pageClass])) return false;
  // Headings profundos quase sempre são subtítulos internos no material jurídico —
  // exceto quando trazem marcador estrutural ("Capítulo X", "3. Fontes legislativas"),
  // caso comum em PDFs onde o OCR rebaixa o nível do título do capítulo.
  const marcadorDeCapitulo =
    /^(cap[ií]tulo|parte|t[ií]tulo|se[cç][ãa]o)\b/i.test(titulo) ||
    /^\d{1,2}\s*[.\-–—)]\s+\S/.test(titulo);
  if (nivel >= 3 && !marcadorDeCapitulo) return false;
  return true;
}

function filtrarCandidatosSumario(sumarioExtraido: any[] = [], pageClasses: PageClassificacao[] = []) {
  const candidatos = (sumarioExtraido || [])
    .filter((s: any) => s && typeof s.page === "number" && typeof s.titulo === "string")
    .map((s: any) => ({ ...s, titulo: limparTituloCandidato(String(s.titulo)) }))
    .filter((s: any) => nivelEstruturalAceitavel(s))
    .filter((s: any) => tituloCapituloAceitavel(s.titulo, Number(s.page), pageClasses))
    .filter((s: any, idx: number, arr: any[]) =>
      arr.findIndex((x: any) => normalizarTexto(x.titulo) === normalizarTexto(s.titulo) && Number(x.page) === Number(s.page)) === idx,
    );
  const temEstruturaNumerada = candidatos.filter((s: any) => tituloComecaComMarcadorEstrutural(s.titulo)).length >= 3;
  return temEstruturaNumerada
    ? candidatos.filter((s: any) => tituloComecaComMarcadorEstrutural(s.titulo) || Number(s.nivel || 1) <= 1)
    : candidatos;
}

function nivelEstruturalAceitavel(s: any): boolean {
  const nivel = Number(s?.nivel || 1);
  const titulo = String(s?.titulo || "");
  if (nivel <= 1) return true;
  return tituloComecaComMarcadorEstrutural(titulo);
}

function tituloComecaComMarcadorEstrutural(titulo: string): boolean {
  return /^\s*(\d{1,3}(?:\.\d{1,3})*\s*[.\-–—)]\s+|cap[ií]tulo\s+[\wIVXLCDM\d]+\b|parte\s+[\wIVXLCDM\d]+\b|t[ií]tulo\s+[\wIVXLCDM\d]+\b|se[cç][ãa]o\s+[\wIVXLCDM\d]+\b)/i.test(titulo);
}

function limparTituloCandidato(raw: string): string {
  return String(raw || "")
    .replace(/\*+/g, "")
    .replace(/_{2,}/g, "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Título como o leitor deve exibir: sem numeração/rótulo estrutural no começo
 * (o leitor já mostra "Capítulo N" e o número no círculo do sumário) e sem
 * pontilhados/número de página herdados do índice impresso. */
function limparTituloCapituloFinal(raw: string): string {
  return limparTituloCandidato(raw)
    .replace(/[.·•…]{2,}\s*\d{1,4}\s*$/g, "")
    .replace(/^\s*(cap[ií]tulo|t[ií]tulo|livro|parte|se[cç][ãa]o|unidade)\s+[\wIVXLCDM]+\s*[-–—:.·]?\s*/i, "")
    .replace(/^\s*\d{1,3}(?:\.\d{1,3})*\s*[.\-–—):·]?\s+/, "")
    .replace(/^\s*[IVXLCDM]{1,6}\s*[.\-–—):·]\s+/, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.,;:–—-]+$/g, "")
    .trim();
}

function tituloCapituloAceitavel(tituloRaw: string, page: number, pageClasses: PageClassificacao[] = []): boolean {
  const titulo = limparTituloCandidato(tituloRaw);
  const n = normalizarTexto(titulo);
  if (!n || titulo.length < 3) return false;
  const cls = pageClasses.find((p) => p.page === page);
  if (cls && cls.kind !== "conteudo") return false;
  if (/^(sumario|indice|table of contents|conteudo|apresentacao|prefacio|ficha catalografica|dedicatoria|agradecimentos)$/i.test(n)) return false;
  if (/\.{2,}\s*\d{1,4}\s*$/.test(titulo)) return false;
  if (/\s\d{1,4}\s*$/.test(titulo) && titulo.length < 120) return false;
  if (/^(art|arts)\.?\s*\d+[\wº°ª-]*\b/i.test(titulo)) return false;
  if (/^\(?[ivxlcdm\d]{1,6}\)?\s*$/i.test(titulo)) return false;
  if (/^(unidade|universalidade|anualidade|exclusividade|transpar[eê]ncia|equil[ií]brio|especifica[cç][aã]o|n[aã]o afeta[cç][aã]o)$/i.test(titulo)) return false;
  // Título de capa no início, sem marcador de seção, não é capítulo.
  if (page <= 2 && !tituloComecaComMarcadorEstrutural(titulo)) return false;
  return true;
}

async function gerarSumarioCanonico(amostra: string, totalPaginas: number, sumarioExtraido: any[] = []): Promise<SumarioCanonico> {
  const sys = `Você é um editor jurídico. A partir de amostras de um livro OCR-extraído (marcadores <<P#>>),
produza o SUMÁRIO CANÔNICO em capítulos e liste TODAS as páginas que compõem material NÃO-CAPITULAR
("preliminares" e "posliminares"), a saber:
- capa, folha de rosto, ficha catalográfica, dedicatória, agradecimentos
- SUMÁRIO / ÍNDICE / "table of contents" / "índice sistemático" — em QUALQUER posição do livro (início, meio ou fim)
- prefácio, apresentação, nota do autor
- bibliografia final, índice remissivo, colofão

Responda EXATAMENTE neste JSON, sem comentários:
{"capitulos":[{"numero":1,"titulo":"...","pagina_inicio":N,"pagina_fim":M,"epigrafe":"opcional"}],
 "preliminaresPaginas":[1,2,3,157,158]}

Processo editorial obrigatório:
1. Agente de estrutura: separe capa, índice/sumário impresso e conteúdo real.
2. Agente de validação: rejeite títulos que aparecem apenas no índice/sumário impresso.
3. Agente de montagem: cada capítulo precisa começar na página onde o texto do capítulo aparece de verdade.

Regras:
- Numere capítulos sequencialmente a partir de 1.
- pagina_inicio DEVE apontar para a página onde o capítulo REALMENTE começa (não onde é listado no sumário).
- Não sobreponha faixas de capítulos.
- Nunca use capa, folha de rosto, página só com o título do livro, ÍNDICE ou SUMÁRIO como capítulo.
- Não transforme subtítulos internos, princípios isolados ou artigos legais em capítulos principais.
- Não crie capítulo para o título geral do livro quando ele aparece sozinho nas páginas iniciais.
- Se você identificar páginas com listas do tipo "Capítulo 1 .... 25 / Capítulo 2 .... 47" ou "SUMÁRIO", elas são preliminaresPaginas — nunca conteúdo de capítulo.
- Se não houver capítulos claros, use apenas Parte/Livro/Título/Seção.
- Título dos capítulos: SEM prefixo "Capítulo N" (já será renderizado). Apenas o título.
- IMPORTANTE: livros jurídicos (ex.: casos judiciais, coletâneas de votos) frequentemente têm CADA voto/opinião como um capítulo próprio. Se a lista de referência (pista abaixo) mostrar muitos títulos curtos com nomes próprios ou seções numeradas, gere um capítulo para CADA um deles — não agrupe tudo em 1 ou 2 capítulos.`;
  const dicaTxt = sumarioExtraido.length
    ? `\n\nPISTA — sumário extraído diretamente do OCR (use como referência de estrutura; inclua TODOS estes títulos como capítulos quando corresponderem a seções reais do texto, ignorando apenas os preliminares como "Sumário", "Apresentação", "Índices para catálogo"):\n${sumarioExtraido.slice(0, 60).map((s: any) => `- p.${s.page} · ${s.titulo}`).join('\n')}`
    : '';
  const usr = `Total de páginas: ${totalPaginas}${dicaTxt}\n\nAmostra (com marcadores <<P#>>):\n${amostra}\n\nDevolva APENAS o JSON.`;
  try {
    const raw = await chatGemini(MODEL_PRO, sys, usr, true);
    const parsed = JSON.parse(raw);
    const caps = (parsed?.capitulos ?? []) as SumarioCanonico["capitulos"];
    if (!caps.length) return { capitulos: [{ numero: 1, titulo: "Conteúdo", pagina_inicio: 1, pagina_fim: totalPaginas }], preliminaresPaginas: [] };
    caps.sort((a, b) => (a.pagina_inicio ?? 0) - (b.pagina_inicio ?? 0));
    for (let i = 0; i < caps.length; i++) {
      if (!caps[i].pagina_fim) caps[i].pagina_fim = (caps[i + 1]?.pagina_inicio ?? totalPaginas + 1) - 1;
      // Normaliza título: remove "Capítulo N -" duplicado
      caps[i].titulo = String(caps[i].titulo || "").replace(/^\s*(cap[ií]tulo|t[ií]tulo|livro|parte|se[cç][ãa]o)\s+[\wIVXLCDM\d]+\s*[-–—:.·]?\s*/i, "").trim() || `Capítulo ${caps[i].numero ?? i + 1}`;
    }
    return { capitulos: caps, preliminaresPaginas: Array.isArray(parsed.preliminaresPaginas) ? parsed.preliminaresPaginas : [] };
  } catch (e) {
    console.warn("[refino] sumário fallback", e);
    return { capitulos: [{ numero: 1, titulo: "Conteúdo", pagina_inicio: 1, pagina_fim: totalPaginas }], preliminaresPaginas: [] };
  }
}

function validarERepararSumario(
  sumario: SumarioCanonico,
  pages: string[],
  sumarioExtraido: any[] = [],
  pageClasses: PageClassificacao[] = [],
): SumarioCanonico {
  const totalPaginas = pages.length;
  let capitulos = (sumario.capitulos || [])
    .map((c, i) => ({ ...c, numero: c.numero ?? i + 1, pagina_inicio: clampNum(Number(c.pagina_inicio) || 1, 1, totalPaginas) }))
    .filter((c) => tituloCapituloAceitavel(c.titulo, c.pagina_inicio, pageClasses))
    .filter((c) => paginaTemCorpoDeCapitulo(pages[c.pagina_inicio - 1] || ""));

  // Fallback: se o AI colapsou tudo em poucos capítulos mas o OCR extraiu um sumário rico,
  // reconstrói os capítulos a partir do sumário extraído (títulos + páginas reais).
  const candidatosExtraidos = filtrarCandidatosSumario(sumarioExtraido, pageClasses);
  if (candidatosExtraidos.length >= 4 && capitulos.length < Math.max(3, Math.floor(candidatosExtraidos.length * 0.4))) {
    console.warn('[refino] AI devolveu poucos capítulos vs sumário extraído — usando fallback', {
      ai: capitulos.length, extraido: candidatosExtraidos.length,
    });
    capitulos = candidatosExtraidos.map((s: any, i: number) => ({
      numero: i + 1,
      titulo: s.titulo,
      pagina_inicio: clampNum(Number(s.page) || 1, 1, totalPaginas),
    }));
  }

  if (!capitulos.length) {
    const primeiraPaginaConteudo = pageClasses.find((p) => p.kind === "conteudo")?.page ?? 1;
    return {
      capitulos: [{ numero: 1, titulo: "Conteúdo", pagina_inicio: primeiraPaginaConteudo, pagina_fim: totalPaginas }],
      preliminaresPaginas: unirPaginas(sumario.preliminaresPaginas || [], pageClasses.filter((p) => p.kind !== "conteudo").map((p) => p.page), totalPaginas),
    };
  }

  const tocPages = new Set<number>();
  pages.forEach((p, i) => {
    if (isPaginaIndiceOriginal(p)) tocPages.add(i + 1);
  });
  pageClasses.forEach((p) => {
    if (p.kind !== "conteudo") tocPages.add(p.page);
  });

  const starts = capitulos.map((c) => c.pagina_inicio);
  const uniqueStarts = new Set(starts);
  const repetiuPagina = capitulos.length >= 4 && uniqueStarts.size <= Math.max(2, Math.ceil(capitulos.length * 0.35));
  const apontaParaIndice = starts.filter((p) => tocPages.has(p)).length >= Math.max(1, Math.ceil(capitulos.length * 0.25));

  const fragmentadoDemais = capitulos.length > Math.max(8, Math.ceil(totalPaginas / 3));
  const semConfirmacaoNoCorpo = capitulos.filter((c) => !paginaTemTitulo(pages[c.pagina_inicio - 1] || "", c.titulo)).length;

  if (!repetiuPagina && !apontaParaIndice && !fragmentadoDemais && semConfirmacaoNoCorpo <= Math.ceil(capitulos.length * 0.5)) {
    return {
      capitulos: normalizarFaixasCapitulos(capitulos, totalPaginas),
      preliminaresPaginas: unirPaginas(sumario.preliminaresPaginas || [], Array.from(tocPages), totalPaginas),
    };
  }

  console.warn('[refino] sumário suspeito; reparando páginas reais dos capítulos', {
    capitulos: capitulos.length,
    starts: uniqueStarts.size,
    fragmentadoDemais,
    semConfirmacaoNoCorpo,
    tocPages: Array.from(tocPages),
  });

  const reparados: SumarioCanonico['capitulos'] = [];
  let depoisDaPagina = 0;

  for (let i = 0; i < capitulos.length; i++) {
    const cap = capitulos[i];
    const encontrado = encontrarPaginaTitulo(cap.titulo, pages, depoisDaPagina + 1, tocPages);
    const atualSano = cap.pagina_inicio > depoisDaPagina && !tocPages.has(cap.pagina_inicio) && !reparados.some((c) => c.pagina_inicio === cap.pagina_inicio);
    const pagina_inicio = encontrado || (atualSano ? cap.pagina_inicio : null);
    if (!pagina_inicio) continue;
    reparados.push({ ...cap, pagina_inicio });
    depoisDaPagina = pagina_inicio;
  }

  const capitulosFinais = reparados.length >= Math.max(2, Math.floor(capitulos.length * 0.45))
    ? reparados
    : capitulos.filter((c, i) => !tocPages.has(c.pagina_inicio) && starts.indexOf(c.pagina_inicio) === i);

  const normalizados = normalizarFaixasCapitulos(capitulosFinais, totalPaginas);
  const prelimSet = new Set<number>(unirPaginas(sumario.preliminaresPaginas || [], Array.from(tocPages), totalPaginas));
  const primeiraPaginaReal = normalizados[0]?.pagina_inicio;
  if (primeiraPaginaReal && tocPages.size > 0) {
    for (let p = 1; p < primeiraPaginaReal; p++) prelimSet.add(p);
  }

  return { capitulos: normalizados, preliminaresPaginas: Array.from(prelimSet).sort((a, b) => a - b) };
}

function normalizarFaixasCapitulos(capitulos: SumarioCanonico['capitulos'], totalPaginas: number) {
  const vistos = new Set<number>();
  const ordenados = capitulos
    .map((c, i) => ({
      ...c,
      numero: c.numero ?? i + 1,
      titulo: String(c.titulo || '').replace(/^\s*(cap[ií]tulo|t[ií]tulo|livro|parte|se[cç][ãa]o)\s+[\wIVXLCDM\d]+\s*[-–—:.·]?\s*/i, '').trim() || `Capítulo ${i + 1}`,
      pagina_inicio: clampNum(Number(c.pagina_inicio) || 1, 1, totalPaginas),
    }))
    .sort((a, b) => a.pagina_inicio - b.pagina_inicio)
    .filter((c) => {
      if (vistos.has(c.pagina_inicio)) return false;
      vistos.add(c.pagina_inicio);
      return true;
    });

  for (let i = 0; i < ordenados.length; i++) {
    ordenados[i].pagina_fim = clampNum(
      ordenados[i].pagina_fim && ordenados[i].pagina_fim! >= ordenados[i].pagina_inicio
        ? Number(ordenados[i].pagina_fim)
        : (ordenados[i + 1]?.pagina_inicio ?? totalPaginas + 1) - 1,
      ordenados[i].pagina_inicio,
      totalPaginas
    );
  }
  return ordenados;
}

function encontrarPaginaTitulo(titulo: string, pages: string[], inicio: number, tocPages: Set<number>) {
  for (let p = Math.max(1, inicio); p <= pages.length; p++) {
    if (tocPages.has(p)) continue;
    if (paginaTemTitulo(pages[p - 1], titulo)) return p;
  }
  return null;
}

function paginaTemTitulo(md: string, titulo: string) {
  const alvo = normalizarTexto(titulo);
  if (!alvo) return false;
  const linhas = md.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 35);
  return linhas.some((linha) => {
    const pareceTitulo = /^#{1,6}\s+/.test(linha) || (/^[IVXLCDM\d]+\s*[.\-–—)]\s+/i.test(linha) && linha.length < 150) || (linha === linha.toUpperCase() && linha.length < 150);
    if (!pareceTitulo) return false;
    const candidato = normalizarTituloLinha(linha);
    return titulosParecidos(alvo, candidato);
  });
}

function isPaginaIndiceOriginal(md: string) {
  const linhas = md.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 90);
  if (!linhas.length) return false;
  const texto = normalizarTexto(linhas.join('\n'));
  const temCabecalhoIndice = linhas.slice(0, 12).some((l) => /^#{0,6}\s*(índice|indice|sum[áa]rio|table of contents)\b/i.test(l));
  const linhasDeSumario = linhas.filter((linha) => {
    const n = normalizarTexto(linha);
    return /^[ivxlcdm]{1,8}\s*[-–—.)]\s+\S+/i.test(linha)
      || /^\d{1,3}\s*[-–—.)]\s+\S+/.test(linha)
      || /\.{2,}\s*\d{1,4}$/.test(linha)
      || /^(capitulo|capítulo|parte|livro|titulo|título|secao|seção)\s+[ivxlcdm\d]+\b/.test(n);
  }).length;

  return (temCabecalhoIndice && linhasDeSumario >= 3)
    || (temCabecalhoIndice && /\b(apresentacao|prefacio|biografia|introducao)\b/.test(texto))
    || linhasDeSumario >= 8;
}

function normalizarTituloLinha(linha: string) {
  return normalizarTexto(
    linha
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\s*(cap[ií]tulo|t[ií]tulo|livro|parte|se[cç][ãa]o)\s+[\wIVXLCDM\d]+\s*[-–—:.·)]?\s*/i, '')
      .replace(/^\s*[IVXLCDM\d]+\s*[.\-–—)]\s*/i, '')
  );
}

function titulosParecidos(alvo: string, candidato: string) {
  if (!alvo || !candidato) return false;
  if (candidato.includes(alvo) || alvo.includes(candidato)) return true;
  const stop = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'em', 'no', 'na', 'nos', 'nas']);
  const toks = alvo.split(/\s+/).filter((t) => t.length > 2 && !stop.has(t));
  if (!toks.length) return false;
  const hits = toks.filter((t) => candidato.includes(t)).length;
  return hits / toks.length >= (toks.length <= 2 ? 1 : 0.75);
}

function normalizarTexto(s: string) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[“”"'`´*_]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function temTextoUtil(md: string | null | undefined, min = 40) {
  const texto = String(md || "")
    .replace(/<!--[^>]*-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return texto.length >= min && /[a-zà-úç]{3,}/i.test(texto);
}

function paginaTemCorpoDeCapitulo(md: string) {
  const corpo = String(md || "")
    .replace(/<!--[^>]*-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .split("\n")
    .filter((linha) => !/^\s*#{1,6}\s+/.test(linha))
    .join("\n");
  return temTextoUtil(corpo, 80);
}

function unirPaginas(a: number[], b: number[], totalPaginas: number) {
  return Array.from(new Set([...a, ...b].filter((n) => Number.isInteger(n) && n >= 1 && n <= totalPaginas))).sort((x, y) => x - y);
}

async function limparLote(
  paginas: string[],
  numeroInicial: number,
  ctx?: { livro?: string; capitulos?: string[] },
): Promise<string[]> {
  const ctxTxt = [
    ctx?.livro ? `Livro: "${ctx.livro}".` : "",
    ctx?.capitulos?.length
      ? `Sumário do livro (para você saber onde esta página se encaixa):\n${ctx.capitulos.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");
  const sys = `Você é um revisor editorial de livros jurídicos. Recebe UMA página por vez, já extraída por OCR, e devolve essa MESMA página em Markdown limpo, fiel e bem estruturado para leitura em app.
${ctxTxt ? `\nCONTEXTO DO LIVRO\n${ctxTxt}\n` : ""}
REMOVER SEMPRE (poluição de diagramação — não deixar rastro):
- Número de página do rodapé/cabeçalho em QUALQUER formato: linha só com "3", "27", "128"; "— 27 —"; "· 27 ·"; "[27]"; "Página 27"; "Pág. 27"; número colado ao nome do livro/capítulo ("27 | Fontes do direito administrativo", "Fontes do direito administrativo · 27")
- Cabeçalhos/rodapés correntes repetidos: nome do livro, nome do autor, nome da editora, título do capítulo isolado em maiúsculas no topo ou no pé da página
- Marcadores de OCR: "---4 |", "----5", pipes soltos, traços soltos, cifras "$" fora de contexto
- Linhas só com pontuação, decoração, bullets vazios ou tabelas vazias
- Créditos de rodapé/watermark, URLs de scanner, "Material de apoio", "Todos os direitos reservados" repetido em toda página

ESTRUTURA DO MARKDOWN (obrigatório):
- O corpo é texto corrido em parágrafos separados por UMA linha em branco. Nunca quebre o parágrafo em várias linhas.
- Títulos de seção reais viram "## Título"; subtítulos internos viram "### Subtítulo". Nunca use "#" (reservado para o capítulo) e nunca passe de "###".
- Título de seção NUNCA leva a numeração da diagramação no texto quando ela for só ordem ("1.", "2.1"): mantenha a numeração APENAS se ela fizer parte do sentido jurídico (ex.: "Art. 5º").
- Listas do original viram listas Markdown ("- " ou "1. "), com um item por linha.
- Citações longas recuadas viram "> citação".
- Preserve tabelas em Markdown quando o original tiver tabela.

CORRIGIR:
- Palavras hifenizadas quebradas em fim de linha (junte: "adminis-\\ntrativo" → "administrativo")
- Espaços duplos e quebras de linha erradas dentro de um parágrafo (remonte o parágrafo)
- Confusões clássicas de OCR: "|" → "I", "l" solto → "I" em siglas, "0" → "O" em texto corrido, "rn" → "m" quando óbvio
- Aspas retas para tipográficas ("texto" → "texto")

ENRIQUECER O MARKDOWN (obrigatório onde couber):
- **Negrito** em termos jurídicos-chave e princípios (ex.: **legalidade**, **devido processo legal**)
- *Itálico* em expressões latinas (*erga omnes*, *ex tunc*)
- SEMPRE colocar citações de artigos/leis em **negrito completo**, incluindo o dispositivo. Exemplos obrigatórios:
  · "art. 5º, XXII, da CF/88" → **art. 5º, XXII, da CF/88**
  · "art. 225, §3º, da CF" → **art. 225, §3º, da CF**
  · "Lei nº 8.112/90" → **Lei nº 8.112/90**
  · "Súmula 473 do STF" → **Súmula 473 do STF**
- Se a página termina claramente NO MEIO de uma frase (sem pontuação final, sem título logo abaixo), acrescente o marcador especial \`<!-- continua -->\` na última linha para sinalizar continuação

NUNCA:
- Reescrever, resumir ou remover parágrafos legítimos
- Alterar o sentido do texto
- Remover imagens Markdown ![...](...) — preserve intactas
- Remover citações, notas de rodapé numeradas, ou numerações de artigos/incisos
- **JAMAIS** produzir qualquer linha com o padrão "PÁGINA N", "Página N", "PÁG. N", "Pág. N" (em qualquer variação de caixa, com ou sem asteriscos \`**\`, com ou sem heading \`#\`/\`##\`/\`###\`, com ou sem pontuação final). Esses rótulos NUNCA devem aparecer no \`md\` retornado — nem no início, nem no meio, nem no fim. O leitor já mostra a numeração de página fora do texto. Exemplos PROIBIDOS que você DEVE remover: \`### Página 50\`, \`**PÁGINA 51**\`, \`PÁGINA 49\`, \`Página 12.\`, \`## Pág. 27\`.

Devolva JSON: {"paginas":[{"n":N,"md":"..."}]} onde n começa em ${numeroInicial}.`;
  const usr = paginas.map((p, i) => `### Página ${numeroInicial + i}\n${p}`).join("\n\n");
  try {
    const raw = await chatGemini(MODEL_FAST, sys, usr, true);
    const parsed = JSON.parse(raw);
    const arr = (parsed?.paginas ?? []) as Array<{ n: number; md: string }>;
    const out = paginas.slice();
    for (const item of arr) {
      const idx = item.n - numeroInicial;
      if (idx >= 0 && idx < out.length && typeof item.md === "string") {
        out[idx] = sanitizarPaginaRefinada(item.md);
      }
    }
    return out;
  } catch (e) {
    console.warn("[refino] lote fallback", e);
    return paginas;
  }
}

/** Remove rótulos residuais "PÁGINA N", números soltos de rodapé e linhas
 * decorativas que o modelo às vezes deixa passar apesar do prompt. */
function sanitizarPaginaRefinada(md: string): string {
  return md
    // Rótulos "PÁGINA N" / "Página N" / "Pág. N" em qualquer variação de caixa,
    // com ou sem heading, asteriscos, itálico, hífen, dois pontos, pontuação final.
    .replace(
      /^[ \t]*(?:#{1,6}[ \t]*)?[*_]{0,2}[ \t]*P[áÁaA]g(?:\.|ina)?[ \t]+\d+[º°ª]?[ \t]*[*_]{0,2}[ \t]*[.:\-–—]?[ \t]*$/gim,
      "",
    )
    // Número solto (rodapé) — só quando é a linha inteira.
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, "")
    // Número de rodapé decorado: "— 27 —", "· 27 ·", "[27]", "-27-", "( 27 )".
    .replace(/^[ \t]*[\[\(]?[ \t]*[-–—·•*|]*[ \t]*\d{1,4}[ \t]*[-–—·•*|]*[ \t]*[\]\)]?[ \t]*$/gm, "")
    // Cabeçalho/rodapé corrente com número colado ao título: "27 | Livro" / "Livro · 27".
    // Só linhas curtas, sem pontuação de frase e sem estrutura de tabela.
    .replace(/^[ \t]*\d{1,4}[ \t]*[|·•][ \t]*[^|\n.;:]{3,60}[ \t]*$/gm, "")
    .replace(/^[ \t]*[^|\n.;:]{3,60}?[ \t]*[|·•][ \t]*\d{1,4}[ \t]*$/gm, "")
    // Linhas apenas com pontuação/decoração residual.
    .replace(/^[ \t]*[-–—·•*_=]{1,}[ \t]*$/gm, "")
    // Heading nível 1 dentro da página: o "#" é reservado à capa do capítulo.
    .replace(/^#\s+/gm, "## ")
    // Numeração de diagramação antes do título ("## 3. Fontes legislativas").
    .replace(/^(#{2,6})\s+\d{1,3}(?:\.\d{1,3})*\s*[.\-–—):·]?\s+(?=\S)/gm, "$1 ")
    // Colapsa múltiplas linhas em branco produzidas pelas remoções.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Palavras terminais que quase sempre indicam continuação na próxima página. */
const CONTINUA_TERMINAL_RE = /\b(no|na|nos|nas|do|da|dos|das|de|em|com|por|para|pelo|pela|pelos|pelas|ao|aos|à|às|e|ou|mas|que|se|um|uma|uns|umas)$/i;

/** Remove o título do capítulo quando ele se repete como heading logo no
 * começo da primeira página — a capa do capítulo já mostra esse título. */
function removerTituloDuplicado(md: string, titulo: string): string {
  const alvo = normalizarTexto(limparTituloCapituloFinal(titulo));
  if (!alvo) return md;
  const linhas = md.split("\n");
  let i = 0;
  while (i < linhas.length && !linhas[i].trim()) i++;
  const primeira = (linhas[i] || "").trim();
  if (!/^#{1,6}\s+/.test(primeira)) return md;
  if (normalizarTexto(limparTituloCapituloFinal(primeira)) !== alvo) return md;
  linhas.splice(0, i + 1);
  return linhas.join("\n").trim();
}

/** Costura continuações entre páginas: quando uma página marca <!-- continua --> ou termina em meio de frase,
 * junta o início da próxima página (até o primeiro parágrafo/título) ao fim da anterior. */
function costurarPaginas(cleaned: string[]): string[] {
  const out = cleaned.slice();
  // Passada 1: garante que rótulos residuais no início de cada página não
  // atrapalhem a heurística de "próxima começa em minúsculo".
  for (let i = 0; i < out.length; i++) {
    out[i] = sanitizarPaginaRefinada(out[i] || "");
  }
  for (let i = 0; i < out.length - 1; i++) {
    const cur = (out[i] || "").trimEnd();
    const nxt = (out[i + 1] || "").trimStart();
    if (!cur || !nxt) continue;
    const marcador = /<!--\s*continua\s*-->\s*$/i.test(cur);
    const semMarcador = cur.replace(/<!--[^>]*-->\s*$/g, "").trimEnd();
    // Palavra final da página atual (ignorando pontuação leve).
    const ultimaPalavra = (semMarcador.match(/[\p{L}\p{M}\-]+$/u)?.[0] ?? "");
    const terminaEmMeioFrase =
      /[a-zà-úñç,;:—-]$/i.test(semMarcador) ||
      CONTINUA_TERMINAL_RE.test(ultimaPalavra);
    const proxComecaMinusculo = /^[a-zà-úñç]/.test(nxt);
    // Também considera páginas absurdamente curtas como continuação (ex.: "bem.").
    const proxCurtissima = nxt.replace(/\s+/g, " ").trim().length <= 8;
    if (marcador || (terminaEmMeioFrase && (proxComecaMinusculo || proxCurtissima))) {
      const curLimpo = cur.replace(/<!--\s*continua\s*-->\s*$/i, "").trimEnd();
      // move o primeiro parágrafo (ou frase) da próxima para o fim da atual
      const quebra = nxt.search(/\n{2,}|^#{1,3}\s/m);
      const trecho = quebra > 0 ? nxt.slice(0, quebra).trim() : nxt.split(/(?<=[.!?])\s/)[0] || nxt;
      if (trecho) {
        out[i] = curLimpo + (curLimpo.endsWith("-") ? "" : " ") + trecho;
        out[i + 1] = (quebra > 0 ? nxt.slice(quebra) : nxt.slice(trecho.length)).trimStart();
      }
    }
  }
  return out;
}




function montarCapaCapitulo(a: { numero: number; titulo: string; epigrafe?: string; totalPaginas: number; totalPalavras: number }) {

  const minutos = Math.max(1, Math.round(a.totalPalavras / 220));
  const l: string[] = ["<!-- capa-capitulo -->", `# Capítulo ${a.numero}`, "", `## ${a.titulo}`];
  if (a.epigrafe) { l.push("", `> ${a.epigrafe}`); }
  l.push("", `*${a.totalPaginas} páginas · ~${minutos} min de leitura*`);
  return l.join("\n");
}

// ============================================================
// WORKER DA FILA (empacotado)
// ============================================================
async function handleWorker() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const MAX_JOBS = 3, MAX_TENT = 3;
  const results: any[] = [];
  for (let i = 0; i < MAX_JOBS; i++) {
    const { data: jobs } = await supabase
      .from("biblioteca_leitura_jobs").select("*")
      .eq("status", "agendado")
      .lte("scheduled_for", new Date().toISOString())
      .order("prioridade", { ascending: true })
      .order("scheduled_for", { ascending: true })
      .limit(1);
    const job = jobs?.[0];
    if (!job) break;
    await supabase.from("biblioteca_leitura_jobs")
      .update({ status: "rodando", started_at: new Date().toISOString(), tentativas: job.tentativas + 1 })
      .eq("id", job.id);
    try {
      if (job.tipo === "ocr" || job.tipo === "completo") {
        if (!job.pdf_url) throw new Error("pdf_url ausente");
        const r = await invokeSelf({ livro_id: job.livro_id, livro_tabela: job.livro_tabela, pdf_url: job.pdf_url, titulo: job.titulo, force: true });
        if (!r.ok) throw new Error(`ocr ${r.status}`);
      }
      if (job.tipo === "refino" || job.tipo === "completo") {
        const r = await invokeSelf({ action: "refino", livro_id: job.livro_id, livro_tabela: job.livro_tabela, force: true });
        if (!r.ok) throw new Error(`refino ${r.status}`);
      }
      await supabase.from("biblioteca_leitura_jobs")
        .update({ status: "ok", finished_at: new Date().toISOString(), erro: null })
        .eq("id", job.id);
      results.push({ id: job.id, status: "ok" });
    } catch (e: any) {
      const retry = job.tentativas + 1 < MAX_TENT;
      await supabase.from("biblioteca_leitura_jobs").update({
        status: retry ? "agendado" : "erro",
        erro: String(e?.message ?? e),
        finished_at: retry ? null : new Date().toISOString(),
        scheduled_for: retry ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : job.scheduled_for,
      }).eq("id", job.id);
      results.push({ id: job.id, status: retry ? "agendado" : "erro" });
    }
  }
  return json({ processed: results.length, results });
}

async function invokeSelf(body: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/functions/v1/biblioteca-ocr-mistral`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: resp.ok, status: resp.status };
}
