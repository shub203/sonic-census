/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F3EFE6',
          muted: '#EAE5D9',
          light: '#FAF7F1',
        },
        ink: {
          DEFAULT: '#14181B',
          light: '#23282C',
          muted: '#363C42',
        },
        graphite: {
          DEFAULT: '#4A5157',
          light: '#6B737A',
          dark: '#353A3F',
        },
        sand: {
          DEFAULT: '#D9D3C4',
          dark: '#C7C0AF',
          light: '#ECE7DC',
        },
        quiet: {
          DEFAULT: '#2F6F63',
          light: '#E6EFEA',
          border: '#458578',
        },
        moderate: {
          DEFAULT: '#E9A23B',
          light: '#FAF2E4',
          border: '#D08C29',
        },
        loud: {
          DEFAULT: '#E4572E',
          light: '#FBECE7',
          border: '#CC4620',
        },
        instrument: {
          DEFAULT: '#0F1315',
          border: '#1F262A',
          muted: '#283238',
          text: '#D8DEE2',
          glow: '#1A2328',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        none: '0px',
      },
      borderWidth: {
        hairline: '1px',
      },
      boxShadow: {
        none: 'none',
        instrument: 'inset 0 1px 2px rgba(0,0,0,0.5)',
      },
      gridTemplateColumns: {
        '12': 'repeat(12, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
