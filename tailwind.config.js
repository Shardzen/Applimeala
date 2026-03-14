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
          bordeaux: '#4A0404', // Deep, rich burgundy
          gold: '#D4AF37',     // Classic gold
          cream: '#FDFCF8',    // Premium off-white
          charcoal: '#1A1A1A'  // Deep black for text
        }
      }
    },
  },
  plugins: [],
}
