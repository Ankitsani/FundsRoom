/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#e4e8f0',
          200: '#c8d1e2',
          300: '#9fb1cd',
          400: '#708ab3',
          500: '#4e6a98',
          600: '#3d537d',
          700: '#324367',
          800: '#2b3754',
          900: '#273047',
          950: '#1a1f2e',
        }
      }
    },
  },
  plugins: [],
}
