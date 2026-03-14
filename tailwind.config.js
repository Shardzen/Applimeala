/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          bordeaux: '#4A0404',
          gold: '#D4AF37',
          cream: '#FDFCF8',
          charcoal: '#1A1A1A'
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}
