import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CC_LEI_ID = '32ae6146-3fd4-42e7-8879-81413f0f41cc';

const driveMap = JSON.parse(fs.readFileSync('src/data/codigoCivilAudioDriveMap.json', 'utf8'));

function isArtigoReal(numero) {
  if (!numero) return false;
  const trimmed = numero.trim().toUpperCase();
  if (/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|DISPOSI[ÇC]|PREÂMBULO|PREAMBULO)/i.test(trimmed)) {
    return false;
  }
  return /\b(?:art(?:igo)?\.?\s*)?(\d+)/i.test(trimmed);
}

function parseNumero(numero) {
  if (!numero) return null;
  const clean = numero.replace(/\./g, '').trim();
  const m = clean.match(/(?:art(?:igo)?\s*)?(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

async function run() {
  console.log('Fetching articles for CC with null narracao_url...');
  let allNull = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero')
      .eq('lei_id', CC_LEI_ID)
      .is('narracao_url', null)
      .range(from, from + 999);

    if (error || !data || data.length === 0) break;
    allNull.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const realArtigos = allNull.filter(a => isArtigoReal(a.numero));
  console.log(`Found ${realArtigos.length} real articles needing audio URL.`);

  let updated = 0;
  const batchSize = 40;

  for (let i = 0; i < realArtigos.length; i += batchSize) {
    const batch = realArtigos.slice(i, i + batchSize);
    const promises = batch.map(a => {
      const numInt = parseNumero(a.numero);
      let audioUrl = null;

      if (numInt && numInt >= 1 && numInt <= 2046) {
        const pad = String(numInt).padStart(4, '0');
        audioUrl = `https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/narracoes/codigos/cc/Art.%20${pad}.mp3`;
      } else if (driveMap[String(a.numero).trim()]) {
        audioUrl = driveMap[String(a.numero).trim()];
      }

      if (!audioUrl) return Promise.resolve();

      return supabase
        .from('vade_mecum_artigos')
        .update({ narracao_url: audioUrl })
        .eq('id', a.id);
    });

    await Promise.all(promises);
    updated += batch.length;
    console.log(`Progress: ${updated}/${realArtigos.length} articles updated in DB.`);
  }

  console.log('Done populating Código Civil audio URLs in Supabase!');
}

run().catch(console.error);
