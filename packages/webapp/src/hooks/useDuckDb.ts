import { useState, useEffect, useRef } from 'react';
import { initDuckDb, loadCsvFromBytes } from '../services/duckdb';

interface DuckDbState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useDuckDb() {
  const [state, setState] = useState<DuckDbState>({
    isReady: false,
    isLoading: true,
    error: null,
  });
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    initDuckDb()
      .then(() => {
        setState({ isReady: true, isLoading: false, error: null });
      })
      .catch((err) => {
        setState({ isReady: false, isLoading: false, error: String(err) });
      });
  }, []);

  const loadFile = async (fileName: string, content: Uint8Array): Promise<string> => {
    return await loadCsvFromBytes(fileName, content);
  };

  return { ...state, loadFile };
}
