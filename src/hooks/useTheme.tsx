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


const PALETTES: ThemePalette[] = [DARK_PALETTE, LIGHT_PALETTE];
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
