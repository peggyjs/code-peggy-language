'use strict';
var path = require('path');
var vscode_1 = require('vscode');
var vscode_languageclient_1 = require('vscode-languageclient');
function activate(context) {
    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
    // If the extension is launch in debug mode the debug server options are use
    // Otherwise the run options are used
    let serverOptions = {
        run: { module: serverModule },
        debug: { module: serverModule, options: debugOptions }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: ['pegjs'],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    let disposable = new vscode_languageclient_1.LanguageClient('Language Server Example', serverOptions, clientOptions).start();
    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=main.js.map