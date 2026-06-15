/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2B4B',
          dark: '#0D1B2A',
          mid: '#253654',
          light: '#2A4275',
        },
        gold: '#F5B800',
        sky: '#E8F4FC',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
