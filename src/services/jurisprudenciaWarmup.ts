// Warmup para Jurisprudência: no boot idle, hidrata IDB → memória para as listas
// (Súmulas STF/STJ/Vinculantes, Pesquisas Prontas STF/STJ, Informativos STJ/STF)
// e dispara revalidação em background. Assim o toque na aba abre instantâneo.
import { fetchSumulas, warmSumulasFromIDB } from '@/services/sumulasService';
import { fetchPesquisasProntas, warmPesquisasProntasFromIDB } from '@/services/pesquisasProntasService';
import { fetchEdicoes, warmEdicoesFromIDB } from '@/services/informativosService';
import { fetchTesesEdicoes, warmTesesEdicoesFromIDB } from '@/services/tesesService';

let started = false;

export function warmupJurisprudencia(): void {
  if (started) return;
  started = true;

  const sumulasIds = ['STF_VINCULANTE', 'STF', 'STJ'] as const;
  const tribunais = ['STF', 'STJ'] as const;

  // 1) Aquece memória a partir do IDB (barato).
  Promise.allSettled([
    ...sumulasIds.map((t) => warmSumulasFromIDB(t)),
    ...tribunais.map((t) => warmPesquisasProntasFromIDB(t)),
    ...tribunais.map((t) => warmEdicoesFromIDB(t)),
    ...tribunais.map((t) => warmTesesEdicoesFromIDB(t)),
  ]).then(() => {
    // 2) Dispara revalidação SWR em segundo plano.
    sumulasIds.forEach((t) => { void fetchSumulas(t).catch(() => {}); });
    tribunais.forEach((t) => {
      void fetchPesquisasProntas(t).catch(() => {});
      void fetchEdicoes(t).catch(() => {});
      void fetchTesesEdicoes(t).catch(() => {});
    });
  });
}