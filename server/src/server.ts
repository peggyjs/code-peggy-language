'use strict';

import * as PEG from 'pegjs';
import {
    createConnection,
    Diagnostic,

    DiagnosticSeverity, IConnection,

    InitializeResult,
    ProposedFeatures,
    Range, TextDocuments,
    TextDocumentSyncKind
} from 'vscode-languageserver';
import {
    TextDocument
} from 'vscode-languageserver-textdocument';



// Create a connection for the server. The connection uses 
// stdin / stdout for message passing
let connection: IConnection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new TextDocuments(TextDocument);
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
connection.onInitialize((): InitializeResult => {
    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: TextDocumentSyncKind.Incremental
        }
    }
});

function pegjsLoc_to_vscodeRange(loc: PEG.LocationRange): Range {
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
        PEG.generate(change.document.getText())
    } catch(error)
    {
        let err = error as PEG.GrammarError;
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: pegjsLoc_to_vscodeRange(err.location),
            message: err.name + ": " + err.message
        });
    }
    
    // Send the computed diagnostics to VS Code.
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

// Listen on the connection
connection.listen();