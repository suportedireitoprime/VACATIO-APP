async function inspectFileEntry() {
  const url = 'https://drive.google.com/embeddedfolderview?id=1DgdBXmXEjeSyxABAfBf_jl_c3qr6-MBO#list';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const re = /<div class="flip-entry" id="entry-([^"]+)"([\s\S]*?)<div class="flip-entry-title">([^<]+)<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[3].includes('.mp3')) {
      console.log('=== AUDIO ENTRY ===');
      console.log('ID:', m[1]);
      console.log('Title:', m[3]);
      console.log('Body:', m[2].slice(0, 300));
      break;
    }
  }
}
inspectFileEntry();
