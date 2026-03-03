import { execSync } from 'child_process';
import { cpSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

console.log('Building webapp...');
execSync('npm run build', { cwd: join(root, 'packages/webapp'), stdio: 'inherit' });

console.log('Building extension...');
execSync('npm run build', { cwd: join(root, 'packages/extension'), stdio: 'inherit' });

console.log('Copying webapp dist to extension webview-dist...');
const webviewDist = join(root, 'packages/extension/webview-dist');
mkdirSync(webviewDist, { recursive: true });
cpSync(join(root, 'packages/webapp/dist'), webviewDist, { recursive: true });

console.log('Build complete.');
