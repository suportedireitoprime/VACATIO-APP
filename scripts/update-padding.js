const fs = require('fs');
const path = require('path');

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
  
  // Replace pb-20, pb-24, pb-28, or lack thereof, if it's the main container.
  // We want to target className="min-h-dvh bg-background ..."
  // Example 1: className="min-h-dvh bg-background pb-20"
  // Example 2: className="min-h-dvh bg-background"
  let updated = content.replace(/className="min-h-dvh bg-background(?: pb-(?:20|24|28))?( lg:pb-0)?"/g, 'className="min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"');
  
  // Example 3: className="min-h-screen bg-background p-4 pb-24" -> don't want to replace p-4
  // Let's also do a general replace of `pb-20`, `pb-24` to the calc if it's inside `min-h-dvh bg-background`
  
  if (content !== updated) {
    fs.writeFileSync(file, updated);
    console.log('Updated:', path.basename(file));
    updatedCount++;
  }
});
console.log('Total files updated:', updatedCount);
