/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // We'll force dark mode or use class based
  theme: {
    extend: {
      colors: {
        bitrix: {
          dark: '#1e2430',
          darker: '#161a23',
          card: '#252d3a',
          blue: '#2fc6f6',
          blueHover: '#1eb5e5',
          green: '#9dcf00',
          border: '#384357',
          text: '#cdd3df',
          textMuted: '#8b96a8'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 10px rgba(47, 198, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
