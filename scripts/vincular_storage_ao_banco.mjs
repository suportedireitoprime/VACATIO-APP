import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CPP_LEI_ID = '246e8691-ebe2-478d-991d-f3930635151a';
const CP_LEI_ID = 'cf9e9292-4fe0-4b23-ae89-611edbb92503';

export function normalizarNumero(str) {
  if (!str) return '';
  if (/título|capítulo|livro/i.test(str)) return '';
  
  let clean = str
    .replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '')
    .replace(/^(cpp|cp|clt|cf|cc)[\s_.-]*/i, '')
    .replace(/^art(?:igo)?[\s_.-]*/i, '')
    .trim();
  
  // Se contiver sufixo letra (ex: 3º-A, 13-A, 13a, 13-a_12345)
  const mLetra = clean.match(/^(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])(?:_\d+)?$/i);
  if (mLetra) {
    const n = parseInt(mLetra[1], 10);
    const l = mLetra[2].toUpperCase();
    return `${n}-${l}`;
  }

  // Se contiver número com timestamp de storage (ex: 100_1791933447946 ou 10_1791933806551)
  const mStorageNum = clean.match(/^(\d+)(?:_\d+)?$/);
  if (mStorageNum) {
    return String(parseInt(mStorageNum[1], 10));
  }

  // Se for número com ordinal (ex: 1º, 2°)
  const mNum = clean.match(/^(\d+)(?:[º°o]|\.º)?$/i);
  if (mNum) {
    return String(parseInt(mNum[1], 10));
  }

  return clean.toLowerCase();
}

async function vincularLei(slug, leiId, leiNome) {
  console.log(`\n========================================`);
  console.log(`Vinculando arquivos do Storage para: ${leiNome} (${slug.toUpperCase()})`);

  // 1. Listar arquivos do Storage
  const { data: files, error: errStorage } = await supabase.storage
    .from('narracoes')
    .list(`vademecum/${slug}`, { limit: 1000 });

  if (errStorage) {
    console.error(`Erro ao listar storage vademecum/${slug}:`, errStorage);
    return;
  }

  console.log(`Total de arquivos encontrados no Storage: ${files.length}`);

  // 2. Buscar todos os artigos da lei no banco de dados
  let todosArtigos = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: pageArtigos, error: errArtigos } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero, narracao_url')
      .eq('lei_id', leiId)
      .range(from, from + pageSize - 1);

    if (errArtigos) {
      console.error(`Erro ao buscar artigos:`, errArtigos);
      break;
    }
    if (!pageArtigos || pageArtigos.length === 0) break;
    todosArtigos = todosArtigos.concat(pageArtigos);
    if (pageArtigos.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Total de artigos cadastrados no banco para ${leiNome}: ${todosArtigos.length}`);

  // Criar mapa de artigos por chave canônica
  const artigoPorChave = new Map();
  for (const art of todosArtigos) {
    const chave = normalizarNumero(art.numero);
    if (chave) {
      artigoPorChave.set(chave, art);
    }
  }

  let vinculadosSucesso = 0;
  let jaEstavamVinculados = 0;
  let naoEncontradosNoBanco = 0;

  for (const file of files) {
    if (!file.name.endsWith('.mp3')) continue;
    const chave = normalizarNumero(file.name);
    if (!chave) {
      console.log(`[Pular] Não reconhecido como artigo: ${file.name}`);
      continue;
    }

    const { data: pubData } = supabase.storage
      .from('narracoes')
      .getPublicUrl(`vademecum/${slug}/${file.name}`);

    const publicUrl = pubData.publicUrl;
    const art = artigoPorChave.get(chave);

    if (art) {
      if (art.narracao_url === publicUrl) {
        jaEstavamVinculados++;
      } else {
        const { error: errUp } = await supabase
          .from('vade_mecum_artigos')
          .update({ narracao_url: publicUrl })
          .eq('id', art.id);

        if (errUp) {
          console.warn(`Erro ao atualizar artigo ${art.numero}:`, errUp.message);
        } else {
          vinculadosSucesso++;
          art.narracao_url = publicUrl; // Atualiza local
        }
      }

      // Upsert na tabela narracoes_artigos
      try {
        await supabase.from('narracoes_artigos').upsert(
          {
            tabela_nome: slug,
            artigo_numero: art.numero,
            lei_nome: leiNome,
            audio_url: publicUrl,
          },
          { onConflict: 'tabela_nome,artigo_numero' }
        );
      } catch {}
    } else {
      naoEncontradosNoBanco++;
      console.warn(`[Aviso] Artigo chave "${chave}" (arquivo ${file.name}) não localizado no banco.`);
    }
  }

  console.log(`Resumo ${slug.toUpperCase()}:`);
  console.log(`- Vinculados com sucesso agora: ${vinculadosSucesso}`);
  console.log(`- Já estavam vinculados: ${jaEstavamVinculados}`);
  console.log(`- Total com áudio no banco: ${vinculadosSucesso + jaEstavamVinculados}`);
  console.log(`- Não encontrados no banco: ${naoEncontradosNoBanco}`);
}

async function main() {
  await vincularLei('cpp', CPP_LEI_ID, 'Código de Processo Penal');
  await vincularLei('cp', CP_LEI_ID, 'Código Penal');
}

main().catch(console.error);
