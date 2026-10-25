#!/usr/bin/env node
/**
 * ============================================================================
 * ROBÔ POPULADOR CTRESB/LEIS ➔ SUPABASE (VACATIO APP)
 * ============================================================================
 * 
 * Baixa e converte legislações em Markdown do repositório oficial
 * https://github.com/ctresb/leis e alimenta as tabelas `vade_mecum_leis`
 * e `vade_mecum_artigos` no Supabase com logs ricos e coloridos no terminal.
 * 
 * USO:
 *   node scripts/robo-ctresb-populador.mjs --target=tratados
 *   node scripts/robo-ctresb-populador.mjs --target=leis-zeradas
 *   node scripts/robo-ctresb-populador.mjs --target=leis-complementares --limit=10
 *   node scripts/robo-ctresb-populador.mjs --target=sumulas-stf
 *   node scripts/robo-ctresb-populador.mjs --target=sumulas-stj
 *   node scripts/robo-ctresb-populador.mjs --slug=lei-tortura
 *   node scripts/robo-ctresb-populador.mjs --dry-run
 */

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTQ5MzM5NiwiZXhwIjoyMTA3MDY5Mzk2fQ.uKcOa5aozLwLOinGs4oI-TJuBiTaYTA_Exa-nh5hdCQ';

const REPO_BRANCH = 'main';
const GITHUB_RAW = `https://raw.githubusercontent.com/ctresb/leis/${REPO_BRANCH}`;
const GITHUB_API = 'https://api.github.com/repos/ctresb/leis';

// Cores ANSI para o terminal
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Mapeamento de Tratados e Leis Federais mapeadas diretamente do repositório ctresb/leis
const DIRECT_MAPPINGS = [
  // 1. Tratados de Direitos Humanos
  {
    path: 'tratados/direitos-humanos/sanjose.md',
    slugs: ['pacto-san-jose', 'cadh'],
    nome: 'Pacto de San José da Costa Rica (Decreto 678/1992)',
    nome_curto: 'San José',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/belem.md',
    slugs: ['convencao-belem-para'],
    nome: 'Convenção de Belém do Pará (Violência contra a Mulher)',
    nome_curto: 'Belém do Pará',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/pacto.md',
    slugs: ['pidcp'],
    nome: 'Pacto Internacional sobre Direitos Civis e Políticos',
    nome_curto: 'PIDCP',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/crianca.md',
    slugs: ['convencao-direitos-crianca'],
    nome: 'Convenção sobre os Direitos da Criança (Decreto 99.710/1990)',
    nome_curto: 'Direitos da Criança',
    categoria: 'estatuto',
  },
  {
    path: 'tratados/direitos-humanos/genocidio.md',
    slugs: ['convencao-genocidio'],
    nome: 'Convenção para a Prevenção e Repressão do Crime de Genocídio',
    nome_curto: 'Genocídio',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/degrdant.md',
    slugs: ['convencao-contra-tortura'],
    nome: 'Convenção contra a Tortura e Outros Tratos Cruéis (Decreto 40/1991)',
    nome_curto: 'Contra Tortura',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/discrimulher.md',
    slugs: ['convencao-cedaw-mulher'],
    nome: 'Convenção sobre a Eliminação de Discriminação contra a Mulher (CEDAW)',
    nome_curto: 'CEDAW Mulher',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/discriraci.md',
    slugs: ['convencao-cerd-racial'],
    nome: 'Convenção Internacional sobre a Eliminação de Discriminação Racial (CERD)',
    nome_curto: 'CERD Racial',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/refugiados.md',
    slugs: ['convencao-refugiados-1951'],
    nome: 'Estatuto dos Refugiados de 1951 (Decreto 50.215/1961)',
    nome_curto: 'Refugiados 1951',
    categoria: 'estatuto',
  },
  {
    path: 'tratados/direitos-humanos/refugiados66.md',
    slugs: ['protocolo-refugiados-1967'],
    nome: 'Protocolo sobre o Estatuto dos Refugiados de 1967 (Decreto 70.946/1972)',
    nome_curto: 'Refugiados 1967',
    categoria: 'estatuto',
  },
  {
    path: 'tratados/direitos-humanos/cartagena.md',
    slugs: ['declaracao-cartagena'],
    nome: 'Declaração de Cartagena sobre Refugiados de 1984',
    nome_curto: 'Cartagena 1984',
    categoria: 'lei',
  },
  {
    path: 'tratados/direitos-humanos/direitos.md',
    slugs: ['declaracao-universal-direitos-humanos', 'dudh'],
    nome: 'Declaração Universal dos Direitos Humanos (DUDH 1948)',
    nome_curto: 'DUDH',
    categoria: 'lei',
  },
  // 2. Leis Federais Ordinárias e Especiais
  {
    path: 'federal/leis-ordinarias/1997/lei-9455-1997-04-07.md',
    slugs: ['lei-tortura', 'ltort'],
    nome: 'Lei de Tortura (Lei nº 9.455/1997)',
    nome_curto: 'Tortura',
    categoria: 'lei',
  },
  {
    path: 'federal/leis-ordinarias/2002/lei-10520-2002-07-17.md',
    slugs: ['lei-pregao'],
    nome: 'Lei do Pregão (Lei nº 10.520/2002)',
    nome_curto: 'Pregão',
    categoria: 'lei',
  },
  {
    path: 'federal/leis-ordinarias/2015/lei-13104-2015-03-09.md',
    slugs: ['lei-feminicidio'],
    nome: 'Lei do Feminicídio (Lei nº 13.104/2015)',
    nome_curto: 'Feminicídio',
    categoria: 'lei',
  },
  {
    path: 'federal/leis-ordinarias/2024/lei-14967-2024-09-09.md',
    slugs: ['estatuto-seguranca-privada'],
    nome: 'Estatuto da Segurança Privada (Lei nº 14.967/2024)',
    nome_curto: 'Segurança Privada',
    categoria: 'estatuto',
  },
  {
    path: 'federal/leis-ordinarias/1968/lei-5540-1968-11-28.md',
    slugs: ['estatuto-magisterio'],
    nome: 'Lei da Reforma Universitária (Lei nº 5.540/1968)',
    nome_curto: 'Magistério Superior',
    categoria: 'estatuto',
  },
];

// 3. Constituições Históricas do Brasil (ctresb/leis -> federal/constituicoes-historicas)
const HISTORICAL_CONSTITUTIONS = [
  {
    path: 'federal/constituicoes-historicas/1824/constituicao-1824.md',
    slugs: ['constituicao-1824'],
    nome: 'Constituição Política do Império do Brasil de 1824',
    nome_curto: 'CF 1824',
    categoria: 'constituicao',
    ano_lei: 1824,
    numero_lei: '1824',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao24.htm',
    ementa: 'Constituição Política do Império do Brasil, outorgada em 25 de março de 1824.',
  },
  {
    path: 'federal/constituicoes-historicas/1891/constituicao-1891.md',
    slugs: ['constituicao-1891'],
    nome: 'Constituição da República dos Estados Unidos do Brasil de 1891',
    nome_curto: 'CF 1891',
    categoria: 'constituicao',
    ano_lei: 1891,
    numero_lei: '1891',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao91.htm',
    ementa: 'Constituição da República dos Estados Unidos do Brasil, de 24 de fevereiro de 1891.',
  },
  {
    path: 'federal/constituicoes-historicas/1934/constituicao-1934.md',
    slugs: ['constituicao-1934'],
    nome: 'Constituição da República dos Estados Unidos do Brasil de 1934',
    nome_curto: 'CF 1934',
    categoria: 'constituicao',
    ano_lei: 1934,
    numero_lei: '1934',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao34.htm',
    ementa: 'Constituição da República dos Estados Unidos do Brasil, de 16 de julho de 1934.',
  },
  {
    path: 'federal/constituicoes-historicas/1937/constituicao-1937.md',
    slugs: ['constituicao-1937'],
    nome: 'Constituição dos Estados Unidos do Brasil de 1937 (Polaca)',
    nome_curto: 'CF 1937',
    categoria: 'constituicao',
    ano_lei: 1937,
    numero_lei: '1937',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao37.htm',
    ementa: 'Constituição dos Estados Unidos do Brasil, outorgada em 10 de novembro de 1937.',
  },
  {
    path: 'federal/constituicoes-historicas/1946/constituicao-1946.md',
    slugs: ['constituicao-1946'],
    nome: 'Constituição dos Estados Unidos do Brasil de 1946',
    nome_curto: 'CF 1946',
    categoria: 'constituicao',
    ano_lei: 1946,
    numero_lei: '1946',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao46.htm',
    ementa: 'Constituição dos Estados Unidos do Brasil, promulgada em 18 de setembro de 1946.',
  },
  {
    path: 'federal/constituicoes-historicas/1967/constituicao-1967.md',
    slugs: ['constituicao-1967'],
    nome: 'Constituição da República Federativa do Brasil de 1967',
    nome_curto: 'CF 1967',
    categoria: 'constituicao',
    ano_lei: 1967,
    numero_lei: '1967',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao67.htm',
    ementa: 'Constituição da República Federativa do Brasil, promulgada em 24 de janeiro de 1967.',
  },
  {
    path: 'federal/constituicoes-historicas/1969/constituicao-1967-emenda-1-1969.md',
    slugs: ['constituicao-1969'],
    nome: 'Constituição da República de 1967 (Emenda Constitucional nº 1/1969)',
    nome_curto: 'EC 01/1969',
    categoria: 'constituicao',
    ano_lei: 1969,
    numero_lei: '1/1969',
    planalto_url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao67emc69.htm',
    ementa: 'Texto constitucional de 1967 com a redação dada pela Emenda Constitucional nº 1, de 17 de outubro de 1969.',
  },
];

// Parser avançado de artigos em Markdown com suporte a leis modernas e históricas
function parseMarkdownArticles(markdown) {
  let yamlMeta = {};
  let body = markdown;
  const yamlMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (yamlMatch) {
    const rawYaml = yamlMatch[1];
    for (const line of rawYaml.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.substring(0, idx).trim();
        const v = line.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        yamlMeta[k] = v;
      }
    }
    body = markdown.substring(yamlMatch[0].length);
  }

  // Correção de inconsistências OCR comuns das fontes oficiais
  body = body.replace(/Art\.\s*14I\./g, 'Art. 141.');

  const lines = body.split('\n');
  const articles = [];
  let currentArt = null;
  let inAdct = false;

  // Regex para captura da linha de cabeçalho do artigo
  // Exemplos suportados:
  //   **Art. 1.** O IMPERIO...
  //   Art 1º - A Nação...
  //   **Art. 1º** A Nação...
  //   **Art.6º** - O Governo...
  //   Art - 184 - O patrimônio...
  //   Art.. 81. Estes Conselhos...
  const artHeaderRegex = /^(?:\*{0,2}Art(?:\.{1,2}|igo)?\s*[-–—.]?\s*(\d+[º°ª\w\-]*)\.?\*{0,2}(?:\s*[-–—.]\s*|\s*))([\s\S]*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detecção contextual do ADCT após os artigos regulares já terem iniciado
    if (articles.length >= 20 && /^\s*#{0,4}\s*(?:disposiç[õo]es transit[óo]rias|ato das disposiç[õo]es)/i.test(line.trim())) {
      inAdct = true;
    }

    const match = line.match(artHeaderRegex);
    if (match) {
      if (currentArt) {
        articles.push(currentArt);
      }
      const rawNum = match[1].replace(/[º°ª\.]/g, '').trim();
      const numInt = parseInt(rawNum, 10);
      const isAdctNumber = inAdct && !isNaN(numInt) && numInt < 50;
      const prefix = isAdctNumber ? 'ADCT ' : '';
      const numero = prefix + rawNum;
      const epigrafe = (isAdctNumber ? 'ADCT ' : '') + 'Art. ' + match[1];
      const initialText = match[2].trim();
      currentArt = {
        numero,
        epigrafe,
        lines: initialText ? [initialText] : []
      };
    } else if (currentArt) {
      currentArt.lines.push(line);
    }
  }
  if (currentArt) {
    articles.push(currentArt);
  }

  // Se o parser linha-a-linha capturou artigos, formata e retorna
  if (articles.length > 0) {
    const blocos = articles.map((a) => {
      const corpo = a.lines.join('\n').trim();
      const textoCompleto = `${a.epigrafe}\n\n${corpo}`.trim();
      return {
        numero: a.numero,
        epigrafe: a.epigrafe,
        texto: textoCompleto,
      };
    });
    return { yamlMeta, blocos, bodyLength: body.length };
  }

  // Fallback para regex contínuo se necessário
  const artRegexFallback = /(?:\n|^)(?:\*\*Art(?:igo)?\.?\s*(\d+[ºo°]?|[A-Za-z0-9\-]+)\.?\*\*\s*[-–—.]?\s*(.*?)(?=\n|$)|Art(?:igo)?\.?\s*(\d+[ºo°]?|[A-Za-z0-9\-]+)\.?\s*[-–—.]?\s*(.*?)(?=\n|$))([\s\S]*?)(?=(?:\n(?:\*\*Art(?:igo)?\.?\s*\d+|\bArt(?:igo)?\.?\s*\d+))|$)/gi;
  const blocos = [];
  let m;
  while ((m = artRegexFallback.exec(body)) !== null) {
    const rawNum = m[1] || m[3];
    const epigrafe = (m[2] || m[4] || '').trim();
    const corpo = (m[5] || '').trim();

    let numero = rawNum;
    if (/^[1-9]$/.test(numero)) {
      numero = `${numero}º`;
    }

    const textoCompleto = `Art. ${numero}${epigrafe ? ' — ' + epigrafe : ''}\n\n${corpo}`.trim();

    blocos.push({
      numero,
      epigrafe: epigrafe || null,
      texto: textoCompleto,
    });
  }

  return { yamlMeta, blocos, bodyLength: body.length };
}

async function supaFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function findOrCreateLei(leiInfo) {
  for (const slug of leiInfo.slugs || [leiInfo.slug]) {
    const res = await supaFetch(`vade_mecum_leis?slug=eq.${encodeURIComponent(slug)}&select=id,slug,nome,total_artigos`);
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows[0]) {
        // Atualiza metadados complementares se existirem
        if (leiInfo.planalto_url || leiInfo.ano_lei || leiInfo.ementa) {
          await supaFetch(`vade_mecum_leis?id=eq.${rows[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              planalto_url: leiInfo.planalto_url || undefined,
              ano_lei: leiInfo.ano_lei || undefined,
              numero_lei: leiInfo.numero_lei || undefined,
              ementa: leiInfo.ementa || undefined,
              categoria: leiInfo.categoria || undefined,
            }),
          });
        }
        return rows[0];
      }
    }
  }

  const primarySlug = leiInfo.slugs ? leiInfo.slugs[0] : leiInfo.slug;
  const insertPayload = {
    slug: primarySlug,
    nome: leiInfo.nome,
    nome_curto: leiInfo.nome_curto || leiInfo.nome,
    categoria: leiInfo.categoria || 'lei',
    planalto_url: leiInfo.planalto_url || null,
    ano_lei: leiInfo.ano_lei || null,
    numero_lei: leiInfo.numero_lei || null,
    ementa: leiInfo.ementa || null,
    total_artigos: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const createRes = await supaFetch('vade_mecum_leis', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(insertPayload),
  });

  if (!createRes.ok) {
    throw new Error(`Falha ao criar lei: ${createRes.status} ${await createRes.text()}`);
  }

  const created = await createRes.json();
  return created[0];
}

async function populateLaw(lei, blocos, dryRun = false) {
  if (dryRun) {
    return { ok: true, dryRun: true, artigos: blocos.length };
  }

  // Limpa artigos antigos
  const delRes = await supaFetch(`vade_mecum_artigos?lei_id=eq.${lei.id}`, {
    method: 'DELETE',
  });
  if (!delRes.ok) {
    throw new Error(`Falha ao limpar artigos antigos: ${delRes.status}`);
  }

  // Insere em lotes de 100
  const rows = blocos.map((b, idx) => ({
    lei_id: lei.id,
    numero: b.numero,
    epigrafe: b.epigrafe,
    texto: b.texto,
    ordem: idx + 1,
    revogado: false,
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const insRes = await supaFetch('vade_mecum_artigos', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    });
    if (!insRes.ok) {
      throw new Error(`Falha no lote ${i}-${i + batch.length}: ${insRes.status} ${await insRes.text()}`);
    }
  }

  // Atualiza total na lei
  await supaFetch(`vade_mecum_leis?id=eq.${lei.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      total_artigos: blocos.length,
      updated_at: new Date().toISOString(),
    }),
  });

  return { ok: true, artigos: blocos.length };
}

function printBanner() {
  console.log(`${c.magenta}${c.bold}========================================================================${c.reset}`);
  console.log(`${c.magenta}${c.bold}   VACATIO APP ➔ ROBÔ POPULADOR DE LEIS EM MARKDOWN (ctresb/leis)       ${c.reset}`);
  console.log(`${c.magenta}${c.bold}========================================================================${c.reset}`);
  console.log(`${c.cyan}Origem:${c.reset}  https://github.com/ctresb/leis (323.849 normas estruturadas)`);
  console.log(`${c.cyan}Destino:${c.reset} Supabase (${SUPABASE_URL}) ➔ tabelas vade_mecum_leis / artigos`);
  console.log(`${c.magenta}------------------------------------------------------------------------${c.reset}\n`);
}

async function runList(items, dryRun = false) {
  let countSuccess = 0;
  let countArticlesTotal = 0;

  for (const item of items) {
    const url = `${GITHUB_RAW}/${item.path}`;
    const primarySlug = item.slugs ? item.slugs[0] : item.slug;
    process.stdout.write(`${c.cyan}➔ Processando ${c.bold}${primarySlug}${c.reset} (${item.nome})... `);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`${c.red}[FALHA HTTP ${res.status}]${c.reset}`);
        continue;
      }

      const md = await res.text();
      const { blocos } = parseMarkdownArticles(md);

      if (blocos.length === 0) {
        console.log(`${c.yellow}[AVISO: 0 artigos encontrados]${c.reset}`);
        continue;
      }

      process.stdout.write(`${c.green}${blocos.length} arts.${c.reset} `);

      const lei = await findOrCreateLei(item);
      await populateLaw(lei, blocos, dryRun);

      console.log(`${c.green}${c.bold}[OK]${c.reset}`);
      countSuccess++;
      countArticlesTotal += blocos.length;
    } catch (err) {
      console.log(`${c.red}[ERRO: ${err.message}]${c.reset}`);
    }
  }

  console.log(`\n${c.green}${c.bold}✔ Processamento Concluído!${c.reset}`);
  console.log(`Leis atualizadas com sucesso: ${c.bold}${countSuccess}/${items.length}${c.reset}`);
  console.log(`Total de artigos gravados no banco: ${c.bold}${countArticlesTotal}${c.reset}\n`);
}

async function runLeisZeradas(dryRun = false) {
  console.log(`${c.yellow}${c.bold}[MODO: PREENCHIMENTO INTELIGENTE DE LEIS ZERADAS]${c.reset}`);
  console.log(`Consultando Supabase por leis com total_artigos = 0...\n`);

  const res = await supaFetch('vade_mecum_leis?total_artigos=eq.0&select=id,slug,nome,nome_curto,categoria');
  if (!res.ok) {
    console.error('Falha ao buscar leis zeradas:', res.status, await res.text());
    return;
  }

  const zeradas = await res.json();
  if (zeradas.length === 0) {
    console.log(`${c.green}${c.bold}🎉 PARABÉNS! Não há nenhuma lei zerada no Supabase! Todas estão populadas!${c.reset}\n`);
    return;
  }

  console.log(`Encontradas ${c.bold}${c.red}${zeradas.length} leis zeradas${c.reset} no banco:\n`);
  for (const l of zeradas) {
    console.log(` • [${l.categoria}] ${c.bold}${l.nome}${c.reset} (slug: ${c.cyan}${l.slug}${c.reset})`);
  }

  console.log(`\n${c.cyan}Cruzando com o acervo do ctresb/leis...${c.reset}\n`);

  let resolvidas = 0;
  for (const l of zeradas) {
    const match = DIRECT_MAPPINGS.find((m) => m.slugs.includes(l.slug));
    if (match) {
      process.stdout.write(`${c.cyan}➔ Preenchendo ${c.bold}${l.slug}${c.reset} via ${match.path}... `);
      try {
        const url = `${GITHUB_RAW}/${match.path}`;
        const mdRes = await fetch(url);
        if (mdRes.ok) {
          const md = await mdRes.text();
          const { blocos } = parseMarkdownArticles(md);
          if (blocos.length > 0) {
            await populateLaw(l, blocos, dryRun);
            console.log(`${c.green}${c.bold}[OK: ${blocos.length} artigos gravados!]${c.reset}`);
            resolvidas++;
            continue;
          }
        }
      } catch (e) {
        console.log(`${c.red}[Erro: ${e.message}]${c.reset}`);
        continue;
      }
    }
    console.log(`${c.dim} • ${l.slug}: Mapeamento pendente${c.reset}`);
  }

  console.log(`\n${c.green}${c.bold}✔ Resolução concluída: ${resolvidas} de ${zeradas.length} leis zeradas foram preenchidas!${c.reset}\n`);
}

async function main() {
  printBanner();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetArg = args.find((a) => a.startsWith('--target='));
  const target = targetArg ? targetArg.split('=')[1] : 'tratados';
  const slugArg = args.find((a) => a.startsWith('--slug='));

  if (dryRun) {
    console.log(`${c.yellow}${c.bold}*** MODO DRY-RUN ATIVADO (NENHUMA GRAVAÇÃO NO BANCO) ***${c.reset}\n`);
  }

  const allCatalogItems = [...DIRECT_MAPPINGS, ...HISTORICAL_CONSTITUTIONS];

  if (slugArg) {
    const slug = slugArg.split('=')[1];
    const item = allCatalogItems.find((m) => m.slugs.includes(slug));
    if (!item) {
      console.log(`${c.red}Lei com slug "${slug}" não encontrada nos mapeamentos diretos.${c.reset}`);
      return;
    }
    await runList([item], dryRun);
    return;
  }

  if (target === 'constituicoes' || target === 'constituicoes-historicas') {
    console.log(`${c.yellow}${c.bold}[MODO: CONSTITUIÇÕES HISTÓRICAS DO BRASIL (1824 - 1969)]${c.reset}\n`);
    await runList(HISTORICAL_CONSTITUTIONS, dryRun);
  } else if (target === 'tratados') {
    const tratadosItems = DIRECT_MAPPINGS.filter((m) => m.path.startsWith('tratados/'));
    await runList(tratadosItems, dryRun);
  } else if (target === 'leis-zeradas') {
    await runLeisZeradas(dryRun);
  } else if (target === 'todas-mapeadas') {
    await runList(allCatalogItems, dryRun);
  } else {
    console.log(`${c.yellow}Alvo "${target}" desconhecido. Alvos válidos:${c.reset}`);
    console.log(`  --target=constituicoes    (Popula as 7 Constituições Históricas do Brasil: 1824 a 1969)`);
    console.log(`  --target=tratados         (Popula todos os 12 Tratados de Direitos Humanos)`);
    console.log(`  --target=leis-zeradas     (Audita e preenche as leis vazias do Supabase)`);
    console.log(`  --target=todas-mapeadas   (Popula todas as leis mapeadas do ctresb/leis)`);
    console.log(`  --slug=<slug-da-lei>      (Popula uma lei específica)`);
  }
}

main().catch((err) => {
  console.error(`\n${c.red}${c.bold}[FATAL ERROR]${c.reset}`, err);
  process.exit(1);
});
