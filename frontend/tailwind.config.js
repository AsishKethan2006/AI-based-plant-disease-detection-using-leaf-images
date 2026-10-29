/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F7F1',
        forest: { DEFAULT: '#173B2E', 800: '#102A21', 700: '#1D4A3A', 600: '#2A5C49', 500: '#3B7560' },
        leaf: { DEFAULT: '#B7D96B', 300: '#CDE795', 600: '#8FB23F' },
        clay: { DEFAULT: '#C77D5B', 700: '#A5603F', 100: '#F3E1D7' },
        ink: { DEFAULT: '#1C2420', 500: '#56635B', 400: '#7B887F' },
        line: '#DDE0D2',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
