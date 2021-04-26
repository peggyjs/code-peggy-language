"use strict";

import * as peggy from "peggy";
import {
  CompletionItem,
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  InitializeResult,
  LocationLink,
  ProposedFeatures,
  Range,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection
} from "vscode-languageserver/node";
import { Position, TextDocument } from "vscode-languageserver-textdocument";

const peggy_unsafe: any = peggy;  // throw away type safety to get at compiler
type AstCache = {
  [uri: string]: any
}
const AST: AstCache = {};
const WORD_RE = /[^\s{}[\]()`~!@#$%^&*_+-=|\\;:'",./<>?]+/g;

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
      completionProvider: {},
      definitionProvider: true
    }
  };
});

function getWordAtPosition(document:TextDocument, position:Position): string {
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 }
  });
  for (const match of line.matchAll(WORD_RE)) {
    if ((match.index <= position.character)
        && ((match.index + match[0].length) >= position.character)) {
      return match[0];
    }
  }

  return "";
}

function peggyLoc_to_vscodeRange(loc: peggy.LocationRange): Range {
  return {
    start: { line: loc.start.line - 1, character: loc.start.column - 1 },
    end: { line: loc.end.line - 1, character: loc.end.column - 1 }
  };
}

connection.onCompletion((pos: TextDocumentPositionParams): CompletionItem[] => {
  const docAST = AST[pos.textDocument.uri];
  if (!docAST || (docAST.rules.length === 0)) {
    return null;
  }
  const document = documents.get(pos.textDocument.uri);
  if (!document) {
    return null;
  }
  const word = getWordAtPosition(document, pos.position);
  if (word === "") {
    return null;
  }

  return docAST.rules.filter(
    (r:any) => r.name.startsWith(word)).map((r:any) => ({
      label: r.name
    }));
});

connection.onDefinition((pos: TextDocumentPositionParams) : LocationLink[] => {
  const docAST = AST[pos.textDocument.uri];
  if (!docAST || (docAST.rules.length === 0)) {
    return null;
  }
  const document = documents.get(pos.textDocument.uri);
  if (!document) {
    return null;
  }
  const word = getWordAtPosition(document, pos.position);
  if (word === "") {
    return null;
  }

  const rule = docAST.rules.find((r:any) => r.name === word);
  const ruleRange = peggyLoc_to_vscodeRange(rule.location);
  const ruleNameRange = {
    start: ruleRange.start,
    end: {
      line: ruleRange.start.line,
      character: ruleRange.start.character + rule.name.length
    }
  };

  return [
    {
      targetUri: pos.textDocument.uri,
      targetRange: ruleRange,
      targetSelectionRange: ruleNameRange
    }
  ];
});

documents.onDidClose((change) => {
  delete AST[change.document.uri.toString()];
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
    AST[change.document.uri] = ast;
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
