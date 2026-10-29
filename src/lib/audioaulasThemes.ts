/**
 * Paleta de cores predominantes por Área do Direito para as Audioaulas.
 * Extraída fielmente a partir das capas cinematográficas 3x4 oficiais.
 *
 * Exemplo:
 * - Teoria e Filosofia do Direito: Tons de Bege, Areia, Mármore clássico e Ouro suave.
 * - Direito Ambiental: Tons de Verde Floresta, Esmeralda e Natureza.
 * - Direito Penal: Tons de Vermelho Rubi e Luz de Sirene.
 * - Direito Constitucional: Verde e Ouro da Bandeira Nacional.
 * - Direito Civil: Azul Safira Crepúsculo.
 */

export interface AreaTheme {
  nome: string;
  primary: string;           // Cor principal em HEX
  primaryLight: string;      // Variante clara para títulos e destaques
  primaryDark: string;       // Variante escura para gradientes e sombras
  primaryAlpha10: string;    // rgba com 10% de opacidade
  primaryAlpha15: string;    // rgba com 15% de opacidade
  primaryAlpha25: string;    // rgba com 25% de opacidade
  primaryAlpha40: string;    // rgba com 40% de opacidade
  primaryAlpha60: string;    // rgba com 60% de opacidade
  gradientButton: string;    // Gradiente para botões de ação ("Ouvir todas")
  cardActiveBg: string;      // Fundo do card em reprodução ativa
  glowShadow: string;        // Box-shadow de brilho suave
  tagClasses: string;        // Classes Tailwind para badges e tags
}

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const criarTema = (
  nome: string,
  primary: string,
  primaryLight: string,
  primaryDark: string
): AreaTheme => ({
  nome,
  primary,
  primaryLight,
  primaryDark,
  primaryAlpha10: hexToRgba(primary, 0.1),
  primaryAlpha15: hexToRgba(primary, 0.15),
  primaryAlpha25: hexToRgba(primary, 0.25),
  primaryAlpha40: hexToRgba(primary, 0.4),
  primaryAlpha60: hexToRgba(primary, 0.6),
  gradientButton: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
  cardActiveBg: `linear-gradient(90deg, ${hexToRgba(primary, 0.25)} 0%, ${hexToRgba(primary, 0.1)} 50%, rgba(7, 11, 20, 0.6) 100%)`,
  glowShadow: `0 10px 28px -4px ${hexToRgba(primary, 0.45)}`,
  tagClasses: '',
});

// Temas oficiais correspondentes a cada uma das 22 capas do acervo
const TEMAS_AREAS: { re: RegExp; tema: AreaTheme }[] = [
  // 03. Teoria e Filosofia do Direito — Bege / Areia / Ouro Quente (Toga clássica de Sócrates/Acrópole)
  {
    re: /filosofia|teoria\s+da\s+norma|hermen[êe]utica|teoria\s+e\s+filosofia/i,
    tema: criarTema('Teoria e Filosofia do Direito', '#d4af37', '#f4e5b8', '#997d26'),
  },

  // 04. Direito Ambiental — Verde Floresta / Esmeralda Amazônica
  {
    re: /ambient/i,
    tema: criarTema('Direito Ambiental', '#10b981', '#a7f3d0', '#047857'),
  },

  // 01. Direito Penal — Vermelho Rubi / Carmim Alerta
  {
    re: /penal|crime/i,
    tema: criarTema('Direito Penal', '#ef4444', '#fca5a5', '#991b1b'),
  },

  // 14. Direito Processual Penal — Laranja Tribunal / Terracota
  {
    re: /processual\s+penal|processo\s+penal|cpp/i,
    tema: criarTema('Direito Processual Penal', '#f97316', '#fed7aa', '#c2410c'),
  },

  // 19. Lei Penal Especial — Vermelho Tático Escarlate
  {
    re: /lei\s+penal\s+especial|legisla[çc][ãa]o\s+penal\s+especial/i,
    tema: criarTema('Lei Penal Especial', '#e11d48', '#fecdd3', '#881337'),
  },

  // 02. Direito Constitucional — Verde e Dourado da Constituição
  {
    re: /constitui|cf88|crfb/i,
    tema: criarTema('Direito Constitucional', '#10b981', '#a7f3d0', '#065f46'),
  },

  // 21. Direito Civil — Azul Crepúsculo / Safira Nobre
  {
    re: /civil/i,
    tema: criarTema('Direito Civil', '#3b82f6', '#bfdbfe', '#1d4ed8'),
  },

  // 22. Direito Processual Civil — Azul Celeste Jurisdicional / Aço
  {
    re: /processual\s+civil|processo\s+civil|cpc/i,
    tema: criarTema('Direito Processual Civil', '#0ea5e9', '#bae6fd', '#0369a1'),
  },

  // 17. Direito Administrativo — Azul Corporativo / Slate Ciano
  {
    re: /administrativ/i,
    tema: criarTema('Direito Administrativo', '#0284c7', '#7dd3fc', '#075985'),
  },

  // 20. Direito Tributário — Verde Contábil / Teal Escuro
  {
    re: /tribut[aá]ri|ctn/i,
    tema: criarTema('Direito Tributário', '#0d9488', '#99f6e4', '#115e59'),
  },

  // 09. Direito do Trabalho — Violeta / Púrpura Industrial
  {
    re: /trabalh|clt/i,
    tema: criarTema('Direito do Trabalho', '#8b5cf6', '#ddd6fe', '#6d28d9'),
  },

  // 16. Direito Processual do Trabalho — Púrpura Real Audiência
  {
    re: /processual\s+do\s+trabalho|processo\s+do\s+trabalho|processo\s+trabalhista/i,
    tema: criarTema('Direito Processual do Trabalho', '#7c3aed', '#e9d5ff', '#5b21b6'),
  },

  // 12. Direito Empresarial — Azul Ciano Executivo / Vidro Corporativo
  {
    re: /empresari|comercial/i,
    tema: criarTema('Direito Empresarial', '#0284c7', '#bae6fd', '#0c4a6e'),
  },

  // 11. Direito Previdenciário — Verde Sábio Sereno
  {
    re: /previdenci[aá]ri/i,
    tema: criarTema('Direito Previdenciário', '#14b8a6', '#99f6e4', '#0f766e'),
  },

  // 15. Direito Financeiro — Ouro Riqueza / Âmbar Dourado
  {
    re: /financeir/i,
    tema: criarTema('Direito Financeiro', '#eab308', '#fef08a', '#a16207'),
  },

  // 05. Direito Urbanístico — Ciano Urbano / Planejamento
  {
    re: /urban[íi]stic/i,
    tema: criarTema('Direito Urbanístico', '#06b6d4', '#a5f3fc', '#0e7490'),
  },

  // 18. Direitos Humanos — Rosa Coral Fraterno
  {
    re: /direitos?\s+humanos?/i,
    tema: criarTema('Direitos Humanos', '#f43f5e', '#fecdd3', '#be123c'),
  },

  // 07. Direito Internacional Privado — Azul Safira Global
  {
    re: /internacional/i,
    tema: criarTema('Direito Internacional Privado', '#3b82f6', '#bfdbfe', '#1e40af'),
  },

  // 08. Direito Desportivo — Verde Esmeralda Vitória
  {
    re: /desportiv/i,
    tema: criarTema('Direito Desportivo', '#10b981', '#a7f3d0', '#047857'),
  },

  // 13. Políticas Públicas — Âmbar Cidadania / Sol Cívico
  {
    re: /pol[íi]ticas?\s+p[úu]blicas?/i,
    tema: criarTema('Políticas Públicas', '#f59e0b', '#fde68a', '#b45309'),
  },

  // 10. Português — Sépia / Bronze Clássico
  {
    re: /portugu[êe]s|l[íi]ngua\s+portuguesa/i,
    tema: criarTema('Português', '#d97706', '#fde68a', '#92400e'),
  },

  // 06. Formação Complementar — Lavanda / Inspiração
  {
    re: /forma[çc][ãa]o\s+complementar/i,
    tema: criarTema('Formação Complementar', '#a855f7', '#f3e8ff', '#7e22ce'),
  },
];

// Tema fallback padrão (Azul Tecnológico Vacatio)
const TEMA_PADRAO = criarTema('Geral', '#52525b', '#e4e4e7', '#27272a');

/**
 * Retorna o tema visual e cromático predominante de uma área do Direito.
 */
export const getAreaTheme = (area: string): AreaTheme => {
  if (!area) return TEMA_PADRAO;
  const match = TEMAS_AREAS.find((item) => item.re.test(area));
  return match ? match.tema : TEMA_PADRAO;
};
