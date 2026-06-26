import { copyFileSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join('dist-electron', 'electron');
const targetRoot = 'dist-electron';

if (!existsSync(sourceRoot)) {
  throw new Error(`Missing Electron build output: ${sourceRoot}`);
}

cpSync(sourceRoot, targetRoot, { recursive: true, force: true });
rmSync(sourceRoot, { recursive: true, force: true });
copyFileSync(join('electron', 'preload.cjs'), join(targetRoot, 'preload.cjs'));
