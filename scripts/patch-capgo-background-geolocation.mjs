import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const checkOnly = process.argv.includes('--check');
const unsafeCall = 'getPackage().getName()';
const packageName = '"com.capgo.capacitor_background_geolocation"';

const packageJson = realpathSync(require.resolve('@capgo/background-geolocation/package.json'));
const sourceDir = join(
  dirname(packageJson),
  'android',
  'src',
  'main',
  'java',
  'com',
  'capgo',
  'capacitor_background_geolocation',
);

if (!existsSync(sourceDir)) {
  throw new Error(`Background geolocation Android sources not found: ${sourceDir}`);
}

const javaFiles = readdirSync(sourceDir)
  .map((name) => join(sourceDir, name))
  .filter((file) => statSync(file).isFile() && file.endsWith('.java'));

let replacements = 0;
const unsafeFiles = [];

for (const file of javaFiles) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes(unsafeCall)) continue;

  if (checkOnly) {
    unsafeFiles.push(file);
    continue;
  }

  const patched = original
    .replace(/\b[A-Za-z_$][\w$]*\.class\.getPackage\(\)\.getName\(\)/g, packageName)
    .replace(/getClass\(\)\.getPackage\(\)\.getName\(\)/g, packageName);

  if (patched.includes(unsafeCall)) {
    throw new Error(`Unable to patch every ${unsafeCall} reference in ${file}`);
  }

  // Bun and pnpm may install immutable hardlinks. Recreate the file before writing.
  unlinkSync(file);
  writeFileSync(file, patched, 'utf8');
  replacements += 1;
  console.log(`Patched ${file}`);
}

if (checkOnly && unsafeFiles.length > 0) {
  throw new Error(`Unsafe ${unsafeCall} remains in:\n${unsafeFiles.join('\n')}`);
}

console.log(
  checkOnly
    ? `Verified ${javaFiles.length} background geolocation Java sources.`
    : `Patched ${replacements} background geolocation Java source file(s).`,
);
