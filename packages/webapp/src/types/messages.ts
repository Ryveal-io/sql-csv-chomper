// Messages FROM extension host TO webview
export type ExtensionToWebviewMessage =
  | { type: 'load'; fileName: string; content: number[] }
  | { type: 'requestExport' };

// Messages FROM webview TO extension host
export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'csvData'; content: number[] }
  | { type: 'error'; message: string };
