import http from 'http';

interface BridgeResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

const bridgePort = process.env.VSCODE_BRIDGE_PORT
  ? parseInt(process.env.VSCODE_BRIDGE_PORT, 10)
  : null;

function isConnected(): boolean {
  return bridgePort !== null;
}

async function post(path: string, body: Record<string, unknown>): Promise<BridgeResult> {
  if (!bridgePort) {
    return { success: false, message: 'Not connected to VS Code editor. Use execute_sql to run queries directly.' };
  }

  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: bridgePort,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch {
            resolve({ success: res.statusCode === 200 });
          }
        });
      }
    );
    req.on('error', () => {
      resolve({ success: false, message: 'Failed to connect to VS Code bridge.' });
    });
    req.write(data);
    req.end();
  });
}

async function get(path: string): Promise<BridgeResult> {
  if (!bridgePort) {
    return { success: false, message: 'Not connected to VS Code editor.' };
  }

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: bridgePort,
        path,
        method: 'GET',
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch {
            resolve({ success: res.statusCode === 200 });
          }
        });
      }
    );
    req.on('error', () => {
      resolve({ success: false, message: 'Failed to connect to VS Code bridge.' });
    });
    req.end();
  });
}

export async function setSql(sql: string): Promise<BridgeResult> {
  return post('/set-sql', { sql });
}

export async function runQuery(sql: string): Promise<BridgeResult> {
  return post('/run-query', { sql });
}

export async function reload(): Promise<BridgeResult> {
  return post('/reload', {});
}

export async function getStatus(): Promise<BridgeResult> {
  return get('/status');
}

export { isConnected };
