/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#06B6D4',
        success: '#10B981',
        warning: '#F59E0B',
        background: '#F8FAFC',
        'card-bg': '#FFFFFF',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
      },
      fontFamily: {
        sans: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      },
    },
  },
  plugins: [],
}
