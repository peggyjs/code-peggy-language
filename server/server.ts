import * as peggy from "peggy";
import {
  CompletionItem,
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  DocumentSymbolParams,
  InitializeResult,
  Location,
  LocationLink,
  ProposedFeatures,
  Range,
  RenameParams,
  SymbolKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocuments,
  TextEdit,
  WorkspaceEdit,
  createConnection,
} from "vscode-languageserver/node";
import { Position, TextDocument } from "vscode-languageserver-textdocument";

type AstCache = {
  [uri: string]: any;
};
const AST: AstCache = {};
const WORD_RE = /[^\s{}[\]()`~!@#$%^&*_+\-=|\\;:'",./<>?]+/g;
const PASSES: peggy.compiler.Stages = {
  check: peggy.compiler.passes.check,
  transform: peggy.compiler.passes.transform.filter(
    // `inferenceMatchResult` will eventually
    // generate warnings.
    n => n.name === "inferenceMatchResult"
  ),
  generate: [],
};

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
connection.onInitialize((): InitializeResult => ({
  capabilities: {
    // Tell the client that the server works in FULL text document sync mode
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {},
    definitionProvider: true,
    documentSymbolProvider: {
      label: "Peggy Rules",
    },
    referencesProvider: true,
    renameProvider: true,
  },
}));

function getWordAtPosition(document: TextDocument, position: Position): string {
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 },
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
    end: { line: loc.end.line - 1, character: loc.end.column - 1 },
  };
}

function ruleNameRange(name: string, ruleRange: Range): Range {
  return {
    start: ruleRange.start,
    end: {
      line: ruleRange.start.line,
      character: ruleRange.start.character + name.length,
    },
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
    (r: any) => r.name.startsWith(word)
  ).map((r: any) => ({
    label: r.name,
  }));
});

connection.onDefinition((pos: TextDocumentPositionParams): LocationLink[] => {
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

  const rule = docAST.rules.find((r: any) => r.name === word);
  if (!rule) {
    return null;
  }
  const targetRange = peggyLoc_to_vscodeRange(rule.location);
  const targetSelectionRange = ruleNameRange(rule.name, targetRange);

  return [
    {
      targetUri: pos.textDocument.uri,
      targetRange,
      targetSelectionRange,
    },
  ];
});

connection.onReferences((pos: TextDocumentPositionParams): Location[] => {
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
  const results: Location[] = [];
  const visit = peggy.compiler.visitor.build({
    rule_ref(node: any): void {
      if (node.name !== word) { return; }
      results.push({
        uri: pos.textDocument.uri,
        range: peggyLoc_to_vscodeRange(node.location),
      });
    },
  });
  visit(docAST);

  return results;
});

connection.onRenameRequest((pos: RenameParams): WorkspaceEdit => {
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

  const edits: TextEdit[] = [];
  const visit = peggy.compiler.visitor.build({
    rule_ref(node: any): void {
      if (node.name !== word) { return; }
      edits.push({
        newText: pos.newName,
        range: peggyLoc_to_vscodeRange(node.location),
      });
    },

    rule(node: any): void {
      visit(node.expression);
      if (node.name !== word) { return; }
      edits.push({
        newText: pos.newName,
        range: ruleNameRange(node.name, peggyLoc_to_vscodeRange(node.location)),
      });
    },
  });
  visit(docAST);

  return {
    changes: {
      [pos.textDocument.uri]: edits,
    },
  };
});

connection.onDocumentSymbol((pos: DocumentSymbolParams): DocumentSymbol[] => {
  const docAST = AST[pos.textDocument.uri];
  if (!docAST) {
    return null;
  }

  const symbols = docAST.rules.map((r: any) => {
    const range = peggyLoc_to_vscodeRange(r.location);
    const ret: DocumentSymbol = {
      name: r.name,
      kind: SymbolKind.Function,
      range,
      selectionRange: ruleNameRange(r.name, range),
    };
    if (r.expression.type === "named") {
      ret.detail = r.expression.name;
    }

    return ret;
  });
  if (docAST.initializer) {
    const range = peggyLoc_to_vscodeRange(docAST.initializer.location);
    symbols.unshift({
      name: "{Per-parse initializer}",
      kind: SymbolKind.Constructor,
      range,
      selectionRange: ruleNameRange("{", range),
    });
  }
  if (docAST.topLevelInitializer) {
    const range = peggyLoc_to_vscodeRange(docAST.topLevelInitializer.location);
    symbols.unshift({
      name: "{{Global initializer}}",
      kind: SymbolKind.Constructor,
      range,
      selectionRange: ruleNameRange("{{", range),
    });
  }

  return symbols;
});

documents.onDidClose(change => {
  delete AST[change.document.uri.toString()];
});

documents.onDidChangeContent(change => {
  const diagnostics: Diagnostic[] = [];

  try {
    const ast = peggy.parser.parse(change.document.getText(), {
      grammarSource: change.document.uri,
      reservedWords: peggy.RESERVED_WORDS,
    });
    peggy.compiler.compile(ast, PASSES);
    AST[change.document.uri] = ast;
  } catch (error) {
    const err = error as peggy.GrammarError;
    const d: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: peggyLoc_to_vscodeRange(err.location),
      message: err.name + ": " + err.message,
      source: "peggy-language",
      relatedInformation: [],
    };
    for (const diag of err.diagnostics) {
      d.relatedInformation.push({
        location: {
          uri: diag.location.source,
          range: peggyLoc_to_vscodeRange(diag.location),
        },
        message: diag.message,
      });
    }
    diagnostics.push(d);
  }

  // Send the computed diagnostics to VS Code.
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

// Listen on the connection
connection.listen();
