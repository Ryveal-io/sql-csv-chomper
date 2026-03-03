import * as vscode from 'vscode';

export class CsvDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri;
  private _content: Uint8Array;

  private constructor(uri: vscode.Uri, content: Uint8Array) {
    this.uri = uri;
    this._content = content;
  }

  static async create(uri: vscode.Uri): Promise<CsvDocument> {
    const content = await vscode.workspace.fs.readFile(uri);
    return new CsvDocument(uri, content);
  }

  get content(): Uint8Array {
    return this._content;
  }

  updateContent(newContent: Uint8Array): void {
    this._content = newContent;
  }

  dispose(): void {
    // Cleanup if needed
  }
}
