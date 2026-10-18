async function inspectEntryHtml() {
  const url = 'https://drive.google.com/embeddedfolderview?id=1DgdBXmXEjeSyxABAfBf_jl_c3qr6-MBO#list';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const re = /<div class="flip-entry" id="entry-([^"]+)"([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let m;
  let count = 0;
  while ((m = re.exec(html)) !== null && count < 4) {
    console.log(`=== ENTRY ${count} (ID: ${m[1]}) ===`);
    console.log(m[2]);
    count++;
  }
}
inspectEntryHtml();
