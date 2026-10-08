/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        reactly: {
          blue: '#1d9bf0',
          dark: '#0f172a',
          bg: '#f3f4f6'
        }
      }
    },
  },
  plugins: [],
}