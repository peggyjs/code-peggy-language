import * as path from "path";

import { ExtensionContext, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule
    = context.asAbsolutePath(path.join("out", "server", "server.js"));

  // The debug options for the server
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launch in debug mode the debug server options are use
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, options: debugOptions },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ language: "peggy" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files
      // condisposabletain in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  const server = new LanguageClient(
    "Language Server Peggy",
    serverOptions,
    clientOptions
  );
  const disposable = server.start();

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);
}
