import { loadCsvFromBytes } from './duckdb';

export async function loadFileFromPicker(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.tsv,.tab,.jsonl,.txt';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        await loadCsvFromBytes(file.name, new Uint8Array(buffer));
        resolve(file.name);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
