/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        apple: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI Variable Display"',
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          "system-ui",
          "sans-serif"
        ],
        mono: [
          '"SF Mono"',
          '"Cascadia Code"',
          '"Segoe UI Mono"',
          "Menlo",
          "monospace"
        ]
      },
      borderRadius: {
        'apple-sm': '16px',
        'apple': '22px',
        'apple-lg': '26px',
        'apple-xl': '32px'
      },
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        apple: {
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          green: '#34C759',
          mint: '#00C7BE',
          teal: '#30B0C7',
          cyan: '#32ADE6',
          blue: '#007AFF',
          indigo: '#5856D6',
          purple: '#AF52DE',
          pink: '#FF2D55',
          brown: '#A2845E',
          gray: {
            50: '#FBFBFD',
            100: '#F5F5F7',
            200: '#E8E8ED',
            300: '#D2D2D7',
            400: '#AEAEB2',
            500: '#86868B',
            600: '#636366',
            700: '#48484A',
            800: '#2C2C2E',
            900: '#1C1C1E',
            950: '#121214'
          }
        }
      },
      boxShadow: {
        'apple-widget': '0 0 0 1px rgba(255, 255, 255, 0.12), 0 12px 32px 0 rgba(0, 0, 0, 0.28), 0 2px 6px 0 rgba(0, 0, 0, 0.12)',
        'apple-widget-light': '0 0 0 1px rgba(0, 0, 0, 0.08), 0 12px 32px 0 rgba(0, 0, 0, 0.14), 0 2px 6px 0 rgba(0, 0, 0, 0.06)',
        'apple-glass': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.22), 0 8px 24px -4px rgba(0, 0, 0, 0.35)',
        'apple-glass-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.6), 0 8px 24px -4px rgba(0, 0, 0, 0.12)',
        'apple-card': '0 2px 10px rgba(0, 0, 0, 0.1)',
        'apple-highlight': 'inset 0 0.5px 0.5px 0 rgba(255, 255, 255, 0.4)'
      },
      backdropBlur: {
        'apple': '28px',
        'apple-heavy': '40px'
      },
      animation: {
        'ken-burns': 'kenburns 30s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite'
      },
      keyframes: {
        kenburns: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '50%': { transform: 'scale(1.08) translate(-1%, -1%)' },
          '100%': { transform: 'scale(1.04) translate(1%, 0.5%)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' }
        }
      }
    }
  },
  plugins: [],
}
