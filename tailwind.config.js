/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        border: 'var(--border)',
        accent: '#7c6aff',
        pink: '#ff6b9d',
        green: '#34d399',
        amber: '#fbbf24',
        muted: 'var(--muted)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--muted)',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'slide-up': 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fadeIn 0.18s ease-out',
        'scale-tap': 'scaleTap 0.12s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleTap: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
