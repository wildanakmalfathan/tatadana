/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Luxury Emerald Primary
          600: '#059669', // Deep Forest Green
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22', // Obsidian Forest
          DEFAULT: '#10b981',
        },
        luxury: {
          bg: '#06090e',       // Deepest Luxury Black
          card: '#0a0f16',     // Obsidian Slate Card
          panel: '#0e1622',    // Deep Forest Panel
          border: '#152332',   // Subtle Luxury Green Border
          accent: '#10b981',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          DEFAULT: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'premium': '0 10px 30px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 25px rgba(16, 185, 129, 0.35)',
        'emerald': '0 4px 20px 0 rgba(16, 185, 129, 0.35)',
      }
    },
  },
  plugins: [],
};
