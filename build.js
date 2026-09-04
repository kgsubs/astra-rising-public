'use strict';

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'public/index.html');
const outPath  = path.join(__dirname, 'public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');

const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!match) {
  console.error('ERROR: No <script type="text/babel"> block found in index.html');
  process.exit(1);
}

const jsx = match[1];

const { code } = babel.transformSync(jsx, {
  presets: ['@babel/preset-react'],
  filename: 'app.jsx',
});

fs.writeFileSync(outPath, code, 'utf8');
console.log('Built public/app.js — ' + (Buffer.byteLength(code) / 1024).toFixed(1) + ' KB');
