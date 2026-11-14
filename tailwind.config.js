/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FDF5EB', deep: '#F7E7D1' },
        bronze: { DEFAULT: '#63401A', dark: '#2E1B08', soft: '#8A6638' },
        gold: '#FBBF24',
        ember: '#D97706',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 40px -20px rgba(99,64,26,0.28)',
        glow: '0 10px 30px -8px rgba(217,119,6,0.55)',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(6%, -8%, 0) scale(1.12)' },
          '66%': { transform: 'translate3d(-7%, 6%, 0) scale(0.94)' },
        },
      },
      animation: {
        drift: 'drift 18s ease-in-out infinite',
        'drift-slow': 'drift 26s ease-in-out infinite reverse',
      },
    },
  },
  plugins: [],
}
