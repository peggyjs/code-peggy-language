import * as assert from "assert";
import * as vscode from "vscode";
import { activate, getDocUri, sleep } from "./helper.js";

suite("Extension Test Suite", () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension("PeggyJS.peggy-language");
    await ext.activate();
  });

  test("Diagnostics", async () => {
    const docUri = getDocUri("bad.peggy");
    const editor = await activate(docUri);
    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);
    console.error({ actualDiagnostics });
    assert.ok(actualDiagnostics);
    assert.ok(Array.isArray(actualDiagnostics));
    assert.equal(actualDiagnostics.length, 3);
    assert.equal(actualDiagnostics[0].severity, 0);
    assert.equal(actualDiagnostics[1].severity, 0);
    assert.equal(actualDiagnostics[2].severity, 0);
    assert.equal(actualDiagnostics[0].message, 'Rule "bar" is not defined');
    assert.equal(actualDiagnostics[1].message, 'Rule "baz" is not defined');
    assert.equal(actualDiagnostics[2].message, 'Rule "baz" is not defined');
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    editor.hide();
  });

  test("live preview", async () => {
    const docUri = getDocUri("fizzbuzz.peggy");
    const editor = await vscode.window.showTextDocument(docUri);
    editor.selection = new vscode.Selection(12, 1, 12, 1);
    let count = 0;

    vscode.window.onDidChangeActiveTextEditor(async input => {
      if ((input?.document?.uri.scheme === "peggyjsin") && (count++ < 2)) {
        await input.edit(async b => {
          const { document } = input;
          const r = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          b.replace(r, `${count}\n2\nfizz\n`);
        });
        await sleep(350);
        await vscode.window.showTextDocument(editor.document, {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false,
        });
        await vscode.commands.executeCommand("editor.peggyLiveFromRule", editor);
      }
    });
    await vscode.commands.executeCommand("editor.peggyLive");

    await sleep(1000);
  });
});
