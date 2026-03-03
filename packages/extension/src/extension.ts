import * as vscode from 'vscode';
import * as http from 'http';
import { CsvEditorProvider } from './csvEditorProvider';

let bridgeServer: http.Server | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(CsvEditorProvider.register(context));

  // Start the bridge HTTP server for MCP server communication
  startBridgeServer(context);
}

export function deactivate() {
  if (bridgeServer) {
    bridgeServer.close();
    bridgeServer = undefined;
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function startBridgeServer(context: vscode.ExtensionContext) {
  bridgeServer = http.createServer(async (req, res) => {
    // CORS for local only
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const provider = CsvEditorProvider.instance;

    try {
      if (req.method === 'POST' && req.url === '/set-sql') {
        const body = JSON.parse(await readBody(req));
        if (!provider) {
          jsonResponse(res, 503, { success: false, message: 'No CSV editor is active.' });
          return;
        }
        const sent = provider.sendToActiveWebview({ type: 'setSql', sql: body.sql });
        jsonResponse(res, sent ? 200 : 404, {
          success: sent,
          message: sent ? 'SQL set in editor.' : 'No active webview found.',
        });
      } else if (req.method === 'POST' && req.url === '/run-query') {
        const body = JSON.parse(await readBody(req));
        if (!provider) {
          jsonResponse(res, 503, { success: false, message: 'No CSV editor is active.' });
          return;
        }
        const sent = provider.sendToActiveWebview({ type: 'runQuery', sql: body.sql });
        jsonResponse(res, sent ? 200 : 404, {
          success: sent,
          message: sent ? 'Query sent to editor.' : 'No active webview found.',
        });
      } else if (req.method === 'POST' && req.url === '/reload') {
        if (!provider) {
          jsonResponse(res, 503, { success: false, message: 'No CSV editor is active.' });
          return;
        }
        const sent = provider.sendToActiveWebview({ type: 'reload' });
        jsonResponse(res, sent ? 200 : 404, {
          success: sent,
          message: sent ? 'Reload triggered.' : 'No active webview found.',
        });
      } else if (req.method === 'GET' && req.url === '/status') {
        const info = provider?.getActiveEditorInfo() ?? { hasActiveEditor: false };
        jsonResponse(res, 200, info);
      } else {
        jsonResponse(res, 404, { error: 'Not found' });
      }
    } catch (err) {
      jsonResponse(res, 500, { error: String(err) });
    }
  });

  // Listen on random port on localhost
  bridgeServer.listen(0, '127.0.0.1', () => {
    const addr = bridgeServer!.address();
    if (addr && typeof addr === 'object') {
      const port = addr.port;
      console.log(`SQL CSV Tool bridge server listening on port ${port}`);

      // Register the MCP server definition provider if the API is available
      registerMcpServer(context, port);
    }
  });

  bridgeServer.on('error', (err) => {
    console.error('Bridge server error:', err);
  });
}

function registerMcpServer(context: vscode.ExtensionContext, bridgePort: number) {
  // The MCP server JS file is bundled alongside the extension
  const mcpServerPath = vscode.Uri.joinPath(context.extensionUri, 'out', 'mcp', 'server.js').fsPath;

  try {
    // vscode.lm.registerMcpServerDefinitionProvider is available in VS Code 1.99+
    if (vscode.lm && typeof (vscode.lm as any).registerMcpServerDefinitionProvider === 'function') {
      const disposable = (vscode.lm as any).registerMcpServerDefinitionProvider('sqlCsvTool.mcp', {
        provideMcpServerDefinitions: () => {
          return [
            {
              label: 'SQL CSV Tool',
              type: 'stdio',
              command: 'node',
              args: [mcpServerPath],
              env: {
                VSCODE_BRIDGE_PORT: String(bridgePort),
              },
            },
          ];
        },
      });
      context.subscriptions.push(disposable);
      console.log('Registered MCP server definition provider');
    } else {
      console.log(
        'vscode.lm.registerMcpServerDefinitionProvider not available. ' +
        `MCP server can be configured manually with: VSCODE_BRIDGE_PORT=${bridgePort} node ${mcpServerPath}`
      );
    }
  } catch (err) {
    console.log('Failed to register MCP server definition provider:', err);
    console.log(
      `MCP server can be configured manually with: VSCODE_BRIDGE_PORT=${bridgePort} node ${mcpServerPath}`
    );
  }
}
