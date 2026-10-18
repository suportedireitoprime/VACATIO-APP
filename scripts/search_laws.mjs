import fs from 'fs';

const leis = JSON.parse(fs.readFileSync('scripts/todas_leis_supabase.json', 'utf-8'));

function findLaw(query) {
  const q = query.toLowerCase();
  return leis.filter(l => 
    l.slug.toLowerCase().includes(q) || 
    l.nome.toLowerCase().includes(q)
  );
}

console.log('Search "guarda":', findLaw('guarda'));
console.log('Search "motorista":', findLaw('motorista'));
console.log('Search "13022":', findLaw('13022')); // Lei das Guardas Municipais é 13.022/2014
console.log('Search "13103":', findLaw('13103')); // Lei do Motorista é 13.103/2015
console.log('Search "12619":', findLaw('12619')); 
