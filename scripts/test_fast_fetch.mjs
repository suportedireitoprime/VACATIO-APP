async function test() {
  const url = 'https://drive.google.com/embeddedfolderview?id=1gSUduKf222QZ8VdBjEoHgAD7lKSLJR0N#list';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  const re = /class="flip-entry"\s+id="entry-([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
  let m, count = 0;
  while ((m = re.exec(html)) !== null) {
    console.log(m[1], m[2]);
    count++;
  }
  console.log('Total entries:', count);
}
test();
