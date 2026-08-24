import capa1 from './capa-1.webp';
import capa2 from './capa-2.webp';
import capa3 from './capa-3.webp';

export type PessoalCover = {
  id: string;
  label: string;
  src: string;
  /** Miniatura embutida (base64, ~1KB) para paint imediato enquanto a capa carrega. */
  lqip: string;
};

const LQIP_1 =
  'data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAADwAwCdASogABIAPt1mp1AopaMiqAqpEBuJbACsLwAA6U7TrIg7tB6AAP7nH1Ll2Du9iQTIsFFn7G9aTSRW8W8pDXz9/7j2QhlELBuLorDas6LlLIQfXxFqD8/hj6NQO4BDzz5F++kaZ1shpqA/et2lM5mO1/0NaJfgrv8J3USg4KwA';
const LQIP_2 =
  'data:image/webp;base64,UklGRugAAABXRUJQVlA4INwAAACwBQCdASogABIAPt1cpkyopSOiMAgBEBuJbACdDiIN5GRoAmhBGLbJ8rxrxAwDy48eL4cLg+wA/up6SxzWwOqLEFWf0k4Y4zcW5OJq6z5GBSLbsut5Jqu+cdHxe3lLPCWpl/5IHrg9/Q1s/YB36Q9f9RqhYGwBJTrZP8YSxItuS7iTKZjAnbcEq2B8UEDI0dgJarihQL/n1VzCJ5oJk0c7WPS3Js3FXiwCuN6l2X8f3e5cQpJ2/6/xAPJVyt0rELNOWUpUEF4N5shSK2dj4A4HmNhfPyS8+Q3rSQAA';
const LQIP_3 =
  'data:image/webp;base64,UklGRuAAAABXRUJQVlA4INQAAABwBQCdASogABIAPt1cpUyopSOiMAgBEBuJaACsM2QlvRf7AsM9+zkRGahXZOCAyuUxYcAAAP7zdot19xwwxFG13W38d1lL1kJUwgQe3kYMqMzKyCJGdK/HIl3fTm7McKDuUChzFb1EMr9htdqZTjH4XS4xemZ82QgU+UN4flpZqbpGdhLFIfk/uMcB/Z9KEBloqO8wTLqYVLlixYN6CoxC2ZxrsYD2/rsBF4xBgmhBzew/OUq2s4K1I1egoyFyD2um9V71W7KlCNSC9rIx6CBdVJUAAA==';

export const PESSOAL_COVERS: PessoalCover[] = [
  { id: 'capa1', label: 'Balança & livros', src: capa1, lqip: LQIP_1 },
  { id: 'capa2', label: 'Templo do Direito', src: capa2, lqip: LQIP_2 },
  { id: 'capa3', label: 'Estudante', src: capa3, lqip: LQIP_3 },
];

function getCover(id: string | null | undefined): PessoalCover {
  return PESSOAL_COVERS.find((c) => c.id === id) ?? PESSOAL_COVERS[0];
}

export function getCoverSrc(id: string | null | undefined): string {
  return getCover(id).src;
}

export function getCoverLqip(id: string | null | undefined): string {
  return getCover(id).lqip;
}

const preloaded = new Set<string>();

/** Aquece o cache HTTP da capa (chamado no prefetch do Meu Espaço). */
export function preloadCover(id: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const src = getCoverSrc(id);
  if (preloaded.has(src)) return;
  preloaded.add(src);
  try {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    (link as any).fetchPriority = 'high';
    document.head.appendChild(link);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  } catch { /* noop */ }
}
