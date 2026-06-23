export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        'bg-subtle': 'rgb(var(--c-bg-subtle) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          hover: 'rgb(var(--c-primary-hover) / <alpha-value>)',
        },
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        risk: {
          high: 'rgb(var(--c-risk-high) / <alpha-value>)',
          medium: 'rgb(var(--c-risk-medium) / <alpha-value>)',
          low: 'rgb(var(--c-risk-low) / <alpha-value>)',
        },
        sidebar: {
          bg: 'rgb(var(--c-sidebar-bg) / <alpha-value>)',
          ink: 'rgb(var(--c-sidebar-ink) / <alpha-value>)',
          muted: 'rgb(var(--c-sidebar-muted) / <alpha-value>)',
          active: 'rgb(var(--c-sidebar-active) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Sora', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
