import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractFile, listPackage } from '@electron/asar';

const asarPath = join('release', 'win-unpacked', 'resources', 'app.asar');

if (!existsSync(asarPath)) {
  throw new Error(`Missing packaged app archive: ${asarPath}`);
}

const list = listPackage(asarPath).join('\n');
const indexHtml = extractFile(asarPath, 'dist/index.html').toString('utf8');
const requiredEntries = [
  '\\dist-electron\\main.js',
  '\\dist-electron\\preload.cjs',
  '\\dist-electron\\ipc\\registerHandlers.js',
  '\\dist-electron\\storage\\database.js',
  '\\dist\\index.html',
];

for (const entry of requiredEntries) {
  if (!list.includes(entry)) {
    throw new Error(`Packaged app archive is missing ${entry}`);
  }
}

if (indexHtml.includes('src="/assets/') || indexHtml.includes('href="/assets/')) {
  throw new Error('Packaged renderer uses root-relative asset paths; Electron file loading needs ./assets paths');
}

if (list.includes('\\dist-electron\\electron\\')) {
  throw new Error('Packaged app archive contains unflattened dist-electron\\electron output');
}

const runtimeFiles = [
  join('dist-electron', 'main.js'),
  join('dist-electron', 'preload.cjs'),
  join('dist-electron', 'ipc', 'registerHandlers.js'),
];

for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8');
  if (source.includes('../../shared/') || source.includes('../shared/')) {
    throw new Error(`${file} contains a runtime shared import that will resolve incorrectly when packaged`);
  }
}

console.log('Electron package layout verified.');
