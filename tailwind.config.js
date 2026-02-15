/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './js/**/*.js',
    './src/**/*.js'
  ],
  theme: {
    extend: {
      maxWidth: {
        'container': '1040px',
        'prose': '72ch',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Malgun Gothic', 'sans-serif'],
      },
      fontSize: {
        'title': ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.6' }],
        'meta': ['12px', { lineHeight: '1.3' }],
      },
      colors: {
        primary: { DEFAULT: '#059669', hover: '#047857', light: '#d1fae5' },
        muted: '#64748b',
        border: '#e2e8f0',
        'border-soft': '#f1f5f9',
      },
      spacing: {
        'list-y': '12px',
        'list-y-sm': '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
