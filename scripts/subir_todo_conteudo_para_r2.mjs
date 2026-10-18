import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// 1. Ler variáveis do .env
const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2Endpoint = getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com';
const r2AccessKey = getEnv('R2_ACCESS_KEY_ID');
const r2SecretKey = getEnv('R2_SECRET_ACCESS_KEY');
const r2Bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const r2PublicUrl = (getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev').replace(/\/+$/, '');

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!r2AccessKey || !r2SecretKey) {
  console.error('❌ Chaves do Cloudflare R2 não encontradas no .env');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

const supabase = createClient(supabaseUrl, supabaseKey);

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.webp': return 'image/webp';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.mp3': return 'audio/mpeg';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.pdf': return 'application/pdf';
    case '.json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

async function existsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadBuffer(key, buffer, contentType) {
  const cleanKey = key.replace(/^\/+/, '');
  await r2.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType || getMimeType(cleanKey),
    })
  );
  return `${r2PublicUrl}/${cleanKey}`;
}

async function uploadLocalFile(localPath, r2Key) {
  const jaExiste = await existsInR2(r2Key);
  if (jaExiste) {
    return { status: 'skipped', r2Key, url: `${r2PublicUrl}/${r2Key}` };
  }
  const buffer = fs.readFileSync(localPath);
  const contentType = getMimeType(localPath);
  await uploadBuffer(r2Key, buffer, contentType);
  return { status: 'uploaded', r2Key, size: buffer.length, url: `${r2PublicUrl}/${r2Key}` };
}

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// Concorrência controlada
async function runConcurrent(items, limit, fn) {
  const results = [];
  const running = new Set();
  for (const item of items) {
    const p = fn(item).then((res) => {
      running.delete(p);
      return res;
    });
    results.push(p);
    running.add(p);
    if (running.size >= limit) {
      await Promise.race(running);
    }
  }
  return Promise.all(results);
}

// Gera PDF elegante para Resumo Jurídico
function gerarPdfResumo(resumo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header com fundo escuro e detalhes em dourado
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 26, 'F');

  doc.setTextColor(234, 179, 8); // dourado/amber
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('VACATIO JURÍDICO — RESUMO INTELIGENTE', margin, 11);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${resumo.area || 'DIREITO'}  •  ${resumo.tema || 'TEMA'}`, margin, 18);

  // Título do Subtema / Conteúdo
  let curY = 36;
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(resumo.subtema || resumo.tema || 'Resumo do Tema', pageW - margin * 2);
  doc.text(titleLines, margin, curY);
  curY += titleLines.length * 7 + 4;

  // Linha divisória
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, curY, pageW - margin, curY);
  curY += 6;

  // Texto Markdown / Explicação
  if (resumo.markdown) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const cleanText = resumo.markdown
      .replace(/###?\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/_(.*?)_/g, '$1');

    const lines = doc.splitTextToSize(cleanText, pageW - margin * 2);
    for (const l of lines) {
      if (curY > pageH - 25) {
        doc.addPage();
        curY = 20;
      }
      doc.text(l, margin, curY);
      curY += 5;
    }
  }

  // Exemplos Práticos
  if (resumo.exemplos) {
    curY += 4;
    if (curY > pageH - 35) { doc.addPage(); curY = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('Exemplos Práticos & Aplicação Forense:', margin, curY);
    curY += 6;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const exLines = doc.splitTextToSize(resumo.exemplos.replace(/\*\*(.*?)\*\*/g, '$1'), pageW - margin * 2);
    for (const l of exLines) {
      if (curY > pageH - 25) { doc.addPage(); curY = 20; }
      doc.text(l, margin, curY);
      curY += 5;
    }
  }

  // Termos-Chave
  if (resumo.termos) {
    curY += 4;
    if (curY > pageH - 35) { doc.addPage(); curY = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Vocabulário & Termos Técnicos:', margin, curY);
    curY += 6;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const termLines = doc.splitTextToSize(resumo.termos.replace(/\*\*(.*?)\*\*/g, '$1'), pageW - margin * 2);
    for (const l of termLines) {
      if (curY > pageH - 25) { doc.addPage(); curY = 20; }
      doc.text(l, margin, curY);
      curY += 5;
    }
  }

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Vacatio App — Material de Consulta e Estudos Jurídicos`, margin, pageH - 8);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// Gera PDF elegante para Mapa Mental
function gerarPdfMapaMental(tema, area, topicos) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Fundo moderno escuro
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, pageH, 'F');

  // Header do Mapa
  doc.setTextColor(234, 179, 8); // dourado
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MAPA MENTAL INTERATIVO — VACATIO', margin, 16);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${area.toUpperCase()}  |  ${tema.toUpperCase()}`, margin, 23);

  // Cartão central
  const centerX = pageW / 2;
  const centerY = pageH / 2;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(centerX - 45, centerY - 15, 90, 30, 4, 4, 'F');
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.8);
  doc.roundedRect(centerX - 45, centerY - 15, 90, 30, 4, 4, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const cTitle = doc.splitTextToSize(tema, 80);
  doc.text(cTitle, centerX, centerY + (cTitle.length > 1 ? -2 : 3), { align: 'center' });

  // Nós ao redor (Ramos do mapa mental)
  const nodes = topicos && topicos.length > 0 ? topicos : [
    { title: 'Conceito & Fundamento Legal', desc: 'Previsão normativa e princípios basilares aplicáveis' },
    { title: 'Requisitos & Elementos', desc: 'Condições indispensáveis para configuração jurídica' },
    { title: 'Exceções & Vedações', desc: 'Hipóteses de afastamento ou proibição expressa em lei' },
    { title: 'Jurisprudência STF / STJ', desc: 'Entendimento sumulado e teses repetitivas vigentes' }
  ];

  const positions = [
    { x: 25, y: 35, w: 75, h: 28 },
    { x: pageW - 100, y: 35, w: 75, h: 28 },
    { x: 25, y: pageH - 45, w: 75, h: 28 },
    { x: pageW - 100, y: pageH - 45, w: 75, h: 28 }
  ];

  nodes.slice(0, 4).forEach((node, idx) => {
    const pos = positions[idx];
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(pos.x, pos.y, pos.w, pos.h, 3, 3, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.roundedRect(pos.x, pos.y, pos.w, pos.h, 3, 3, 'S');

    // Linha de conexão com o centro
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    const nodeCenterX = pos.x + pos.w / 2;
    const nodeCenterY = pos.y + pos.h / 2;
    doc.line(centerX, centerY, nodeCenterX, nodeCenterY);

    // Texto do nó
    doc.setTextColor(234, 179, 8);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(node.title, pos.x + 4, pos.y + 7);

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(node.desc, pos.w - 8);
    doc.text(descLines, pos.x + 4, pos.y + 13);
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Vacatio — Mapas Mentais Estruturados para Alta Retenção', margin, pageH - 6);

  return Buffer.from(doc.output('arraybuffer'));
}

async function main() {
  console.log('================================================================');
  console.log('🚀 SUBINDO TODO CONTEÚDO (CAPAS, ASSETS, RESUMOS, MAPAS, INTROS)');
  console.log(`Bucket R2: ${r2Bucket}`);
  console.log(`CDN R2:    ${r2PublicUrl}`);
  console.log('================================================================\n');

  let stats = {
    capas: { uploaded: 0, skipped: 0 },
    assets: { uploaded: 0, skipped: 0 },
    intros: { uploaded: 0, skipped: 0 },
    sons: { uploaded: 0, skipped: 0 },
    resumos: { uploaded: 0, skipped: 0 },
    mapas: { uploaded: 0, skipped: 0 },
    erros: 0
  };

  // 1. CAPAS LOCAIS (src/assets e public/assets)
  console.log('📸 [1/6] PROCESSANDO E ENVIANDO CAPAS...');
  const allSrc = walkDir('src/assets');
  const allPub = walkDir('public');
  const allLocal = [...allSrc, ...allPub];

  const capasLocais = allLocal.filter((f) => {
    const norm = f.replace(/\\/g, '/');
    const base = path.basename(norm);
    const ext = path.extname(norm).toLowerCase();
    if (!['.webp', '.png', '.jpg', '.jpeg'].includes(ext)) return false;
    return (
      base.startsWith('lei-cover-') ||
      base.startsWith('capa-') ||
      base.startsWith('norma-cover-') ||
      norm.includes('/pessoal/capa-') ||
      norm.includes('/biblioteca/areas/') ||
      norm.includes('/aprender-mascotes/') ||
      base.startsWith('direito-') ||
      base.includes('-cover') ||
      (norm.includes('public/assets/') && !norm.includes('icons'))
    );
  });

  console.log(`   Total de capas identificadas: ${capasLocais.length}`);
  await runConcurrent(capasLocais, 5, async (filePath) => {
    const norm = filePath.replace(/\\/g, '/');
    const base = path.basename(norm);
    
    // Subir tanto com caminho relativo de categoria quanto direto em capas/
    let targetKey = `capas/${base}`;
    if (norm.includes('/biblioteca/areas/')) targetKey = `capas/areas/${base}`;
    else if (norm.includes('/aprender-mascotes/')) targetKey = `capas/mascotes/${base}`;
    else if (norm.includes('/pessoal/')) targetKey = `capas/pessoal/${base}`;

    try {
      const res = await uploadLocalFile(filePath, targetKey);
      if (res.status === 'skipped') stats.capas.skipped++;
      else stats.capas.uploaded++;
      
      // Também garantir que exista na raiz de capas/ caso tenha subpasta
      if (targetKey !== `capas/${base}`) {
        await uploadLocalFile(filePath, `capas/${base}`);
      }
    } catch (err) {
      stats.erros++;
      console.error(`   ❌ Erro ao enviar capa ${base}:`, err.message);
    }
  });

  // 2. ASSETS GERAIS, HEROES, ILUSTRAÇÕES, PERSONAS, ÍCONES
  console.log('\n🎨 [2/6] PROCESSANDO E ENVIANDO ASSETS E ILUSTRAÇÕES...');
  const assetsLocais = allLocal.filter((f) => {
    const norm = f.replace(/\\/g, '/');
    const ext = path.extname(norm).toLowerCase();
    if (!['.webp', '.png', '.jpg', '.jpeg', '.svg'].includes(ext)) return false;
    if (capasLocais.includes(f)) return false;
    return (
      norm.includes('/hero-figures/') ||
      norm.includes('/tematica-figures/') ||
      norm.includes('/aprender-hero/') ||
      norm.includes('/landing-tribunal/') ||
      norm.includes('/onboarding/') ||
      norm.includes('/praticar/') ||
      norm.includes('/radar/') ||
      norm.includes('/radares/') ||
      norm.includes('/horus/') ||
      norm.includes('/icons/') ||
      norm.includes('/logos/') ||
      norm.startsWith('src/assets/')
    );
  });

  console.log(`   Total de assets identificados: ${assetsLocais.length}`);
  await runConcurrent(assetsLocais, 5, async (filePath) => {
    const norm = filePath.replace(/\\/g, '/');
    const base = path.basename(norm);
    
    // Manter subpastas organizadas em assets/
    let sub = '';
    if (norm.includes('/hero-figures/')) sub = 'hero-figures/';
    else if (norm.includes('/tematica-figures/')) sub = 'tematica-figures/';
    else if (norm.includes('/aprender-hero/')) sub = 'aprender-hero/';
    else if (norm.includes('/landing-tribunal/')) sub = 'landing-tribunal/';
    else if (norm.includes('/onboarding/')) sub = 'onboarding/';
    else if (norm.includes('/praticar/')) sub = 'praticar/';
    else if (norm.includes('/radar/')) sub = 'radar/';
    else if (norm.includes('/radares/')) sub = 'radares/';
    else if (norm.includes('/icons/')) sub = 'icons/';
    else if (norm.includes('/logos/')) sub = 'logos/';

    const targetKey = `assets/${sub}${base}`;
    try {
      const res = await uploadLocalFile(filePath, targetKey);
      if (res.status === 'skipped') stats.assets.skipped++;
      else stats.assets.uploaded++;

      // Espelhar na raiz de assets/ se tiver subpasta
      if (sub) {
        await uploadLocalFile(filePath, `assets/${base}`);
      }
    } catch (err) {
      stats.erros++;
      console.error(`   ❌ Erro ao enviar asset ${base}:`, err.message);
    }
  });

  // 3. INTROS EM VÍDEO
  console.log('\n🎬 [3/6] PROCESSANDO E ENVIANDO VÍDEOS DE INTRODUÇÃO...');
  const introsLocais = allLocal.filter((f) => f.replace(/\\/g, '/').includes('/intros/') && f.endsWith('.mp4'));
  console.log(`   Total de intros: ${introsLocais.length}`);
  for (const introPath of introsLocais) {
    const base = path.basename(introPath);
    try {
      const res = await uploadLocalFile(introPath, `intros/${base}`);
      if (res.status === 'skipped') stats.intros.skipped++;
      else stats.intros.uploaded++;
      console.log(`   ✅ Intro enviada: intros/${base}`);
    } catch (err) {
      stats.erros++;
      console.error(`   ❌ Erro em intro ${base}:`, err.message);
    }
  }

  // 4. SONS E EFEITOS SONOROS
  console.log('\n🔔 [4/6] PROCESSANDO E ENVIANDO EFEITOS SONOROS...');
  const sonsLocais = allLocal.filter((f) => f.endsWith('.mp3'));
  console.log(`   Total de sons: ${sonsLocais.length}`);
  for (const somPath of sonsLocais) {
    const base = path.basename(somPath);
    try {
      const res = await uploadLocalFile(somPath, `sons/${base}`);
      if (res.status === 'skipped') stats.sons.skipped++;
      else stats.sons.uploaded++;
    } catch (err) {
      stats.erros++;
      console.error(`   ❌ Erro em som ${base}:`, err.message);
    }
  }

  // 5. RESUMOS JURÍDICOS (PDFs gerados para a pasta resumos/)
  console.log('\n📄 [5/6] GERANDO E ENVIANDO PDFs DE RESUMOS JURÍDICOS...');
  try {
    const { data: resumos, error: rErr } = await supabase
      .from('resumos_juridicos')
      .select('*')
      .limit(30);

    if (rErr || !resumos || resumos.length === 0) {
      console.warn('   Nenhum resumo encontrado ou erro na tabela:', rErr?.message);
    } else {
      console.log(`   Gerando PDFs para ${resumos.length} resumos jurídicos chave...`);
      await runConcurrent(resumos, 4, async (item) => {
        const slugArea = (item.area || 'geral').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const slugTema = (item.subtema || item.tema || `resumo-${item.id}`).toLowerCase().replace(/[^a-z0-9]/g, '-');
        const pdfKey = `resumos/${slugArea}/${slugTema}.pdf`;
        
        try {
          const jaExiste = await existsInR2(pdfKey);
          if (jaExiste) {
            stats.resumos.skipped++;
            return;
          }
          const pdfBuffer = gerarPdfResumo(item);
          await uploadBuffer(pdfKey, pdfBuffer, 'application/pdf');
          stats.resumos.uploaded++;
          console.log(`   ✅ PDF Resumo gerado: ${pdfKey}`);
        } catch (err) {
          stats.erros++;
          console.error(`   ❌ Erro gerando PDF ${pdfKey}:`, err.message);
        }
      });
    }
  } catch (err) {
    console.error('   ❌ Falha ao processar resumos:', err.message);
  }

  // 6. MAPAS MENTAIS (PDFs gerados para a pasta mapas/)
  console.log('\n🧠 [6/6] GERANDO E ENVIANDO PDFs DE MAPAS MENTAIS...');
  const mapasTemas = [
    { tema: 'Personalidade e Capacidade Civil', area: 'Direito Civil' },
    { tema: 'Teoria Geral do Crime e Ilicitude', area: 'Direito Penal' },
    { tema: 'Controle de Constitucionalidade', area: 'Direito Constitucional' },
    { tema: 'Atos Administrativos e Poderes', area: 'Direito Administrativo' },
    { tema: 'Princípios do Direito do Trabalho', area: 'Direito do Trabalho' },
    { tema: 'Competência e Jurisdição Civil', area: 'Direito Processual Civil' },
    { tema: 'Prisão em Flagrante e Cautelares', area: 'Direito Processual Penal' },
    { tema: 'Sistema Tributário e Limitações', area: 'Direito Tributário' },
    { tema: 'Direitos Fundamentais da Criança', area: 'Estatuto da Criança e do Adolescente' },
    { tema: 'Ética e Prerrogativas do Advogado', area: 'Estatuto da OAB' },
  ];

  for (const m of mapasTemas) {
    const slug = m.tema.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const mapaKey = `mapas/${slug}.pdf`;
    try {
      const jaExiste = await existsInR2(mapaKey);
      if (jaExiste) {
        stats.mapas.skipped++;
        continue;
      }
      const pdfBuf = gerarPdfMapaMental(m.tema, m.area);
      await uploadBuffer(mapaKey, pdfBuf, 'application/pdf');
      stats.mapas.uploaded++;
      console.log(`   ✅ PDF Mapa Mental gerado: ${mapaKey}`);
    } catch (err) {
      stats.erros++;
      console.error(`   ❌ Erro gerando Mapa Mental ${mapaKey}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 SINCRONIZAÇÃO COMPLETA PARA CLOUDFLARE R2!');
  console.log(`📸 Capas:          ${stats.capas.uploaded} enviadas, ${stats.capas.skipped} já existiam`);
  console.log(`🎨 Assets Gerais:  ${stats.assets.uploaded} enviadas, ${stats.assets.skipped} já existiam`);
  console.log(`🎬 Intros Vídeo:   ${stats.intros.uploaded} enviadas, ${stats.intros.skipped} já existiam`);
  console.log(`🔔 Efeitos Sons:   ${stats.sons.uploaded} enviadas, ${stats.sons.skipped} já existiam`);
  console.log(`📄 Resumos PDFs:   ${stats.resumos.uploaded} gerados/enviados`);
  console.log(`🧠 Mapas Mentais:  ${stats.mapas.uploaded} gerados/enviados`);
  console.log(`❌ Erros:          ${stats.erros}`);
  console.log('================================================================');
}

main().catch(console.error);
