import fs from 'fs';

const publicUrl = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function generateAcervo() {
  const inventoryPath = 'scripts/data/audioaulas_18_areas_inventory.json';
  if (!fs.existsSync(inventoryPath)) {
    console.error('Inventário não encontrado:', inventoryPath);
    return;
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

  // Carrega acervo existente para preservar Filosofia do Direito
  const acervoFile = fs.readFileSync('src/data/audioaulasAcervo.ts', 'utf-8');
  
  // Extrai itens de Filosofia já existentes
  const matchArray = acervoFile.match(/export const AUDIOAULAS_ACERVO_INICIAL:\s*AulaAudio\[\]\s*=\s*(\[[\s\S]*?\]);/);
  let itensExistentes = [];
  if (matchArray) {
    try {
      itensExistentes = JSON.parse(matchArray[1]);
    } catch {
      // Se JSON.parse falhar por formatação ts, filtra Filosofia
      itensExistentes = [];
    }
  }

  // Encontra o maior ID atual
  let maxId = 500;
  for (const item of itensExistentes) {
    if (item.id && item.id > maxId) maxId = item.id;
  }

  let nextId = Math.max(maxId + 1, 1000);
  const novosItens = [];

  for (const areaItem of inventory) {
    const area = areaItem.area;
    const areaSlug = areaItem.areaSlug || slugify(area);

    for (const sub of areaItem.subpastas) {
      const subpasta = sub.subpasta;
      // Limpa prefixo numérico para o tema se houver (ex: "01. Crimes..." -> "Crimes...")
      const temaLimpo = subpasta.replace(/^\d+\.\s*/, '').trim();

      for (const arq of sub.arquivos) {
        const fileName = arq.name;
        // Parse da sequência e título (ex: "01. Crimes Contra a Família.mp3")
        const m = fileName.match(/^(\d+)\.\s*(.*?)(?:\.mp3)?$/i);
        const seq = m ? parseInt(m[1], 10) : 1;
        const rawTitulo = m ? m[2].trim() : fileName.replace(/\.mp3$/i, '').trim();
        const titulo = rawTitulo.replace(/\.$/, '').trim();

        const encSub = encodeURIComponent(subpasta);
        const encArq = encodeURIComponent(fileName);
        const urlAudio = `${publicUrl}/narracoes/${areaSlug}/${encSub}/${encArq}`;

        novosItens.push({
          id: nextId++,
          area,
          tema: subpasta, // Mantém subpasta completa para ordenação sequencial no catálogo
          sequencia: seq,
          titulo,
          descricao: '',
          url_audio: urlAudio,
          imagem_miniatura: '',
          tag: area,
        });
      }
    }
  }

  console.log(`Gerados ${novosItens.length} novos itens de áudio aula para as 18 áreas!`);

  // Combina com itens de Filosofia preservados
  const todosItens = [...itensExistentes, ...novosItens];
  console.log(`Total combinado no acervo: ${todosItens.length} aulas.`);

  const content = `export interface AulaAudio {
  id: number;
  area: string;
  tema: string | null;
  sequencia: number | null;
  titulo: string;
  descricao: string | null;
  url_audio: string | null;
  imagem_miniatura?: string | null;
  tag?: string | null;
}

export const AUDIOAULAS_ACERVO_INICIAL: AulaAudio[] = ${JSON.stringify(todosItens, null, 2)};
`;

  fs.writeFileSync('src/data/audioaulasAcervo.ts', content, 'utf-8');
  console.log('✅ src/data/audioaulasAcervo.ts atualizado com sucesso!');
}

if (process.argv[1].endsWith('generate_acervo_18_areas.mjs')) {
  generateAcervo();
}
