export interface PickedFile {
  name: string;
  content: Uint8Array;
}

export async function pickFile(): Promise<PickedFile> {
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
        resolve({ name: file.name, content: new Uint8Array(buffer) });
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
