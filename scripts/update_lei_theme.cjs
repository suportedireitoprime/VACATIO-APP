const fs = require('fs');
const path = require('path');

const colorMap = require('../src/data/leiColorMapComplete.json');

const entries = Object.entries(colorMap)
  .map(([id, col]) => `  '${id}': '${col}',`)
  .join('\n');

const currentTheme = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'leiTheme.ts'), 'utf8');

const updatedColorMap = `const COLOR_MAP: Record<string, string> = {
${entries}
};`;

const newContent = currentTheme.replace(/const COLOR_MAP: Record<string, string> = \{[\s\S]*?\};/, updatedColorMap);

fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'leiTheme.ts'), newContent, 'utf8');
console.log('Successfully updated src/lib/leiTheme.ts with complete COLOR_MAP!');
