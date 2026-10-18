import fs from 'fs';

const rawUrls = [
  "https://drive.google.com/drive/folders/1f-HRVj3yTZNqTBQ2KEnmmYEgvoQas7Yb",
  "https://drive.google.com/drive/folders/1al-ttiygeEUAJULh7h84tlSckTbOCM6h",
  "https://drive.google.com/drive/folders/1qFeGsY1ywzNn393--tncVC3xBf623Gzk",
  "https://drive.google.com/drive/folders/1gaOxkt5eBs1rqeF0BnPy6zEL3D7pBdrd",
  "https://drive.google.com/drive/folders/1wvAiA3mxzGiGEmwqWrR9H3UFKgD3WKu9",
  "https://drive.google.com/drive/folders/1LbiPOOm-JxUvOo4R0G73VpnhiahH3MH_",
  "https://drive.google.com/drive/folders/1RQ_k-8bCLb-1Nt-YqphW4y-QUcsu9onr",
  "https://drive.google.com/drive/folders/19CPhnncoerh_s-FG05eisSkWDjuWw5IK",
  "https://drive.google.com/drive/folders/1MZQezvRoHrtT1Tk_84ts6MPuHYq4Qpuq",
  "https://drive.google.com/drive/folders/1IaijWz37zjZPkvUIzjbBKduJSYSVy5yr",
  "https://drive.google.com/drive/folders/1WE7AgmZ_vb52upQliqG308n1kBkFYQbs",
  "https://drive.google.com/drive/folders/1k6TKqrGxGwbHb8Ym0b-V3iWLI3IEC8KQ",
  "https://drive.google.com/drive/folders/1G_NMHatyDtoraLicAMQwwkQo2UsEbbI1",
  "https://drive.google.com/drive/folders/1ZvyJ8T27zQdZ79R3r492q_LqLHl1q9Vt",
  "https://drive.google.com/drive/folders/1pWGEfUIcXQNUFHDUZ6c6kHtLssUpefNd",
  "https://drive.google.com/drive/folders/1EXt_w2cGotMBiQyp1X5KgjFdtiqPYe6o",
  "https://drive.google.com/drive/folders/1vnMxLOM0rT55JkjGHAL76jWQFnudY4-1",
];

const uniqueIds = [...new Set(rawUrls.map(u => u.match(/folders\/([a-zA-Z0-9_-]+)/)[1]))];
console.log('Total de pastas enviadas:', rawUrls.length);
console.log('Pastas únicas:', uniqueIds.length);
console.log(uniqueIds);
fs.writeFileSync('scripts/drive_folders_enviadas.json', JSON.stringify(uniqueIds, null, 2));
