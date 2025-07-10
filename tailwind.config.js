/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
    "!./node_modules"
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#121212',
        darkPrimary: '#0f172a',
        darkSecondary: '#1e293b',
        darkTertiary: '#334155',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}