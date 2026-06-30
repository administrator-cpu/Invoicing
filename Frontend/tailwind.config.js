/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'logo-gradient': 'linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%)',
      }
    },
  },
  plugins: [],
}
