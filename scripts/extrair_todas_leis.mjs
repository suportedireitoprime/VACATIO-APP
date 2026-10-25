#!/usr/bin/env node
/**
 * ============================================================================
 * ROBÔ DE EXTRAÇÃO EM MASSA DE LEGISLAÇÃO ➔ SUPABASE (VACATIO APP)
 * ============================================================================
 * 
 * Extrai e sincroniza em lote todas as legislações diretamente do Planalto
 * para o Supabase (banco tlpxubeagmxapkysgobk), populando as tabelas
 * `vade_mecum_leis` e `vade_mecum_artigos`.
 * 
 * RECURSOS ESPECIAIS:
 * - Extração de Epígrafe / Nomen Juris: Leis penais (Código Penal, CPM,
 *   Lei de Drogas, etc.) têm os nomes dos crimes/tipos penais capturados
 *   automaticamente e salvos na coluna `epigrafe`. Leis civis e constitucionais
 *   são tratadas com rigor para manter `epigrafe: null`, sem falsos positivos.
 * - Preservação de Enriquecimento: Mantém comentários, flashcards, narrações,
 *   explicações e questões pré-existentes.
 * - Rate limiting e segurança: Pausas configuráveis entre requisições.
 * - Modo Dry-run: Permite simular e ver estatísticas sem alterar o banco.
 * 
 * USO NO TERMINAL:
 *   # Extrair apenas leis pendentes (sem extração ou zeradas):
 *   node scripts/extrair_todas_leis.mjs --pendentes
 * 
 *   # Extrair todas as leis de uma categoria específica (ex: constituicao, codigo, estatuto):
 *   node scripts/extrair_todas_leis.mjs --categoria=constituicao
 *   node scripts/extrair_todas_leis.mjs --categoria=codigo
 * 
 *   # Extrair uma lei individual por slug (ex: cp, cc, cpm, clt):
 *   node scripts/extrair_todas_leis.mjs --slug=cp
 * 
 *   # Testar sem gravar no banco (Dry-run):
 *   node scripts/extrair_todas_leis.mjs --slug=cp --dry-run
 * 
 *   # Extrair absolutamente TODAS as leis cadastradas:
 *   node scripts/extrair_todas_leis.mjs --todas
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (Backend de Legislação Vade Mecum)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tlpxubeagmxapkysgobk.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTQ5MzM5NiwiZXhwIjoyMTA3MDY5Mzk2fQ.uKcOa5aozLwLOinGs4oI-TJuBiTaYTA_Exa-nh5hdCQ';

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Cores ANSI para o terminal
const clr = {
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
  bgBlue: '\x1b[44m',
};

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function fetchHtmlOnce(url) {
  const fullUrl = url.replace(/^http:/, 'https:');
  const res = await fetch(fullUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${fullUrl}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let html;
  try {
    html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    html = new TextDecoder('windows-1252').decode(bytes);
  }
  return html
    .normalize('NFC')
    .replace(/\uFFFD/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function urlVariants(url) {
  const u = url.replace(/^http:/, 'https:');
  const out = new Set([u]);
  if (/compilado\.htm$/i.test(u)) out.add(u.replace(/compilado\.htm$/i, '.htm'));
  else if (/\.htm$/i.test(u)) out.add(u.replace(/\.htm$/i, 'compilado.htm'));
  out.add(u.replace('/LEIS/', '/leis/'));
  out.add(u.replace('/leis/', '/LEIS/'));
  out.add(u.replace('://www.planalto', '://planalto'));
  out.add(u.replace('://planalto', '://www.planalto'));
  return [...out];
}

async function fetchHtml(url) {
  const variants = urlVariants(url);
  let lastErr = null;
  for (const v of variants) {
    try {
      return await fetchHtmlOnce(v);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const HIER_RE =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)(?:\s+(?:[IVXLCDM]+|[ÚU]NICO|[ÚU]NICA|PRELIMINAR|GERAL|ESPECIAL|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[ÉE]TIMA|OITAVA|NONA|D[ÉE]CIMA|\d+[ºª°]?)\b[\s\S]*|\s*)$/i;

// Aceita "Art. 1", "Art. 1º", "Art 1º" (sem ponto, comum em 1891/1937/1946/1967), "Art. 1.368-C", etc.
// Exige "Art" com A maiúsculo: referências internas em minúscula ("art. 5º") não viram artigo novo.
const ART_RE = /^Art\.?\s*(\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)/;

// Início de §/parágrafo/inciso/alínea — aceita também grafias históricas (Paragrapho / Parágrapho)
const CAPUT_STOP_RE = /^(§|Par[áa]gra(?:fo|pho)\b|[IVXLCDM]+(?:\b|\s|$)|[a-zà-ÿ]\s*[\)\-–—.]|[a-zà-ÿ]\))/i;

const PLANALTO_NOTE_START_RE =
  /^(?:[\(\[]\s*)?(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Regulamento|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produ[çc][ãa]o\s+de\s+efeito)\b/i;

const PLANALTO_NOTE_BLOCK_RE =
  /[\(\[]\s*(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Regulamento|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produ[çc][ãa]o\s+de\s+efeito)[\s\S]{0,320}?[\)\]]/gi;

const PLANALTO_NOTE_CONTINUATION_RE =
  /^(?:Lei|Leis|Decreto|Decretos|Medida\s+Provis[óo]ria|Emenda\s+Constitucional|Lei\s+Complementar)\s+n[º°o]?\s*[\d.]+/i;

function isPlanaltoAnnotationLine(s) {
  if (!s) return false;
  const t = s.trim();
  return PLANALTO_NOTE_START_RE.test(t) || PLANALTO_NOTE_CONTINUATION_RE.test(t);
}

function stripPlanaltoAnnotations(s) {
  return s.replace(PLANALTO_NOTE_BLOCK_RE, ' ').replace(/\s+/g, ' ').trim();
}

function formatPlanaltoAnnotationBlocks(s) {
  return s.replace(PLANALTO_NOTE_BLOCK_RE, (m) => m.replace(/\s+/g, ' '));
}

function isPotentialEpigrafe(line) {
  if (!line) return false;
  const clean = stripPlanaltoAnnotations(line).trim();
  if (clean.length < 3 || clean.length > 140) return false;
  if (HIER_RE.test(clean)) return false;
  if (ART_RE.test(clean)) return false;
  if (CAPUT_STOP_RE.test(clean)) return false;
  if (isPlanaltoAnnotationLine(clean)) return false;
  // Epígrafes / nomen juris são títulos: não começam com hífen/travessão, parênteses ou colchetes, e não terminam com ponto final (.)
  if (/^[-–—\(\[]/.test(clean)) return false;
  if (/\.$/.test(clean)) return false;
  // Não começa com minúscula
  if (/^[a-zà-ÿ]/.test(clean)) return false;
  // Não começa com dígitos ou numerais romanos isolados / de inciso
  if (/^\d/.test(clean)) return false;
  if (/^[IVXLCDM]+(?:\b|\s|$)/i.test(clean)) return false;
  // Não começa com Do/Da/Dos/Das (títulos de capítulos/seções estruturais)
  if (/^(?:D[OA]S?)\s+/i.test(clean)) return false;
  // Não termina com pontuação de continuidade como :, ;, ,
  if (/[:;,]$/.test(clean)) return false;
  // Não começa com palavras comuns de texto corrido / atos
  if (/^(Par[áa]gra|Pena|Multa|Reclusão|Detenção|Brasília|Publicado|Revoga-se|Mensagem|Vigência|Vide|Disposi[çc][õo]es|ATO\b|Emenda\b|Constitui[çc][ãa]o\b)/i.test(clean)) return false;
  return true;
}

function normalizeHierLabel(s) {
  return s.replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
}

function extractEmenta(html) {
  const redMatches = html.match(/<font[^>]*color=["']?#?800000["']?[^>]*>([\s\S]*?)<\/font>/gi);
  if (redMatches) {
    for (const m of redMatches) {
      const text = decodeHtmlEntities(m.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (text && text.length >= 6 && !/presidência|subchefia/i.test(text)) {
        return text;
      }
    }
  }

  const tdMatches = html.match(/<td[^>]*(?:align=["']?(?:right|justify)["']?|width=["']?(?:4[0-9]%|5[0-9]%|60%)["']?)[^>]*>([\s\S]*?)<\/td>/gi);
  if (tdMatches) {
    for (const td of tdMatches) {
      const text = decodeHtmlEntities(td.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (text && text.length >= 8 && !/^(vigência|vide|retificação|presidência)/i.test(text)) {
        return text;
      }
    }
  }

  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/td>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  body = decodeHtmlEntities(body).replace(/[ \t]+/g, ' ').replace(/\r/g, '');
  const linhas = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const inicio = linhas.findIndex((l) =>
    /^(LEI(?:\s+COMPLEMENTAR)?|DECRETO(?:-LEI)?|MEDIDA\s+PROVISÓRIA|EMENDA\s+CONSTITUCIONAL)\s+N[º°]/i.test(l)
  );
  if (inicio < 0) return '';
  const stopRe =
    /^(O\s+PRESIDENTE|A\s+PRESIDENTE|Faço\s+saber|PRESIDENTE\s+DA\s+REPÚBLICA|CAP[ÍI]TULO|T[ÍI]TULO|LIVRO|PARTE|Art\.)/i;
  for (let k = inicio + 1; k < Math.min(linhas.length, inicio + 15); k++) {
    const l = linhas[k];
    if (stopRe.test(l)) break;
    if (l.length < 6) continue;
    if (/^(vigência|vide|mensagem\s+de\s+veto)/i.test(l)) continue;
    return l.replace(/\s+/g, ' ').trim();
  }
  return '';
}

function extractBlocos(html) {
  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, ' ')
    .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, ' ')
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, ' ')
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*"[^"]*text-decoration\s*:\s*[^"]*line-through[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*'[^']*text-decoration\s*:\s*[^']*line-through[^']*'[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  const bm = body.match(/<body[^>]*>([\s\S]+)/i);
  if (bm) body = bm[1];

  body = body.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const t = inner.replace(/<[^>]+>/g, '').trim().toLowerCase();
    if (t === '' || t === 'o' || t === 'a' || t === 'º' || t === '°' || t === 'ª') return 'º';
    return inner;
  });

  body = body.replace(/[\r\n\t]+/g, ' ');

  body = body
    .replace(/<blockquote[^>]*>/gi, '')
    .replace(/<\/blockquote>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  body = decodeHtmlEntities(body);
  body = formatPlanaltoAnnotationBlocks(body);

  const linhasBrutas = body
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  const linhas = [];
  for (let k = 0; k < linhasBrutas.length; k++) {
    const atual = linhasBrutas[k];
    const proxima = linhasBrutas[k + 1];
    if (/^Art\.?$/.test(atual) && proxima && /^\d/.test(proxima)) {
      linhas.push(`Art. ${proxima}`);
      k += 1;
      continue;
    }
    linhas.push(atual);
  }

  const startIdx = linhas.findIndex((l) => HIER_RE.test(l) || ART_RE.test(l));
  const uteis = startIdx > 0 ? linhas.slice(startIdx) : linhas;

  let endIdx = -1;
  for (let k = uteis.length - 1; k >= 0; k--) {
    if (/Este texto não substitui/i.test(uteis[k])) {
      endIdx = k;
      break;
    }
  }
  const finais = endIdx > 0 ? uteis.slice(0, endIdx) : uteis;

  const blocos = [];
  let pendingEpigrafe = null;
  let i = 0;
  while (i < finais.length) {
    const linha = finais[i];

    // Hierarquia
    const hm = linha.match(HIER_RE);
    if (hm) {
      pendingEpigrafe = null;
      const proximaUtil = (from) => {
        let k = from;
        while (k < finais.length && isPlanaltoAnnotationLine(finais[k])) k++;
        return { idx: k, linha: finais[k] };
      };

      let sigla = linha;
      let nome = '';
      const p1 = proximaUtil(i + 1);
      const eSoLabel = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s*$/i.test(linha);
      const romano = p1.linha ? p1.linha.match(/^([IVXLCDM]+|[ÚU]NICO|PRELIMINAR)$/i) : null;
      if (eSoLabel && romano) {
        sigla = `${linha} ${romano[1]}`;
        const p2 = proximaUtil(p1.idx + 1);
        const nomeLinha = p2.linha;
        if (nomeLinha && !HIER_RE.test(nomeLinha) && !ART_RE.test(nomeLinha) && nomeLinha.length < 200) {
          nome = nomeLinha;
          i = p2.idx + 1;
        } else {
          i = p1.idx + 1;
        }
      } else if (
        p1.linha &&
        !HIER_RE.test(p1.linha) &&
        !ART_RE.test(p1.linha) &&
        p1.linha.length < 200
      ) {
        nome = p1.linha;
        i = p1.idx + 1;
      } else {
        i += 1;
      }
      sigla = stripPlanaltoAnnotations(sigla);
      nome = stripPlanaltoAnnotations(nome);
      const siglaNorm = normalizeHierLabel(sigla);
      const texto = nome ? `${siglaNorm}\n${nome}` : siglaNorm;
      blocos.push({ tipo: 'hier', numero: siglaNorm, texto });
      continue;
    }

    // Artigo
    const am = linha.match(ART_RE);
    if (am) {
      const numero = am[1];
      const epigrafe = pendingEpigrafe;
      pendingEpigrafe = null;

      const cabeca = linha
        .replace(/^Art\.?\s*(\d{2,})[º°]/i, (_, n) => `Art. ${n}`)
        .replace(/^Art\.?\s*(\d+)[º°](?=\.\d)/i, (_, n) => `Art. ${n}`)
        .replace(/^Art\.?\s*([1-9])(?![\dº°\w\-.])/i, (_, n) => `Art. ${n}º`);

      const caputParts = [cabeca];
      const restoParts = [];
      let j = i + 1;
      let caputFechado = false;
      while (j < finais.length) {
        const l2 = finais[j];
        if (HIER_RE.test(l2) || ART_RE.test(l2)) break;
        if (/^[ºª°oa]$/i.test(l2)) {
          j += 1;
          continue;
        }
        if (isPotentialEpigrafe(l2)) {
          let k = j + 1;
          while (k < finais.length && isPlanaltoAnnotationLine(finais[k])) k++;
          if (k < finais.length && ART_RE.test(finais[k])) {
            break;
          }
        }
        if (!caputFechado && CAPUT_STOP_RE.test(l2)) caputFechado = true;
        (caputFechado ? restoParts : caputParts).push(l2);
        j += 1;
      }

      const rawCaput = caputParts.join(' ').replace(/\s+/g, ' ').trim();
      const caputLinha = rawCaput.replace(
        /^Art\.?\s*(\d+(?:\.\d+)*(?:-[A-Za-z0-9]+)?)[º°]?\s*[.:–—]*\s*/i,
        (_, num) => {
          const isOrdinal = /^[1-9]$/.test(num);
          return `Art. ${num}${isOrdinal ? 'º' : ''}. `;
        }
      );

      const restoNormalizado = restoParts.map((l) => {
        const trimmed = l.trim();
        if (/^[IVXLCDM]+\s*[-–—.]\s*/i.test(trimmed)) {
          return trimmed.replace(/^([IVXLCDM]+)\s*[-–—.]\s*/i, (_, rom) => `${rom.toUpperCase()} - `);
        }
        if (/^Par[áa]gra(?:fo|pho)\s+[úu]nico\s*[-–—.]?\s*/i.test(trimmed)) {
          return trimmed.replace(/^Par[áa]gra(?:fo|pho)\s+[úu]nico\s*[-–—.]?\s*/i, 'Parágrafo único. ');
        }
        if (/^§\s*\d+/i.test(trimmed)) {
          return trimmed
            .replace(/^§\s*([1-9])o(?=[\s.,;:])/i, '§ $1º')
            .replace(/^§\s*(\d+[º°]?(?:-[A-Za-z0-9]+)?)\s*[-–—.]?\s*/i, (_, p) => `§ ${p.replace(/\s+/g, '')} `);
        }
        if (/^[a-z]\s*[)\-–—.]\s*/i.test(trimmed)) {
          return trimmed.replace(/^([a-z])\s*[)\-–—.]\s*/i, (_, lettr) => `${lettr.toLowerCase()}) `);
        }
        return trimmed;
      });

      const texto = [caputLinha, ...restoNormalizado]
        .join('\n')
        .replace(/(\d)o(?=[\s.,;:])/g, '$1º')
        .replace(/([0-9])[º°]\s+[º°]/g, '$1º');
      blocos.push({ tipo: 'art', numero, texto, ...(epigrafe ? { epigrafe } : {}) });
      i = j;
      continue;
    }

    if (isPotentialEpigrafe(linha)) {
      let k = i + 1;
      while (k < finais.length && isPlanaltoAnnotationLine(finais[k])) k++;
      if (k < finais.length && ART_RE.test(finais[k])) {
        pendingEpigrafe = stripPlanaltoAnnotations(linha);
      }
    }

    i += 1;
  }

  return blocos;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const todas = args.includes('--todas');
  const pendentes = args.includes('--pendentes') || (!todas && !args.some((a) => a.startsWith('--slug=') || a.startsWith('--categoria=')));
  const semPreservar = args.includes('--sem-preservar');

  const slugArg = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
  const catArg = args.find((a) => a.startsWith('--categoria='))?.split('=')[1];
  const limiteArg = parseInt(args.find((a) => a.startsWith('--limite='))?.split('=')[1] || '0', 10);
  const delayArg = parseInt(args.find((a) => a.startsWith('--delay='))?.split('=')[1] || '1500', 10);

  console.log(`\n${clr.bgBlue}${clr.white}${clr.bold} ⚖️  ROBÔ DE EXTRAÇÃO EM MASSA — VACATIO APP ${clr.reset}\n`);
  console.log(`${clr.dim}Supabase Backend:${clr.reset} ${SUPABASE_URL}`);
  console.log(`${clr.dim}Modo de Execução:${clr.reset} ${dryRun ? `${clr.yellow}${clr.bold}DRY-RUN (Simulação)${clr.reset}` : `${clr.green}${clr.bold}GRAVAÇÃO REAL NO BANCO${clr.reset}`}`);
  console.log(`${clr.dim}Preservar Enriquecimento:${clr.reset} ${!semPreservar ? `${clr.green}Sim${clr.reset}` : `${clr.red}Não${clr.reset}`}`);
  console.log(`${clr.dim}Intervalo entre Leis:${clr.reset} ${delayArg}ms`);

  // Monta query no Supabase
  let query = supa.from('vade_mecum_leis').select('id, slug, nome, nome_curto, categoria, planalto_url, total_artigos, ultima_reextracao_em');

  if (slugArg) {
    query = query.eq('slug', slugArg);
    console.log(`${clr.cyan}Filtro por Slug:${clr.reset} ${slugArg}`);
  } else if (catArg) {
    query = query.ilike('categoria', `%${catArg}%`);
    console.log(`${clr.cyan}Filtro por Categoria:${clr.reset} ${catArg}`);
  } else if (pendentes) {
    // Pendentes: ultima_reextracao_em IS NULL ou total_artigos = 0 / NULL
    query = query.or('ultima_reextracao_em.is.null,total_artigos.eq.0,total_artigos.is.null');
    console.log(`${clr.yellow}Filtro:${clr.reset} Apenas Leis PENDENTES de extração`);
  } else if (todas) {
    console.log(`${clr.magenta}Filtro:${clr.reset} TODAS as leis cadastradas`);
  }

  query = query.order('id', { ascending: true });
  if (limiteArg > 0) {
    query = query.limit(limiteArg);
    console.log(`${clr.cyan}Limite:${clr.reset} Máximo de ${limiteArg} leis`);
  }

  const { data: leis, error: leisErr } = await query;
  if (leisErr) {
    console.error(`${clr.red}Erro ao consultar leis no Supabase:${clr.reset}`, leisErr);
    process.exit(1);
  }

  if (!leis || leis.length === 0) {
    console.log(`\n${clr.green}✔ Nenhuma lei encontrada com os filtros informados (todas já podem estar extraídas!).${clr.reset}\n`);
    return;
  }

  console.log(`\n${clr.bold}Encontradas ${leis.length} lei(s) para processar.${clr.reset}\n`);

  let sucessos = 0;
  let erros = 0;
  let totalArtigosExtraidos = 0;
  let totalEpigrafesExtraidas = 0;
  const listaErros = [];

  const startTime = Date.now();

  for (let index = 0; index < leis.length; index++) {
    const lei = leis[index];
    const n = index + 1;
    const total = leis.length;
    const pct = Math.round((n / total) * 100);
    const label = `[${n}/${total}] (${pct}%)`;

    if (!lei.planalto_url) {
      console.log(`${clr.yellow}${label} ⚠️  ${lei.nome_curto || lei.nome} (${lei.slug}): Sem planalto_url cadastrada. Pulando.${clr.reset}`);
      continue;
    }

    process.stdout.write(`${clr.bold}${label} Baixando ${lei.nome_curto || lei.nome} (${lei.slug})...${clr.reset} `);

    const leiStart = Date.now();
    try {
      const html = await fetchHtml(lei.planalto_url);
      const blocos = extractBlocos(html);
      const ementa = extractEmenta(html);

      const nHier = blocos.filter((b) => b.tipo === 'hier').length;
      const nArt = blocos.filter((b) => b.tipo === 'art').length;
      const nEpigrafe = blocos.filter((b) => b.tipo === 'art' && b.epigrafe).length;

      if (nArt < 5) {
        throw new Error(`Extração encontrou apenas ${nArt} artigo(s) (mínimo 5). Possível página de layout especial ou desafio.`);
      }

      totalArtigosExtraidos += nArt;
      totalEpigrafesExtraidas += nEpigrafe;

      if (dryRun) {
        const tempo = ((Date.now() - leiStart) / 1000).toFixed(1);
        console.log(`${clr.green}OK (DRY-RUN)${clr.reset} ${clr.dim}➔ ${nArt} artigos (${nEpigrafe} com nomen juris), ${nHier} hierarquias em ${tempo}s${clr.reset}`);
        if (nEpigrafe > 0) {
          const amostra = blocos.filter((b) => b.tipo === 'art' && b.epigrafe).slice(0, 3).map((b) => `Art. ${b.numero}: "${b.epigrafe}"`).join(', ');
          console.log(`    ${clr.magenta}Epígrafes:${clr.reset} ${amostra}`);
        }
        sucessos++;
        continue;
      }

      // Snapshot de enriquecimento (se ativo)
      const enriquecimentoPorNumero = new Map();
      if (!semPreservar) {
        const { data: antigos } = await supa
          .from('vade_mecum_artigos')
          .select('numero, comentario, explicacao_tecnico, explicacao_resumido, explicacao_simples_maior16, explicacao_simples_menor16, exemplo, termos, questoes, flashcards, alteracoes, narracao_url, planalto_url, epigrafe, relevancia, relevancia_nota, ult_alteracao_em, revogado')
          .eq('lei_id', lei.id);
        for (const a of antigos ?? []) {
          if (a?.numero != null) enriquecimentoPorNumero.set(String(a.numero), a);
        }
      }

      // Limpa artigos antigos
      const { error: delErr } = await supa.from('vade_mecum_artigos').delete().eq('lei_id', lei.id);
      if (delErr) throw delErr;

      // Prepara linhas
      const rows = blocos.map((b, idx) => {
        const base = {
          lei_id: lei.id,
          numero: b.numero,
          texto: b.texto,
          ordem: idx + 1,
          epigrafe: b.epigrafe || null,
        };
        if (!semPreservar) {
          const antigo = enriquecimentoPorNumero.get(String(b.numero));
          if (antigo) {
            for (const [k, v] of Object.entries(antigo)) {
              if (k === 'numero') continue;
              if (k === 'epigrafe' && b.epigrafe) continue; // Mantém a nova epígrafe se extraída
              if (v !== null && v !== undefined) base[k] = v;
            }
          }
        }
        return base;
      });

      // Insere em lotes de 500
      let inserted = 0;
      for (let k = 0; k < rows.length; k += 500) {
        const chunk = rows.slice(k, k + 500);
        const { error: insErr } = await supa.from('vade_mecum_artigos').insert(chunk);
        if (insErr) throw insErr;
        inserted += chunk.length;
      }

      // Atualiza a tabela mãe
      await supa
        .from('vade_mecum_leis')
        .update({
          total_artigos: nArt,
          updated_at: new Date().toISOString(),
          ultima_reextracao_em: new Date().toISOString(),
          ...(ementa ? { ementa } : {}),
        })
        .eq('id', lei.id);

      const tempo = ((Date.now() - leiStart) / 1000).toFixed(1);
      console.log(`${clr.green}✔ OK!${clr.reset} ${clr.dim}➔ ${nArt} artigos (${nEpigrafe > 0 ? `${clr.magenta}${nEpigrafe} nomen juris${clr.reset}${clr.dim}` : '0 títulos per-artigo'}), ${nHier} hierarquias em ${tempo}s${clr.reset}`);
      sucessos++;
    } catch (e) {
      erros++;
      const msg = e?.message || String(e);
      console.log(`${clr.red}✖ FALHA: ${msg}${clr.reset}`);
      listaErros.push({ slug: lei.slug, nome: lei.nome_curto || lei.nome, erro: msg });
    }

    if (index < leis.length - 1 && delayArg > 0) {
      await sleep(delayArg);
    }
  }

  const totalTempo = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${clr.bold}================ RELATÓRIO DE EXTRAÇÃO ================${clr.reset}`);
  console.log(`⏱️  Tempo Total: ${totalTempo}s`);
  console.log(`✔ Sucessos: ${clr.green}${sucessos}${clr.reset}`);
  console.log(`✖ Erros: ${erros > 0 ? `${clr.red}${erros}${clr.reset}` : '0'}`);
  console.log(`📜 Total de Artigos: ${totalArtigosExtraidos}`);
  console.log(`🏷️  Total de Epígrafes / Nomen Juris: ${totalEpigrafesExtraidas}`);

  if (listaErros.length > 0) {
    console.log(`\n${clr.red}${clr.bold}Leis com falha:${clr.reset}`);
    for (const item of listaErros) {
      console.log(`- ${clr.bold}${item.nome}${clr.reset} (${item.slug}): ${item.erro}`);
    }
  }

  console.log(`\n${clr.green}${clr.bold}Sincronização concluída com sucesso!${clr.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${clr.red}Erro fatal:${clr.reset}`, err);
  process.exit(1);
});
