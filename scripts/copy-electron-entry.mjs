import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const entries = ['main', 'preload'];

for (const entry of entries) {
  const source = join('dist-electron', 'electron', `${entry}.js`);
  const sourceMap = `${source}.map`;
  const target = join('dist-electron', `${entry}.js`);
  const targetMap = `${target}.map`;

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  copyFileSync(sourceMap, targetMap);
}
