/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#50A3A4', // Teal
          hover: '#408B8C',
          light: '#EAF4F4',
        },
        secondary: {
          DEFAULT: '#674A40', // Dark Brown
          hover: '#7F5D51',
          light: '#8D6E63',
        },
        accent: {
          DEFAULT: '#FCAF38', // Golden Yellow
        },
        danger: {
          DEFAULT: '#F95335', // Coral
        },
        warning: {
          DEFAULT: '#FCAF38', // Golden Yellow
        },
        success: {
          DEFAULT: '#50A3A4', // Teal
        },
        background: {
          DEFAULT: '#FAF8F5', // Warm white background
        },
        surface: {
          DEFAULT: '#FFFFFF', // Cards background
        },
        text: {
          primary: '#674A40', // Dark Brown headings
          secondary: '#8D6E63', // Warm medium brown text
          muted: '#B19990',
        },
        border: {
          DEFAULT: '#D7CCC8', // Light brown border
        }
      },
    },
  },
  plugins: [],
}
