import type { Config } from "tailwindcss";

// Escala amarela pivotando em #F7D945 (HSL 50 92% 62%)
const YELLOW = {
  50:  "hsl(50 100% 96%)",
  100: "hsl(50 95% 88%)",
  200: "hsl(50 95% 80%)",
  300: "hsl(50 94% 72%)",
  400: "hsl(50 93% 66%)",
  500: "hsl(50 92% 62%)",
  600: "hsl(48 85% 52%)",
  700: "hsl(45 80% 42%)",
  800: "hsl(42 75% 32%)",
  900: "hsl(40 70% 22%)",
  950: "hsl(38 65% 14%)",
};

// Escala cinza neutra pivotando em #212121 (HSL 0 0% 13%)
const GRAY = {
  50:  "hsl(0 0% 96%)",
  100: "hsl(0 0% 90%)",
  200: "hsl(0 0% 80%)",
  300: "hsl(0 0% 68%)",
  400: "hsl(0 0% 55%)",
  500: "hsl(0 0% 42%)",
  600: "hsl(0 0% 28%)",
  700: "hsl(0 0% 22%)",
  800: "hsl(0 0% 16%)",
  900: "hsl(0 0% 13%)",
  950: "hsl(0 0% 8%)",
};

const MONO_COLOR_ALIASES = {
  // Quentes -> amarelo
  amber: YELLOW, yellow: YELLOW, orange: YELLOW, rose: YELLOW,
  red: YELLOW, pink: YELLOW, fuchsia: YELLOW, lime: YELLOW,
  // Frios/neutros -> cinza
  sky: GRAY, blue: GRAY, indigo: GRAY, violet: GRAY, purple: GRAY,
  cyan: GRAY, teal: GRAY, emerald: GRAY, green: GRAY,
  stone: GRAY, slate: GRAY, zinc: GRAY, neutral: GRAY, gray: GRAY,
};

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', '"Barlow Condensed"', 'system-ui', 'sans-serif'],
        body: ['"Barlow"', 'system-ui', 'sans-serif'],
        legal: ['"Barlow"', 'Georgia', 'serif'],
      },
      colors: {
        ...MONO_COLOR_ALIASES,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        copper: {
          DEFAULT: "hsl(var(--copper))",
          light: "hsl(var(--copper-light))",
          dark: "hsl(var(--copper-dark))",
        },
        signature: "hsl(var(--signature))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%) skewX(-20deg)" },
          "100%": { transform: "translateX(200%) skewX(-20deg)" },
        },
        shinePratique: {
          "0%, 100%": { left: "-100%" },
          "50%": { left: "100%" },
        },
        "letter-slide": {
          "0%":   { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "underline-draw": {
          "0%":   { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "pulse-hazard": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(51 100% 50% / 0.6)" },
          "50%":      { boxShadow: "0 0 0 12px hsl(51 100% 50% / 0)" },
        },
        waveform: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%":      { transform: "scaleY(1)" },
        },
        "cascade-in": {
          "0%":   { opacity: "0", transform: "translateY(14px) scale(0.985)" },
          "60%":  { opacity: "1" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "letter-slide": "letter-slide 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        ticker: "ticker 30s linear infinite",
        "underline-draw": "underline-draw 0.6s ease-out both",
        "pulse-hazard": "pulse-hazard 2s ease-in-out infinite",
        waveform: "waveform 1.1s ease-in-out infinite",
        "cascade-in": "cascade-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
