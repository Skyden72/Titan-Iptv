import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const asarPath = join('release', 'win-unpacked', 'resources', 'app.asar');
const asarCli = join('node_modules', '@electron', 'asar', 'bin', 'asar.js');

if (!existsSync(asarPath)) {
  throw new Error(`Missing packaged app archive: ${asarPath}`);
}

if (!existsSync(asarCli)) {
  throw new Error(`Missing asar CLI: ${asarCli}`);
}

const list = execFileSync(process.execPath, [asarCli, 'list', asarPath], { encoding: 'utf8' });
const requiredEntries = [
  '\\dist-electron\\main.js',
  '\\dist-electron\\preload.js',
  '\\dist-electron\\ipc\\registerHandlers.js',
  '\\dist-electron\\storage\\database.js',
  '\\dist\\index.html',
];

for (const entry of requiredEntries) {
  if (!list.includes(entry)) {
    throw new Error(`Packaged app archive is missing ${entry}`);
  }
}

if (list.includes('\\dist-electron\\electron\\')) {
  throw new Error('Packaged app archive contains unflattened dist-electron\\electron output');
}

const runtimeFiles = [
  join('dist-electron', 'main.js'),
  join('dist-electron', 'preload.js'),
  join('dist-electron', 'ipc', 'registerHandlers.js'),
];

for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8');
  if (source.includes('../../shared/') || source.includes('../shared/')) {
    throw new Error(`${file} contains a runtime shared import that will resolve incorrectly when packaged`);
  }
}

console.log('Electron package layout verified.');
