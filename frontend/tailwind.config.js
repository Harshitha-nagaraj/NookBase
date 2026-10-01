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
          bg: '#fafaf4',
          sidebar: '#f5f5f0',
          surface: '#ffffff',
          border: '#e4e4e7',
          'border-subtle': '#f4f4f5',
          primary: '#00288e',
          'primary-hover': '#1e40af',
          'primary-light': '#eff6ff',
          text: '#18181b',
          muted: '#71717a',
          dim: '#a1a1aa',
          good: '#166534',
          'good-bg': '#f0fdf4',
          'good-border': '#bbf7d0',
          warn: '#9a3412',
          'warn-bg': '#fff7ed',
          'warn-border': '#fed7aa',
          danger: '#991b1b',
          'danger-bg': '#fef2f2',
          'danger-border': '#fecaca',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}


