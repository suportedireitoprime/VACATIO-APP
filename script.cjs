const fs = require('fs');
let text = fs.readFileSync('src/components/vademecum/ArtigoBottomSheet.tsx', 'utf8');

text = text.replace(/<TabsTrigger value="historico"/g, '<TabsTrigger value="termos"');
text = text.replace(/>Histórico<\/TabsTrigger>/g, '>Termos</TabsTrigger>');

text = text.replace(/showTermosSheet/g, 'showHistoricoSheet');
text = text.replace(/setShowTermosSheet/g, 'setShowHistoricoSheet');

text = text.replace(/<TabsContent value="historico"/g, '<TabsContent value="termos"');

fs.writeFileSync('src/components/vademecum/ArtigoBottomSheet.tsx', text, 'utf8');
