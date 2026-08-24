// radar-detectar-impacto-leis
// Cruza atos da resenha_diaria com a biblioteca vade_mecum_leis e registra
// impactos pendentes (sem aplicar) em radar_impactos_leis.
//
// Body opcional: { dias?: number = 7, limit?: number = 200, reprocessar?: boolean = false }

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Ato {
  id: string;
  tipo_ato: string;
  numero_ato: string;
  ementa: string;
  url: string | null;
  texto_completo: string | null;
  data_dou: string | null;
}

interface Lei {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  numero_lei: string | null;
  ano_lei: number | null;
}

function normalizarNumero(n: string): string {
  return (n || "").replace(/\./g, "").replace(/\s+/g, "").toLowerCase();
}

// Extrai referências a leis/decretos/CF a partir do texto do ato.
// Retorna pares { numero, ano } normalizados.
function extrairReferencias(texto: string): Array<{ numero: string; ano?: number }> {
  const refs = new Map<string, { numero: string; ano?: number }>();
  const push = (numero: string, ano?: number) => {
    const key = `${normalizarNumero(numero)}|${ano ?? ""}`;
    if (!refs.has(key)) refs.set(key, { numero: normalizarNumero(numero), ano });
  };

  // "Lei nº 8.078, de 11 de setembro de 1990"
  const reLeiComData = /lei\s+(?:complementar\s+)?(?:n[ºo\.]*\s*)?([\d\.]+)[,\s]+de[^,]{1,40}?de\s+(\d{4})/gi;
  // "Lei nº 8.078/90" ou "Lei nº 8.078/1990"
  const reLeiBarra = /lei\s+(?:complementar\s+)?(?:n[ºo\.]*\s*)?([\d\.]+)\s*\/\s*(\d{2,4})/gi;
  // "Decreto-Lei nº 2.848, de 7 de dezembro de 1940"
  const reDecretoLei = /decreto[- ]lei\s+(?:n[ºo\.]*\s*)?([\d\.]+)[,\s]+de[^,]{1,40}?de\s+(\d{4})/gi;
  // "Decreto nº 10.000, de 2020"
  const reDecreto = /decreto\s+(?:n[ºo\.]*\s*)?([\d\.]+)[,\s]+de[^,]{1,40}?de\s+(\d{4})/gi;
  // "Constituição Federal" / "CF/88"
  const reCf = /constitui[çc][ãa]o\s+federal|\bcf\s*\/\s*88\b/gi;

  for (const m of texto.matchAll(reLeiComData)) push(m[1], parseInt(m[2]));
  for (const m of texto.matchAll(reLeiBarra)) {
    let ano = parseInt(m[2]);
    if (ano < 100) ano = ano >= 30 ? 1900 + ano : 2000 + ano;
    push(m[1], ano);
  }
  for (const m of texto.matchAll(reDecretoLei)) push(m[1], parseInt(m[2]));
  for (const m of texto.matchAll(reDecreto)) push(m[1], parseInt(m[2]));
  if (reCf.test(texto)) push("cf88", 1988);

  return [...refs.values()];
}

function classificarTipo(texto: string): string {
  const t = texto.toLowerCase();
  if (/\brevoga(m|do|dos|das|-se)?\b/.test(t)) return "revogacao";
  if (/\baltera(m|-se|ção)?\b|acresc(enta|ida)|inclui|nova\s+redação/.test(t)) return "alteracao";
  if (/regulament|dispõe sobre|estabelece/.test(t)) return "regulamentacao";
  return "mencao";
}

async function gerarResumoIA(ato: Ato, lei: Lei): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const prompt = `Você é analista jurídico. Um novo ato normativo foi publicado e pode impactar a lei "${lei.nome}" (${lei.numero_lei ?? ""}/${lei.ano_lei ?? ""}).

ATO: ${ato.tipo_ato} ${ato.numero_ato}
EMENTA: ${ato.ementa}

Em UMA frase curta (máx. 220 caracteres), explique o impacto concreto na lei mencionada. Se não houver impacto claro, responda "Menciona a lei mas sem alteração aparente.". Seja direto, técnico, sem introduções.`;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) return null;
    const j = await resp.json();
    const txt = String(j?.choices?.[0]?.message?.content ?? "").trim();
    return txt.slice(0, 400) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* sem body */ }
  const dias = Math.max(1, Math.min(90, Number(body?.dias) || 7));
  const limit = Math.max(1, Math.min(500, Number(body?.limit) || 200));
  const reprocessar = !!body?.reprocessar;

  // 1) Carrega leis com número/ano
  const { data: leisData, error: eLeis } = await supabase
    .from("vade_mecum_leis")
    .select("id, slug, nome, nome_curto, numero_lei, ano_lei");
  if (eLeis) return new Response(JSON.stringify({ error: eLeis.message }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  const leis = (leisData ?? []) as Lei[];

  // Índice: "numero|ano" e "numero" -> Lei[]
  const idxNumAno = new Map<string, Lei[]>();
  const idxNum = new Map<string, Lei[]>();
  for (const l of leis) {
    if (!l.numero_lei) continue;
    const num = normalizarNumero(l.numero_lei);
    const keyNa = `${num}|${l.ano_lei ?? ""}`;
    if (!idxNumAno.has(keyNa)) idxNumAno.set(keyNa, []);
    idxNumAno.get(keyNa)!.push(l);
    if (!idxNum.has(num)) idxNum.set(num, []);
    idxNum.get(num)!.push(l);
  }

  // 2) Carrega atos recentes da resenha
  const desde = new Date(Date.now() - dias * 86400_000).toISOString().slice(0, 10);
  const { data: atosData, error: eAtos } = await supabase
    .from("resenha_diaria")
    .select("id, tipo_ato, numero_ato, ementa, url, texto_completo, data_dou")
    .gte("data_dou", desde)
    .order("data_dou", { ascending: false })
    .limit(limit);
  if (eAtos) return new Response(JSON.stringify({ error: eAtos.message }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  const atos = (atosData ?? []) as Ato[];

  // 3) Já existentes (para evitar duplicatas)
  const existentes = new Set<string>();
  if (!reprocessar && atos.length) {
    const { data: exist } = await supabase
      .from("radar_impactos_leis")
      .select("ato_id, lei_id")
      .in("ato_id", atos.map(a => a.id));
    (exist ?? []).forEach((r: any) => existentes.add(`${r.ato_id}|${r.lei_id}`));
  }

  let inseridos = 0;
  let atosComImpacto = 0;
  let atosAnalisados = 0;

  for (const ato of atos) {
    atosAnalisados++;
    const texto = `${ato.ementa ?? ""}\n${ato.texto_completo ?? ""}`;
    const refs = extrairReferencias(texto);
    if (refs.length === 0) continue;

    const leisAtingidas = new Map<string, Lei>();
    for (const r of refs) {
      const keyNa = `${r.numero}|${r.ano ?? ""}`;
      const cands = idxNumAno.get(keyNa) ?? (r.ano ? [] : idxNum.get(r.numero) ?? []);
      for (const l of cands) leisAtingidas.set(l.id, l);
    }
    if (leisAtingidas.size === 0) continue;
    atosComImpacto++;

    for (const lei of leisAtingidas.values()) {
      const dedup = `${ato.id}|${lei.id}`;
      if (existentes.has(dedup)) continue;
      const tipo = classificarTipo(texto);
      const resumo = await gerarResumoIA(ato, lei);

      // Tenta extrair número(s) de artigo mencionados perto do nome da lei.
      // Padrões: "art. 5º", "arts. 10 e 11", "artigo 25-A".
      const artigosRe = /\bart(?:\.|igo)s?\.?\s*((?:\d+(?:\.\d+)*(?:-[A-Z0-9]+)?[ºª°]?)(?:\s*(?:,|e|até)\s*\d+(?:\.\d+)*(?:-[A-Z0-9]+)?[ºª°]?)*)/gi;
      const numeros = new Set<string>();
      for (const m of texto.matchAll(artigosRe)) {
        const grupo = m[1];
        for (const raw of grupo.split(/\s*(?:,|e|até)\s*/)) {
          const n = raw.replace(/[ºª°]/g, "").trim();
          if (n) numeros.add(n);
        }
      }
      let artigoId: string | null = null;
      let artigoNumero: string | null = null;
      if (numeros.size > 0) {
        const nums = [...numeros];
        const { data: arts } = await supabase
          .from("vade_mecum_artigos")
          .select("id, numero")
          .eq("lei_id", lei.id)
          .in("numero", nums)
          .limit(1);
        if (arts && arts.length) {
          artigoId = arts[0].id as string;
          artigoNumero = arts[0].numero as string;
        } else {
          artigoNumero = nums[0];
        }
      }

      const { error: eIns } = await supabase.from("radar_impactos_leis").upsert({
        ato_id: ato.id,
        ato_url: ato.url,
        ato_ementa: ato.ementa,
        lei_id: lei.id,
        artigo_id: artigoId,
        artigo_numero: artigoNumero,
        tipo,
        status: "pendente",
        resumo_ia: resumo,
      }, { onConflict: "ato_id,lei_id" });
      if (!eIns) {
        inseridos++;
        existentes.add(dedup);
      } else {
        console.error("insert impacto", eIns.message);
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true, dias, atos_analisados: atosAnalisados, atos_com_impacto: atosComImpacto, impactos_registrados: inseridos,
  }), { headers: { ...cors, "content-type": "application/json" } });
});
