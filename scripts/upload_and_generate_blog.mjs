import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const endpoint = getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com';
const accessKeyId = getEnv('R2_ACCESS_KEY_ID');
const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY');
const bucketName = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicUrl = getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

console.log('--- INICIANDO PROCESSAMENTO E UPLOAD DOS NOVOS ARTIGOS DO BLOG ---');
console.log('R2 Bucket:', bucketName);
console.log('Public URL:', publicUrl);

const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function uploadToR2(key, filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  console.log(`Subindo para R2: ${key} (${fileBuffer.length} bytes)...`);
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000',
    })
  );
  return `${publicUrl}/${key}`;
}

const ARTICLES_CONFIG = [
  {
    folder: 'artigo-01-o-que-e-lei',
    id: 'o-que-e-lei',
    titulo: 'O que é lei? O conceito explicado sem juridiquês',
    resumo: 'Você obedece a dezenas de leis todos os dias sem perceber. Mas afinal: o que é lei? Por que ela existe, quem a cria e por que algumas valem mais que outras?',
    tema: 'Iniciantes',
    data_publicacao: '2026-10-18T10:00:00Z',
  },
  {
    folder: 'artigo-02-lei-norma-regra',
    id: 'lei-norma-e-regra',
    titulo: 'Lei, norma e regra: qual é a diferença?',
    resumo: 'Toda lei é uma norma, mas nem toda norma é lei. Entenda de uma vez a fronteira entre regras de convivência, normas formais e leis do Estado.',
    tema: 'Leis',
    data_publicacao: '2026-10-17T14:30:00Z',
  },
  {
    folder: 'artigo-03-direito-natural-positivo',
    id: 'direito-natural-x-direito-positivo',
    titulo: 'Direito natural x direito positivo: entenda de uma vez',
    resumo: 'De onde vem o Direito? Da natureza humana e da justiça universal ou das regras escritas pelo Estado? Entenda o debate milenar que define a aplicação das leis.',
    tema: 'Filosofia',
    data_publicacao: '2026-10-16T11:00:00Z',
  },
  {
    folder: 'artigo-04-funcoes-da-lei',
    id: 'para-que-servem-as-leis',
    titulo: 'Para que servem as leis? As 5 funções das normas',
    resumo: 'Organizar a convivência, proteger direitos, resolver conflitos, limitar o poder do Estado e transformar a sociedade. Descubra os 5 papéis fundamentais da lei.',
    tema: 'Leis',
    data_publicacao: '2026-10-15T16:00:00Z',
  },
  {
    folder: 'artigo-05-quem-cria-as-leis',
    id: 'quem-cria-as-leis-no-brasil',
    titulo: 'Quem cria as leis no Brasil? Os 3 Poderes explicados',
    resumo: 'Congresso, presidente, assembleias, câmaras municipais e Judiciário: entenda quem cria, quem aprova, quem sanciona e quem interpreta as leis no país.',
    tema: 'Leis',
    data_publicacao: '2026-10-14T09:30:00Z',
  },
  {
    folder: 'artigo-06-piramide-kelsen',
    id: 'a-piramide-de-kelsen',
    titulo: 'A pirâmide de Kelsen: a hierarquia das leis brasileiras',
    resumo: 'Nem toda lei vale o mesmo. Descubra a pirâmide de Kelsen, a regra de ouro da hierarquia jurídica e o que acontece quando uma norma contraria a Constituição.',
    tema: 'Direito Constitucional',
    data_publicacao: '2026-10-13T15:00:00Z',
  },
  {
    folder: 'artigo-07-constituicao',
    id: 'constituicao-a-lei-maior',
    titulo: 'Constituição: a lei maior que está acima de todas',
    resumo: 'A certidão de nascimento da República e o manual de funcionamento do país. Conheça a Constituição Cidadã de 1988, seus direitos fundamentais e cláusulas pétreas.',
    tema: 'Direito Constitucional',
    data_publicacao: '2026-10-12T10:00:00Z',
  },
  {
    folder: 'artigo-08-estado-de-direito',
    id: 'estado-de-direito-ninguem-acima-da-lei',
    titulo: 'Estado de Direito: por que ninguém está acima da lei',
    resumo: 'Nem o presidente, nem o milionário, nem o cidadão comum. Entenda a ideia central do Estado de Direito, sua história e a barreira vital contra a tirania.',
    tema: 'Direito Constitucional',
    data_publicacao: '2026-10-11T13:00:00Z',
  },
  {
    folder: 'artigo-09-lei-justa',
    id: 'toda-lei-e-justa',
    titulo: 'Toda lei é justa? Legalidade, moralidade e justiça',
    resumo: 'A lei nem sempre coincide com a justiça. Descubra o que a filosofia e o ordenamento jurídico ensinam quando uma norma vigente parece manifestamente errada.',
    tema: 'Filosofia',
    data_publicacao: '2026-10-10T11:00:00Z',
  },
  {
    folder: 'artigo-10-como-surgiu-a-lei',
    id: 'como-surgiu-a-lei',
    titulo: 'Como surgiu a lei: da vingança privada ao código escrito',
    resumo: 'Antes da lei, mandava a força bruta. Da vingança privada ao Código de Hamurabi, de Roma à Constituição de 1988: conheça a jornada de 4 mil anos da civilização.',
    tema: 'Curiosidades',
    data_publicacao: '2026-10-09T08:30:00Z',
  },
];

function convertTable(tblXml) {
  const trMatches = [...tblXml.matchAll(/<w:tr\b[^>]*>(.*?)<\/w:tr>/gs)];
  const rows = [];
  for (const tr of trMatches) {
    const trContent = tr[1];
    const tcMatches = [...trContent.matchAll(/<w:tc\b[^>]*>(.*?)<\/w:tc>/gs)];
    const rowCells = [];
    for (const tc of tcMatches) {
      const tcContent = tc[1];
      const rMatches = [...tcContent.matchAll(/<w:r\b[^>]*>(.*?)<\/w:r>/gs)];
      let cellText = '';
      for (const r of rMatches) {
        const rXml = r[1];
        const isBold = /<w:b(\/|\s+w:val="(true|1)")/.test(rXml) && !/<w:b\s+w:val="(false|0)"/.test(rXml);
        const isItalic = /<w:i(\/|\s+w:val="(true|1)")/.test(rXml) && !/<w:i\s+w:val="(false|0)"/.test(rXml);
        const tMatches = [...rXml.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g)].map(m => m[1]).join('');
        if (!tMatches) continue;
        let formatted = tMatches;
        if (isBold) formatted = `**${formatted}**`;
        if (isItalic) formatted = `*${formatted}*`;
        cellText += formatted;
      }
      rowCells.push(cellText.trim().replace(/\|/g, '\\|'));
    }
    rows.push(rowCells);
  }

  if (rows.length === 0) return '';
  const colCount = Math.max(...rows.map(r => r.length));
  const padRow = (r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push('');
    return copy;
  };

  const header = padRow(rows[0]);
  const sep = Array(colCount).fill('---');
  const bodyRows = rows.slice(1).map(padRow);

  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...bodyRows.map(r => `| ${r.join(' | ')} |`)
  ];
  return lines.join('\n');
}

async function processAll() {
  const finalPosts = [];

  for (const conf of ARTICLES_CONFIG) {
    console.log(`\n========================================`);
    console.log(`Processando artigo: [${conf.id}] ${conf.titulo}`);
    const artPath = path.resolve(`scripts/temp_blog/extracted/${conf.folder}`);
    const relsXml = fs.readFileSync(path.join(artPath, 'word/_rels/document.xml.rels'), 'utf-8');
    const docXml = fs.readFileSync(path.join(artPath, 'word/document.xml'), 'utf-8');

    const relMap = {};
    for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
      relMap[m[1]] = m[2];
    }

    const bodyMatch = docXml.match(/<w:body\b[^>]*>(.*?)<\/w:body>/s);
    if (!bodyMatch) throw new Error(`No w:body found in ${conf.folder}`);
    const bodyContent = bodyMatch[1];

    const elementRegex = /<(w:p|w:tbl)\b[^>]*>(.*?)<\/\1>/gs;
    let elMatch;

    const mdBlocks = [];
    let coverUrl = null;
    let drawingIndex = 0;

    while ((elMatch = elementRegex.exec(bodyContent)) !== null) {
      const tag = elMatch[1];
      const content = elMatch[2];

      if (tag === 'w:tbl') {
        const tableMd = convertTable(content);
        if (tableMd) mdBlocks.push(tableMd);
        continue;
      }

      // Check for drawings in this paragraph
      const drawingEmbeds = [];
      for (const dm of content.matchAll(/<w:drawing>(.*?)<\/w:drawing>/gs)) {
        const dContent = dm[1];
        const rIdMatch = dContent.match(/r:embed="([^"]+)"/);
        const nameMatch = dContent.match(/<pic:cNvPr[^>]*name="([^"]+)"/);
        if (rIdMatch) {
          drawingEmbeds.push({
            target: relMap[rIdMatch[1]] || rIdMatch[1],
            name: nameMatch ? nameMatch[1] : `figura-${drawingIndex + 1}.png`
          });
        }
      }

      if (drawingEmbeds.length > 0) {
        for (const d of drawingEmbeds) {
          if (drawingIndex === 0) {
            // 1st drawing: Cover image!
            const coverLocalPath = path.join(artPath, 'word', d.target);
            const coverR2Key = `blog/capas/${conf.id}.png`;
            coverUrl = await uploadToR2(coverR2Key, coverLocalPath);
            console.log(`✅ Capa enviada: ${coverUrl}`);
            drawingIndex++;
          } else {
            // Subsequent drawing: Content illustration!
            drawingIndex++;
            const cleanName = d.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
            const contentLocalPath = path.join(artPath, 'word', d.target);
            const contentR2Key = `blog/conteudo/${conf.id}-${cleanName}.png`;
            const contentUrl = await uploadToR2(contentR2Key, contentLocalPath);
            console.log(`✅ Ilustração interna enviada: ${contentUrl}`);
            mdBlocks.push(`\n![${cleanName}](${contentUrl})`);
          }
        }
        continue;
      }

      // Process paragraph text runs
      const isHeading = content.includes('1A3A5C') || /<w:pStyle\s+w:val="Heading/.test(content);
      const isBullet = /<w:pStyle\s+w:val="ListBullet"/.test(content);

      const rMatches = [...content.matchAll(/<w:r\b[^>]*>(.*?)<\/w:r>/gs)];
      let pText = '';
      for (const r of rMatches) {
        const rXml = r[1];
        const isBold = /<w:b(\/|\s+w:val="(true|1)")/.test(rXml) && !/<w:b\s+w:val="(false|0)"/.test(rXml);
        const isItalic = /<w:i(\/|\s+w:val="(true|1)")/.test(rXml) && !/<w:i\s+w:val="(false|0)"/.test(rXml);
        const tMatches = [...rXml.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g)].map(m => m[1]).join('');
        if (!tMatches) continue;

        let formatted = tMatches;
        if (!isHeading && formatted.trim().length > 0) {
          const leadingSpace = formatted.match(/^\s*/)[0];
          const trailingSpace = formatted.match(/\s*$/)[0];
          const core = formatted.trim();
          if (isBold && isItalic) {
            formatted = `${leadingSpace}***${core}***${trailingSpace}`;
          } else if (isBold) {
            formatted = `${leadingSpace}**${core}**${trailingSpace}`;
          } else if (isItalic) {
            formatted = `${leadingSpace}*${core}*${trailingSpace}`;
          }
        }
        pText += formatted;
      }

      pText = pText.trim();
      if (!pText) continue;

      // Clean up any adjacent asterisks like "** **"
      pText = pText.replace(/\*\*\s+\*\*/g, ' ').replace(/\*\s+\*/g, ' ');

      // Caption for preceding image
      if (/^Figura\s+\d+:/i.test(pText) || /^\*Figura\s+\d+:/i.test(pText)) {
        mdBlocks.push(`*${pText.replace(/^\*+|\*+$/g, '')}*`);
        continue;
      }

      // Heading or list or normal paragraph
      if (isHeading) {
        const cleanHeading = pText.replace(/^#+\s*/, '');
        mdBlocks.push(`## ${cleanHeading}`);
      } else if (pText.startsWith('### ')) {
        mdBlocks.push(pText);
      } else if (isBullet) {
        if (/^\d+\.\s/.test(pText)) {
          mdBlocks.push(pText);
        } else {
          mdBlocks.push(`- ${pText}`);
        }
      } else {
        mdBlocks.push(pText);
      }
    }

    const fullMd = mdBlocks.join('\n\n');
    const wordCount = fullMd.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(3, Math.round(wordCount / 160));

    finalPosts.push({
      id: conf.id,
      titulo: conf.titulo,
      resumo: conf.resumo,
      imagem_url: coverUrl,
      tema: conf.tema,
      autor: 'Redação Vadimeco',
      data_publicacao: conf.data_publicacao,
      tempo_leitura_min: readTime,
      conteudo_md: fullMd,
    });
  }

  console.log('\n--- TODOS OS 10 ARTIGOS PROCESSADOS COM SUCESSO! ---');

  // Gerar o conteúdo de src/data/blogPosts.ts
  const fileContent = `export type BlogTema =
  | 'Filosofia'
  | 'STF'
  | 'Curiosidades'
  | 'Clássicos'
  | 'Leis'
  | 'Iniciantes'
  | 'Direito Penal'
  | 'Direito Civil'
  | 'Direito Constitucional'
  | 'Direito Administrativo'
  | 'Direito do Trabalho'
  | 'Direito Processual'
  | 'Direito Tributário'
  | 'Carreiras Jurídicas'
  | 'Atualidades Jurídicas'
  | 'Jurisprudência';

export const TEMAS: BlogTema[] = [
  'Iniciantes',
  'Leis',
  'Direito Constitucional',
  'Filosofia',
  'Curiosidades',
  'STF',
  'Clássicos',
  'Direito Penal',
  'Direito Civil',
  'Direito Administrativo',
  'Direito do Trabalho',
  'Direito Processual',
  'Direito Tributário',
  'Carreiras Jurídicas',
  'Atualidades Jurídicas',
  'Jurisprudência',
];

export const TEMA_COLORS: Record<BlogTema, string> = {
  Filosofia: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  STF: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Curiosidades: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Clássicos: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Leis: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  Iniciantes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'Direito Penal': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  'Direito Civil': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  'Direito Constitucional': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'Direito Administrativo': 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  'Direito do Trabalho': 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20',
  'Direito Processual': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'Direito Tributário': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  'Carreiras Jurídicas': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  'Atualidades Jurídicas': 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
  Jurisprudência: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export interface BlogPost {
  id: string;
  titulo: string;
  resumo: string;
  conteudo_md: string;
  imagem_url: string;
  tema: BlogTema;
  autor: string;
  data_publicacao: string; // ISO
  tempo_leitura_min: number;
}

export const BLOG_POSTS: BlogPost[] = ${JSON.stringify(finalPosts, null, 2)};
`;

  fs.writeFileSync('src/data/blogPosts.ts', fileContent, 'utf-8');
  console.log('✅ src/data/blogPosts.ts gerado e gravado com sucesso!');
}

processAll().catch(err => {
  console.error('❌ Erro no processamento:', err);
  process.exit(1);
});
