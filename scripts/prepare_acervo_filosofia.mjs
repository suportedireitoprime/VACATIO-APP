import fs from 'fs';

// 1. Carrega inventário das 15 pastas e 133 arquivos
const driveFiles = JSON.parse(
  fs.readFileSync('scripts/data/filosofia_do_direito_drive_files.json', 'utf-8')
);

// 2. Mapeamento histórico dos 10 itens antigos com suas descrições
const descricoesAntigas = {
  'História do Direito::1': {
    id: 54,
    desc: 'Neste episódio, exploramos as origens do Direito, desde as primeiras formas de organização social até a necessidade de regras para a convivência pacífica.',
  },
  'História do Direito::2': {
    id: 55,
    desc: 'Uma análise aprofundada sobre a contribuição do pensamento grego clássico para a formação da justiça, da democracia e dos fundamentos éticos do Direito.',
  },
  'História do Direito::3': {
    id: 56,
    desc: 'O Direito Romano como a maior matriz jurídica do Ocidente: o nascimento do jus civile, a distinção entre direito público e privado e a consolidação do Corpus Juris Civilis.',
  },
  'História do Direito::4': {
    id: 57,
    desc: 'O Direito na Idade Média: a fusão entre o costume germânico, o direito canônico e a redescoberta do direito romano pelas primeiras universidades europeias.',
  },
  'História do Direito::5': {
    id: 58,
    desc: 'A transição para a modernidade: o surgimento dos Estados nacionais, a centralização do poder, a razão iluminista e as primeiras grandes codificações.',
  },
  'História do Direito::6': {
    id: 59,
    desc: `**Influência da Era Contemporânea:**\r\n\r\n  - A Era Contemporânea, marcada pela Revolução Industrial e o desenvolvimento científico, impactou profundamente o Direito.\r\n  - A partir de Immanuel Kant, a razão assume um papel central na elaboração e interpretação das normas jurídicas.\r\n\r\n**Hans Kelsen e o Positivismo Jurídico:**\r\n\r\n  - Hans Kelsen propõe o positivismo jurídico, que busca transformar o Direito em uma ciência autônoma.\r\n  - Pirâmide de Kelsen e hierarquia das normas.\r\n  - A crise do positivismo pós-Segunda Guerra e a ascensão do neoconstitucionalismo e dos princípios.`,
  },
  'Hans Kelsen::1': {
    id: 60,
    desc: 'As bases epistemológicas e influências teóricas de Hans Kelsen na formulação da Teoria Pura do Direito.',
  },
  'Hans Kelsen::2': {
    id: 61,
    desc: 'A visão kelseniana sobre a interpretação do Direito: a moldura normativa e a discricionariedade do aplicador.',
  },
  'Hans Kelsen::3': {
    id: 62,
    desc: 'O que é a Justiça segundo Kelsen: a separação entre validade formal da norma jurídica e juízos morais de justiça.',
  },
  'Hans Kelsen::4': {
    id: 63,
    desc: 'As principais críticas dirigidas ao positivismo normativista de Hans Kelsen e seu legado para o direito contemporâneo.',
  },
};

const cdnBase = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/narracoes/filosofia-do-direito';

let nextId = 300;
const novosItens = [];

for (const pasta of driveFiles) {
  // Limpa o prefixo numérico da subpasta para o Tema (ex: "01. Filosofia do Direito" -> "Filosofia do Direito")
  const tema = pasta.subpasta.replace(/^\d+\.\s*/, '').trim();

  for (const arq of pasta.arquivos) {
    // Parse seq e titulo
    const m = arq.name.match(/^(\d+)\.\s*(.*?)(?:\.mp3)?$/i);
    const seq = m ? parseInt(m[1], 10) : 1;
    const rawTitulo = m ? m[2].trim() : arq.name.replace(/\.mp3$/i, '').trim();

    // Normaliza pontuações finais supérfluas no título
    const titulo = rawTitulo.replace(/\.$/, '');

    const keyAntiga = `${tema}::${seq}`;
    let itemId = nextId++;
    let descricao = '';

    if (descricoesAntigas[keyAntiga]) {
      itemId = descricoesAntigas[keyAntiga].id;
      descricao = descricoesAntigas[keyAntiga].desc;
    }

    const encPasta = encodeURIComponent(pasta.subpasta);
    const encArq = encodeURIComponent(arq.name);
    const urlAudio = `${cdnBase}/${encPasta}/${encArq}`;

    novosItens.push({
      id: itemId,
      area: 'Filosofia do Direito',
      tema,
      sequencia: seq,
      titulo,
      descricao,
      url_audio: urlAudio,
      imagem_miniatura: '',
      tag: 'Filosofia do Direito',
      created_at: '2026-10-18T19:00:00.000Z',
      updated_at: '2026-10-18T19:00:00.000Z',
    });
  }
}

console.log(`Gerados ${novosItens.length} itens para Filosofia do Direito.`);
const temasDistintos = Array.from(new Set(novosItens.map((i) => i.tema)));
console.log('Temas:', temasDistintos);

fs.writeFileSync(
  'scripts/data/filosofia_do_direito_acervo_items.json',
  JSON.stringify(novosItens, null, 2),
  'utf-8'
);
console.log('Salvo em scripts/data/filosofia_do_direito_acervo_items.json');
