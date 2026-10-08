import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir(path.join(__dirname, '../src/pages'));

let updatedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  let updated = content.replace(/className="min-h-dvh bg-background(?: pb-(?:20|24|28))?( lg:pb-0)?"/g, 'className="min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"');
  // Also try replacing without lg:pb-0 group correctly so it doesn't leave undefined
  
  // A better regex:
  // We want to replace: className="min-h-dvh bg-background"
  // Or className="min-h-dvh bg-background pb-X"
  // Or className="min-h-dvh bg-background pb-X lg:pb-0"
  
  // First, normalize everything to min-h-dvh bg-background
  // Wait, if it has other classes, this exact match won't work perfectly. Let's just do an exact match since that's what we found with grep.
  
  let newContent = content.replace(/className="min-h-dvh bg-background(?: pb-2[048])?(?: lg:pb-0)?"/g, 'className="min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"');
  
  // What about min-h-screen?
  newContent = newContent.replace(/className="min-h-screen bg-background(?: pb-2[048])?(?: lg:pb-0)?"/g, 'className="min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Updated:', path.basename(file));
    updatedCount++;
  }
});
console.log('Total files updated:', updatedCount);
