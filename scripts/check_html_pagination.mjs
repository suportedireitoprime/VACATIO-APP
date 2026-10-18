async function checkHtml() {
  const url = 'https://drive.google.com/embeddedfolderview?id=1DgdBXmXEjeSyxABAfBf_jl_c3qr6-MBO#list';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  console.log('HTML length:', html.length);
  console.log('Includes Art. 0081?', html.includes('0081'));
  console.log('Includes Art. 0095?', html.includes('0095'));
  console.log('Includes next page token or more?', html.includes('next') || html.includes('pageToken') || html.includes('continue'));
  // Look for any links or forms
  const moreMatches = html.match(/href="([^"]+)"/g);
  console.log('Hrefs:', moreMatches?.slice(0, 10));
}
checkHtml();
