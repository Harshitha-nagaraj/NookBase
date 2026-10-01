/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stitch: {
          bg: '#f8fafc',
          sidebar: '#f1f5f9',
          surface: '#ffffff',
          border: '#e2e8f0',
          'border-subtle': '#f1f5f9',
          primary: '#00288e',
          'primary-hover': '#1e40af',
          'primary-light': '#eff6ff',
          text: '#0f172a',
          muted: '#64748b',
          dim: '#94a3b8',
          good: '#15803d',
          'good-bg': '#f0fdf4',
          'good-border': '#bbf7d0',
          warn: '#c2410c',
          'warn-bg': '#fff7ed',
          'warn-border': '#fed7aa',
          danger: '#b91c1c',
          'danger-bg': '#fef2f2',
          'danger-border': '#fecaca',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'dev': '6px',
      }
    },
  },
  plugins: [],
}
