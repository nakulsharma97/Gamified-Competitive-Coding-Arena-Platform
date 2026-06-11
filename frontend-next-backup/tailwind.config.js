/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 20px rgba(84, 155, 255, 0.35), 0 0 60px rgba(115, 67, 255, 0.18)',
      },
      backgroundImage: {
        'grid-radial': 'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.14) 1px, transparent 0)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
