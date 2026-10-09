const fs = require('fs');
const code = fs.readFileSync('src/data/leisCatalog.ts', 'utf-8');

// quick parse of the JS
const items = [];
const regex = /\{ id: '([^']+)', nome: '([^']+)', sigla: '([^']+)', descricao: '([^']+)', tipo: '([^']+)'/g;
let match;
while ((match = regex.exec(code)) !== null) {
  items.push({ id: match[1], nome: match[2], sigla: match[3], descricao: match[4], tipo: match[5] });
}

console.log("Constituição:", items.filter(l => l.tipo === 'constituicao').length);
console.log("Códigos:", items.filter(l => l.tipo === 'codigo').length);
console.log("Estatutos:", items.filter(l => l.tipo === 'estatuto').length);
console.log("Leis Ordinárias:", items.filter(l => l.tipo === 'lei-especial' && !l.descricao.includes('Decreto') && !l.descricao.includes('Complementar') && !l.descricao.includes('LC')).length);
console.log("Leis Complementares:", items.filter(l => l.descricao.includes('Complementar') || l.descricao.includes('LC nº')).length);
console.log("Decretos:", items.filter(l => l.descricao.includes('Decreto nº') && !l.descricao.includes('Decreto-Lei')).length);
console.log("Decretos-Leis:", items.filter(l => l.descricao.includes('Decreto-Lei')).length);
console.log("MPs:", items.filter(l => l.descricao.includes('Medida Provisória') || l.descricao.includes('MPv')).length);
