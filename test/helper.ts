import * as vscode from "vscode";
import path from "node:path";

export function getDocPath(p: string): string {
  return path.resolve(__dirname, "..", "..", "test", "fixtures", p);
}

export function getDocUri(p: string): vscode.Uri {
  return vscode.Uri.file(getDocPath(p));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, ms); });
}

export async function activate(docUri: vscode.Uri): Promise<vscode.TextEditor> {
  return new Promise((resolve, reject) => {
    const docUriS = docUri.toString();
    let w: vscode.TextEditor | undefined = undefined;
    vscode.languages.onDidChangeDiagnostics(e => {
      if (e.uris.some(u => docUriS === u.toString())) {
        resolve(w);
      }
    });
    try {
      vscode.window.showTextDocument(docUri)
        .then(win => { w = win; });
      sleep(2000).then(() => reject(new Error("Timeout")));
    } catch (e) {
      reject(e as Error);
    }
  });
}

export function allTabs(): Map<string, vscode.Tab> {
  return new Map(vscode.window.tabGroups.all
    .map(tg => tg.tabs)
    .flat()
    .filter(t => t.input instanceof vscode.TabInputText)
    .map((t: vscode.Tab) => [
      (t.input as vscode.TabInputText).uri.toString(),
      t,
    ]));
}
