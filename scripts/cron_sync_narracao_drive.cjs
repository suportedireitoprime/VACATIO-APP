/**
 * Script de sincronização automática e monitoramento de áudios narrados (CPP e outras leis)
 * Monitora e sincroniza a cada 10 minutos até que todos os artigos sejam concluídos.
 * 
 * Uso: node scripts/cron_sync_narracao_drive.cjs [lei_slug]
 * Exemplo: node scripts/cron_sync_narracao_drive.cjs cpp
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LEI_SLUG = process.argv[2] || 'cpp';
const INTERVALO_MINUTOS = 10;

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

function normalizeArtigoKey(numero) {
  if (!numero) return '';
  const trimmed = String(numero).trim().toLowerCase();
  if (trimmed.includes('único') || trimmed.includes('unico')) return 'unico';
  const match = trimmed.match(/(?:art(?:igo)?\.?\s*)?(\d+)(?:[º°o]|\.º)?(?:-([a-z]))?/i);
  if (match) {
    const num = match[1];
    const suf = match[2] ? `-${match[2]}` : '';
    return `${num}${suf}`;
  }
  return trimmed.replace(/\D/g, '');
}

function matchArtigoKeyFromFilename(filename) {
  const clean = filename.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  const regexComLetra = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])\b/i;
  const matchLetra = clean.match(regexComLetra);
  if (matchLetra) {
    return `${matchLetra[1]}-${matchLetra[2].toLowerCase()}`;
  }
  const regexSimples = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?/i;
  const matchSimples = clean.match(regexSimples);
  if (matchSimples) {
    return matchSimples[1];
  }
  return null;
}

async function verificarESincronizar() {
  const hora = new Date().toLocaleTimeString('pt-BR');
  console.log(`\n[${hora}] === Verificando status de áudios da lei [${LEI_SLUG.toUpperCase()}] ===`);

  // 1. Obter dados da lei
  const { data: leis, error: errLei } = await supabase
    .from('vade_mecum_leis')
    .select('id, slug, nome')
    .ilike('slug', `%${LEI_SLUG}%`)
    .limit(1);

  if (errLei || !leis || leis.length === 0) {
    console.error(`Lei "${LEI_SLUG}" não encontrada no banco.`, errLei);
    return false;
  }

  const lei = leis[0];
  console.log(`Lei identificada: ${lei.nome} (ID: ${lei.id})`);

  // 2. Buscar artigos
  let allArtigos = [];
  let from = 0;
  const chunkSize = 1000;
  while (true) {
    const to = from + chunkSize - 1;
    const { data, error } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero, ordem, narracao_url')
      .eq('lei_id', lei.id)
      .order('ordem', { ascending: true })
      .range(from, to);

    if (error || !data || data.length === 0) break;
    allArtigos.push(...data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }

  const artigosReais = allArtigos.filter(a => isArtigoReal(a.numero));
  const comAudio = artigosReais.filter(a => a.narracao_url && a.narracao_url.trim().length > 0);
  const pendentes = artigosReais.filter(a => !a.narracao_url || !a.narracao_url.trim().length);

  const percentual = Math.round((comAudio.length / artigosReais.length) * 100);

  console.log(`📊 Total de Artigos Reais: ${artigosReais.length}`);
  console.log(`✅ Áudios Sincronizados: ${comAudio.length} (${percentual}%)`);
  console.log(`⏳ Faltando Gravar: ${pendentes.length}`);

  if (pendentes.length > 0) {
    const primeirosFaltando = pendentes.slice(0, 10).map(p => p.numero).join(', ');
    console.log(`Próximos artigos pendentes: ${primeirosFaltando}...`);
  }

  // 3. Verificar se há arquivos locais prontos para ingestão em pastas sincronizadas
  const pastasLocais = [
    path.resolve(__dirname, `../public/audios_${LEI_SLUG}`),
    `C:\\Users\\ext_wpereira\\Desktop\\AULAS MUSSE\\Códigos\\Código de Processo Penal`,
    `C:\\Users\\ext_wpereira\\OneDrive - Vitamina Work Life S.A\\Escritorio\\AULAS MUSSE\\Códigos\\Código de Processo Penal`,
  ];

  for (const pasta of pastasLocais) {
    if (fs.existsSync(pasta)) {
      const arquivos = fs.readdirSync(pasta).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f));
      if (arquivos.length > 0) {
        console.log(`\nEncontrados ${arquivos.length} arquivos de áudio na pasta local: ${pasta}`);
        for (const arquivo of arquivos) {
          const key = matchArtigoKeyFromFilename(arquivo);
          if (!key) continue;

          const artAlvo = pendentes.find(p => normalizeArtigoKey(p.numero) === key);
          if (artAlvo) {
            console.log(`Sincronizando arquivo "${arquivo}" com Art. ${artAlvo.numero}...`);
            const filePath = path.join(pasta, arquivo);
            const buffer = fs.readFileSync(filePath);
            const ext = arquivo.endsWith('.wav') ? 'wav' : 'mp3';
            const storagePath = `vademecum/${lei.slug}/art_${key}_${Date.now()}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from('narracoes')
              .upload(storagePath, buffer, {
                contentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
                upsert: true,
              });

            if (!upErr) {
              const { data: pubData } = supabase.storage.from('narracoes').getPublicUrl(storagePath);
              const audioUrl = pubData.publicUrl;

              await supabase.from('vade_mecum_artigos').update({ narracao_url: audioUrl }).eq('id', artAlvo.id);
              await supabase.from('narracoes_artigos').upsert({
                tabela_nome: lei.slug,
                artigo_numero: artAlvo.numero,
                lei_nome: lei.nome,
                audio_url: audioUrl,
              }, { onConflict: 'tabela_nome,artigo_numero' });

              console.log(`-> Sucesso! Art. ${artAlvo.numero} sincronizado no Storage: ${audioUrl}`);
            }
          }
        }
      }
    }
  }

  // 4. Se todos os artigos foram concluídos
  if (pendentes.length === 0 && artigosReais.length > 0) {
    console.log(`\n🎉 PARABÉNS! Todos os ${artigosReais.length} artigos da lei ${lei.nome} foram completamente narrados e sincronizados!`);
    console.log('Cron Job finalizado automaticamente.');
    return true; // Finalizado
  }

  return false; // Ainda tem pendências
}

async function startCron() {
  console.log(`Iniciando Cron Job de Sincronização de Áudios (verificação a cada ${INTERVALO_MINUTOS} minutos)...`);
  const finalizado = await verificarESincronizar();
  if (finalizado) return;

  const intervalId = setInterval(async () => {
    try {
      const pronto = await verificarESincronizar();
      if (pronto) {
        clearInterval(intervalId);
      }
    } catch (e) {
      console.error('Erro no ciclo de cron:', e);
    }
  }, INTERVALO_MINUTOS * 60 * 1000);
}

startCron().catch(console.error);
