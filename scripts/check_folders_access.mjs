const folders = [
  { nome: 'Direito Penal', url: 'https://drive.google.com/drive/folders/1GnhklC5TPcefkmZJbi2nfdeBwKOS0bXC' },
  { nome: 'Direito Constitucional', url: 'https://drive.google.com/drive/folders/1qrhg4LBQwwO9QytaWCwyazDuslsyRWXj' },
  { nome: 'Direito do Trabalho', url: 'https://drive.google.com/drive/folders/1NU2l9lAVaDVL49EaZc1lcCVL8KF2ReQC' },
  { nome: 'Direito Ambiental', url: 'https://drive.google.com/drive/folders/16M12PS1UQivOEE5Zh6n3J3Ge0BPiz2lr' },
  { nome: 'Direito Urbanístico', url: 'https://drive.google.com/drive/folders/1WhGLbjHHLaVZ7pAocjQ7d6IU5fI-6Vsg' },
  { nome: 'Formação Complementar', url: 'https://drive.google.com/drive/folders/1EP_p1zgjA7wTWF-wF52mhqehpaUBn0d0' },
  { nome: 'Direito Processual do Trabalho', url: 'https://drive.google.com/drive/folders/1J3YSY8QS2JmZibH6x-Rq_iQQ0BtkDFkE' },
  { nome: 'Português', url: 'https://drive.google.com/drive/folders/1t2_x2BkX8SMpj4NXpRj6NUueBKxkbr09' },
  { nome: 'Direito Internacional Privado', url: 'https://drive.google.com/drive/folders/1Hwm5ycoFay4NXfMyqKoFibENvp-PZ5kS' },
  { nome: 'Direito Desportivo', url: 'https://drive.google.com/drive/folders/1naLwp8nFhb81vJFyVa1vcsGimjqpF_5H' },
  { nome: 'Direito Financeiro', url: 'https://drive.google.com/drive/folders/1-foULZkKGloeV2xTKeDT_41Qaa4hGjcz' },
  { nome: 'Direito Empresarial', url: 'https://drive.google.com/drive/folders/1NSOBt8u96ZjjI9TTslaVS4b17yRxMCPf' },
  { nome: 'Lei Penal Especial', url: 'https://drive.google.com/drive/folders/1-PvDG_MbKZDWF7Tjdq5xyPb6YTqAse58' },
  { nome: 'Políticas Públicas', url: 'https://drive.google.com/drive/folders/1f-RGWzdxAbXqrTDU4VKUqWekgwcetzlp' },
  { nome: 'Direito Administrativo', url: 'https://drive.google.com/drive/folders/1RHqLwhOgiQM8pYHHr9HlXOfJfi_gVn2w' },
  { nome: 'Direito Previdenciário', url: 'https://drive.google.com/drive/folders/1askPjQI8_xiC0FwD89YUlXGlLbePrbkT' },
  { nome: 'Direitos Humanos', url: 'https://drive.google.com/drive/folders/1cfAnJ0YLegH7oMByymH-2grjflqTDGcq' },
  { nome: 'Direito Processual Penal', url: 'https://drive.google.com/drive/folders/11f7RbK_z9mzB5VWeaulRoTXqmKxWT3Lp' },
];

async function checkFolders() {
  for (const f of folders) {
    try {
      const res = await fetch(f.url, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const loc = res.headers.get('location') || '';
      const isLogin = loc.includes('accounts.google.com') || loc.includes('ServiceLogin');
      console.log(`[${res.status}] ${f.nome}: ${isLogin ? '🔒 REQUER LOGIN' : '🔓 PÚBLICO'}`);
    } catch (e) {
      console.log(`[ERR] ${f.nome}: ${e.message}`);
    }
  }
}

checkFolders();
