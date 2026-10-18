async function test() {
  const url = 'https://drive.google.com/drive/folders/1DgdBXmXEjeSyxABAfBf_jl_c3qr6-MBO';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log('HTML length:', html.length);
  const match = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'([^']+)'/);
  if (!match) {
    console.log('No _DRIVE_ivd found!');
    return;
  }
  const rawEscaped = match[1];
  console.log('Found escaped string, len:', rawEscaped.length);
  const unescaped = rawEscaped.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const data = JSON.parse(unescaped);
  console.log('Parsed successfully! Top level array length:', data.length);
  const items = data[0] || [];
  console.log('Number of items inside folder:', items.length);
  for (let i = 0; i < Math.min(10, items.length); i++) {
    const item = items[i];
    console.log(`[${i}] id: ${item[0]} | name: ${item[2]} | mime: ${item[3]}`);
  }
  const audios = items.filter(it => it[3]?.startsWith('audio/') || /\.(mp3|wav|m4a)/i.test(it[2]));
  const folders = items.filter(it => it[3] === 'application/vnd.google-apps.folder');
  console.log(`Summary: ${folders.length} subfolders, ${audios.length} audio files`);
}
test();
