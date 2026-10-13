/**
 * Script gerador da estrutura de pastas e planilhas de Áudio-Aulas
 * Pasta raiz do Google Drive: https://drive.google.com/drive/folders/1rsvR4YxmtssBSBf-Ymc3Diwo9P61egfA?usp=sharing
 * (AUDIO AULAS MUSSE)
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_PROMPT_TEMPLATE = `Você é o locutor e professor oficial do aplicativo VACATIO Vade Mecum.

DIRETRIZES E REGRAS MANDATÓRIAS:
1. Inicie sempre com uma saudação calorosa, inspiradora e profissional a todos os estudantes e operadores do Direito.
2. Diga com clareza e entusiasmo: "Olá! Seja muito bem-vindo a mais uma áudio-aula exclusiva do VACATIO Vade Mecum."
3. ATENÇÃO ABSOLUTA: NÃO cite em hipótese alguma o nome de apresentadores individuais (nunca invente nem mencione nomes pessoais de locutores). Você representa a voz institucional do VACATIO Vade Mecum.
4. Apresente o conteúdo com a frase: "Hoje vamos analisar detalhadamente o {NUMERO_ARTIGO} da lei {NOME_LEI}."
5. Faça a leitura pontual, solene e precisa do texto oficial do artigo:
"{TEXTO_ARTIGO}"
6. Em seguida, desenvolva uma explicação didática e fluida:
   - Qual a finalidade principal e o bem jurídico tutelado por esta norma;
   - Impactos práticos nas decisões judiciais, no cotidiano da advocacia e em provas de concursos públicos;
   - Um exemplo prático da vida real para fixação imediata do conteúdo pelo ouvinte.
7. Encerre com uma mensagem motivacional e convide o estudante a continuar aprofundando seus estudos no VACATIO Vade Mecum.`;

function isArtigoReal(numero) {
  if (!numero) return false;
  const trimmed = numero.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase();
  if (/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|DISPOSI[ÇC]|PREÂMBULO|PREAMBULO)/i.test(upper)) {
    return false;
  }
  if (/\b(?:art(?:igo)?\.?\s*)?(\d+)/i.test(trimmed)) return true;
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(trimmed)) return true;
  return false;
}

function formatArtigoLabel(numero) {
  if (!numero) return '';
  const trimmed = numero.trim();
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(trimmed)) return 'Art. Único';
  const match = trimmed.match(/(?:art(?:igo)?\.?\s*)?(\d+)(?:[º°o]|\.º)?(?:-([a-zA-Z]))?/i);
  if (match) {
    const numInt = Number(match[1]);
    const sufixo = match[2] ? `-${match[2].toUpperCase()}` : '';
    if (numInt >= 1 && numInt <= 9) return `Art. ${numInt}º${sufixo}`;
    return `Art. ${numInt}${sufixo}`;
  }
  if (trimmed.startsWith('Art.')) return trimmed;
  return `Art. ${trimmed}`;
}

function generatePromptForArticle(numeroArtigo, textoArtigo, nomeLei) {
  const numLimpo = formatArtigoLabel(numeroArtigo);
  const textoLimpo = (textoArtigo || '').trim();
  return DEFAULT_PROMPT_TEMPLATE
    .replace(/\{NUMERO_ARTIGO\}/g, numLimpo)
    .replace(/\{NOME_LEI\}/g, nomeLei.trim())
    .replace(/\{TEXTO_ARTIGO\}/g, textoLimpo);
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

async function fetchAllArtigos(leiId, leiSlug) {
  const all = [];
  let from = 0;
  const chunkSize = 1000;

  while (true) {
    const to = from + chunkSize - 1;
    let { data, error } = await supabase
      .from('vade_mecum_artigos')
      .select('numero, texto, ordem')
      .eq('lei_id', leiId)
      .order('ordem', { ascending: true })
      .range(from, to);

    if ((!data || data.length === 0) && leiSlug && from === 0) {
      const resSlug = await supabase
        .from('vade_mecum_artigos')
        .select('numero, texto, ordem')
        .eq('lei_id', leiSlug)
        .order('ordem', { ascending: true })
        .range(from, to);
      data = resSlug.data;
    }

    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}

async function main() {
  console.log('--- Iniciando geração da estrutura de pastas e planilhas de Áudio-Aulas ---');

  // Buscar lista de leis principais
  const { data: leis, error } = await supabase
    .from('vade_mecum_leis')
    .select('id, slug, nome, categoria')
    .order('nome');

  if (error || !leis) {
    console.error('Erro ao buscar leis:', error);
    return;
  }

  // Filtrar leis mais importantes para Códigos e Estatutos
  const leisParaProcessar = [
    // Códigos
    { slug: 'cp', pasta: 'Códigos', nome: 'Código Penal' },
    { slug: 'cpc', pasta: 'Códigos', nome: 'Código de Processo Civil' },
    { slug: 'cc', pasta: 'Códigos', nome: 'Código Civil' },
    { slug: 'clt', pasta: 'Códigos', nome: 'Consolidação das Leis do Trabalho (CLT)' },
    { slug: 'cpp', pasta: 'Códigos', nome: 'Código de Processo Penal' },
    { slug: 'cdc', pasta: 'Códigos', nome: 'Código de Defesa do Consumidor' },
    { slug: 'ctn', pasta: 'Códigos', nome: 'Código Tributário Nacional' },
    { slug: 'ctb', pasta: 'Códigos', nome: 'Código de Trânsito Brasileiro' },
    // Estatutos
    { slug: 'oab', pasta: 'Estatutos', nome: 'Estatuto da OAB' },
    { slug: 'eca', pasta: 'Estatutos', nome: 'Estatuto da Criança e do Adolescente' },
    { slug: 'epd', pasta: 'Estatutos', nome: 'Estatuto da Pessoa com Deficiência' },
    { slug: 'idoso', pasta: 'Estatutos', nome: 'Estatuto do Idoso' },
    // Constituição
    { slug: 'cf', pasta: 'Constituição', nome: 'Constituição Federal de 1988' },
  ];

  const outDir = path.resolve(__dirname, '../public/audio_aulas_drive');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const item of leisParaProcessar) {
    const leiData = leis.find(l => l.slug === item.slug || l.nome.toLowerCase().includes(item.nome.toLowerCase()));
    if (!leiData) {
      console.warn(`Lei não encontrada no banco: ${item.nome} (${item.slug})`);
      continue;
    }

    console.log(`\nProcessando: [${item.pasta}] -> ${item.nome}...`);
    const artigosRaw = await fetchAllArtigos(leiData.id, leiData.slug);
    const artigosReais = artigosRaw.filter(a => a.texto && a.texto.trim() && isArtigoReal(a.numero));

    console.log(`-> Encontrados ${artigosReais.length} artigos reais.`);

    // Criar pasta da categoria e subpasta da lei
    const pastaCat = path.join(outDir, item.pasta);
    const pastaLei = path.join(pastaCat, item.nome.replace(/[/\\?%*:|"<>]/g, ''));
    if (!fs.existsSync(pastaLei)) fs.mkdirSync(pastaLei, { recursive: true });

    // Montar CSV
    const rows = [];
    rows.push(['Numero_Artigo', 'Texto_Artigo', 'Prompt_Gerador'].map(escapeCsvCell).join(','));

    for (const art of artigosReais) {
      const numLabel = formatArtigoLabel(art.numero);
      const prompt = generatePromptForArticle(numLabel, art.texto, item.nome);
      rows.push([escapeCsvCell(numLabel), escapeCsvCell(art.texto), escapeCsvCell(prompt)].join(','));
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const filePath = path.join(pastaLei, `${item.nome} - Planilha Áudio-Aulas.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    console.log(`-> Planilha criada: ${filePath}`);
  }

  console.log('\n--- Geração concluída com sucesso! ---');
}

main().catch(console.error);
