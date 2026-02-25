/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agent: '#1a5276',
        supervisor: '#e67e22',
        sqreview: '#27ae60',
        humanloop: '#8e44ad',
        notify: '#2874a6',
        denial: '#c0392b',
        success: '#1b5e20',
        dark: {
          bg: '#0a0e17',
          card: '#141c2b',
          border: '#1e2d42',
        },
      },
    },
  },
  plugins: [],
};
