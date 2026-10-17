async function testDriveFetch() {
  const rootId = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  const url = `https://drive.google.com/embeddedfolderview?id=${rootId}#list`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  console.log('embeddedfolderview status:', res.status, 'HTML length:', html.length);
  // Match folder names or links
  const matches = html.match(/folders\/([a-zA-Z0-9_-]+)/g);
  console.log('Folder matches in HTML:', matches ? matches.length : 0);
  
  // Also check drive.google.com/drive/folders/
  const res2 = await fetch(`https://drive.google.com/drive/folders/${rootId}`);
  const html2 = await res2.text();
  console.log('folders url status:', res2.status, 'HTML length:', html2.length);
  const m2 = html2.match(/\["([^"]+)",\["([^"]+)"\],"application\/vnd\.google-apps\.folder"/g);
  console.log('Folder matches in main html:', m2 ? m2.length : 0);
  if (m2) {
    console.log('Sample m2:', m2.slice(0, 5));
  }
}
testDriveFetch();
