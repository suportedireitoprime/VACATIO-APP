import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  console.log('--- Checking Supabase Tables & Storage ---');

  // 1. Check all buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.name));

  // 2. Check narracoes bucket folders
  const { data: narracoesRoot } = await supabase.storage.from('narracoes').list('', { limit: 100 });
  console.log('narracoes root:', narracoesRoot?.map(f => f.name));

  const { data: vademecumFolders } = await supabase.storage.from('narracoes').list('vademecum', { limit: 100 });
  console.log('vademecum folders in narracoes:', vademecumFolders?.map(f => f.name));

  // Check each folder count in vademecum
  for (const folder of vademecumFolders || []) {
    const { data: files } = await supabase.storage.from('narracoes').list(`vademecum/${folder.name}`, { limit: 5000 });
    console.log(`vademecum/${folder.name}: ${files?.length || 0} files`);
  }

  // 3. Check narracao-artigos bucket if exists
  try {
    const { data: artFolders } = await supabase.storage.from('narracao-artigos').list('', { limit: 100 });
    console.log('narracao-artigos root:', artFolders?.map(f => f.name));
    for (const folder of artFolders || []) {
      const { data: files } = await supabase.storage.from('narracao-artigos').list(folder.name, { limit: 5000 });
      console.log(`narracao-artigos/${folder.name}: ${files?.length || 0} files`);
    }
  } catch (e) {
    console.log('narracao-artigos error:', e.message);
  }

  // 4. Check DB table vade_mecum_leis
  const { data: leis } = await supabase.from('vade_mecum_leis').select('id, slug, nome');
  console.log('Leis in DB:', leis);

  // 5. Check audios in vade_mecum_artigos for each lei
  for (const lei of leis || []) {
    const { count: totalCount } = await supabase
      .from('vade_mecum_artigos')
      .select('id', { count: 'exact', head: true })
      .eq('lei_id', lei.id);
    const { count: audioCount } = await supabase
      .from('vade_mecum_artigos')
      .select('id', { count: 'exact', head: true })
      .eq('lei_id', lei.id)
      .not('narracao_url', 'is', null);
    console.log(`Lei ${lei.slug} (${lei.nome}): total=${totalCount}, with narracao_url=${audioCount}`);
  }
}

check().catch(console.error);
