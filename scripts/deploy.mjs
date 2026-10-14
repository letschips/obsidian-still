// Copy the theme into a vault so Obsidian picks it up (it reloads theme.css
// on change). The repository is the source of truth; the vault holds a copy.
// Usage: node scripts/deploy.mjs <path to vault>
import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const vault = process.argv[2];
if (!vault || !existsSync(join(vault, '.obsidian'))) {
  console.error('Usage: node scripts/deploy.mjs <path to vault>  (the folder that contains .obsidian)');
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(vault, '.obsidian', 'themes', 'Still');
mkdirSync(target, {recursive: true});
for (const file of ['theme.css', 'manifest.json', 'README.md', 'CHANGELOG.md', 'LICENSE']) {
  copyFileSync(join(root, file), join(target, file));
  console.log('copied', file);
}
