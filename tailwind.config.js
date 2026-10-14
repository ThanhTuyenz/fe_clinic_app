/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#28a745',
          50: '#f0faf2',
          100: '#d9f2df',
          200: '#b9eac3',
          300: '#8edda1',
          400: '#5dca76',
          500: '#34b852',
          600: '#28a745',
          700: '#218838',
          800: '#19692c',
          900: '#145523',
          950: '#0b3014',
        },
        medical: {
          teal: '#0d9488',
          blue: '#2563eb',
          soft: '#f8fafc',
          muted: '#64748b',
          dark: '#0f172a',
          success: '#28a745',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
