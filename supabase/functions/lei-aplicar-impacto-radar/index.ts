// lei-aplicar-impacto-radar
// Aplica um impacto do Radar de Leis a um artigo específico:
// - baixa o texto atualizado do Planalto (mesma extração da reextração),
// - grava snapshot do estado antigo em HISTORICO_ALTERACOES,
// - atualiza texto do artigo, marca ult_alteracao_em, empurra `alteracoes` jsonb,
// - LIMPA narração/explicações/exemplo/comentário/termos/questões/flashcards
//   (o texto mudou, o conteúdo antigo não vale mais),
// - marca o impacto como `aplicado`.
//
// Body: { impacto_id: string }

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function decodeHtmlEntities(t: string): string {
  return t
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function fetchHtml(url: string): Promise<string> {
  const full = url.replace(/^http:/, "https:");
  const res = await fetch(full, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${full}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let html: string;
  try { html = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { html = new TextDecoder("windows-1252").decode(bytes); }
  return html.normalize("NFC").replace(/\uFFFD/g, " ");
}

// Extrai o texto de UM artigo específico da lei. Reaproveita a mesma lógica
// básica de linearização usada em reextrair-lei-planalto, mas retorna só
// o bloco que casa com `numero`.
function extractArtigo(html: string, numeroAlvo: string): string | null {
  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, " ")
    .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, " ")
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, " ")
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*"[^"]*line-through[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, " ");

  body = body.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const t = inner.replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (t === "" || t === "o" || t === "a" || t === "º" || t === "°" || t === "ª") return "º";
    return inner;
  });

  body = body
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  body = decodeHtmlEntities(body);

  const linhas = body.split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  const ART_RE = /^Art\.\s*(\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)/i;
  const HIER_RE = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i;
  const alvoNorm = numeroAlvo.replace(/[ºª°]/g, "").trim();

  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(ART_RE);
    if (!m) continue;
    const n = m[1];
    if (n !== alvoNorm) continue;
    const partes: string[] = [linhas[i]];
    let j = i + 1;
    while (j < linhas.length) {
      const l2 = linhas[j];
      if (ART_RE.test(l2) || HIER_RE.test(l2)) break;
      partes.push(l2);
      j++;
    }
    return partes.join("\n").replace(/\s+\n/g, "\n").trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const impactoId = String(body?.impacto_id || "").trim();
    if (!impactoId) {
      return new Response(JSON.stringify({ error: "impacto_id obrigatório" }),
        { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Verifica admin (opcional — chamado só do painel admin)
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data: userData } = await supa.auth.getUser(jwt);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: isAdmin } = await supa.rpc("is_admin_user", { _user_id: uid });
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "acesso negado" }),
            { status: 403, headers: { ...cors, "content-type": "application/json" } });
        }
      }
    }

    // 1) Carrega impacto + lei
    const { data: impacto, error: eImp } = await supa
      .from("radar_impactos_leis")
      .select("id, lei_id, artigo_id, artigo_numero, tipo, ato_url, ato_ementa, status")
      .eq("id", impactoId)
      .maybeSingle();
    if (eImp) throw eImp;
    if (!impacto) throw new Error("impacto não encontrado");
    if (impacto.status === "aplicado") {
      return new Response(JSON.stringify({ ok: true, ja_aplicado: true }),
        { headers: { ...cors, "content-type": "application/json" } });
    }

    const { data: lei, error: eLei } = await supa
      .from("vade_mecum_leis")
      .select("id, slug, nome, planalto_url")
      .eq("id", impacto.lei_id)
      .maybeSingle();
    if (eLei) throw eLei;
    if (!lei?.planalto_url) throw new Error("lei sem planalto_url");

    const numeroAlvo = impacto.artigo_numero;
    if (!numeroAlvo) throw new Error("impacto sem número de artigo identificado — aplique manualmente");

    // 2) Carrega artigo atual
    const { data: artigoAtual, error: eArt } = await supa
      .from("vade_mecum_artigos")
      .select("*")
      .eq("lei_id", lei.id)
      .eq("numero", numeroAlvo)
      .maybeSingle();
    if (eArt) throw eArt;
    if (!artigoAtual) throw new Error(`artigo ${numeroAlvo} não encontrado na lei`);

    // 3) Se for REVOGAÇÃO: só marca revogado=true e conclui
    if (impacto.tipo === "revogacao") {
      await supa.from("HISTORICO_ALTERACOES").insert({
        entidade: "vade_mecum_artigos",
        entidade_id: artigoAtual.id,
        acao: "revogacao_radar",
        payload: { antes: artigoAtual, motivo: impacto.ato_ementa, ato: impacto.ato_url },
      } as any);
      await supa.from("vade_mecum_artigos").update({
        revogado: true,
        ult_alteracao_em: new Date().toISOString().slice(0, 10),
        alteracoes: [
          ...(Array.isArray(artigoAtual.alteracoes) ? artigoAtual.alteracoes : []),
          { data: new Date().toISOString(), tipo: "revogacao", ato: impacto.ato_url, ementa: impacto.ato_ementa },
        ],
      }).eq("id", artigoAtual.id);
      await supa.from("radar_impactos_leis").update({
        status: "aplicado", aplicado_em: new Date().toISOString(),
      }).eq("id", impacto.id);
      return new Response(JSON.stringify({ ok: true, tipo: "revogacao", artigo_id: artigoAtual.id }),
        { headers: { ...cors, "content-type": "application/json" } });
    }

    // 4) Baixa Planalto e extrai o artigo novo
    const html = await fetchHtml(lei.planalto_url);
    const textoNovo = extractArtigo(html, numeroAlvo);
    if (!textoNovo) throw new Error(`não foi possível extrair Art. ${numeroAlvo} do Planalto`);

    const mudou = textoNovo.trim() !== String(artigoAtual.texto || "").trim();

    // 5) Snapshot
    await supa.from("HISTORICO_ALTERACOES").insert({
      entidade: "vade_mecum_artigos",
      entidade_id: artigoAtual.id,
      acao: "aplicar_impacto_radar",
      payload: {
        antes: artigoAtual,
        texto_novo: textoNovo,
        mudou,
        ato: impacto.ato_url,
        ementa: impacto.ato_ementa,
      },
    } as any);

    // 6) Atualiza artigo: novo texto e LIMPA enriquecimentos
    const tinhaNarracao = !!artigoAtual.narracao_url;
    const tinhaExplicacao = !!(artigoAtual.explicacao_tecnico || artigoAtual.explicacao_resumido);

    if (mudou) {
      await supa.from("vade_mecum_artigos").update({
        texto: textoNovo,
        ult_alteracao_em: new Date().toISOString().slice(0, 10),
        alteracoes: [
          ...(Array.isArray(artigoAtual.alteracoes) ? artigoAtual.alteracoes : []),
          {
            data: new Date().toISOString(),
            tipo: impacto.tipo,
            ato: impacto.ato_url,
            ementa: impacto.ato_ementa,
          },
        ],
        // Enriquecimentos ficam obsoletos com o novo texto:
        narracao_url: null,
        comentario: null,
        explicacao_tecnico: null,
        explicacao_resumido: null,
        explicacao_simples_maior16: null,
        explicacao_simples_menor16: null,
        exemplo: null,
        termos: null,
        questoes: null,
        flashcards: null,
      }).eq("id", artigoAtual.id);
    }

    await supa.from("radar_impactos_leis").update({
      status: "aplicado", aplicado_em: new Date().toISOString(),
    }).eq("id", impacto.id);

    return new Response(JSON.stringify({
      ok: true,
      tipo: impacto.tipo,
      artigo_id: artigoAtual.id,
      artigo_numero: numeroAlvo,
      mudou,
      tinha_narracao: tinhaNarracao,
      tinha_explicacao: tinhaExplicacao,
      texto_novo: textoNovo,
    }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
