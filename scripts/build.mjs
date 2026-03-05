import { execSync } from 'child_process';
import { cpSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

console.log('Building webapp...');
execSync('npm run build', { cwd: join(root, 'packages/webapp'), stdio: 'inherit' });

console.log('Building MCP server...');
execSync('npm run build', { cwd: join(root, 'packages/mcp-server'), stdio: 'inherit' });

console.log('Building extension...');
execSync('npm run build', { cwd: join(root, 'packages/extension'), stdio: 'inherit' });

console.log('Copying webapp dist to extension webview-dist...');
const webviewDist = join(root, 'packages/extension/webview-dist');
mkdirSync(webviewDist, { recursive: true });
cpSync(join(root, 'packages/webapp/dist'), webviewDist, { recursive: true });

console.log('Copying MCP server to extension out/mcp/...');
const mcpDist = join(root, 'packages/extension/out/mcp');
mkdirSync(mcpDist, { recursive: true });
cpSync(join(root, 'packages/mcp-server/out/server.js'), join(mcpDist, 'server.js'));
cpSync(join(root, 'packages/mcp-server/out/server.js.map'), join(mcpDist, 'server.js.map'));
cpSync(join(root, 'packages/mcp-server/src/launcher.mjs'), join(mcpDist, 'launcher.mjs'));
cpSync(join(root, 'packages/mcp-server/mcp-package.json'), join(mcpDist, 'package.json'));

console.log('Build complete.');
