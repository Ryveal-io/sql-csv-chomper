import * as vscode from 'vscode';
import { CsvDocument } from './csvDocument';
import { getWebviewContent } from './util/getWebviewContent';

export class CsvEditorProvider implements vscode.CustomEditorProvider<CsvDocument> {
  private static readonly viewType = 'sqlCsvTool.csvEditor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      CsvEditorProvider.viewType,
      new CsvEditorProvider(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  private constructor(private readonly context: vscode.ExtensionContext) {}

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<CsvDocument>
  >();
  readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<CsvDocument> {
    return CsvDocument.create(uri);
  }

  async resolveCustomEditor(
    document: CsvDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'webview-dist'),
      ],
    };

    webviewPanel.webview.html = getWebviewContent(
      webviewPanel.webview,
      this.context.extensionUri
    );

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready': {
          const bytes = document.content;
          const fileName = document.uri.path.split('/').pop() ?? 'data.csv';
          webviewPanel.webview.postMessage({
            type: 'load',
            fileName,
            content: Array.from(bytes),
          });
          break;
        }

        case 'csvData': {
          document.updateContent(new Uint8Array(message.content));
          break;
        }
      }
    });
  }

  async saveCustomDocument(
    document: CsvDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await vscode.workspace.fs.writeFile(document.uri, document.content);
  }

  async saveCustomDocumentAs(
    document: CsvDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await vscode.workspace.fs.writeFile(destination, document.content);
  }

  async revertCustomDocument(
    document: CsvDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const content = await vscode.workspace.fs.readFile(document.uri);
    document.updateContent(content);
  }

  async backupCustomDocument(
    document: CsvDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    await this.saveCustomDocumentAs(document, context.destination, _cancellation);
    return {
      id: context.destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(context.destination);
        } catch {
          // ignore
        }
      },
    };
  }
}
