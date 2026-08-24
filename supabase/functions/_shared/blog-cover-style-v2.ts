// Estilo oficial das capas do blog (espelha src/data/blogCoverStyle.json).
// Fundo PRETO puro + personagem cartoon vetorial + vestígios da cor da categoria.

export const BASE_PALETTE = {
  background: "#000000",
  skin: "#EFE0C4",
  beigeLight: "#F5E9CE",
  neutralWarm: "#C9A26A",
  brownDark: "#6B3F1D",
  outline: "#1A1004",
};

type Accent = { hex: string; name: string; hint: string };

export const THEME_ACCENTS: Record<string, Accent> = {
  "Iniciantes": { hex: "#F5C76A", name: "âmbar quente", hint: "estudante jovem, expressão curiosa, livro didático" },
  "Filosofia": { hex: "#A78BFA", name: "violeta/roxo", hint: "pensador clássico, pergaminho ou tocha" },
  "Clássicos": { hex: "#FCA5A5", name: "vermelho terroso", hint: "figura togada, coroa de louros" },
  "Classicos": { hex: "#FCA5A5", name: "vermelho terroso", hint: "figura togada, coroa de louros" },
  "STF": { hex: "#60A5FA", name: "azul institucional", hint: "ministro togado, martelo, colunata austera" },
  "STJ": { hex: "#38BDF8", name: "azul ciano", hint: "ministro do STJ, autos empilhados" },
  "Curiosidades": { hex: "#5EEAD4", name: "verde-água", hint: "figura intrigada, lupa, ponto de interrogação" },
  "Leis": { hex: "#A3B18A", name: "verde-oliva", hint: "legislador, código de leis fechado" },
  "Jurisprudência": { hex: "#F0ABFC", name: "magenta suave", hint: "juiz analisando acórdão" },
  "Direito Constitucional": { hex: "#93C5FD", name: "azul-royal", hint: "figura séria segurando a Constituição" },
  "Direito Penal": { hex: "#EF4444", name: "vermelho sangue", hint: "promotor severo, algemas ou martelo" },
  "Direito Civil": { hex: "#93C5FD", name: "azul frio", hint: "advogado civilista, contrato assinado" },
  "Direito Administrativo": { hex: "#D4D4D8", name: "cinza-aço", hint: "servidor público, carimbo" },
  "Direito do Trabalho": { hex: "#FBBF24", name: "amarelo trabalho", hint: "operário em traje formal, engrenagem" },
  "Direito Processual": { hex: "#C4B5FD", name: "violeta suave", hint: "escrivão, pilha de autos" },
  "Direito Tributário": { hex: "#6EE7B7", name: "verde-cofre", hint: "contador de terno, cofre" },
  "Carreiras Jurídicas": { hex: "#FCD34D", name: "ouro", hint: "concurseiro focado, medalha" },
  "Atualidades Jurídicas": { hex: "#7DD3FC", name: "azul jornal", hint: "jornalista jurídica, microfone" },
};

const FALLBACK: Accent = { hex: "#F5C76A", name: "âmbar quente", hint: "cena editorial vintage com objetos jurídicos" };

// Vocabulário de objetos da "cena vazada" (estilo gravura editorial vintage).
const PROP_POOL = [
  "pilha de livros antigos", "pergaminho enrolado", "colunas gregas", "vela acesa",
  "tinteiro", "pena de escrever", "balança da justiça", "relógio de bolso",
  "lupa", "cartola", "martelo de juiz", "carimbo e almofada de tinta",
  "diário oficial dobrado", "chave antiga", "globo terrestre", "ampulheta",
  "correntes e algemas", "urna de votação", "cofre metálico", "engrenagens",
  "mapa antigo", "coroa de louros", "tocha", "escrivaninha com papéis",
  "estante embutida", "candelabro", "pasta de autos amarrada com barbante",
];

// Ângulos de câmera — sorteados a cada capa para nunca repetir enquadramento.
const ANGLE_POOL = [
  "low-angle hero shot looking up at the main subject",
  "high-angle top-down view over a desk covered with the objects",
  "eye-level three-quarter view with strong depth",
  "wide establishing shot with the scene set inside an arched interior",
  "extreme close-up of the main symbol with the rest of the scene behind it",
  "dutch/tilted angle with dynamic diagonal composition",
  "over-the-shoulder view from behind a character looking at the scene",
  "side profile view, subject entering from one edge of the frame",
  "symmetrical frontal composition with the subject centered under an arch",
  "isometric-ish diagonal view of a layered stage of objects",
];

// Estruturas de composição — garantem variedade de layout.
const LAYOUT_POOL = [
  "main subject on the left third, secondary objects sweeping to the right",
  "main subject on the right third, foreground props cropped by the left edge",
  "central subject framed by an arch/columns, props radiating outward",
  "diagonal composition running from bottom-left to top-right",
  "layered horizontal bands: foreground props, mid subject, background architecture",
  "circular composition, objects orbiting the central symbol",
];

// Ambientes coloridos — a capa DEVE preencher todo o quadro (sem fundo preto vazio).
const SETTING_POOL = [
  "old law library at golden hour, warm amber light pouring through tall windows",
  "courtroom interior with deep teal shadows and brass highlights",
  "night study with candlelight, deep indigo and ember tones",
  "marble hall with cool blue-grey stone and warm sunlight patches",
  "wooden magistrate's office with rich burgundy drapes",
  "sunlit classic arcade with sand, terracotta and olive tones",
  "archive room with dusty green shelves and warm lamp glow",
  "stormy exterior of a neoclassical courthouse, dramatic sky",
];

export function getAccent(categoria?: string | null): Accent {
  if (!categoria) return FALLBACK;
  const direct = THEME_ACCENTS[categoria];
  if (direct) return direct;
  const norm = categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [k, v] of Object.entries(THEME_ACCENTS)) {
    if (k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === norm) return v;
  }
  return FALLBACK;
}

/**
 * Monta o prompt final da capa. `evitar` recebe títulos/adereços de capas
 * recentes para forçar variação de sujeito e adereço.
 */
export function buildCoverPrompt(
  titulo: string,
  categoria: string,
  evitar: string[] = [],
): string {
  const a = getAccent(categoria);
  const avoid = evitar.filter(Boolean).slice(0, 8);
  // Semente = título + categoria + aleatório, para que duas capas nunca caiam
  // no mesmo ângulo/composição/ambiente mesmo com temas parecidos.
  const seed = Math.abs(
    [...`${titulo}|${categoria}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) +
      Math.floor(Math.random() * 100000),
  );
  const pick = <T,>(pool: T[], offset: number): T => pool[(seed + offset) % pool.length];
  const angle = pick(ANGLE_POOL, 3);
  const layout = pick(LAYOUT_POOL, 11);
  const setting = pick(SETTING_POOL, 23);
  const picked: string[] = [];
  for (let i = 0; picked.length < 9 && i < PROP_POOL.length * 2; i++) {
    const p = PROP_POOL[(seed + i * 7) % PROP_POOL.length];
    if (!picked.includes(p)) picked.push(p);
  }

  return `Vintage editorial illustration for a Brazilian legal-education blog cover. 16:9 horizontal, FULL-BLEED.

THEME OF THIS COVER: "${titulo}" — category: ${categoria}. Interpretation direction: ${a.hint}.

CAMERA ANGLE (must be respected, it is what makes this cover unique): ${angle}.
COMPOSITION: ${layout}. Horizontal, asymmetric, clear hierarchy, objects overlapping naturally.
SETTING (fills the entire frame): ${setting}.

SCENE (this is the most important part): build a RICH, DETAILED illustrated scene with MANY overlapping objects, in the spirit of a classic engraving-inspired editorial illustration. NOT a single sticker, NOT a lone portrait, NOT a generic bust. Use 7 to 11 distinct objects arranged in depth layers:
- foreground: the main symbol of the theme, large and readable;
- middle: supporting props overlapping each other (stacked old books, candle, inkwell, quill, pocket watch, scales of justice, rolled parchment, gavel, stamp, keys, hourglass, files tied with string);
- background: architectural touches such as ionic/greek columns, shelves or an unfurled scroll, partially cropped by the frame.
Suggested props for THIS cover (adapt freely to the theme, drop what doesn't fit): ${picked.join(", ")}.

HUMAN FIGURE: optional. Include a single period character (19th-century scholar, jurist, magistrate, clerk) ONLY when the theme naturally calls for it, placed off-center (left or right third) and integrated into the scene. For abstract/normative themes (decrees, ordinances, hierarchy of norms, validity, procedure) prefer an OBJECT-LED scene with no person at all.

BACKGROUND / EDGE-TO-EDGE FILL (critical): the illustration MUST fill 100% of the canvas, edge to edge, corner to corner. The chosen setting is painted behind the objects with real colour, depth and atmosphere. NEVER leave black, empty, flat or unpainted areas; no cutout floating on black, no white margins, no borders, no frame, no vignette bars. Every pixel is illustrated.

STYLE: vintage illustration meets editorial vector art, engraving-inspired linework, rich shading, clean medium-thickness dark outlines (${BASE_PALETTE.outline}), cartoon realism. Highly detailed, crisp, print-quality.

PALETTE: warm, saturated and colourful — built on the sepia/amber base (#C9B58A, #A18B63, #735346, #EFE1BD, #8D775D, #3A2A22, skin ${BASE_PALETTE.skin}) but ENRICHED with the ambient colours of the chosen setting (sky, walls, drapes, light shafts). The cover must look colourful, never washed out, never grey, never monochrome black-and-beige.

CATEGORY ACCENT: ${a.hex} (${a.name}). Make it clearly dominant in the lighting and in key elements (drapes, book spines, ribbons, glass, flame glow, wax seals), around 25-35% of the artwork, so the reader recognises the category at a glance.

LIGHTING: dramatic and atmospheric, coherent with the setting — light shafts, glow, coloured bounce light, visible depth.

TEXT: allowed ONLY as a short serif title engraved on a book spine, banner or scroll (1-3 uppercase Latin words). No captions, no paragraphs, no watermark, no logo.

UNIQUENESS: this scene must NOT repeat the camera angle, composition or props of previous covers.${avoid.length ? ` Avoid repeating the subject/props of: ${avoid.join("; ")}.` : ""}

NEGATIVES: photorealistic, 3D render, blurry, neon colors, modern devices (laptops, smartphones), black or empty background, unpainted areas, borders/margins/frames, cutout sticker with a single object, generic corporate flat design, distorted hands, extra limbs, low quality.`;
}
