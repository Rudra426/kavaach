/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        accent2: 'var(--color-accent-2)',
        muted: 'var(--color-muted)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
      },
      boxShadow: {
        card: '0 6px 20px rgba(26, 58, 42, 0.08), 0 1px 3px rgba(26, 58, 42, 0.12)',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.03)', opacity: '0.8' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
