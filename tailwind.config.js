/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        // Planilla is paper: nearly square. Only the clock panels are rounder.
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '4px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '8px',
      },
      colors: {
        // Semantic, theme-aware tokens (see src/index.css for values).
        app: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
        },
        hairline: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        carbon: {
          DEFAULT: 'rgb(var(--carbon) / <alpha-value>)',
          pink: 'rgb(var(--carbon-pink) / <alpha-value>)',
        },
        clock: {
          DEFAULT: 'rgb(var(--clock) / <alpha-value>)',
          2: 'rgb(var(--clock-2) / <alpha-value>)',
          fg: 'rgb(var(--clock-fg) / <alpha-value>)',
          muted: 'rgb(var(--clock-muted) / <alpha-value>)',
          lit: 'rgb(var(--clock-lit) / <alpha-value>)',
          flag: 'rgb(var(--clock-flag) / <alpha-value>)',
        },
        win: 'rgb(var(--win) / <alpha-value>)',
        draw: 'rgb(var(--draw) / <alpha-value>)',
        loss: 'rgb(var(--loss) / <alpha-value>)',
        board: {
          light: 'rgb(var(--board-light) / <alpha-value>)',
          dark: 'rgb(var(--board-dark) / <alpha-value>)',
          highlight: 'rgb(var(--board-highlight) / <alpha-value>)',
        },
        cat: {
          1: 'rgb(var(--cat-1) / <alpha-value>)',
          2: 'rgb(var(--cat-2) / <alpha-value>)',
          3: 'rgb(var(--cat-3) / <alpha-value>)',
          4: 'rgb(var(--cat-4) / <alpha-value>)',
          5: 'rgb(var(--cat-5) / <alpha-value>)',
          6: 'rgb(var(--cat-6) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
