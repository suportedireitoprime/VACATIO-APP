import * as fs from 'fs';
import https from 'https';

const url = 'https://www.planalto.gov.br/ccivil_03/decreto/1990-1994/d0678.htm';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('cadh.html', data);
    console.log('Saved to cadh.html');
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
