// Mensagens criativas para lembrete de leitura.
// Placeholders suportados: {nome} {livro} {pag}
export type EstiloMsg = 'padrao' | 'motivacional' | 'bem_humorado' | 'zen';

const POOL: Record<EstiloMsg, { title: string; body: string }[]> = {
  padrao: [
    { title: '📖 Hora de ler', body: 'Ei {nome}, {livro} está te esperando. Só 10 minutos hoje já contam.' },
    { title: '📚 Sua sessão de leitura', body: 'Retome de onde parou em {livro}. Página {pag}.' },
    { title: '📕 Lembrete de leitura', body: 'Pequenas doses diárias formam grandes leitores. Bora, {nome}?' },
  ],
  motivacional: [
    { title: '🔥 Não quebra o ritmo', body: '{nome}, você parou na página {pag}. Vamos manter a chama acesa!' },
    { title: '💪 Foco total', body: '15 minutos em {livro} agora valem por 1 hora amanhã.' },
    { title: '🚀 Uma página por vez', body: 'Cada linha de {livro} te aproxima do próximo nível.' },
  ],
  bem_humorado: [
    { title: '👀 Cadê você?', body: '{livro} tá aqui olhando a hora. Não deixa ele no vácuo, {nome}.' },
    { title: '🍿 Sessão premium', body: 'Trocou o livro pelo TikTok de novo? Vem, {livro} tá bom demais.' },
    { title: '😴 Antes de dormir', body: '5 páginas de {livro} agora ou vai ficar rolando no feed até 3h?' },
  ],
  zen: [
    { title: '🌙 Momento seu', body: 'Respira. Abre {livro}. Só você e a página.' },
    { title: '🍃 Pausa consciente', body: 'Silencia o mundo por 10 minutos com {livro}.' },
    { title: '✨ Ritual diário', body: 'Uma xícara, {livro} e você. Como combinamos.' },
  ],
};

function renderTemplate(t: string, ctx: Record<string, string | number | undefined>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] !== undefined && ctx[k] !== null ? String(ctx[k]) : ''))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

// Seed baseado no dia para não repetir seguido
function daySeed() {
  const d = new Date();
  return d.getUTCFullYear() * 1000 + Math.floor(d.getTime() / 86400000);
}

export function pickMensagem(
  estilo: EstiloMsg,
  ctx: { nome?: string; livro?: string; pag?: number | string }
) {
  const pool = POOL[estilo] || POOL.padrao;
  const idx = daySeed() % pool.length;
  const raw = pool[idx];
  const full = {
    nome: (ctx.nome || 'você').split(' ')[0],
    livro: ctx.livro || 'seu livro',
    pag: ctx.pag ?? '—',
  };
  return {
    title: renderTemplate(raw.title, full),
    body: renderTemplate(raw.body, full),
  };
}

export const ESTILOS: { id: EstiloMsg; label: string; hint: string }[] = [
  { id: 'padrao', label: 'Padrão', hint: 'Direto ao ponto' },
  { id: 'motivacional', label: 'Motivacional', hint: 'Empurrãozinho firme' },
  { id: 'bem_humorado', label: 'Bem-humorado', hint: 'Com tom leve' },
  { id: 'zen', label: 'Zen', hint: 'Calmo e ritualístico' },
];
