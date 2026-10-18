import fs from 'fs';

// Mapeamento dos 11 Códigos e dos 20 Estatutos
const TAREFAS = [
  // CÓDIGOS
  { tipo: 'codigo', slug: 'ctn', nome: 'Código Tributário Nacional', driveId: '1f-HRVj3yTZNqTBQ2KEnmmYEgvoQas7Yb' },
  { tipo: 'codigo', slug: 'ctb', nome: 'Código de Trânsito Brasileiro', driveId: '1al-ttiygeEUAJULh7h84tlSckTbOCM6h' },
  { tipo: 'codigo', slug: 'clt', nome: 'Consolidação das Leis do Trabalho', driveId: '1qFeGsY1ywzNn393--tncVC3xBf623Gzk' },
  { tipo: 'codigo', slug: 'cdc', nome: 'Código de Defesa do Consumidor', driveId: '1gaOxkt5eBs1rqeF0BnPy6zEL3D7pBdrd' },
  { tipo: 'codigo', slug: 'ce', nome: 'Código Eleitoral', driveId: '1wvAiA3mxzGiGEmwqWrR9H3UFKgD3WKu9' },
  { tipo: 'codigo', slug: 'cpm', nome: 'Código Penal Militar', driveId: '1LbiPOOm-JxUvOo4R0G73VpnhiahH3MH_' },
  { tipo: 'codigo', slug: 'cpc', nome: 'Código de Processo Civil', driveId: '1RQ_k-8bCLb-1Nt-YqphW4y-QUcsu9onr' },
  { tipo: 'codigo', slug: 'cpp', nome: 'Código de Processo Penal', driveId: '19CPhnncoerh_s-FG05eisSkWDjuWw5IK' },
  { tipo: 'codigo', slug: 'cppm', nome: 'Código de Processo Penal Militar', driveId: '1MZQezvRoHrtT1Tk_84ts6MPuHYq4Qpuq' },
  { tipo: 'codigo', slug: 'cp', nome: 'Código Penal', driveId: '1IaijWz37zjZPkvUIzjbBKduJSYSVy5yr' },
  { tipo: 'codigo', slug: 'cc', nome: 'Código Civil', driveId: '1WE7AgmZ_vb52upQliqG308n1kBkFYQbs' },

  // ESTATUTOS (da pasta pai ou links diretos)
  { tipo: 'estatuto', slug: 'estatuto-cidade', nome: 'Estatuto da Cidade', driveId: '1s_dYNW_GPOdzHkkHhMThbqSofzs6dfxU' },
  { tipo: 'estatuto', slug: 'estatuto-eca', nome: 'ECA - Estatuto da Criança e do Adolescente', driveId: '1qz_mMdz4LnIVXNkh-GMIh-ULnZlcrT34' },
  { tipo: 'estatuto', slug: 'estatuto-desarmamento', nome: 'Estatuto do Desarmamento', driveId: '1vnMxLOM0rT55JkjGHAL76jWQFnudY4-1' },
  { tipo: 'estatuto', slug: 'eggm', nome: 'Estatuto Geral das Guardas Municipais', driveId: '1EXt_w2cGotMBiQyp1X5KgjFdtiqPYe6o' },
  { tipo: 'estatuto', slug: 'estatuto-indio', nome: 'Estatuto do Índio', driveId: '1ng1TWmSug1PYC721Tdw74qmSqXC7x8x6' },
  { tipo: 'estatuto', slug: 'estatuto-igualdade-racial', nome: 'Estatuto da Igualdade Racial', driveId: '1zvtjryWKIOG82GkJx3Lo0LB3KM2R0XWW' },
  { tipo: 'estatuto', slug: 'estatuto-juventude', nome: 'Estatuto da Juventude', driveId: '1wJB_vZhWe7LaKLbBmlG0GN5KFRodCJj_' },
  { tipo: 'estatuto', slug: 'estatuto-militares', nome: 'Estatuto dos Militares', driveId: '1mR3i62Zvo7wtx1YCQ4HfWtMRcgT2OKkq' },
  { tipo: 'estatuto', slug: 'estatuto-metropole', nome: 'Estatuto da Metrópole', driveId: '1CH8K9CDWvq-jXzdDHr0nTfQFp77gJfUT' },
  { tipo: 'estatuto', slug: 'emot', nome: 'Estatuto do Motorista', driveId: '1pWGEfUIcXQNUFHDUZ6c6kHtLssUpefNd' },
  { tipo: 'estatuto', slug: 'estatuto-oab', nome: 'Estatuto da Advocacia e da OAB', driveId: '1osS12-9p1NaYuprDZtBZYei5Zp-uWFq5' },
  { tipo: 'estatuto', slug: 'estatuto-cancer', nome: 'Estatuto da Pessoa com Câncer', driveId: '1iCqh5loIJj8v4jHC2Ku9nXVcghVOXHpQ' },
  { tipo: 'estatuto', slug: 'estatuto-pessoa-deficiencia', nome: 'Estatuto da Pessoa com Deficiência', driveId: '12vyWJ03Uklvigmkme2Lwd-E7zns5TmW0' },
  { tipo: 'estatuto', slug: 'estatuto-idoso', nome: 'Estatuto da Pessoa Idosa', driveId: '1EJwdrOVpBnbzusqgnwtBX2XV7zyjRzqn' },
  { tipo: 'estatuto', slug: 'estatuto-refugiado', nome: 'Estatuto dos Refugiados', driveId: '1NQH_jJSBQNK59gP1rnOXaF8yMKKiyVsN' },
  { tipo: 'estatuto', slug: 'estatuto-seguranca-privada', nome: 'Estatuto da Segurança Privada', driveId: '1ZvyJ8T27zQdZ79R3r492q_LqLHl1q9Vt' },
  { tipo: 'estatuto', slug: 'lei-servidor', nome: 'Estatuto dos Servidores Públicos Federais', driveId: '1G_NMHatyDtoraLicAMQwwkQo2UsEbbI1' },
  { tipo: 'estatuto', slug: 'estatuto-torcedor', nome: 'Estatuto do Torcedor', driveId: '1hLb-7V0ThDbpME1L81kt4uZmiaCX4kDS' },
  { tipo: 'estatuto', slug: 'estatuto-terra', nome: 'Estatuto da Terra', driveId: '1hqa_99iQ4-CTzwm9AJx8xoD9GdkvI_e5' },
  { tipo: 'estatuto', slug: 'estatuto-mpe', nome: 'Estatuto da Microempresa e EPP', driveId: '1auXnjyNxkiSUQ9QQMH3iU6G0gOOxPpDS' },
];

function matchArtigoKey(filename) {
  let clean = filename.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  clean = clean.replace(/_\d{10,}$/, '');
  const cleanNoDots = clean.replace(/\./g, '');

  if (/art(?:igo)?\.?\s*[úu]nico/i.test(clean)) return 'unico';

  const regexComLetra = /(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])(?:\b|_|$)/i;
  const matchLetra = cleanNoDots.match(regexComLetra);
  if (matchLetra) {
    return `${Number(matchLetra[1])}-${matchLetra[2].toLowerCase()}`;
  }

  const regexSimples = /(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)(?:[º°o]|\.º)?/i;
  const matchSimples = cleanNoDots.match(regexSimples);
  if (matchSimples) {
    return `${Number(matchSimples[1])}`;
  }
  return null;
}

async function crawl(folderId, path = '', visited = new Set(), results = []) {
  if (visited.has(folderId)) return results;
  visited.add(folderId);

  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  let html = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) return results;
    html = await res.text();
  } catch (e) {
    return results;
  }

  const re = /<div class="flip-entry" id="entry-([^"]+)"([\s\S]*?)<div class="flip-entry-title">([^<]+)<\/div>/g;
  let m;
  const subfolders = [];
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const body = m[2];
    const title = m[3].trim();

    if (body.includes('/drive/folders/')) {
      subfolders.push({ id, title });
    } else if (body.includes('/file/d/') || /\.(mp3|wav|m4a|ogg)$/i.test(title)) {
      results.push({ id, title, path });
    }
  }

  for (const sub of subfolders) {
    await crawl(sub.id, `${path} / ${sub.title}`, visited, results);
  }

  return results;
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 INICIANDO MAPEAMENTO RECURSIVO DE TODAS AS LEIS DO DRIVE');
  console.log('===============================================================\n');

  const inventario = {};
  let totalGeral = 0;

  for (let i = 0; i < TAREFAS.length; i++) {
    const t = TAREFAS[i];
    console.log(`[${i + 1}/${TAREFAS.length}] Mapeando: ${t.nome} (${t.slug})...`);
    const files = await crawl(t.driveId, t.nome);

    // Deduplica por id
    const uniqueMap = new Map();
    for (const f of files) {
      if (!uniqueMap.has(f.id)) {
        const artKey = matchArtigoKey(f.title);
        uniqueMap.set(f.id, {
          driveFileId: f.id,
          nomeArquivo: f.title,
          caminho: f.path,
          artigoKey: artKey
        });
      }
    }

    const listaArquivos = Array.from(uniqueMap.values());
    inventario[t.slug] = {
      tipo: t.tipo,
      nome: t.nome,
      slug: t.slug,
      driveFolderId: t.driveId,
      totalArquivos: listaArquivos.length,
      arquivos: listaArquivos
    };

    totalGeral += listaArquivos.length;
    console.log(`  -> Encontrados ${listaArquivos.length} áudios.`);
  }

  fs.writeFileSync('scripts/inventario_completo_drive.json', JSON.stringify(inventario, null, 2), 'utf-8');
  console.log('\n===============================================================');
  console.log(`🎉 MAPEAMENTO FINALIZADO COM SUCESSO!`);
  console.log(`📦 TOTAL GERAL DE ÁUDIOS MAPEADOS NO GOOGLE DRIVE: ${totalGeral}`);
  console.log(`💾 Salvo em: scripts/inventario_completo_drive.json`);
  console.log('===============================================================');
}

main().catch(console.error);
