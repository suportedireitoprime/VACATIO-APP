/**
 * Favoritos e recentes dos Visuais Jurídicos (armazenamento local, por dispositivo).
 * Mesmo padrão usado no Vade Mecum: chave estável por item.
 */

const K_FAV = 'vj:favoritos';
const K_REC = 'vj:recentes';
const MAX_REC = 60;

function ler(chave: string): string[] {
  try {
    const raw = localStorage.getItem(chave);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function gravar(chave: string, valores: string[]) {
  try {
    localStorage.setItem(chave, JSON.stringify(valores));
  } catch {
    /* armazenamento indisponível — ignora */
  }
}

export const listarFavoritos = () => ler(K_FAV);
export const listarRecentes = () => ler(K_REC);

export function isFavorito(key: string) {
  return ler(K_FAV).includes(key);
}

/** Alterna o favorito e devolve o novo estado. */
export function toggleFavorito(key: string): boolean {
  const atuais = ler(K_FAV);
  const existe = atuais.includes(key);
  gravar(K_FAV, existe ? atuais.filter((k) => k !== key) : [key, ...atuais]);
  return !existe;
}

export function registrarRecente(key: string) {
  const atuais = ler(K_REC).filter((k) => k !== key);
  gravar(K_REC, [key, ...atuais].slice(0, MAX_REC));
}

/** Apaga todos os visuais antigos salvos em cache local ou histórico. */
export function limparTodosOsVisuais() {
  try {
    localStorage.removeItem(K_FAV);
    localStorage.removeItem(K_REC);
    const paraRemover: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('vj:') || k.startsWith('visual:') || k.startsWith('mapas:') || k.includes('visuais'))) {
        paraRemover.push(k);
      }
    }
    paraRemover.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignora */
  }
}

