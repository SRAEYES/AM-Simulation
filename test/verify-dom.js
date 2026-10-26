const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const appJs = fs.readFileSync('js/app.js', 'utf8');
const chartJs = fs.readFileSync('js/chart-manager.js', 'utf8');

const idRegex = /getElementById\(['"]([^'"]+)['"]/g;
const ids = new Set();
let m;
while ((m = idRegex.exec(appJs))) ids.add(m[1]);
while ((m = idRegex.exec(chartJs))) ids.add(m[1]);

const missing = [];
for (const id of ids) {
  // Ignore dynamic IDs generated in code like preset-btn-news
  if (id.startsWith('preset-btn-')) continue;
  if (!html.includes(`id="${id}"`)) {
    missing.push(id);
  }
}

console.log('Total referenced static IDs:', ids.size);
console.log('Missing IDs:', missing);
if (missing.length > 0) {
  process.exit(1);
} else {
  console.log('All referenced DOM elements are present in index.html!');
}
