import * as path from "path";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { ExtensionContext } from "vscode";

let client: LanguageClient = undefined;

export function activate(context: ExtensionContext): void {
  // The server is implemented in node
  const serverModule
    = context.asAbsolutePath(path.join("out", "server", "server.js"));

  // The debug options for the server
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launch in debug mode the debug server options are use
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ language: "peggy" }],
    diagnosticCollectionName: "peggy",
    synchronize: {
      configurationSection: "peggyLanguageServer",
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "peggyLanguageServer",
    "Peggy Language Server",
    serverOptions,
    clientOptions
  );
  client.registerProposedFeatures();
  client.start();
}

export function deactivate(): Promise<void> {
  if (client) {
    return client.stop();
  }
  return undefined;
}
