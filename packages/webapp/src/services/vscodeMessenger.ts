import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types/messages';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

let vscodeApi: VsCodeApi | null = null;

export function isVsCodeEnvironment(): boolean {
  return typeof acquireVsCodeApi !== 'undefined';
}

export function getVsCodeApi(): VsCodeApi | null {
  if (!vscodeApi && isVsCodeEnvironment()) {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

export function postMessageToExtension(message: WebviewToExtensionMessage): void {
  getVsCodeApi()?.postMessage(message);
}

export function onMessageFromExtension(
  handler: (message: ExtensionToWebviewMessage) => void
): () => void {
  const listener = (event: MessageEvent) => {
    handler(event.data as ExtensionToWebviewMessage);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
