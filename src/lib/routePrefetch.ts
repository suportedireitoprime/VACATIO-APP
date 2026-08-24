// Centralized prefetchable route imports for the 4 hero shortcuts.
// Sharing the same import() factory between React.lazy and idle/hover prefetch
// ensures the browser/bundler cache is hit — Suspense resolves without a
// visible fallback.

export const routePrefetch = {
  radares:  () => import("@/pages/Radares.tsx"),
  boletins: () => import("@/pages/BoletinsJuridicos.tsx"),
  noticias: () => import("@/pages/Noticias.tsx"),
  locais:   () => import("@/pages/LocaisJuridicos.tsx"),
  desktop:  () => import("@/pages/DesktopPromo.tsx"),
  blog:     () => import("@/pages/Blog.tsx"),
  biblioteca: () => import("@/pages/Bibliotecas.tsx"),
  assistenteHorus: () => import("@/pages/AssistenteHorus.tsx"),
  resumosJuridicos: () => import("@/pages/resumos-juridicos/ResumosJuridicosAreas.tsx"),
  modoOffline: () => import("@/pages/ModoOffline.tsx"),
  tematica: () => import("@/pages/TematicaJuridica.tsx"),
  estudos: () => import("@/pages/Estudar.tsx"),
  ferramentas: () => import("@/pages/Ferramentas.tsx"),
  pessoal: () => import("@/pages/pessoal/Avisos.tsx"),
  perfil: () => import("@/pages/Perfil.tsx"),
  aprender: () => import("@/pages/Aprender.tsx"),
  peticaoInicial: () => import("@/pages/PeticaoInicial.tsx"),
  dicionario: () => import("@/pages/DicionarioJuridicoPage.tsx"),
  radar360: () => import("@/pages/Radar360.tsx"),
  newsletter: () => import("@/pages/Newsletter.tsx"),
  gravarAula: () => import("@/pages/AnotacoesAudio.tsx"),
  categoriaAprender: () => import("@/pages/CategoriaAprender.tsx"),
  aprenderAula: () => import("@/pages/AprenderAula.tsx"),
  praticar: () => import("@/pages/Praticar.tsx"),
  jurisprudencia: () => import("@/pages/Jurisprudencia.tsx"),
  sumulasTribunal: () => import("@/pages/SumulasTribunal.tsx"),
  pesquisasProntasLista: () => import("@/pages/PesquisasProntasLista.tsx"),
  pesquisasProntasTema: () => import("@/pages/PesquisasProntasTema.tsx"),
  informativosTribunal: () => import("@/pages/InformativosTribunal.tsx"),
  tesesTribunal: () => import("@/pages/TesesTribunal.tsx"),
} as const;

export type PrefetchKey = keyof typeof routePrefetch;

let idleScheduled = false;

/** Prefetches all main navigation chunks after the browser is idle. */
export function prefetchHeroRoutesIdle(): void {
  if (idleScheduled || typeof window === "undefined") return;
  idleScheduled = true;
  const run = () => {
    // Dispara todas em paralelo — o browser dedupe e o bundler
    // já entrega em chunks separados, então cada uma carrega rapidamente.
    for (const key of Object.keys(routePrefetch) as PrefetchKey[]) {
      try { routePrefetch[key](); } catch { /* noop */ }
    }
  };
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout?: number }) => number)
    | undefined;
  if (ric) ric(run, { timeout: 2500 });
  else setTimeout(run, 800);
}

/** Fires a single route prefetch (safe to call repeatedly — dedup by browser). */
export function prefetchRoute(key: PrefetchKey): void {
  try { routePrefetch[key](); } catch { /* noop */ }
}
