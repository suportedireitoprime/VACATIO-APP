import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sanitizeFirstName } from "../_shared/nomeSanitizer.ts";


// Sincroniza estatísticas consolidadas do usuário para o Horus usar como contexto.
// Chamado pelo frontend (debounced ~1x/sessão) e pelo cron diário.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization") || "";
    let userId: string | null = body?.user_id || null;
    const force: boolean = Boolean(body?.force);

    // Se veio JWT, resolve o user_id a partir dele (não confia no body).
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: u } = await admin.auth.getUser(token);
      if (u?.user?.id) userId = u.user.id;
    }

    // Modo cron: sem user_id, refaz para todos que têm atividade recente
    if (!userId) {
      const results = await refreshAll(admin);
      return json({ ok: true, batch: true, updated: results });
    }

    const result = await syncOne(admin, userId, force);
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("horus-stats-sync error", e);
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshAll(admin: any): Promise<number> {
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: active } = await admin
    .from("user_activity_log")
    .select("user_id")
    .gte("created_at", since)
    .limit(2000);
  const ids = Array.from(new Set((active || []).map((r: any) => r.user_id).filter(Boolean)));
  let ok = 0;
  for (const id of ids) {
    try {
      await syncOne(admin, id as string, true);
      ok++;
    } catch (e) { console.warn("refresh fail", id, String(e)); }
  }
  return ok;
}

async function syncOne(admin: any, userId: string, force: boolean) {
  // Cache: se atualizado há < 30min e não forçado, pula recomputo.
  const { data: existing } = await admin
    .from("horus_user_stats")
    .select("updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!force && existing?.updated_at) {
    const age = Date.now() - new Date(existing.updated_at).getTime();
    if (age < 30 * 60 * 1000) return { skipped: true, reason: "cache" };
  }

  // Perfil
  const { data: profile } = await admin
    .from("profiles")
    .select("id, display_name, telefone")
    .eq("id", userId)
    .maybeSingle();
  const telefone = String(profile?.telefone || "").replace(/\D/g, "");

  // Assinatura
  const { data: sub } = await admin
    .from("play_subscriptions")
    .select("status, expires_at, product_id")
    .eq("user_id", userId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plano = sub && (sub.status || "").toString().toLowerCase().includes("active") ? "pro" : "free";

  // Streak: dias consecutivos com study_sessions
  const { data: sessoes } = await admin
    .from("study_sessions")
    .select("created_at, tabela_nome, correct, total")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  const dias = new Set<string>();
  (sessoes || []).forEach((s: any) => {
    if (s.created_at) dias.add(String(s.created_at).slice(0, 10));
  });
  let streak = 0;
  const hoje = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoje.getTime() - i * 86400000).toISOString().slice(0, 10);
    if (dias.has(d)) streak++;
    else if (i === 0) continue; // permite quebra hoje sem zerar
    else break;
  }

  // Matéria mais estudada (7d e 30d)
  const cutoff7 = Date.now() - 7 * 86400000;
  const cutoff30 = Date.now() - 30 * 86400000;
  const cont7: Record<string, number> = {};
  const cont30: Record<string, number> = {};
  let totalQ = 0, totalC = 0;
  (sessoes || []).forEach((s: any) => {
    const ts = s.created_at ? new Date(s.created_at).getTime() : 0;
    const nome = s.tabela_nome || "outros";
    if (ts >= cutoff7) cont7[nome] = (cont7[nome] || 0) + 1;
    if (ts >= cutoff30) cont30[nome] = (cont30[nome] || 0) + 1;
    totalQ += Number(s.total) || 0;
    totalC += Number(s.correct) || 0;
  });
  const top = (m: Record<string, number>) => {
    const total = Object.values(m).reduce((a, b) => a + b, 0);
    if (!total) return null;
    const [nome, count] = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return `${nome} (${Math.round((count / total) * 100)}%)`;
  };

  // Último artigo lido
  const { data: ultArtigo } = await admin
    .from("artigos_visualizacoes")
    .select("numero_artigo, tabela_codigo, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ultimoArtigo = ultArtigo
    ? `Art. ${ultArtigo.numero_artigo} ${(ultArtigo.tabela_codigo || "").toUpperCase()}`
    : null;

  // Livros favoritos (top 3 nomes)
  const { data: favs } = await admin
    .from("biblioteca_favoritos")
    .select("livro_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);
  const livrosIds = (favs || []).map((f: any) => f.livro_id).filter(Boolean);
  const livrosNomes: string[] = livrosIds.length ? await resolveLivros(admin, livrosIds) : [];

  // Última atividade
  const { data: ultAtiv } = await admin
    .from("user_activity_log")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Horário preferido (moda das horas de atividade dos últimos 30 dias)
  const { data: acts30 } = await admin
    .from("user_activity_log")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(cutoff30).toISOString())
    .limit(500);
  const horas: Record<string, number> = { manha: 0, tarde: 0, noite: 0 };
  (acts30 || []).forEach((a: any) => {
    const h = new Date(a.created_at).getUTCHours() - 3; // BRT
    const bucket = h >= 5 && h < 12 ? "manha" : h >= 12 && h < 18 ? "tarde" : "noite";
    horas[bucket]++;
  });
  const preferencia = Object.entries(horas).sort((a, b) => b[1] - a[1])[0][0];

  const stats = {
    user_id: userId,
    telefone: telefone || null,
    nome_preferido: sanitizeFirstName(profile?.display_name) || null,
    plano_atual: plano,
    plano_expira_em: sub?.expires_at || null,
    ultima_atividade_em: ultAtiv?.created_at || new Date().toISOString(),
    dias_streak_estudo: streak,
    materia_mais_estudada_7d: top(cont7),
    materia_mais_estudada_30d: top(cont30),
    ultimas_buscas: [],
    ultimo_artigo_lido: ultimoArtigo,
    ultimo_resumo_visto: null,
    total_questoes_respondidas: totalQ,
    pct_acerto_geral: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
    livros_favoritos: livrosNomes,
    notificacoes_permitidas: true,
    preferencia_horario_contato: preferencia,
    contexto_formatado: null as string | null,
    updated_at: new Date().toISOString(),
  };

  // Pré-formata o bloco textual para injeção rápida
  stats.contexto_formatado = buildContextText(stats);

  const { error } = await admin
    .from("horus_user_stats")
    .upsert(stats, { onConflict: "user_id" });
  if (error) throw error;

  return { skipped: false, stats };
}

async function resolveLivros(admin: any, ids: string[]): Promise<string[]> {
  const tables = [
    "biblioteca_classicos", "biblioteca_estudos", "biblioteca_oab",
    "biblioteca_portugues", "biblioteca_lideranca", "biblioteca_fora_da_toga",
    "biblioteca_pesquisa_cientifica", "biblioteca_leitura_nativa", "biblioteca_livros",
  ];
  const names: string[] = [];
  for (const t of tables) {
    try {
      const { data } = await admin.from(t).select("id, titulo, nome").in("id", ids).limit(3);
      (data || []).forEach((r: any) => {
        const nome = r.titulo || r.nome;
        if (nome && !names.includes(nome)) names.push(nome);
      });
      if (names.length >= 3) break;
    } catch { /* tabela pode não ter coluna esperada */ }
  }
  return names.slice(0, 3);
}

function buildContextText(s: any): string {
  const lines: string[] = ["[CONTEXTO DO ALUNO]"];
  if (s.nome_preferido) lines.push(`Nome: ${s.nome_preferido}`);
  if (s.plano_atual) {
    const exp = s.plano_expira_em ? ` (expira ${new Date(s.plano_expira_em).toLocaleDateString("pt-BR")})` : "";
    lines.push(`Plano: ${s.plano_atual}${exp}`);
  }
  if (s.dias_streak_estudo > 0) lines.push(`Sequência de estudo: ${s.dias_streak_estudo} dia(s)`);
  if (s.materia_mais_estudada_7d) lines.push(`Matéria mais estudada (7d): ${s.materia_mais_estudada_7d}`);
  if (s.materia_mais_estudada_30d && s.materia_mais_estudada_30d !== s.materia_mais_estudada_7d) {
    lines.push(`Matéria mais estudada (30d): ${s.materia_mais_estudada_30d}`);
  }
  if (s.ultimo_artigo_lido) lines.push(`Último artigo lido: ${s.ultimo_artigo_lido}`);
  if (s.total_questoes_respondidas > 0) {
    lines.push(`Questões respondidas: ${s.total_questoes_respondidas} (${s.pct_acerto_geral}% acerto)`);
  }
  if (s.livros_favoritos && s.livros_favoritos.length) {
    lines.push(`Livros favoritos: ${s.livros_favoritos.join(", ")}`);
  }
  if (s.preferencia_horario_contato) lines.push(`Prefere contato no período da ${s.preferencia_horario_contato}`);
  return lines.length > 1 ? lines.join("\n") : "";
}
