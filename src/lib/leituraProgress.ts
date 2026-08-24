import { COLECOES } from '@/lib/bibliotecaColecoes';
import { getRecentes, type LivroSnapshot } from '@/lib/bibliotecaTracking';

export type EmProgresso = {
  snap: LivroSnapshot;
  index: number;
  total: number | null;
  totalOcr: number | null;
  updatedAt: number;
  readTimeMs: number;
  percent: number;
  etaMs: number | null;
};

export function readLeituraProgress(_tick: number): EmProgresso[] {
  if (typeof window === 'undefined') return [];

  const recentes = getRecentes();
  const colecaoById = new Map(COLECOES.map((c) => [c.id, c]));
  // Índice por qualquer nome que o leitor possa ter usado como `livroTabela`:
  // o id da coleção ("classicos"), o nome real da tabela ("biblioteca_classicos")
  // e — por segurança — a versão sem o prefixo "biblioteca_".
  const colecaoByAnyKey = new Map<string, (typeof COLECOES)[number]>();
  COLECOES.forEach((c) => {
    colecaoByAnyKey.set(c.id, c);
    colecaoByAnyKey.set(c.table, c);
    colecaoByAnyKey.set(c.table.replace(/^biblioteca_/, ''), c);
  });

  const recByKey = new Map<string, LivroSnapshot>();
  recentes.forEach((r) => {
    const cfg = colecaoById.get(r.colecaoId);
    if (!cfg) return;
    // Mesma entrada indexada pelas variações — assim o `get` mais abaixo casa
    // independentemente da forma usada no `livroTabela` da chave localStorage.
    recByKey.set(`${cfg.id}:${r.id}`, r);
    recByKey.set(`${cfg.table}:${r.id}`, r);
    recByKey.set(`${cfg.table.replace(/^biblioteca_/, '')}:${r.id}`, r);
  });

  const out: EmProgresso[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('leitura-nativa:')) continue;
    if (key === 'leitura-nativa:rail-open') continue;
    if (key.startsWith('leitura-nativa:prefs')) continue;
    if (key.startsWith('leitura-nativa:done')) continue;
    const parts = key.split(':');
    if (parts.length < 3) continue;
    const table = parts[1];
    const id = parts.slice(2).join(':');
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const index = typeof parsed?.index === 'number' ? parsed.index : 0;
      const updatedAt = Number(parsed?.updatedAt || 0);
      // Mostra a partir da 1ª página lida (index >= 0), desde que haja timestamp de leitura.
      if (index < 0 || !updatedAt) continue;
      let snap = recByKey.get(`${table}:${id}`);
      if (!snap) {
        // Fallback: reconstrói snapshot mínimo a partir do que temos.
        // Sem isso, livros abertos direto na leitura nativa (sem passar
        // pelo LivroDetailSheet naquela sessão) nunca aparecem.
        const cfg = colecaoByAnyKey.get(table);
        if (!cfg) continue;
        snap = {
          id,
          titulo: parsed?.titulo || 'Continuar leitura',
          autor: parsed?.autor || null,
          sobre: null,
          capa: parsed?.capa || null,
          link: null,
          download: null,
          area: null,
          colecaoId: cfg.id,
          at: updatedAt,
        };
      }
      const total = typeof parsed?.total === 'number' && parsed.total > 0 ? parsed.total : null;
      const totalOcr = typeof parsed?.totalOcr === 'number' && parsed.totalOcr > 0 ? parsed.totalOcr : null;
      const readTimeMs = Number(parsed?.readTimeMs || 0);
      const percent = total ? Math.min(100, Math.round(((index + 1) / total) * 100)) : 0;
      const etaMs =
        total && index > 0 && readTimeMs > 0
          ? Math.max(0, (readTimeMs / (index + 1)) * (total - index - 1))
          : null;
      out.push({ snap, index, total, totalOcr, updatedAt, readTimeMs, percent, etaMs });
    } catch { /* ignore */ }
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export function formatDuration(ms: number): string {
  if (!ms || ms < 60_000) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${s}s`;
  }
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}
