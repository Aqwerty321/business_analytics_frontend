/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './utils/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        deep: '#0b1220',
        charcoal: '#111827',
        accent: '#1f8fff',
        mint: '#14b8a6',
        muted: '#94a3b8',
        glass: 'rgba(255,255,255,0.04)'
      },
      fontFamily: {
        sans: ['Inter', 'Source Sans Pro', 'Roboto', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        glass: '0 20px 45px rgba(2, 8, 23, 0.45)'
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' }
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        pulseSoft: 'pulseSoft 1.2s ease-in-out infinite',
        riseIn: 'riseIn 380ms ease-out both'
      }
    }
  },
  plugins: []
};
