import type { DicionarioTermo } from "@/hooks/useDicionarioJuridico";

export type CategoriaId =
  | "todas"
  | "em_alta"
  | "latins"
  | "penal"
  | "civil"
  | "constitucional"
  | "processual"
  | "trabalhista"
  | "tributario"
  | "administrativo"
  | "empresarial"
  | "consumidor"
  | "ambiental";

export interface Categoria {
  id: CategoriaId;
  label: string;
  short?: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: "todas", label: "Todas" },
  { id: "em_alta", label: "Em alta" },
  { id: "latins", label: "Latins" },
  { id: "penal", label: "Penal" },
  { id: "civil", label: "Civil" },
  { id: "constitucional", label: "Constitucional" },
  { id: "processual", label: "Processual" },
  { id: "trabalhista", label: "Trabalhista" },
  { id: "tributario", label: "Tributário" },
  { id: "administrativo", label: "Administrativo" },
  { id: "empresarial", label: "Empresarial" },
  { id: "consumidor", label: "Consumidor" },
  { id: "ambiental", label: "Ambiental" },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const LATIN_MARKERS = [
  "loc. lat", "(lat.)", "lat.", "do latim", "latim:", "expressão latina",
  "locução latina", "brocardo",
];

const LATIN_TOKENS = [
  " ipso ", " ipsa ", " ipsum ", " ex ", " ad ", " sub ", " sui ",
  " lege ", " lex ", " juris ", " iuris ", " in ", " de facto", " de jure",
  " a priori", " a posteriori", " modus ", " causa ", " actio ",
];

const AREA_RULES: Array<{ id: CategoriaId; needles: string[] }> = [
  {
    id: "penal",
    needles: ["penal", "crime", "delito", "reu ", " reu,", "acusad", "dolo", "culpa ", "tipicidade", "pena ", "prisao", "flagrante"],
  },
  {
    id: "civil",
    needles: ["civil", "contrato", "obrigac", "posse", "propriedade", "sucess", "familia", "casament", "divorc", "heranc", "usucap"],
  },
  {
    id: "constitucional",
    needles: ["constituc", "constitui", " cf ", "cf/88", "fundament", "direitos human", "clausula petrea"],
  },
  {
    id: "processual",
    needles: ["process", "recurso", "sentenc", "peticao", "audiencia", "cpc", "cpp", "juiz", "tribunal", "juizad"],
  },
  {
    id: "trabalhista",
    needles: ["trabalh", "clt", "emprega", "salario", "ferias", "fgts", "sindic", "greve", "aviso previo"],
  },
  {
    id: "tributario",
    needles: ["tribut", "imposto", "fiscal", "fazenda", "receita federal", "icms", "iptu", "issqn", "cofins"],
  },
  {
    id: "administrativo",
    needles: ["administrativ", "servidor public", "licitac", "concurso public", "administracao public", "improbidade"],
  },
  {
    id: "empresarial",
    needles: ["empresari", "comercial", "sociedade", "falenc", "recuperacao judicial", "titulo de credito", "cheque"],
  },
  {
    id: "consumidor",
    needles: ["consumidor", "cdc", "relacao de consumo", "fornecedor"],
  },
  {
    id: "ambiental",
    needles: ["ambient", "meio ambiente", "poluic", "florest", "biodiver"],
  },
];

export function isLatin(t: DicionarioTermo): boolean {
  const bodyN = norm(` ${t.significado} `);
  if (LATIN_MARKERS.some((m) => bodyN.includes(m))) return true;
  if (LATIN_TOKENS.some((tok) => bodyN.includes(tok))) return true;
  const p = norm(t.palavra).trim();
  const words = p.split(/\s+/);
  if (words.length >= 2 && /(us|um|ae|io|ii|orum|arum|is)$/.test(words[words.length - 1])) return true;
  return false;
}

export function categoriasDoTermo(t: DicionarioTermo): CategoriaId[] {
  const cats: CategoriaId[] = [];
  const body = norm(t.significado || "");
  for (const rule of AREA_RULES) {
    if (rule.needles.some((n) => body.includes(n))) cats.push(rule.id);
  }
  if (isLatin(t)) cats.push("latins");
  return cats;
}

export function categoriaMatches(t: DicionarioTermo, cat: CategoriaId, cache?: Map<string, CategoriaId[]>): boolean {
  if (cat === "todas" || cat === "em_alta") return true;
  const key = `${t.letra}|${t.palavra}`;
  let cats = cache?.get(key);
  if (!cats) {
    cats = categoriasDoTermo(t);
    cache?.set(key, cats);
  }
  return cats.includes(cat);
}

const AREA_LABEL: Record<Exclude<CategoriaId, "todas" | "em_alta" | "latins">, string> = {
  penal: "Direito Penal",
  civil: "Direito Civil",
  constitucional: "Direito Constitucional",
  processual: "Direito Processual",
  trabalhista: "Direito do Trabalho",
  tributario: "Direito Tributário",
  administrativo: "Direito Administrativo",
  empresarial: "Direito Empresarial",
  consumidor: "Direito do Consumidor",
  ambiental: "Direito Ambiental",
};

export function labelCategoria(id: CategoriaId): string {
  const c = CATEGORIAS.find((x) => x.id === id);
  return c?.label ?? id;
}

export function aplicacaoNoDireito(t: DicionarioTermo): string {
  const cats = categoriasDoTermo(t);
  const areas = cats.filter((c) => c !== "latins") as Array<keyof typeof AREA_LABEL>;
  if (areas.length === 0 && cats.includes("latins")) {
    return "Expressão de origem latina, tradicionalmente empregada em petições, decisões e doutrina para dar precisão técnica a um argumento jurídico.";
  }
  if (areas.length === 0) {
    return "Termo de uso geral no vocabulário jurídico, empregado em petições, decisões e produção doutrinária.";
  }
  const nomes = areas.map((a) => AREA_LABEL[a]);
  const lista =
    nomes.length === 1
      ? nomes[0]
      : nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
  return `Termo frequentemente empregado em ${lista}. Aparece em petições, pareceres, decisões judiciais e obras doutrinárias para descrever com precisão o instituto correspondente.`;
}

export function termosRelacionados(alvo: DicionarioTermo, todos: DicionarioTermo[], limite = 6): DicionarioTermo[] {
  const alvoCats = new Set(categoriasDoTermo(alvo));
  const palavraLower = alvo.palavra.toLowerCase();
  const scored = todos
    .filter((t) => t.palavra.toLowerCase() !== palavraLower)
    .map((t) => {
      let score = 0;
      if (t.letra === alvo.letra) score += 1;
      const cats = categoriasDoTermo(t);
      for (const c of cats) if (alvoCats.has(c)) score += 2;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((x) => x.t);
  return scored;
}
