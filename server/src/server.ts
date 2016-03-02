'use strict';

import {
    createConnection, IConnection,
    TextDocuments, ITextDocument, Diagnostic,
    InitializeParams, InitializeResult, DiagnosticSeverity,
    Range
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

function pegjsLoc_to_vscodeRange(loc: pegjs.LocationRange): Range {
    return {
        start: {
            line: loc.start.line - 1,
            character: loc.start.column - 1
        },
        end: {
            line: loc.end.line - 1,
            character: loc.end.column - 1
        }
    };
}

documents.onDidChangeContent((change) => {
    let diagnostics: Diagnostic[] = [];
    
    try {
        let result = pegjs.buildParser(change.document.getText());
    } catch(error)
    {
        let err : pegjs.PegjsError = error;
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: pegjsLoc_to_vscodeRange(err.location),
            message: error.name + ": " + error.message
        });
    }
    
    // Send the computed diagnostics to VS Code.
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

// Listen on the connection
connection.listen();