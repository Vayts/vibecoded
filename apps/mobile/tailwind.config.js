/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './modules/**/*.{js,jsx,ts,tsx}',
    './shared/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './stores/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    // Override default fontSize to strip Tailwind's coupled lineHeight values.
    // React Native treats lineHeight as a fixed line-box height which clips
    // descenders (g, y, p, q, j). Omitting lineHeight lets RN calculate it
    // from actual font metrics, preventing clipping. Use `leading-*` utilities
    // when explicit lineHeight is needed.
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      '7xl': '4.5rem',
      '8xl': '6rem',
      '9xl': '8rem',
    },
    extend: {
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
        'sans-extrabold': ['PlusJakartaSans_800ExtraBold'],
      },
      colors: {
        brand: {
          DEFAULT: '#205B23', // Acme Blue (blue-600)
          light: '#C3EFC4', // Light Blue (blue-100)
          dark: '#205B23', // Deep Blue (blue-700)
        },
        accent: {
          green: '#16A34A', // Success / correct (green-600)
          red: '#DC2626', // Error / destructive (red-600)
          amber: '#D97706', // Warning / trial (amber-600)
          purple: '#7C3AED', // Pro badge (violet-600)
          600: '#E28200',
        },
        sparkle: {
          DEFAULT: '#FBBF24', // AI sparkle gold
          dark: '#F59E0B', // AI sparkle amber
        },
        neutrals: {
          50: '#FAFAFA',
          100: '#F1F1F1',
          200: '#E6E6E6',
          500: '#767676',
          900: '#1A1A1A',
        },
        background: '#FAFAFA',
        primary: {
          900: '#205B23',
          700: '#237227',
        }
      },
    },
  },
  plugins: [
    // Map Tailwind font-weight utilities to the correct Plus Jakarta Sans font files.
    // In React Native, fontWeight alone doesn't select the right .ttf — fontFamily must change.
    function ({ addUtilities }) {
      addUtilities({
        '.font-normal': { 'font-family': 'PlusJakartaSans_400Regular', 'font-weight': '400' },
        '.font-medium': { 'font-family': 'PlusJakartaSans_500Medium', 'font-weight': '500' },
        '.font-semibold': { 'font-family': 'PlusJakartaSans_600SemiBold', 'font-weight': '600' },
        '.font-bold': { 'font-family': 'PlusJakartaSans_700Bold', 'font-weight': '700' },
        '.font-extrabold': { 'font-family': 'PlusJakartaSans_800ExtraBold', 'font-weight': '800' },
      });
    },
  ],
};
