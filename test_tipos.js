import { readFileSync } from 'fs';
const content = readFileSync('src/data/leisCatalog.ts', 'utf-8');
const matches = content.match(/tipo:\s*'([^']+)'/g);
if (matches) {
  const tipos = matches.map(m => m.match(/'([^']+)'/)[1]);
  console.log([...new Set(tipos)]);
}
