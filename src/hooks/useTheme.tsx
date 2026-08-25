import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  colors: Record<string, string>;
}

function p(bg: string, fg: string, card: string, cardFg: string, primary: string, primaryFg: string, primaryLight: string, secondary: string, secondaryFg: string, muted: string, mutedFg: string, accent: string, accentFg: string, border: string, ring: string, copper: string, copperLight: string, copperDark: string): Record<string, string> {
  return {
    '--background': bg, '--foreground': fg,
    '--card': card, '--card-foreground': cardFg,
    '--popover': card, '--popover-foreground': cardFg,
    '--primary': primary, '--primary-foreground': primaryFg, '--primary-light': primaryLight,
    '--secondary': secondary, '--secondary-foreground': secondaryFg,
    '--muted': muted, '--muted-foreground': mutedFg,
    '--accent': accent, '--accent-foreground': accentFg,
    '--destructive': '0 70% 55%', '--destructive-foreground': '0 0% 100%',
    '--border': border, '--input': border, '--ring': ring,
    '--sidebar-background': bg, '--sidebar-foreground': secondaryFg,
    '--sidebar-primary': primary, '--sidebar-primary-foreground': primaryFg,
    '--sidebar-accent': muted, '--sidebar-accent-foreground': secondaryFg,
    '--sidebar-border': border, '--sidebar-ring': ring,
    '--copper': copper, '--copper-light': copperLight, '--copper-dark': copperDark,
    '--gold-accent': '45 65% 62%',
  };
}

// Paleta escura padrão — Limão & Antracite
const DARK_PALETTE: ThemePalette = {
  id: 'limao-antracite',
  name: 'Limão & Antracite',
  description: 'Amarelo limão vibrante com cinza antracite profundo',
  colors: p('55 8% 5%','55 5% 91%','55 6% 9%','55 5% 91%','55 85% 58%','55 30% 8%','55 85% 58%','55 4% 14%','55 5% 85%','55 4% 11%','55 12% 54%','55 85% 58%','55 30% 8%','55 6% 20%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// Paleta clara — Marfim & Grafite (papel quente, WCAG AA)
const LIGHT_PALETTE: ThemePalette = {
  id: 'marfim-grafite',
  name: 'Marfim & Grafite',
  description: 'Papel marfim com grafite elegante e mostarda vibrante',
  colors: p(
    '40 25% 96%',   // background — off-white marfim
    '220 15% 15%',  // foreground — grafite
    '0 0% 100%',    // card — branco puro (elevação)
    '220 15% 15%',  // card-foreground
    '45 90% 42%',   // primary — mostarda AA em fundo claro
    '0 0% 100%',    // primary-foreground — branco
    '48 95% 55%',   // primary-light
    '40 15% 92%',   // secondary — sand claro
    '220 15% 20%',  // secondary-foreground
    '40 15% 92%',   // muted
    '220 8% 42%',   // muted-foreground
    '45 88% 45%',   // accent — mostarda
    '0 0% 100%',    // accent-foreground
    '40 10% 86%',   // border
    '45 90% 42%',   // ring
    '45 85% 40%',   // copper
    '48 95% 55%',   // copper-light
    '45 75% 32%',   // copper-dark
  ),
};


// 1. Limão & Ônix (OLED)
const LIMAO_ONIX: ThemePalette = {
  id: 'limao-onix', name: 'Limão & Ônix', description: 'Fundo preto puro perfeito para telas OLED',
  colors: p('0 0% 0%','0 0% 95%','0 0% 4%','0 0% 95%','55 85% 58%','55 30% 8%','55 85% 58%','0 0% 8%','0 0% 85%','0 0% 6%','0 0% 55%','55 85% 58%','55 30% 8%','0 0% 12%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 2. Limão & Ardósia (Slate)
const LIMAO_ARDOSIA: ThemePalette = {
  id: 'limao-ardosia', name: 'Limão & Ardósia', description: 'Cinza escuro azulado com amarelo limão',
  colors: p('215 15% 9%','215 10% 91%','215 15% 13%','215 10% 91%','55 85% 58%','55 30% 8%','55 85% 58%','215 15% 18%','215 10% 85%','215 15% 12%','215 10% 55%','55 85% 58%','55 30% 8%','215 15% 24%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 3. Limão & Zinco (Zinc)
const LIMAO_ZINCO: ThemePalette = {
  id: 'limao-zinco', name: 'Limão & Zinco', description: 'Cinza chumbo industrial clássico',
  colors: p('240 5% 10%','240 5% 91%','240 5% 14%','240 5% 91%','55 85% 58%','55 30% 8%','55 85% 58%','240 5% 18%','240 5% 85%','240 5% 12%','240 5% 55%','55 85% 58%','55 30% 8%','240 5% 24%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 4. Limão & Asfalto (Neutral)
const LIMAO_ASFALTO: ThemePalette = {
  id: 'limao-asfalto', name: 'Limão & Asfalto', description: 'Cinza escuro neutro super limpo',
  colors: p('0 0% 10%','0 0% 91%','0 0% 14%','0 0% 91%','55 85% 58%','55 30% 8%','55 85% 58%','0 0% 18%','0 0% 85%','0 0% 12%','0 0% 55%','55 85% 58%','55 30% 8%','0 0% 24%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 5. Limão & Meia-noite (Midnight)
const LIMAO_MEIANOITE: ThemePalette = {
  id: 'limao-meianoite', name: 'Limão & Meia-noite', description: 'Azul marinho ultra profundo e elegante',
  colors: p('230 25% 8%','230 15% 91%','230 25% 12%','230 15% 91%','55 85% 58%','55 30% 8%','55 85% 58%','230 25% 16%','230 15% 85%','230 25% 10%','230 15% 55%','55 85% 58%','55 30% 8%','230 25% 22%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 6. Limão & Obsidiana (Obsidian)
const LIMAO_OBSIDIANA: ThemePalette = {
  id: 'limao-obsidiana', name: 'Limão & Obsidiana', description: 'Tons de roxo escuro acinzentado luxuoso',
  colors: p('270 10% 8%','270 10% 91%','270 10% 12%','270 10% 91%','55 85% 58%','55 30% 8%','55 85% 58%','270 10% 16%','270 10% 85%','270 10% 10%','270 10% 55%','55 85% 58%','55 30% 8%','270 10% 22%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 7. Limão & Café (Coffee)
const LIMAO_CAFE: ThemePalette = {
  id: 'limao-cafe', name: 'Limão & Café', description: 'Marrom escuro intenso e sofisticado',
  colors: p('20 15% 8%','20 15% 91%','20 15% 12%','20 15% 91%','55 85% 58%','55 30% 8%','55 85% 58%','20 15% 16%','20 15% 85%','20 15% 10%','20 15% 55%','55 85% 58%','55 30% 8%','20 15% 22%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 8. Limão & Floresta (Forest)
const LIMAO_FLORESTA: ThemePalette = {
  id: 'limao-floresta', name: 'Limão & Floresta', description: 'Verde musgo muito escuro quase cinza',
  colors: p('150 10% 8%','150 10% 91%','150 10% 12%','150 10% 91%','55 85% 58%','55 30% 8%','55 85% 58%','150 10% 16%','150 10% 85%','150 10% 10%','150 10% 55%','55 85% 58%','55 30% 8%','150 10% 22%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 9. Limão & Chumbo (Cool Gray)
const LIMAO_CHUMBO: ThemePalette = {
  id: 'limao-chumbo', name: 'Limão & Chumbo', description: 'Cinza metálico com leve tom azul claro',
  colors: p('200 10% 12%','200 10% 91%','200 10% 16%','200 10% 91%','55 85% 58%','55 30% 8%','55 85% 58%','200 10% 20%','200 10% 85%','200 10% 14%','200 10% 55%','55 85% 58%','55 30% 8%','200 10% 28%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};

// 10. Limão & Basalto (Stone)
const LIMAO_BASALTO: ThemePalette = {
  id: 'limao-basalto', name: 'Limão & Basalto', description: 'Cinza quente com toque de natureza e pedra',
  colors: p('30 5% 10%','30 5% 91%','30 5% 14%','30 5% 91%','55 85% 58%','55 30% 8%','55 85% 58%','30 5% 18%','30 5% 85%','30 5% 12%','30 5% 55%','55 85% 58%','55 30% 8%','30 5% 24%','55 30% 8%','55 85% 58%','55 85% 58%','55 8% 60%'),
};


const PALETTES: ThemePalette[] = [
  DARK_PALETTE, 
  LIMAO_ONIX,
  LIMAO_ARDOSIA,
  LIMAO_ZINCO,
  LIMAO_ASFALTO,
  LIMAO_MEIANOITE,
  LIMAO_OBSIDIANA,
  LIMAO_CAFE,
  LIMAO_FLORESTA,
  LIMAO_CHUMBO,
  LIMAO_BASALTO,
  LIGHT_PALETTE
];
const STORAGE_KEY = 'vademecum-theme';

interface ThemeContextType {
  currentTheme: string;
  setTheme: (id: string) => void;
  palettes: ThemePalette[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: DARK_PALETTE.id,
  setTheme: () => {},
  palettes: PALETTES,
});

function applyTheme(palette: ThemePalette) {
  const root = document.documentElement;
  Object.entries(palette.colors).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
  // toggle .light class for any tailwind/css that keys off it
  if (palette.id === LIGHT_PALETTE.id) {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && PALETTES.find((p) => p.id === saved)) return saved;
    } catch {}
    return DARK_PALETTE.id;
  });

  useEffect(() => {
    const palette = PALETTES.find((p) => p.id === currentTheme) || DARK_PALETTE;
    applyTheme(palette);
    try {
      localStorage.setItem(STORAGE_KEY, palette.id);
    } catch {}
  }, [currentTheme]);

  const setTheme = (id: string) => {
    if (PALETTES.find((p) => p.id === id)) setCurrentTheme(id);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, palettes: PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}


export function useTheme() {
  return useContext(ThemeContext);
}
