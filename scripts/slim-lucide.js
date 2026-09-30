'use strict';
// Build a slim lucide-react UMD bundle containing only the icons app.js uses.
const fs = require('fs');

const SRC = '/path/to/astra-rising/public/vendor/lucide-react.js';
const OUT = '/path/to/astra-rising/public/vendor/lucide-react.slim.js';

const NEEDED = ['AlertCircle','ChevronRight','Loader','BookOpen','Shield','Zap',
  'User','Menu','X','Check','RefreshCw','Globe','Briefcase','Star','Eye','Info',
  'Trash2','PanelLeft','Dice3'];

const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split('\n');

// Prelude: everything before the first icon definition.
const firstIcon = lines.findIndex(l => /^  const \w+ = createLucideIcon\(/.test(l));
if (firstIcon < 0) throw new Error('no icon defs found');
const prelude = lines.slice(0, firstIcon).join('\n');

// Collect icon definition blocks keyed by const name.
const defs = {};
for (let i = firstIcon; i < lines.length; i++) {
  const m = lines[i].match(/^  const (\w+) = createLucideIcon\(/);
  if (!m) continue;
  let j = i;
  while (j < lines.length && !/\]\);\s*$/.test(lines[j])) j++;
  defs[m[1]] = lines.slice(i, j + 1).join('\n');
  i = j;
}

// Export lines map exported name -> underlying const (handles aliases).
const exportOf = {};
for (const l of lines) {
  const m = l.match(/^  exports\.(\w+) = (\w+);/);
  if (m) exportOf[m[1]] = m[2];
}

const constsNeeded = new Set();
const exportLines = [];
for (const name of NEEDED) {
  const target = exportOf[name];
  if (!target || !defs[target]) throw new Error('cannot resolve icon: ' + name);
  constsNeeded.add(target);
  exportLines.push(`  exports.${name} = ${target};`);
}

const out = [
  prelude,
  [...constsNeeded].map(c => defs[c]).join('\n\n'),
  '',
  '  exports.Icon = Icon;',
  '  exports.createLucideIcon = createLucideIcon;',
  exportLines.join('\n'),
  '',
  '}));',
  '',
].join('\n');

fs.writeFileSync(OUT, out);
console.log('Wrote ' + OUT + ' (' + (out.length / 1024).toFixed(1) + ' KB, ' + constsNeeded.size + ' icons)');
