"use strict";

import * as peggy from "peggy";
import {
  CompletionItem,
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  InitializeResult,
  ProposedFeatures,
  Range,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

const peggy_unsafe: any = peggy;  // throw away type safety to get at compiler
type RuleCache = {
  [uri: string]: string[]
}
const rules: RuleCache = {};

// Create a connection for the server. The connection uses
// stdin / stdout for message passing
const connection: Connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents = new TextDocuments(TextDocument);
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The
// server receives in the passed params the rootPath of the workspace plus the
// client capabilites.
connection.onInitialize((): InitializeResult => {
  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {}
    }
  };
});

connection.onCompletion(
  (pos: TextDocumentPositionParams): CompletionItem[] => {
    const docRules = rules[pos.textDocument.uri];
    if (!docRules || (docRules.length === 0)) {
      return null;
    }
    const document = documents.get(pos.textDocument.uri);
    if (!document) {
      return null;
    }
    const maxRule = docRules.reduce((t, r) => Math.max(t, r.length), 0);
    const endOffset = document.offsetAt(pos.position);
    const startOffset = (endOffset < maxRule) ? 0 : (endOffset - maxRule);
    const endPos = document.positionAt(startOffset);
    const words = document.getText({
      start: pos.position,
      end: endPos
    }).split(/\P{L}/gmu);  // example "|rule" => ["", "rule"]
    const word = words[words.length - 1];
    if (word === "") {
      return null;
    }

    return docRules.filter(r => r.startsWith(word)).map(label => ({
      label
    }));
  });

function peggyLoc_to_vscodeRange(loc: peggy.LocationRange): Range {
  return {
    start: { line: loc.start.line - 1, character: loc.start.column - 1 },
    end: { line: loc.end.line - 1, character: loc.end.column - 1 }
  };
}

documents.onDidClose((change) => {
  delete rules[change.document.uri.toString()];
});

documents.onDidChangeContent((change) => {
  const diagnostics: Diagnostic[] = [];

  try {
    const ast = peggy_unsafe.parser.parse(change.document.getText(), {
      grammarSource: change.document.uri
    });
    peggy_unsafe.compiler.compile(ast, {
      check: Object.values(peggy_unsafe.compiler.passes.check)
    });
    rules[change.document.uri] = ast.rules.map((r:any) => r.name);
  } catch (error) {
    const err = error as peggy.GrammarError;
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: peggyLoc_to_vscodeRange(err.location),
      message: err.name + ": " + err.message,
      source: "peggy-language"
    });
  }

  // Send the computed diagnostics to VS Code.
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

// Listen on the connection
connection.listen();
