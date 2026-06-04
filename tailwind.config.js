/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind which files to scan for class names
  // This keeps your CSS bundle small — only used classes are included
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Add custom colors, fonts, or spacing here as your project grows
    },
  },
  plugins: [],
};
