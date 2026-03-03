import { useEffect, useRef } from 'react';
import {
  isVsCodeEnvironment,
  postMessageToExtension,
  onMessageFromExtension,
} from '../services/vscodeMessenger';
import type { ExtensionToWebviewMessage } from '../types/messages';

interface UseVsCodeMessagingOptions {
  onLoad: (fileName: string, content: Uint8Array) => Promise<void>;
  onRequestExport?: () => Promise<void>;
}

export function useVsCodeMessaging({ onLoad, onRequestExport }: UseVsCodeMessagingOptions) {
  const isVsCode = isVsCodeEnvironment();
  const callbacksRef = useRef({ onLoad, onRequestExport });
  callbacksRef.current = { onLoad, onRequestExport };

  useEffect(() => {
    if (!isVsCode) return;

    const cleanup = onMessageFromExtension(async (msg: ExtensionToWebviewMessage) => {
      switch (msg.type) {
        case 'load':
          await callbacksRef.current.onLoad(msg.fileName, new Uint8Array(msg.content));
          break;
        case 'requestExport':
          await callbacksRef.current.onRequestExport?.();
          break;
      }
    });

    postMessageToExtension({ type: 'ready' });

    return cleanup;
  }, [isVsCode]);

  return { isVsCode };
}
