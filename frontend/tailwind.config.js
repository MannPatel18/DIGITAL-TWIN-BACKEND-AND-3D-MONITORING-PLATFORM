/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        twin: {
          bg: '#101B2A',
          secondary: '#19283A',
          panel: '#203247',
          elevated: '#263B50',
          interactive: '#30485E',
          text: '#F1F5F8',
          secondaryText: '#B9C9D3',
          mutedText: '#899EAF',
          teal: '#28A6A0',
          tealHover: '#208A85',
          steel: '#4D91D2',
          steelHover: '#3D7CBD',
          copper: '#D69A55',
          amber: '#E0B653',
          healthy: '#43B58A',
          warning: '#E0B653',
          critical: '#DF6964',
          neutral: '#899EAF',
          border: '#263B50',
          borderLight: '#30485E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
