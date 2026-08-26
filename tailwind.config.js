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
      // Every text-* utility class shrunk by the same ~88% ratio applied to
      // every inline `fontSize: N` value app-wide (see the one-time script
      // pass across src/**/*.tsx) — the app looked oversized at 100%
      // browser zoom. Deliberately overriding fontSize only, NOT touching
      // Tailwind's (also rem-based) spacing/gap scale, which stays at
      // Tailwind's defaults — shrinking that too would have reduced
      // padding/gaps everywhere as a side effect, not just typography.
      // Values are px (not rem) so they're immune to any future root
      // font-size change, same reasoning.
      fontSize: {
        xs  : ['10.5px', { lineHeight: '14px' }],
        sm  : ['12.5px', { lineHeight: '17.5px' }],
        base: ['14px',   { lineHeight: '21px' }],
        lg  : ['16px',   { lineHeight: '24.5px' }],
        xl  : ['17.5px', { lineHeight: '24.5px' }],
        '2xl': ['21px',  { lineHeight: '28px' }],
        '3xl': ['26.5px', { lineHeight: '31.5px' }],
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
