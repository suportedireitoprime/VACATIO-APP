async function checkFoldersSnippet() {
  const rootId = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  const url = `https://drive.google.com/embeddedfolderview?id=${rootId}#list`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  const idx = html.indexOf('folders/');
  if (idx !== -1) {
    console.log('Snippet around folders/:\n', html.substring(Math.max(0, idx - 150), idx + 350));
  }
}
checkFoldersSnippet();
