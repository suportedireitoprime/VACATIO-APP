import {
  existsSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const checkOnly = process.argv.includes('--check');

let packageJson;
try {
  packageJson = realpathSync(require.resolve('@codetrix-studio/capacitor-google-auth/package.json'));
} catch (e) {
  console.log('@codetrix-studio/capacitor-google-auth not installed, skipping patch.');
  process.exit(0);
}

const targetFile = join(
  dirname(packageJson),
  'android',
  'src',
  'main',
  'java',
  'com',
  'codetrixstudio',
  'capacitor',
  'GoogleAuth',
  'GoogleAuth.java'
);

if (!existsSync(targetFile)) {
  console.log(`GoogleAuth.java not found at ${targetFile}, skipping patch.`);
  process.exit(0);
}

const original = readFileSync(targetFile, 'utf8');

const signOutTarget = 'public void signOut(final PluginCall call) {';
const signOutPatched = `public void signOut(final PluginCall call) {\n    if (googleSignInClient == null) {\n      call.resolve();\n      return;\n    }`;

const signInTarget = 'public void signIn(PluginCall call) {';
const signInPatched = `public void signIn(PluginCall call) {\n    if (googleSignInClient == null) {\n      call.reject("GoogleAuth not initialized");\n      return;\n    }`;

let patched = original;
let modified = false;

if (!patched.includes('if (googleSignInClient == null) {\n      call.resolve();')) {
  if (patched.includes(signOutTarget)) {
    patched = patched.replace(signOutTarget, signOutPatched);
    modified = true;
  }
}

if (!patched.includes('if (googleSignInClient == null) {\n      call.reject("GoogleAuth not initialized')) {
  if (patched.includes(signInTarget)) {
    patched = patched.replace(signInTarget, signInPatched);
    modified = true;
  }
}

if (checkOnly) {
  if (modified) {
    throw new Error(`GoogleAuth.java needs patching in ${targetFile}`);
  }
  console.log('Verified GoogleAuth.java is safely patched.');
  process.exit(0);
}

if (modified) {
  try {
    unlinkSync(targetFile);
  } catch {}
  writeFileSync(targetFile, patched, 'utf8');
  console.log(`✅ Successfully patched GoogleAuth.java against NullPointerException in signOut/signIn`);
} else {
  console.log(`GoogleAuth.java already patched.`);
}
