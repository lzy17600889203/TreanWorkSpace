/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'buy': '#10b981',
        'buy-dark': '#059669',
        'sell': '#ef4444',
        'sell-dark': '#dc2626',
        'spark': '#fbbf24',
        'bg-dark': '#0f172a',
        'bg-card': 'rgba(15, 23, 42, 0.8)',
      },
      fontFamily: {
        'mono': ['"Roboto Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
