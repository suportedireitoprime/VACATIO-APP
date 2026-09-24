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
    '--gold-accent': '348 80% 50%',
  };
}

// Paleta escura padrão — Rubro & Antracite (Direito Prime)
const DARK_PALETTE: ThemePalette = {
  id: 'limao-antracite',
  name: 'Rubro & Antracite',
  description: 'Vermelho intenso com cinza antracite profundo',
  colors: p('0 0% 5%','0 0% 98%','0 0% 12%','0 0% 98%','348 80% 50%','0 0% 100%','348 80% 60%','0 0% 18%','0 0% 96%','0 0% 14%','0 0% 62%','348 80% 50%','0 0% 100%','0 0% 20%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// Paleta clara — Marfim & Grafite (papel quente, WCAG AA)
const LIGHT_PALETTE: ThemePalette = {
  id: 'marfim-grafite',
  name: 'Marfim & Grafite',
  description: 'Papel marfim com grafite elegante e vermelho vibrante',
  colors: p(
    '0 15% 96%',    // background — off-white marfim
    '220 15% 15%',  // foreground — grafite
    '0 0% 100%',    // card — branco puro (elevação)
    '220 15% 15%',  // card-foreground
    '348 80% 50%',    // primary — vermelho AA em fundo claro
    '0 0% 100%',    // primary-foreground — branco
    '348 80% 60%',    // primary-light
    '0 12% 92%',    // secondary
    '220 15% 20%',  // secondary-foreground
    '0 12% 92%',    // muted
    '220 8% 42%',   // muted-foreground
    '348 80% 50%',    // accent
    '0 0% 100%',    // accent-foreground
    '0 8% 86%',     // border
    '348 80% 50%',    // ring
    '348 80% 50%',    // copper
    '348 80% 60%',    // copper-light
    '350 70% 22%',    // copper-dark
  ),
};

// 1. Rubro & Ônix (OLED)
const LIMAO_ONIX: ThemePalette = {
  id: 'limao-onix', name: 'Rubro & Ônix', description: 'Fundo preto puro perfeito para telas OLED',
  colors: p('0 0% 0%','0 0% 95%','0 0% 4%','0 0% 95%','348 80% 50%','0 0% 100%','348 80% 60%','0 0% 8%','0 0% 85%','0 0% 6%','0 0% 55%','348 80% 50%','0 0% 100%','0 0% 12%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 2. Rubro & Ardósia (Slate)
const LIMAO_ARDOSIA: ThemePalette = {
  id: 'limao-ardosia', name: 'Rubro & Ardósia', description: 'Cinza escuro azulado com vermelho rubro',
  colors: p('215 15% 9%','215 10% 91%','215 15% 13%','215 10% 91%','348 80% 50%','0 0% 100%','348 80% 60%','215 15% 18%','215 10% 85%','215 15% 12%','215 10% 55%','348 80% 50%','0 0% 100%','215 15% 24%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 3. Rubro & Zinco (Zinc)
const LIMAO_ZINCO: ThemePalette = {
  id: 'limao-zinco', name: 'Rubro & Zinco', description: 'Cinza chumbo industrial clássico',
  colors: p('240 5% 10%','240 5% 91%','240 5% 14%','240 5% 91%','348 80% 50%','0 0% 100%','348 80% 60%','240 5% 18%','240 5% 85%','240 5% 12%','240 5% 55%','348 80% 50%','0 0% 100%','240 5% 24%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 4. Rubro & Asfalto (Neutral)
const LIMAO_ASFALTO: ThemePalette = {
  id: 'limao-asfalto', name: 'Rubro & Asfalto', description: 'Cinza escuro neutro super limpo',
  colors: p('0 0% 10%','0 0% 91%','0 0% 14%','0 0% 91%','348 80% 50%','0 0% 100%','348 80% 60%','0 0% 18%','0 0% 85%','0 0% 12%','0 0% 55%','348 80% 50%','0 0% 100%','0 0% 24%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 5. Rubro & Meia-noite (Midnight)
const LIMAO_MEIANOITE: ThemePalette = {
  id: 'limao-meianoite', name: 'Rubro & Meia-noite', description: 'Azul marinho ultra profundo e elegante',
  colors: p('230 25% 8%','230 15% 91%','230 25% 12%','230 15% 91%','348 80% 50%','0 0% 100%','348 80% 60%','230 25% 16%','230 15% 85%','230 25% 10%','230 15% 55%','348 80% 50%','0 0% 100%','230 25% 22%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 6. Rubro & Obsidiana (Obsidian)
const LIMAO_OBSIDIANA: ThemePalette = {
  id: 'limao-obsidiana', name: 'Rubro & Obsidiana', description: 'Tons de roxo escuro acinzentado luxuoso',
  colors: p('270 10% 8%','270 10% 91%','270 10% 12%','270 10% 91%','348 80% 50%','0 0% 100%','348 80% 60%','270 10% 16%','270 10% 85%','270 10% 10%','270 10% 55%','348 80% 50%','0 0% 100%','270 10% 22%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 7. Rubro & Café (Coffee)
const LIMAO_CAFE: ThemePalette = {
  id: 'limao-cafe', name: 'Rubro & Café', description: 'Marrom escuro intenso e sofisticado',
  colors: p('20 15% 8%','20 15% 91%','20 15% 12%','20 15% 91%','348 80% 50%','0 0% 100%','348 80% 60%','20 15% 16%','20 15% 85%','20 15% 10%','20 15% 55%','348 80% 50%','0 0% 100%','20 15% 22%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 8. Rubro & Floresta (Forest)
const LIMAO_FLORESTA: ThemePalette = {
  id: 'limao-floresta', name: 'Rubro & Floresta', description: 'Verde musgo muito escuro quase cinza',
  colors: p('150 10% 8%','150 10% 91%','150 10% 12%','150 10% 91%','348 80% 50%','0 0% 100%','348 80% 60%','150 10% 16%','150 10% 85%','150 10% 10%','150 10% 55%','348 80% 50%','0 0% 100%','150 10% 22%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 9. Rubro & Chumbo (Cool Gray)
const LIMAO_CHUMBO: ThemePalette = {
  id: 'limao-chumbo', name: 'Rubro & Chumbo', description: 'Cinza metálico com leve tom azul claro',
  colors: p('200 10% 12%','200 10% 91%','200 10% 16%','200 10% 91%','348 80% 50%','0 0% 100%','348 80% 60%','200 10% 20%','200 10% 85%','200 10% 14%','200 10% 55%','348 80% 50%','0 0% 100%','200 10% 28%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
};

// 10. Rubro & Basalto (Stone)
const LIMAO_BASALTO: ThemePalette = {
  id: 'limao-basalto', name: 'Rubro & Basalto', description: 'Cinza quente com toque de natureza e pedra',
  colors: p('30 5% 10%','30 5% 91%','30 5% 14%','30 5% 91%','348 80% 50%','0 0% 100%','348 80% 60%','30 5% 18%','30 5% 85%','30 5% 12%','30 5% 55%','348 80% 50%','0 0% 100%','30 5% 24%','348 80% 50%','348 80% 50%','348 80% 60%','350 70% 22%'),
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
  currentTheme: LIMAO_MEIANOITE.id,
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
    return LIMAO_MEIANOITE.id;
  });

  useEffect(() => {
    const palette = PALETTES.find((p) => p.id === currentTheme) || LIMAO_MEIANOITE;
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
