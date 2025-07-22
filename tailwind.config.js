/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
    "./*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Poppins', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace']
      },
      colors: {
        darkBg: '#121212',
        darkSecondary: '#1e1e1e',
        darkTertiary: '#2c2c2c',
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}