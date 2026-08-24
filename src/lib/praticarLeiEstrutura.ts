export type TipoEstruturaLei = 'PARTE' | 'TITULO' | 'CAPITULO' | 'SECAO' | 'SUBSECAO';

export type LinhaLeiPraticar = {
  id: string;
  numero: string | null;
  texto: string | null;
  epigrafe?: string | null;
  ordem?: number | null;
};

export type ArtigoTrilha = {
  id: string;
  numero: string | null;
  epigrafe: string | null;
  texto: string | null;
  ordem: number | null;
};

export type BlocoLei = {
  titulo: string;
  tipo: TipoEstruturaLei | 'ARTIGOS';
  artigos: ArtigoTrilha[];
  ordemInicio: number | null;
  ordemFim: number | null;
};

const TIPOS_EM_ORDEM: TipoEstruturaLei[] = ['TITULO', 'CAPITULO', 'SECAO', 'SUBSECAO'];

export function getTipoEstrutura(row: Pick<LinhaLeiPraticar, 'numero' | 'texto'>): TipoEstruturaLei | null {
  const primeiraLinha = [row.numero, row.texto]
    .flatMap((valor) => (valor ?? '').split(/\n+/))
    .map((linha) => linha.trim())
    .find(Boolean);

  if (!primeiraLinha) return null;
  if (/^PARTE\b/i.test(primeiraLinha)) return 'PARTE';
  if (/^T[ÍI]TULO\b/i.test(primeiraLinha)) return 'TITULO';
  if (/^CAP[ÍI]TULO\b/i.test(primeiraLinha)) return 'CAPITULO';
  if (/^SUBSE[ÇC][ÃA]O\b/i.test(primeiraLinha)) return 'SUBSECAO';
  if (/^SE[ÇC][ÃA]O\b/i.test(primeiraLinha)) return 'SECAO';
  return null;
}

export function isLinhaDeArtigo(row: Pick<LinhaLeiPraticar, 'numero' | 'texto'>): boolean {
  const numero = row.numero?.trim() ?? '';
  return Boolean(row.texto?.trim()) && !getTipoEstrutura(row) && /^\d/.test(numero);
}

export function formatarFaixaArtigos(artigos: Pick<ArtigoTrilha, 'numero'>[]): string {
  const numeros = artigos.map((artigo) => artigo.numero?.trim()).filter(Boolean) as string[];
  const primeiro = numeros[0];
  const ultimo = numeros[numeros.length - 1];

  if (!primeiro) return `${artigos.length} art.`;
  if (!ultimo || primeiro === ultimo) return `Art. ${primeiro}`;
  return `Art. ${primeiro} – Art. ${ultimo}`;
}

export function montarBlocosDaLei(rows: LinhaLeiPraticar[]): BlocoLei[] {
  const linhas = [...rows].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const tipoAlvo = escolherTipoAlvo(linhas);

  if (!tipoAlvo) {
    const artigos = linhas.filter(isLinhaDeArtigo).map(linhaParaArtigo);
    return artigos.length
      ? [{ titulo: 'Artigos da lei seca', tipo: 'ARTIGOS', artigos, ordemInicio: artigos[0]?.ordem ?? null, ordemFim: artigos[artigos.length - 1]?.ordem ?? null }]
      : [];
  }

  const blocos: BlocoLei[] = [];
  let blocoAtual: BlocoLei | null = null;

  for (const linha of linhas) {
    const tipo = getTipoEstrutura(linha);

    if (tipo === tipoAlvo) {
      if (blocoAtual?.artigos.length) blocos.push(blocoAtual);
      blocoAtual = {
        titulo: extrairTituloEstrutural(linha),
        tipo,
        artigos: [],
        ordemInicio: linha.ordem ?? null,
        ordemFim: linha.ordem ?? null,
      };
      continue;
    }

    if (tipo) continue;
    if (!isLinhaDeArtigo(linha)) continue;

    const artigo = linhaParaArtigo(linha);
    if (!blocoAtual) {
      blocoAtual = {
        titulo: 'Disposições iniciais',
        tipo: 'ARTIGOS',
        artigos: [],
        ordemInicio: artigo.ordem,
        ordemFim: artigo.ordem,
      };
    }
    blocoAtual.artigos.push(artigo);
    blocoAtual.ordemFim = artigo.ordem;
  }

  if (blocoAtual?.artigos.length) blocos.push(blocoAtual);
  return blocos;
}

function escolherTipoAlvo(rows: LinhaLeiPraticar[]): TipoEstruturaLei | null {
  const contagem = new Map<TipoEstruturaLei, number>();
  for (const row of rows) {
    const tipo = getTipoEstrutura(row);
    if (tipo && tipo !== 'PARTE') contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1);
  }

  const tipoComVariosBlocos = TIPOS_EM_ORDEM.find((tipo) => (contagem.get(tipo) ?? 0) >= 2);
  if (tipoComVariosBlocos) return tipoComVariosBlocos;
  return TIPOS_EM_ORDEM.find((tipo) => (contagem.get(tipo) ?? 0) > 0) ?? null;
}

function linhaParaArtigo(linha: LinhaLeiPraticar): ArtigoTrilha {
  return {
    id: linha.id,
    numero: linha.numero,
    epigrafe: linha.epigrafe ?? null,
    texto: linha.texto,
    ordem: linha.ordem ?? null,
  };
}

function extrairTituloEstrutural(row: LinhaLeiPraticar): string {
  const linhas = (row.texto ?? row.numero ?? '')
    .split(/\n+/)
    .map((linha) => limparLinhaEstrutural(linha))
    .filter(Boolean);

  const marcador = linhas.find((linha) => isLinhaMarcador(linha));
  const tituloAposMarcador = marcador ? extrairTituloInline(marcador) : '';
  const titulo = linhas.find((linha) => !isLinhaMarcador(linha)) || tituloAposMarcador || marcador || row.numero || 'Sem título';

  return humanizarTitulo(titulo);
}

function limparLinhaEstrutural(linha: string): string {
  return linha
    .replace(/\s*\((?:Reda[çc][ãa]o dada|Inclu[ií]do|Inclu[ií]da|Vide|Vig[êe]ncia|Revogado|Revogada|Renumerado|Renumerada)[^)]+\)/gi, '')
    .replace(/^\(?\s*(?:Reda[çc][ãa]o dada|Inclu[ií]do|Inclu[ií]da|Vide|Vig[êe]ncia|Revogado|Revogada|Renumerado|Renumerada)\b.*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLinhaMarcador(linha: string): boolean {
  return /^(?:PARTE\b|T[ÍI]TULO\b|CAP[ÍI]TULO\b|SE[ÇC][ÃA]O\b|SUBSE[ÇC][ÃA]O\b)/i.test(linha);
}

function extrairTituloInline(linha: string): string {
  return linha
    .replace(/^(?:PARTE\s+\S+|T[ÍI]TULO\s+[\wºª-]+|CAP[ÍI]TULO\s+[\wºª-]+|SE[ÇC][ÃA]O\s+[\wºª-]+|SUBSE[ÇC][ÃA]O\s+[\wºª-]+)\s*[-–—:]?\s*/i, '')
    .trim();
}

function humanizarTitulo(titulo: string): string {
  const limpo = limparLinhaEstrutural(titulo);
  if (!limpo) return 'Sem título';

  const temMinusculas = /[a-záéíóúâêôãõç]/.test(limpo);
  const base = temMinusculas ? limpo : limpo.toLocaleLowerCase('pt-BR');
  return base.charAt(0).toLocaleUpperCase('pt-BR') + base.slice(1);
}