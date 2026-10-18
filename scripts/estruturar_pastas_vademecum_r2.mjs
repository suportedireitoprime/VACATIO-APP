import { S3Client, PutObjectCommand, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2Endpoint = getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com';
const r2AccessKey = getEnv('R2_ACCESS_KEY_ID');
const r2SecretKey = getEnv('R2_SECRET_ACCESS_KEY');
const r2Bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';

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

// TAXONOMIA COMPLETA DO VADE MECUM VACATIO
const VADEMECUM_TAXONOMIA = {
  codigos: [
    { slug: 'codigo-civil', alias: 'cc', nome: 'Código Civil' },
    { slug: 'codigo-penal', alias: 'cp', nome: 'Código Penal' },
    { slug: 'codigo-processo-civil', alias: 'cpc', nome: 'Código de Processo Civil' },
    { slug: 'codigo-processo-penal', alias: 'cpp', nome: 'Código de Processo Penal' },
    { slug: 'clt', alias: 'clt', nome: 'Consolidação das Leis do Trabalho' },
    { slug: 'codigo-tributario-nacional', alias: 'ctn', nome: 'Código Tributário Nacional' },
    { slug: 'codigo-defesa-consumidor', alias: 'cdc', nome: 'Código de Defesa do Consumidor' },
    { slug: 'codigo-transito-brasileiro', alias: 'ctb', nome: 'Código de Trânsito Brasileiro' },
    { slug: 'codigo-eleitoral', alias: 'ce', nome: 'Código Eleitoral' },
    { slug: 'codigo-penal-militar', alias: 'cpm', nome: 'Código Penal Militar' },
    { slug: 'codigo-processo-penal-militar', alias: 'cppm', nome: 'Código de Processo Penal Militar' },
    { slug: 'codigo-florestal', alias: 'cflor', nome: 'Código Florestal' },
    { slug: 'codigo-comercial', alias: 'ccom', nome: 'Código Comercial' },
    { slug: 'codigo-brasileiro-aeronautica', alias: 'cba', nome: 'Código Brasileiro de Aeronáutica' },
    { slug: 'codigo-aguas', alias: 'cagua', nome: 'Código de Águas' },
    { slug: 'codigo-mineracao', alias: 'cmin', nome: 'Código de Mineração' },
    { slug: 'codigo-brasileiro-telecomunicacoes', alias: 'ctel', nome: 'Código Brasileiro de Telecomunicações' },
  ],
  constituicao: [
    { slug: 'cf88', alias: 'constituicao-federal', nome: 'Constituição da República Federativa do Brasil' },
    { slug: 'emendas-constitucionais', alias: 'emendas', nome: 'Emendas Constitucionais' },
    { slug: 'adct', alias: 'adct', nome: 'Ato das Disposições Constitucionais Transitórias' },
  ],
  estatutos: [
    { slug: 'estatuto-oab', alias: 'eoab', nome: 'Estatuto da Advocacia e da OAB' },
    { slug: 'estatuto-crianca-adolescente', alias: 'eca', nome: 'Estatuto da Criança e do Adolescente' },
    { slug: 'estatuto-idoso', alias: 'ei', nome: 'Estatuto da Pessoa Idosa' },
    { slug: 'estatuto-pessoa-deficiencia', alias: 'epd', nome: 'Estatuto da Pessoa com Deficiência' },
    { slug: 'estatuto-igualdade-racial', alias: 'eir', nome: 'Estatuto da Igualdade Racial' },
    { slug: 'estatuto-cidade', alias: 'ec', nome: 'Estatuto da Cidade' },
    { slug: 'estatuto-desarmamento', alias: 'ed', nome: 'Estatuto do Desarmamento' },
    { slug: 'estatuto-torcedor', alias: 'et', nome: 'Estatuto do Torcedor' },
    { slug: 'estatuto-juventude', alias: 'ej', nome: 'Estatuto da Juventude' },
    { slug: 'estatuto-militares', alias: 'em', nome: 'Estatuto dos Militares' },
    { slug: 'estatuto-indio', alias: 'eind', nome: 'Estatuto do Índio' },
    { slug: 'estatuto-terra', alias: 'eterra', nome: 'Estatuto da Terra' },
    { slug: 'estatuto-migracao', alias: 'emig', nome: 'Estatuto da Migração' },
    { slug: 'estatuto-refugiado', alias: 'eref', nome: 'Estatuto do Refugiado' },
    { slug: 'estatuto-metropole', alias: 'emet', nome: 'Estatuto da Metrópole' },
    { slug: 'estatuto-museus', alias: 'emus', nome: 'Estatuto dos Museus' },
    { slug: 'estatuto-microempresa', alias: 'eme', nome: 'Estatuto da Microempresa' },
    { slug: 'estatuto-pessoa-cancer', alias: 'epc', nome: 'Estatuto da Pessoa com Câncer' },
  ],
  leis_especiais: [
    { slug: 'lei-execucao-penal', alias: 'lep', nome: 'Lei de Execução Penal' },
    { slug: 'lei-maria-da-penha', alias: 'lmp', nome: 'Lei Maria da Penha' },
    { slug: 'lei-drogas', alias: 'ld', nome: 'Lei de Drogas' },
    { slug: 'lei-organizacoes-criminosas', alias: 'loc', nome: 'Lei de Organizações Criminosas' },
    { slug: 'lei-abuso-autoridade', alias: 'laa', nome: 'Lei de Abuso de Autoridade' },
    { slug: 'lei-interceptacao-telefonica', alias: 'lit', nome: 'Lei de Interceptação Telefônica' },
    { slug: 'lei-8112-servidores-federais', alias: 'l8112', nome: 'Regime Jurídico dos Servidores Federais' },
    { slug: 'lei-improbidade-administrativa', alias: 'lia', nome: 'Lei de Improbidade Administrativa' },
    { slug: 'nova-lei-licitacoes', alias: 'nll', nome: 'Nova Lei de Licitações e Contratos' },
    { slug: 'lei-mandado-seguranca', alias: 'lms', nome: 'Lei do Mandado de Segurança' },
    { slug: 'lei-acao-civil-publica', alias: 'lacp', nome: 'Lei da Ação Civil Pública' },
    { slug: 'lei-juizados-especiais', alias: 'lje', nome: 'Lei dos Juizados Especiais Cíveis e Criminais' },
    { slug: 'lei-geral-protecao-dados', alias: 'lgpd', nome: 'Lei Geral de Proteção de Dados (LGPD)' },
    { slug: 'marco-civil-internet', alias: 'mci', nome: 'Marco Civil da Internet' },
    { slug: 'lei-falencias-recuperacao', alias: 'lf', nome: 'Lei de Falências e Recuperação Judicial' },
    { slug: 'lei-arbitragem', alias: 'la', nome: 'Lei de Arbitragem' },
    { slug: 'lei-inquilinato', alias: 'li', nome: 'Lei do Inquilinato' },
    { slug: 'lei-registros-publicos', alias: 'lrp', nome: 'Lei de Registros Públicos' },
    { slug: 'lindb', alias: 'lindb', nome: 'Lei de Introdução às Normas do Direito Brasileiro' },
    { slug: 'lei-diretrizes-bases-educacao', alias: 'ldb', nome: 'Lei de Diretrizes e Bases da Educação' },
    { slug: 'lei-organica-saude-sus', alias: 'lsus', nome: 'Lei Orgânica da Saúde (SUS)' },
    { slug: 'lei-responsabilidade-fiscal', alias: 'lrf', nome: 'Lei de Responsabilidade Fiscal' },
    { slug: 'lei-acesso-informacao', alias: 'lai', nome: 'Lei de Acesso à Informação' },
    { slug: 'lei-sociedades-anonimas', alias: 'lsa', nome: 'Lei das Sociedades Anônimas' },
    { slug: 'lei-propriedade-industrial', alias: 'lpi', nome: 'Lei de Propriedade Industrial' },
    { slug: 'lei-organica-magistratura', alias: 'loman', nome: 'Lei Orgânica da Magistratura Nacional' },
    { slug: 'lei-organica-ministerio-publico', alias: 'lomp', nome: 'Lei Orgânica Nacional do MP' },
    { slug: 'lei-crimes-hediondos', alias: 'lch', nome: 'Lei dos Crimes Hediondos' },
    { slug: 'lei-tortura', alias: 'ltort', nome: 'Lei de Tortura' },
    { slug: 'lei-crimes-ambientais', alias: 'lca', nome: 'Lei dos Crimes Ambientais' },
    { slug: 'lei-racismo', alias: 'lrac', nome: 'Lei de Crimes Resultantes de Preconceito' },
    { slug: 'lei-lavagem-dinheiro', alias: 'llav', nome: 'Lei de Lavagem de Dinheiro' },
    { slug: 'lei-pacote-anticrime', alias: 'pacote-anticrime', nome: 'Pacote Anticrime' },
    { slug: 'lei-henry-borel', alias: 'henry-borel', nome: 'Lei Henry Borel' },
    { slug: 'lei-superendividamento', alias: 'superendividamento', nome: 'Lei do Superendividamento' },
  ],
  areas: [
    { slug: 'direito-civil', nome: 'Direito Civil' },
    { slug: 'direito-penal', nome: 'Direito Penal' },
    { slug: 'direito-constitucional', nome: 'Direito Constitucional' },
    { slug: 'direito-administrativo', nome: 'Direito Administrativo' },
    { slug: 'direito-do-trabalho', nome: 'Direito do Trabalho' },
    { slug: 'direito-tributario', nome: 'Direito Tributário' },
    { slug: 'direito-processual-civil', nome: 'Direito Processual Civil' },
    { slug: 'direito-processual-penal', nome: 'Direito Processual Penal' },
    { slug: 'direito-empresarial', nome: 'Direito Empresarial' },
    { slug: 'direito-previdenciario', nome: 'Direito Previdenciário' },
    { slug: 'direito-ambiental', nome: 'Direito Ambiental' },
    { slug: 'direitos-humanos', nome: 'Direitos Humanos' },
  ],
};

// Seções principais que receberão todas as pastas
const SECOES_RAIZ = [
  'narracoes',
  'mapas',
  'resumos',
  'audioaulas',
  'capas',
  'pdfs',
];

async function criarPastaR2(caminhoPasta) {
  const pastaLimpa = caminhoPasta.replace(/^\/+/, '').replace(/\/+$/, '');
  // Cria .keep para exibição visual imediata no dashboard Cloudflare R2
  const keyKeep = `${pastaLimpa}/.keep`;
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: keyKeep,
        Body: Buffer.from(`Pasta criada pelo Vacatio App: ${pastaLimpa}`),
        ContentType: 'text/plain',
      })
    );
    return true;
  } catch (err) {
    console.error(`Erro ao criar pasta ${caminhoPasta}:`, err.message);
    return false;
  }
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

// Copia/espelha arquivos dentro do próprio R2
async function copiarObjetoR2(sourceKey, targetKey) {
  try {
    const encodedSource = sourceKey.split('/').map(encodeURIComponent).join('/');
    await r2.send(
      new CopyObjectCommand({
        Bucket: r2Bucket,
        CopySource: `${r2Bucket}/${encodedSource}`,
        Key: targetKey,
      })
    );
    return true;
  } catch (err) {
    try {
      await r2.send(
        new CopyObjectCommand({
          Bucket: r2Bucket,
          CopySource: `${r2Bucket}/${sourceKey}`,
          Key: targetKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}

async function listarArquivosPrefixo(prefixo) {
  const lista = [];
  let token = undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: r2Bucket,
        Prefix: prefixo,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    if (res.Contents) {
      for (const item of res.Contents) {
        if (item.Key && !item.Key.endsWith('.keep')) {
          lista.push(item.Key);
        }
      }
    }
    token = res.NextContinuationToken;
  } while (token);
  return lista;
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ CRIANDO ESTRUTURA COMPLETA DE PASTAS NO CLOUDFLARE R2');
  console.log(`Bucket de Destino: ${r2Bucket}`);
  console.log('================================================================\n');

  const listaPastasParaCriar = [];

  for (const secao of SECOES_RAIZ) {
    // 1. Códigos
    for (const item of VADEMECUM_TAXONOMIA.codigos) {
      listaPastasParaCriar.push(`${secao}/codigos/${item.slug}`);
      if (item.alias && item.alias !== item.slug) {
        listaPastasParaCriar.push(`${secao}/codigos/${item.alias}`);
      }
    }

    // 2. Constituição
    for (const item of VADEMECUM_TAXONOMIA.constituicao) {
      listaPastasParaCriar.push(`${secao}/constituicao/${item.slug}`);
    }

    // 3. Estatutos
    for (const item of VADEMECUM_TAXONOMIA.estatutos) {
      listaPastasParaCriar.push(`${secao}/estatutos/${item.slug}`);
      if (item.alias && item.alias !== item.slug) {
        listaPastasParaCriar.push(`${secao}/estatutos/${item.alias}`);
      }
    }

    // 4. Leis Especiais (Extravagantes)
    for (const item of VADEMECUM_TAXONOMIA.leis_especiais) {
      listaPastasParaCriar.push(`${secao}/leis-especiais/${item.slug}`);
      if (item.alias && item.alias !== item.slug) {
        listaPastasParaCriar.push(`${secao}/leis-especiais/${item.alias}`);
      }
    }

    // 5. Áreas do Direito
    for (const item of VADEMECUM_TAXONOMIA.areas) {
      listaPastasParaCriar.push(`${secao}/areas/${item.slug}`);
    }
  }

  // Pastas extras para mídias
  listaPastasParaCriar.push('capas/push');
  listaPastasParaCriar.push('capas/pessoal');
  listaPastasParaCriar.push('capas/mascotes');
  listaPastasParaCriar.push('audioaulas/gravadas');
  listaPastasParaCriar.push('aulas-audio');

  console.log(`📁 Total de pastas a criar na taxonomia: ${listaPastasParaCriar.length}...`);

  let criadas = 0;
  await runConcurrent(listaPastasParaCriar, 10, async (pasta) => {
    const ok = await criarPastaR2(pasta);
    if (ok) criadas++;
  });

  console.log(`✅ ${criadas} pastas estruturadas no R2 com sucesso!\n`);

  // ESPELHAMENTO DOS ÁUDIOS EXISTENTES DE NARRAÇÃO PARA A NOVA TAXONOMIA
  console.log('🔄 ESPELHANDO NARRAÇÕES EXISTENTES PARA AS NOVAS PASTAS...');
  const mapeamentoEspelhamento = [
    { de: 'narracoes/vademecum/cp', para: 'narracoes/codigos/codigo-penal' },
    { de: 'narracoes/vademecum/cp', para: 'narracoes/codigos/cp' },
    { de: 'narracoes/vademecum/cc', para: 'narracoes/codigos/codigo-civil' },
    { de: 'narracoes/vademecum/cc', para: 'narracoes/codigos/cc' },
    { de: 'narracoes/vademecum/cpp', para: 'narracoes/codigos/codigo-processo-penal' },
    { de: 'narracoes/vademecum/cpp', para: 'narracoes/codigos/cpp' },
    { de: 'narracoes/vademecum/estatuto-oab', para: 'narracoes/estatutos/estatuto-oab' },
    { de: 'narracoes/vademecum/estatuto-oab', para: 'narracoes/estatutos/eoab' },
  ];

  for (const m of mapeamentoEspelhamento) {
    const arquivos = await listarArquivosPrefixo(m.de);
    console.log(`   Copiando ${arquivos.length} arquivos de "${m.de}" ➔ "${m.para}"...`);
    
    let copiados = 0;
    await runConcurrent(arquivos, 10, async (src) => {
      const nomeArquivo = src.split('/').pop();
      const dest = `${m.para}/${nomeArquivo}`;
      const ok = await copiarObjetoR2(src, dest);
      if (ok) copiados++;
    });
    console.log(`   ✅ ${copiados} arquivos espelhados em "${m.para}".`);
  }

  // ESPELHAMENTO DAS CAPAS
  console.log('\n🔄 ESPELHANDO CAPAS DE LEIS PARA SUAS PASTAS CORRESPONDENTES...');
  const capasEspelhadas = [
    { src: 'capas/lei-cover-cc.webp', dest: 'capas/codigos/codigo-civil.webp' },
    { src: 'capas/lei-cover-cp.webp', dest: 'capas/codigos/codigo-penal.webp' },
    { src: 'capas/lei-cover-cpp.webp', dest: 'capas/codigos/codigo-processo-penal.webp' },
    { src: 'capas/lei-cover-cpc.webp', dest: 'capas/codigos/codigo-processo-civil.webp' },
    { src: 'capas/lei-cover-clt.webp', dest: 'capas/codigos/clt.webp' },
    { src: 'capas/lei-cover-ctn.webp', dest: 'capas/codigos/codigo-tributario-nacional.webp' },
    { src: 'capas/lei-cover-cdc.webp', dest: 'capas/codigos/codigo-defesa-consumidor.webp' },
    { src: 'capas/lei-cover-ce.webp', dest: 'capas/codigos/codigo-eleitoral.webp' },
    { src: 'capas/lei-cover-cf88.webp', dest: 'capas/constituicao/cf88.webp' },
    { src: 'capas/lei-cover-eoab.webp', dest: 'capas/estatutos/estatuto-oab.webp' },
    { src: 'capas/lei-cover-eca.webp', dest: 'capas/estatutos/estatuto-crianca-adolescente.webp' },
    { src: 'capas/lei-cover-ei.webp', dest: 'capas/estatutos/estatuto-idoso.webp' },
    { src: 'capas/lei-cover-epd.webp', dest: 'capas/estatutos/estatuto-pessoa-deficiencia.webp' },
    { src: 'capas/lei-cover-eir.webp', dest: 'capas/estatutos/estatuto-igualdade-racial.webp' },
    { src: 'capas/lei-cover-ec.webp', dest: 'capas/estatutos/estatuto-cidade.webp' },
    { src: 'capas/lei-cover-ed.webp', dest: 'capas/estatutos/estatuto-desarmamento.webp' },
  ];

  for (const c of capasEspelhadas) {
    await copiarObjetoR2(c.src, c.dest);
  }
  console.log(`✅ ${capasEspelhadas.length} capas organizadas em subpastas de códigos, estatutos e constituição.`);

  console.log('\n================================================================');
  console.log('🎉 ESTRUTURAÇÃO COMPLETA FINALIZADA COM SUCESSO!');
  console.log('================================================================');
}

main().catch(console.error);
