// Helpers para ler/formatar horus_user_stats em texto pronto para o prompt.

export type HorusUserStats = {
  telefone: string;
  user_id: string | null;
  nome_preferido: string | null;
  plano_atual: string | null;
  plano_expira_em: string | null;
  ultima_atividade_em: string | null;
  dias_streak_estudo: number | null;
  materia_mais_estudada_7d: string | null;
  materia_mais_estudada_30d: string | null;
  ultimas_buscas: Array<{ termo: string; quando?: string }> | null;
  ultimo_artigo_lido: string | null;
  ultimo_resumo_visto: string | null;
  total_questoes_respondidas: number | null;
  pct_acerto_geral: number | null;
  livros_favoritos: string[] | null;
  preferencia_horario_contato: string | null;
  contexto_formatado: string | null;
};

export async function loadUserStatsByPhone(admin: any, phone: string): Promise<HorusUserStats | null> {
  if (!phone) return null;
  const { data } = await admin
    .from("horus_user_stats")
    .select("*")
    .eq("telefone", phone)
    .maybeSingle();
  return (data as HorusUserStats) || null;
}

export function formatStatsBlock(stats: HorusUserStats | null): string {
  if (!stats) return "";
  if (stats.contexto_formatado) return stats.contexto_formatado;
  const lines: string[] = ["[CONTEXTO DO ALUNO]"];
  if (stats.nome_preferido) lines.push(`Nome: ${stats.nome_preferido}`);
  if (stats.plano_atual) {
    const exp = stats.plano_expira_em ? ` (expira em ${new Date(stats.plano_expira_em).toLocaleDateString("pt-BR")})` : "";
    lines.push(`Plano: ${stats.plano_atual}${exp}`);
  }
  if (stats.dias_streak_estudo && stats.dias_streak_estudo > 0) {
    lines.push(`Sequência de estudo: ${stats.dias_streak_estudo} dia(s)`);
  }
  if (stats.materia_mais_estudada_7d) lines.push(`Matéria mais estudada (7d): ${stats.materia_mais_estudada_7d}`);
  if (stats.ultimo_artigo_lido) lines.push(`Último artigo lido: ${stats.ultimo_artigo_lido}`);
  if (stats.ultimo_resumo_visto) lines.push(`Último resumo visto: ${stats.ultimo_resumo_visto}`);
  if (stats.ultimas_buscas && stats.ultimas_buscas.length > 0) {
    const termos = stats.ultimas_buscas.slice(0, 3).map((b) => b.termo).filter(Boolean).join(", ");
    if (termos) lines.push(`Últimas buscas: ${termos}`);
  }
  if (stats.total_questoes_respondidas && stats.total_questoes_respondidas > 0) {
    lines.push(`Questões respondidas: ${stats.total_questoes_respondidas} (${stats.pct_acerto_geral ?? 0}% acerto)`);
  }
  if (stats.ultima_atividade_em) {
    lines.push(`Última atividade no app: ${new Date(stats.ultima_atividade_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  }
  if (lines.length === 1) return "";
  return lines.join("\n");
}
