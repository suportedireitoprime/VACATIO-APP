import fs from 'fs';

const rel = JSON.parse(fs.readFileSync('scripts/relatorio_geral_narracoes.json', 'utf-8'));

// Ordenar por nome
rel.sort((a, b) => a.nome.localeCompare(b.nome));

const completas = rel.filter(r => r.totalArtigos > 0 && r.comAudioNoBanco >= r.totalArtigos * 0.95);
const parciais = rel.filter(r => r.comAudioNoBanco > 0 && r.comAudioNoBanco < r.totalArtigos * 0.95);
const semAudio = rel.filter(r => r.comAudioNoBanco === 0);

console.log('================================================================');
console.log('📊 LEVANTAMENTO GERAL DE NARRAÇÕES DAS LEIS');
console.log('================================================================\n');

console.log(`TOTAL DE LEIS ANALISADAS: ${rel.length}`);
console.log(`✅ Leis Completas (95% a 100% gravadas): ${completas.length}`);
console.log(`🟡 Leis Parciais (com áudios parciais gravados): ${parciais.length}`);
console.log(`❌ Leis Sem Narração (0% gravadas no sistema): ${semAudio.length}`);

console.log('\n================================================================');
console.log('✅ LEIS COM NARRAÇÃO COMPLETA (OU QUASE COMPLETA):');
console.log('================================================================');
completas.forEach(l => {
  const pct = l.totalArtigos > 0 ? Math.round((l.comAudioNoBanco / l.totalArtigos) * 100) : 0;
  console.log(`• ${l.nome} (${l.slug}): ${l.comAudioNoBanco} de ${l.totalArtigos} artigos (${pct}%)`);
});

console.log('\n================================================================');
console.log('🟡 LEIS COM NARRAÇÃO PARCIAL:');
console.log('================================================================');
parciais.forEach(l => {
  const pct = l.totalArtigos > 0 ? Math.round((l.comAudioNoBanco / l.totalArtigos) * 100) : 0;
  console.log(`• ${l.nome} (${l.slug}): ${l.comAudioNoBanco} de ${l.totalArtigos} artigos (${pct}%)`);
});

console.log('\n================================================================');
console.log('❌ LEIS QUE AINDA NÃO POSSUEM NARRAÇÃO (SEM ÁUDIO):');
console.log('================================================================');
semAudio.forEach(l => {
  console.log(`• ${l.nome} (${l.slug}) - ${l.totalArtigos} artigos`);
});
