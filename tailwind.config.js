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
          DEFAULT: '#0284c7', // Sky 600
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        medical: {
          teal: '#0d9488',
          blue: '#2563eb',
          soft: '#f8fafc',
          muted: '#64748b',
          dark: '#0f172a',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
