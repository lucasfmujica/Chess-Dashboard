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
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
        hairline: 'rgb(var(--border) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
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
