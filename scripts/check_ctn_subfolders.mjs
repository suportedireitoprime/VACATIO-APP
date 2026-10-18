async function testAllSub() {
  const titles = [
    { id: '1gSUduKf222QZ8VdBjEoHgAD7lKSLJR0N', name: 'Título I' },
    { id: '1w3dmnS3VPP79WxGNWwzI2U0QM0xC8w12', name: 'Título II' },
    { id: '1WaUVQXIsmN0ViuyqHX1zBFirMNkVura9', name: 'Título III' },
    { id: '1IWBxpLQFloJ9u61G01dbmcxIrjeJfIEa', name: 'Título IV' },
    { id: '1lxteUHPiq_fexrKm-3Evh4dX_5-7FOZM', name: 'Título V' },
    { id: '1OwcXlywEyne9pX60ObXIWmBEEMLw8Biu', name: 'Título V-A' },
    { id: '11H7TcyfaHQjEhtHKWIkqfhsyHM4RH8jR', name: 'Título VI' }
  ];

  for (const t of titles) {
    const url = `https://drive.google.com/embeddedfolderview?id=${t.id}#list`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const re = /class="flip-entry"\s+id="entry-([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
    let m, count = 0;
    const items = [];
    while ((m = re.exec(html)) !== null) {
      items.push(m[2]);
      count++;
    }
    console.log(`${t.name} (${t.id}): ${count} items. Sample:`, items.slice(0, 3));
  }
}
testAllSub();
