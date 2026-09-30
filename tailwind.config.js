'use strict';
// Mirrors the inline tailwind.config that lived in index.html when the CDN
// runtime compiler was in use. Build: npm run build:css
module.exports = {
  content: [
    './public/index.html',
    './public/app.js',
    './public/data/game-data.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Karla', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
};
