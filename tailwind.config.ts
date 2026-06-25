import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: { 500: '#F07F00', 600: '#D97200' },
        navy: { 500: '#263578', 600: '#1E2A60', 700: '#112888' },
        teal: { 500: '#006C6D', 600: '#005A5B' },
        cyan: { 400: '#02B8BF' },
      },
    },
  },
  plugins: [],
};
export default config;
