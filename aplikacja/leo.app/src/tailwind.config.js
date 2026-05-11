/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#12284c',
        copper: '#c36945',
        gray: {
          custom: '#f5f5f5',
        }
      }
    },
  },
  plugins: [],
}
