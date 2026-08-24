// Utilitários compartilhados dos desafios determinísticos.

export type Artigo = {
  id: string;
  numero: string;
  texto: string | null;
  epigrafe?: string | null;
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Remove anotações comuns do Vade Mecum: "(Redação dada pela Lei ...)",
// "(Incluído pela Lei ...)", "(Vide ...)", "(Revogado ...)" etc.
export function limparTextoArtigo(texto: string): string {
  return texto
    .replace(/\s*\((?:Redação|Incluíd[oa]|Renumerad[oa]|Vide|Revogad[oa]|Nova redação|Alterad[oa])[^)]*\)/gi, "")
    .replace(/^\s*(?:Redação|Incluíd[oa]|Renumerad[oa]|Vide|Revogad[oa]|Nova redação|Alterad[oa])[^\n]*$/gim, "")
    .replace(/\s*[-–—]\s*(?:Redação|Incluíd[oa]|Renumerad[oa]|Vide|Revogad[oa]|Nova redação|Alterad[oa])[^\n]*/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Divide o texto do artigo em segmentos ordenados (caput + incisos + parágrafos).
export function segmentar(texto: string): string[] {
  return limparTextoArtigo(texto)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Segmenta o artigo em pelo menos `minChunks` pedaços para o "Monte o artigo".
// 1) tenta linhas; 2) se poucas, quebra por frases (. ; :); 3) por vírgulas;
// 4) por grupos de ~3 palavras. Garante montagem mesmo para caputs curtos.
export function segmentarParaMontar(texto: string, minChunks = 3): string[] {
  const base = segmentar(texto);
  if (base.length >= minChunks) return base;

  const bruto = limparTextoArtigo(texto);
  // por frases
  const frases = bruto.split(/(?<=[.;:])\s+/).map((s) => s.trim()).filter(Boolean);
  if (frases.length >= minChunks) return frases;

  // por vírgulas dentro de cada frase
  const porVirgula = frases.flatMap((f) => f.split(/,\s+/).map((p, i, arr) => (i < arr.length - 1 ? `${p},` : p).trim()));
  if (porVirgula.length >= minChunks) return porVirgula.filter(Boolean);

  // grupos de 3 palavras
  const palavras = bruto.split(/\s+/).filter(Boolean);
  const grupos: string[] = [];
  for (let i = 0; i < palavras.length; i += 3) {
    grupos.push(palavras.slice(i, i + 3).join(" "));
  }
  return grupos.length ? grupos : [bruto];
}

// Detecta incisos numerados romanos "I -", "II -", "III -" ...
export function extrairIncisos(texto: string): string[] {
  const linhas = segmentar(texto);
  return linhas.filter((l) => /^[IVX]+\s*[-–—]/.test(l));
}

// Gera pares "início da frase" ↔ "fim da frase" para o modo Ligar pares.
export type ParLigar = { esquerda: string; direita: string };
export function gerarParesLigar(texto: string): ParLigar[] {
  const bruto = limparTextoArtigo(texto);
  const frases = bruto.split(/(?<=[.;])\s+/).map((s) => s.trim()).filter((s) => s.length >= 20);
  const pares: ParLigar[] = [];
  for (const f of frases) {
    // divide em meio pela palavra do meio
    const palavras = f.split(/\s+/);
    if (palavras.length < 5) continue;
    const meio = Math.floor(palavras.length / 2);
    const esq = palavras.slice(0, meio).join(" ");
    const dir = palavras.slice(meio).join(" ");
    if (esq.length >= 8 && dir.length >= 8) pares.push({ esquerda: esq, direita: dir });
  }
  return pares.slice(0, 4);
}

// Pares de opostos simples para "caça-pegadinha".
const OPOSTOS: Record<string, string> = {
  sem: "com",
  com: "sem",
  anterior: "posterior",
  posterior: "anterior",
  poderá: "deverá",
  deverá: "poderá",
  pode: "deve",
  deve: "pode",
  devem: "podem",
  podem: "devem",
  condenado: "absolvido",
  absolvido: "condenado",
  punido: "absolvido",
  absolvida: "punida",
  punida: "absolvida",
  público: "privado",
  privado: "público",
  pública: "privada",
  privada: "pública",
  maior: "menor",
  menor: "maior",
  máximo: "mínimo",
  mínimo: "máximo",
  máxima: "mínima",
  mínima: "máxima",
  sempre: "nunca",
  nunca: "sempre",
  todos: "nenhum",
  todas: "nenhuma",
  nenhum: "todos",
  nenhuma: "todas",
  antes: "depois",
  depois: "antes",
  dentro: "fora",
  fora: "dentro",
  vedado: "permitido",
  permitido: "vedado",
  vedada: "permitida",
  permitida: "vedada",
  legal: "ilegal",
  ilegal: "legal",
  válido: "inválido",
  inválido: "válido",
  nacional: "estrangeiro",
  estrangeiro: "nacional",
  estrangeira: "brasileira",
  brasileira: "estrangeira",
  brasileiro: "estrangeiro",
  permanente: "temporária",
  temporária: "permanente",
  temporário: "permanente",
  benefício: "prejuízo",
  prejuízo: "benefício",
  beneficiar: "prejudicar",
  prejudicar: "beneficiar",
  agravante: "atenuante",
  atenuante: "agravante",
  aumentar: "diminuir",
  diminuir: "aumentar",
  aumento: "diminuição",
  diminuição: "aumento",
};

export type Pegadinha = {
  palavras: { token: string; adulterada: boolean }[];
  correta: string;
  substituta: string;
  indice: number;
};

export type TrechoPegadinha = {
  texto: string;
  rotulo: string;
};

function palavraBase(token: string): string {
  return token.replace(/[.,;:!?()"'“”‘’]/g, "").toLowerCase();
}

function temOposto(texto: string): boolean {
  return texto.split(/(\s+)/).some((tk) => Boolean(OPOSTOS[palavraBase(tk)]));
}

function rotuloDoTrecho(trecho: string, index: number): string {
  const texto = trecho.trim();
  if (/^Art\.\s*\d+/i.test(texto)) return "Caput do artigo";
  if (/^(Parágrafo\s+único|§)/i.test(texto)) return "Parágrafo";
  const inciso = texto.match(/^([IVXLCDM]+)\s*[-–—]/i);
  if (inciso) return `Inciso ${inciso[1].toUpperCase()}`;
  const alinea = texto.match(/^([a-z])\)/i);
  if (alinea) return `Alínea ${alinea[1].toLowerCase()}`;
  return index === 0 ? "Trecho inicial" : "Trecho curto";
}

function quebrarTrechoLongo(trecho: string): string[] {
  if (trecho.length <= 360) return [trecho];

  const partes = trecho.split(/(?<=[.;:])\s+/).filter(Boolean);
  if (partes.length <= 1) return [trecho.slice(0, 360).trim()];

  const grupos: string[] = [];
  let atual = "";
  partes.forEach((parte) => {
    const proximo = atual ? `${atual} ${parte}` : parte;
    if (proximo.length > 320 && atual) {
      grupos.push(atual.trim());
      atual = parte;
    } else {
      atual = proximo;
    }
  });
  if (atual.trim()) grupos.push(atual.trim());
  return grupos;
}

// Desmembra o artigo em trechos curtos: caput, parágrafos, incisos e alíneas.
export function gerarTrechosPegadinha(textoBruto: string): TrechoPegadinha[] {
  const vistos = new Set<string>();
  return segmentar(textoBruto)
    .flatMap(quebrarTrechoLongo)
    .map((texto) => texto.trim())
    .filter((texto) => texto.length >= 28 && temOposto(texto))
    .filter((texto) => {
      const chave = texto.toLowerCase();
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .map((texto, index) => ({ texto, rotulo: rotuloDoTrecho(texto, index) }));
}

// Constrói um item de Verdadeiro/Falso a partir de um trecho.
// Metade das vezes retorna o trecho original (verdadeiro); metade retorna com
// uma palavra trocada pelo oposto (falso).
export type ItemVF = {
  texto: string;
  verdadeiro: boolean;
  correta?: string;
  substituta?: string;
};

export function gerarItemVF(trecho: string): ItemVF | null {
  const base = limparTextoArtigo(trecho).trim();
  if (base.length < 28) return null;
  // 50% chance de manter verdadeiro
  if (Math.random() < 0.5) return { texto: base, verdadeiro: true };
  const p = gerarPegadinha(base);
  if (!p) return { texto: base, verdadeiro: true };
  const texto = p.palavras.map((x) => x.token).join("");
  return { texto, verdadeiro: false, correta: p.correta.trim(), substituta: p.substituta.trim() };
}

// Constrói uma "caça-pegadinha": troca 1 palavra pelo seu oposto no texto.
export function gerarPegadinha(textoBruto: string): Pegadinha | null {
  const texto = limparTextoArtigo(textoBruto);
  const tokens = texto.split(/(\s+)/); // preserva espaços e quebras
  const candidatos: number[] = [];
  tokens.forEach((tk, i) => {
    const clean = palavraBase(tk);
    if (OPOSTOS[clean]) candidatos.push(i);
  });
  if (candidatos.length === 0) return null;

  const idx = candidatos[Math.floor(Math.random() * candidatos.length)];
  const original = tokens[idx];
  const clean = palavraBase(original);
  const oposto = OPOSTOS[clean];
  // preserva capitalização e pontuação
  const wasCap = /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(original);
  const punctMatch = original.match(/[.,;:!?)]+$/);
  const punct = punctMatch ? punctMatch[0] : "";
  const substituta = (wasCap ? oposto[0].toUpperCase() + oposto.slice(1) : oposto) + punct;

  const novo = [...tokens];
  novo[idx] = substituta;

  // Emite lista de tokens ignorando os separadores (mas mantendo espaço no render)
  const palavras = novo.map((tk, i) => ({
    token: tk,
    adulterada: i === idx,
  }));

  return {
    palavras,
    correta: original,
    substituta,
    indice: idx,
  };
}
