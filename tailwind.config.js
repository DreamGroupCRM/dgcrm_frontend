/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand neutrals (replaces old green/gold) ──
        crm: {
          50 : '#f0f9ff',
          100: '#e0f2fe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
      fontFamily: {
        // All aliases point to Inter — eliminates font-display/font-body drift
        sans   : ['"Inter"', 'sans-serif'],
        serif  : ['"Inter"', 'serif'],
        display: ['"Inter"', 'serif'],
        body   : ['"Inter"', 'serif'],
        mono   : ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'slide-in'  : 'slideIn 0.3s ease-out',
        'fade-in'   : 'fadeIn 0.35s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%'  : { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%'  : { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
