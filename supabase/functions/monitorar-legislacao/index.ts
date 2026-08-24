import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

/* ── Catálogo inline (tabela_nome → url) ── */
const CATALOG: { tabela_nome: string; url: string }[] = [
  { tabela_nome: "CF88_CONSTITUICAO_FEDERAL", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm" },
  { tabela_nome: "CP_CODIGO_PENAL", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm" },
  { tabela_nome: "CC_CODIGO_CIVIL", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm" },
  { tabela_nome: "CPC_CODIGO_PROCESSO_CIVIL", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm" },
  { tabela_nome: "CPP_CODIGO_PROCESSO_PENAL", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm" },
  { tabela_nome: "CTN_CODIGO_TRIBUTARIO_NACIONAL", url: "https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm" },
  { tabela_nome: "CDC_CODIGO_DEFESA_CONSUMIDOR", url: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" },
  { tabela_nome: "CLT_CONSOLIDACAO_LEIS_TRABALHO", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm" },
  { tabela_nome: "CTB_CODIGO_TRANSITO_BRASILEIRO", url: "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm" },
  { tabela_nome: "CE_CODIGO_ELEITORAL", url: "https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm" },
  { tabela_nome: "CPM_CODIGO_PENAL_MILITAR", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del1001compilado.htm" },
  { tabela_nome: "CPPM_CODIGO_PROCESSO_PENAL_MILITAR", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002compilado.htm" },
  { tabela_nome: "CFLOR_CODIGO_FLORESTAL", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651compilado.htm" },
  { tabela_nome: "CCOM_CODIGO_COMERCIAL", url: "https://www.planalto.gov.br/ccivil_03/leis/lim/lim556compilado.htm" },
  { tabela_nome: "CBA_CODIGO_BRASILEIRO_AERONAUTICA", url: "https://www.planalto.gov.br/ccivil_03/leis/l7565compilado.htm" },
  { tabela_nome: "CAGUA_CODIGO_AGUAS", url: "https://www.planalto.gov.br/ccivil_03/decreto/d24643compilado.htm" },
  { tabela_nome: "CMIN_CODIGO_MINAS", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del0227compilado.htm" },
  { tabela_nome: "CTEL_CODIGO_TELECOMUNICACOES", url: "https://www.planalto.gov.br/ccivil_03/leis/l4117compilado.htm" },
  { tabela_nome: "ECA_ESTATUTO_CRIANCA_ADOLESCENTE", url: "https://www.planalto.gov.br/ccivil_03/leis/l8069compilado.htm" },
  { tabela_nome: "EI_ESTATUTO_IDOSO", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741compilado.htm" },
  { tabela_nome: "EPD_ESTATUTO_PESSOA_DEFICIENCIA", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm" },
  { tabela_nome: "EIR_ESTATUTO_IGUALDADE_RACIAL", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12288.htm" },
  { tabela_nome: "EC_ESTATUTO_CIDADE", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm" },
  { tabela_nome: "ED_ESTATUTO_DESARMAMENTO", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826compilado.htm" },
  { tabela_nome: "EOAB_ESTATUTO_OAB", url: "https://www.planalto.gov.br/ccivil_03/leis/l8906compilada.htm" },
  { tabela_nome: "ET_ESTATUTO_TORCEDOR", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.671compilado.htm" },
  { tabela_nome: "EJ_ESTATUTO_JUVENTUDE", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12852.htm" },
  { tabela_nome: "EM_ESTATUTO_MILITARES", url: "https://www.planalto.gov.br/ccivil_03/leis/l6880compilada.htm" },
  { tabela_nome: "EIND_ESTATUTO_INDIO", url: "https://www.planalto.gov.br/ccivil_03/leis/l6001.htm" },
  { tabela_nome: "ETERRA_ESTATUTO_TERRA", url: "https://www.planalto.gov.br/ccivil_03/leis/l4504compilada.htm" },
  { tabela_nome: "EMIG_ESTATUTO_MIGRACAO", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13445.htm" },
  { tabela_nome: "EREF_ESTATUTO_REFUGIADO", url: "https://www.planalto.gov.br/ccivil_03/leis/l9474.htm" },
  { tabela_nome: "EMET_ESTATUTO_METROPOLE", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13089.htm" },
  { tabela_nome: "EMUS_ESTATUTO_MUSEUS", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11904.htm" },
  { tabela_nome: "EME_ESTATUTO_MICROEMPRESA", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123compilado.htm" },
  { tabela_nome: "EPC_ESTATUTO_PESSOA_CANCER", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14238.htm" },
  { tabela_nome: "LEP_EXECUCAO_PENAL", url: "https://www.planalto.gov.br/ccivil_03/leis/l7210compilado.htm" },
  { tabela_nome: "LMP_MARIA_PENHA", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm" },
  { tabela_nome: "LD_LEI_DROGAS", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm" },
  { tabela_nome: "LOC_ORGANIZACAO_CRIMINOSA", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm" },
  { tabela_nome: "LAA_ABUSO_AUTORIDADE", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13869.htm" },
  { tabela_nome: "LIT_INTERCEPTACAO_TELEFONICA", url: "https://www.planalto.gov.br/ccivil_03/leis/l9296.htm" },
  { tabela_nome: "L8112_SERVIDORES_FEDERAIS", url: "https://www.planalto.gov.br/ccivil_03/leis/l8112compilado.htm" },
  { tabela_nome: "LIA_IMPROBIDADE_ADMINISTRATIVA", url: "https://www.planalto.gov.br/ccivil_03/leis/l8429compilado.htm" },
  { tabela_nome: "NLL_LICITACOES", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm" },
  { tabela_nome: "LMS_MANDADO_SEGURANCA", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm" },
  { tabela_nome: "LACP_ACAO_CIVIL_PUBLICA", url: "https://www.planalto.gov.br/ccivil_03/leis/l7347compilada.htm" },
  { tabela_nome: "LJE_JUIZADOS_ESPECIAIS", url: "https://www.planalto.gov.br/ccivil_03/leis/l9099compilado.htm" },
  { tabela_nome: "LGPD_PROTECAO_DADOS", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" },
  { tabela_nome: "MCI_MARCO_CIVIL_INTERNET", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm" },
  { tabela_nome: "LF_FALENCIAS", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101compilado.htm" },
  { tabela_nome: "LA_ARBITRAGEM", url: "https://www.planalto.gov.br/ccivil_03/leis/l9307.htm" },
  { tabela_nome: "LI_INQUILINATO", url: "https://www.planalto.gov.br/ccivil_03/leis/l8245compilado.htm" },
  { tabela_nome: "LRP_REGISTROS_PUBLICOS", url: "https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm" },
  { tabela_nome: "LOMAN_LEI_ORGANICA_MAGISTRATURA", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp35.htm" },
  { tabela_nome: "LAT_ANTITERRORISMO", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13260.htm" },
  { tabela_nome: "LBPS_BENEFICIOS_PREVIDENCIA", url: "https://www.planalto.gov.br/ccivil_03/leis/l8213compilado.htm" },
  { tabela_nome: "LCSS_CUSTEIO_SEGURIDADE", url: "https://www.planalto.gov.br/ccivil_03/leis/l8212compilado.htm" },
  { tabela_nome: "LPC_PREVIDENCIA_COMPLEMENTAR", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp109.htm" },
];

/* ── HTML Parser (copied from scrape-legislacao) ── */

interface ArtigoParsed {
  numero: string;
  texto: string;
}

function decodeHtmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseHtmlToArticles(html: string): ArtigoParsed[] {
  const textBlocks: string[] = [];
  const blockRegex = /<(?:p|h[1-6]|center)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|center)>/gi;
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const cleaned = match[1]
      .replace(/<(?:strike|s|del)\b[^>]*>[\s\S]*?<\/(?:strike|s|del)\b>/gi, "")
      .replace(/<(?:br|hr)\s*\/?>/gi, "\n");
    const decoded = decodeHtmlText(cleaned);
    if (decoded) textBlocks.push(decoded);
  }

  const artigos: ArtigoParsed[] = [];
  const artRegex = /^Art\.\s*(\d+(?:\.\d+)*[º°o]?(?:-[A-Z])?)\s*[.–\-\s]/i;

  let currentArt: ArtigoParsed | null = null;

  for (const block of textBlocks) {
    const artMatch = block.match(artRegex);
    if (artMatch) {
      if (currentArt && currentArt.texto.trim()) {
        artigos.push(currentArt);
      }
      const rawNum = artMatch[1].replace(/°/g, "º").replace(/(\d)o\b/gi, "$1º");
      const cleanNum = artMatch[1].replace(/[º°o]/g, "").replace(/\./g, "").trim();
      currentArt = {
        numero: `Art. ${cleanNum}`,
        texto: block.replace(artRegex, "").replace(/^[oº]\s*/, "").trim(),
      };
    } else if (currentArt) {
      currentArt.texto += "\n" + block;
    }
  }
  if (currentArt && currentArt.texto.trim()) {
    artigos.push(currentArt);
  }

  // Dedupe by numero
  const deduped = new Map<string, ArtigoParsed>();
  for (const art of artigos) deduped.set(art.numero, art);
  return Array.from(deduped.values());
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    try { body = await req.json(); } catch {}

    const { tabela_nome, batch_size = 5, offset = 0 } = body;

    // If specific law, check only that one; otherwise batch from catalog
    const targets = tabela_nome
      ? CATALOG.filter(c => c.tabela_nome === tabela_nome)
      : CATALOG.slice(offset, offset + batch_size);

    if (targets.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma lei para verificar", alteracoes: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultados: any[] = [];
    let totalAlteracoes = 0;

    for (const lei of targets) {
      try {
        console.log(`Verificando: ${lei.tabela_nome}`);

        // 1. Fetch HTML from Planalto
        const response = await fetch(lei.url, { headers: FETCH_HEADERS });
        if (!response.ok) {
          console.error(`Fetch falhou para ${lei.tabela_nome}: ${response.status}`);
          resultados.push({ tabela_nome: lei.tabela_nome, status: "fetch_error", code: response.status });
          continue;
        }

        const rawBytes = new Uint8Array(await response.arrayBuffer());
        let html: string;
        try {
          html = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
        } catch {
          html = new TextDecoder("windows-1252").decode(rawBytes);
        }
        html = html.normalize("NFC").replace(/\uFFFD/g, " ");

        // 2. Parse articles from HTML
        const artigosPlanalto = parseHtmlToArticles(html);
        console.log(`${lei.tabela_nome}: ${artigosPlanalto.length} artigos no Planalto`);

        if (artigosPlanalto.length === 0) {
          resultados.push({ tabela_nome: lei.tabela_nome, status: "parse_empty" });
          continue;
        }

        // 3. Fetch current articles from DB
        const dbRes = await fetch(
          `${supabaseUrl}/rest/v1/${encodeURIComponent(lei.tabela_nome)}?select=numero,texto&order=ordem_numero`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        const artigosDb: { numero: string; texto: string }[] = dbRes.ok ? await dbRes.json() : [];
        console.log(`${lei.tabela_nome}: ${artigosDb.length} artigos no banco`);

        // 4. Compare
        const dbMap = new Map(artigosDb.map(a => [a.numero, a.texto]));
        const planaltoMap = new Map(artigosPlanalto.map(a => [a.numero, a.texto]));
        const alteracoes: any[] = [];

        // New articles (in Planalto but not in DB)
        for (const [num, texto] of planaltoMap) {
          if (!dbMap.has(num)) {
            alteracoes.push({
              tabela_nome: lei.tabela_nome,
              tipo_alteracao: "artigo_novo",
              artigo_numero: num,
              texto_anterior: null,
              texto_atual: texto.substring(0, 2000),
            });
          }
        }

        // Revoked articles (in DB but not in Planalto)
        for (const [num, texto] of dbMap) {
          if (!planaltoMap.has(num)) {
            alteracoes.push({
              tabela_nome: lei.tabela_nome,
              tipo_alteracao: "artigo_revogado",
              artigo_numero: num,
              texto_anterior: texto.substring(0, 2000),
              texto_atual: null,
            });
          }
        }

        // Changed text
        for (const [num, textoPlanalto] of planaltoMap) {
          const textoDb = dbMap.get(num);
          if (textoDb && normalize(textoPlanalto) !== normalize(textoDb)) {
            alteracoes.push({
              tabela_nome: lei.tabela_nome,
              tipo_alteracao: "texto_alterado",
              artigo_numero: num,
              texto_anterior: textoDb.substring(0, 2000),
              texto_atual: textoPlanalto.substring(0, 2000),
            });
          }
        }

        // 5. Insert alterations
        if (alteracoes.length > 0) {
          // Remove existing unreviewed alterations for this law to avoid duplicates
          await fetch(
            `${supabaseUrl}/rest/v1/legislacao_alteracoes?tabela_nome=eq.${encodeURIComponent(lei.tabela_nome)}&revisado=eq.false`,
            {
              method: "DELETE",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: "return=minimal",
              },
            }
          );

          for (let i = 0; i < alteracoes.length; i += 50) {
            const batch = alteracoes.slice(i, i + 50);
            await fetch(`${supabaseUrl}/rest/v1/legislacao_alteracoes`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify(batch),
            });
          }
          totalAlteracoes += alteracoes.length;
        }

        resultados.push({
          tabela_nome: lei.tabela_nome,
          status: "ok",
          artigos_planalto: artigosPlanalto.length,
          artigos_db: artigosDb.length,
          alteracoes: alteracoes.length,
        });
      } catch (err: any) {
        console.error(`Erro em ${lei.tabela_nome}:`, err.message);
        resultados.push({ tabela_nome: lei.tabela_nome, status: "error", message: err.message });
      }
    }

    // Auto-enqueue next batch if running full catalog
    const nextOffset = offset + batch_size;
    const hasMore = !tabela_nome && nextOffset < CATALOG.length;

    return new Response(
      JSON.stringify({
        total_verificadas: targets.length,
        total_alteracoes: totalAlteracoes,
        has_more: hasMore,
        next_offset: hasMore ? nextOffset : null,
        resultados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro geral:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
