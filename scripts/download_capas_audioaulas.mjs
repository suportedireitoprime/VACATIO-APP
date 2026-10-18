import fs from 'fs';
import path from 'path';

const CAPAS_DRIVE = [
  { id: '1cF5rDEu-RrHUnUQxRJj-2LQ3UgV-0Byh', filename: '01-direito-penal.webp', area: 'Direito Penal' },
  { id: '1CpRuHnPE6O12UdI_avq18SRVg8_5r9Pl', filename: '02-direito-constitucional.webp', area: 'Direito Constitucional' },
  { id: '1wumqEtsvxQTJ5HtxHaLQxV2vl7ahRgcA', filename: '03-teoria-e-filosofia-do-direito.webp', area: 'Teoria e Filosofia do Direito' },
  { id: '1uoxZ1apP8ml7BVfEfNoGr1JL2sl0Jf5G', filename: '04-direito-ambiental.webp', area: 'Direito Ambiental' },
  { id: '1TnXBOOk73RFKTg0iN73qV43osGEBkAWO', filename: '05-direito-urbanistico.webp', area: 'Direito Urbanístico' },
  { id: '1LUbG1yO2PGMn_pO9gDVHYnXmLF8qprnI', filename: '06-formacao-complementar.webp', area: 'Formação Complementar' },
  { id: '1SwGaXAd2pBoa6_g3eKkwdTFsvA3svMG-', filename: '07-direito-internacional-privado.webp', area: 'Direito Internacional Privado' },
  { id: '1orApW5DEyI949PVw0Ceq68qxV6UsomrN', filename: '08-direito-desportivo.webp', area: 'Direito Desportivo' },
  { id: '1OtJTUDpmclzzBF6pIwOcuBL_NJPW8c8E', filename: '09-direito-do-trabalho.webp', area: 'Direito do Trabalho' },
  { id: '1Lsern-B78VMZXyA_HcSzudUlDn_PpIaR', filename: '10-portugues.webp', area: 'Português' },
  { id: '1WIR-KjFoEEGLUw89TaxvyRjaZBgLJzOK', filename: '11-direito-previdenciario.webp', area: 'Direito Previdenciário' },
  { id: '1dnEcEO5NO-487LQdLrD15pLoSN00gbbS', filename: '12-direito-empresarial.webp', area: 'Direito Empresarial' },
  { id: '1Hx_YUsj_X0LLCumlgdd0536ioAEMCAT1', filename: '13-politicas-publicas.webp', area: 'Políticas Públicas' },
  { id: '1mVw5kLdFD5grGsg_bUCyc3w6qysEYD3s', filename: '14-direito-processual-penal.webp', area: 'Direito Processual Penal' },
  { id: '1EFJMry8wqCRHchO9iuEvfAU9bbkWAe1X', filename: '15-direito-financeiro.webp', area: 'Direito Financeiro' },
  { id: '1bhwGkbWPpFKIMcdak6sOyp4iET6pW1oR', filename: '16-direito-processual-do-trabalho.webp', area: 'Direito Processual do Trabalho' },
  { id: '1gbMAkuQSqb5zVztePHHMWWMev6NtRoRp', filename: '17-direito-administrativo.webp', area: 'Direito Administrativo' },
  { id: '196KZJzmm9LeWDf4OERLcV3O1i9Y8enDP', filename: '18-direitos-humanos.webp', area: 'Direitos Humanos' },
  { id: '1nLUUbzx0UgciJ_cIGGjheRO4JCqKTnXi', filename: '19-lei-penal-especial.webp', area: 'Lei Penal Especial' },
  { id: '1qRE8YEh9u2p9QQprXmfmohpJ_uwF42Ja', filename: '20-direito-tributario.webp', area: 'Direito Tributário' },
  { id: '11ZjaPhnnuy1R-BobqelhDTtqOt0Ngw3L', filename: '21-direito-civil.webp', area: 'Direito Civil' },
  { id: '1RV_f2wPlYyIW4AhP64VrVyLEdQtrfhNv', filename: '22-direito-processual-civil.webp', area: 'Direito Processual Civil' },
];

const destDir = path.resolve('src/assets/audio-areas');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function downloadAll() {
  console.log(`Iniciando download de ${CAPAS_DRIVE.length} capas para ${destDir}...`);

  for (let i = 0; i < CAPAS_DRIVE.length; i++) {
    const item = CAPAS_DRIVE[i];
    const targetPath = path.join(destDir, item.filename);
    const url = `https://drive.usercontent.google.com/download?id=${item.id}&export=download`;

    console.log(`[${i + 1}/${CAPAS_DRIVE.length}] Baixando: ${item.filename} (${item.area})...`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
      console.log(`  -> Salvo: ${targetPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  -> Erro ao baixar ${item.filename}:`, err.message);
    }
  }

  console.log('Download concluído com sucesso!');
}

downloadAll().catch(console.error);
