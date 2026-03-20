/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#74A0FF',
          light: '#7CA5FF',
          dark: '#5B8DEF',
        },
        pastel: {
          purple: '#dbeafe',
          mint: '#d1fae5',
          peach: '#ffe4d6',
          sky: '#dbeafe',
        },
      },
      boxShadow: {
        soft: '0 8px 24px rgba(148, 163, 184, 0.15)',
      },
    },
  },
  plugins: [],
};
