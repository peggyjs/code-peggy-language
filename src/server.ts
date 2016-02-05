'use strict';

import {
    createConnection, IConnection,
    TextDocuments, ITextDocument, Diagnostic,
    InitializeParams, InitializeResult, DiagnosticSeverity
} from 'vscode-languageserver';

import * as pegjs from 'pegjs';

// Create a connection for the server. The connection uses 
// stdin / stdout for message passing
let connection: IConnection = createConnection(process.stdin, process.stdout);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: documents.syncKind
        }
    }
});

documents.onDidChangeContent((change) => {
    let diagnostics: Diagnostic[] = [];
    
    try {
        let result = pegjs.buildParser(change.document.getText());
    } catch(message)
    {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: 1, character: 1},
                end: { line: 1, character: 1 + 10 }
            },
            message: message.meassage
        });
    }
    
    // Send the computed diagnostics to VS Code.
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

// Listen on the connection
connection.listen();