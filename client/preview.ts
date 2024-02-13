import * as path from "path";
import * as peggy from "peggy";

import {
  ExtensionContext,
  OutputChannel,
  Uri,
  ViewColumn,
  commands,
  window,
  workspace,
} from "vscode";
import { MemFS } from "./memFs";

const PEGGY_INPUT_SCHEME = "peggyin";

interface GrammarConfig {
  name: string;
  key: string;
  start_rule: string | undefined;
  grammar_uri: Uri;
  input_uri: Uri;
  timeout?: NodeJS.Timer;
  grammar_text?: string;
  parser?: any;
}

async function executeAndDisplayResults(
  output: OutputChannel,
  config: GrammarConfig
): Promise<void> {
  output.clear();
  output.show(true);
  output.appendLine(
    `${config.name} ${config.start_rule ? `(${config.start_rule})` : ""}`
  );

  try {
    const [grammar_document, input_document] = [
      await workspace.openTextDocument(config.grammar_uri),
      await workspace.openTextDocument(config.input_uri),
    ];

    const grammar_text = grammar_document.getText();

    config.parser
      = grammar_text === config.grammar_text
        ? config.parser
        : peggy.generate(
          grammar_text,
          config.start_rule
            ? {
                allowedStartRules: [config.start_rule],
              }
            : undefined
        );

    config.grammar_text = grammar_text;

    const input = input_document.getText();
    const result = config.parser.parse(
      input,
      config.start_rule ? { startRule: config.start_rule } : undefined
    );

    output.appendLine(JSON.stringify(result, null, 3));
  } catch (error) {
    output.append(error.toString());
  }
}

function debounceExecution(output: OutputChannel, config: GrammarConfig): void {
  clearTimeout(config.timeout);

  config.timeout = setTimeout(() => {
    executeAndDisplayResults(output, config);
  }, 300);
}

export function activate(context: ExtensionContext): void {
  const peggy_output = window.createOutputChannel("Peggy");
  const memory_fs = new MemFS();
  const grammars = new Map<string, GrammarConfig>();

  function grammarNameFromUri(uri: Uri): string {
    return path
      .basename(uri.fsPath)
      .replace(/.(pegjs|peggy)$/, "")
      .replace(/^[(][^)]+[)]__/, "");
  }

  function trackGrammar(
    grammar_document_uri: Uri,
    start_rule?: string
  ): GrammarConfig {
    const grammar_name = grammarNameFromUri(grammar_document_uri);
    const key = `${grammar_name}:${start_rule || "*"}`;

    /*
    Const base_path = path.dirname(grammar_document_uri.toString());
    const input_document_uri = start_rule
      ? Uri.parse(`${base_path}/(${start_rule})__${grammar_name}`)
      : Uri.parse(`${base_path}/${grammar_name}`);
    */
    const input_document_uri = start_rule
      ? Uri.parse(`${PEGGY_INPUT_SCHEME}:/(${start_rule})__${grammar_name}`)
      : Uri.parse(`${PEGGY_INPUT_SCHEME}:/${grammar_name}`);

    const is_input_document_open = workspace.textDocuments.find(
      d => d.uri === input_document_uri
    );

    if (!is_input_document_open) {
      workspace.fs.writeFile(input_document_uri, Buffer.from("")).then(() => {
        window.showTextDocument(input_document_uri, {
          viewColumn: ViewColumn.Beside,
          preserveFocus: true,
        });
      });
    }

    grammars.set(key, {
      name: grammar_name,
      key,
      start_rule,
      grammar_uri: grammar_document_uri,
      input_uri: input_document_uri,
    });

    return grammars.get(key);
  }

  const documents_changed = workspace.onDidChangeTextDocument(async e => {
    const document_uri_string = e.document.uri.toString();

    for (const config of grammars.values()) {
      if (
        config.grammar_uri.toString() === document_uri_string
        || config.input_uri.toString() === document_uri_string
      ) {
        await executeAndDisplayResults(peggy_output, config);
      }
    }
  });

  const documents_closed = workspace.onDidCloseTextDocument(e => {
    const to_remove = [...grammars.values()].filter(
      config => config.grammar_uri === e.uri || config.input_uri === e.uri
    );

    to_remove.forEach(config => {
      grammars.delete(config.key);
    });
  });

  context.subscriptions.push(
    documents_changed,
    documents_closed,
    peggy_output,
    commands.registerTextEditorCommand("editor.peggyLive", editor => {
      const grammar_config = trackGrammar(editor.document.uri);
      debounceExecution(peggy_output, grammar_config);
    }),
    commands.registerTextEditorCommand("editor.peggyLiveFromRule", editor => {
      const word_range = editor.document.getWordRangeAtPosition(
        editor.selection.start,
        /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*/
      );

      if (word_range !== null) {
        const rule_name = editor.document.getText(word_range);
        const grammar_config = trackGrammar(editor.document.uri, rule_name);

        debounceExecution(peggy_output, grammar_config);
      }
    })
  );
  workspace.registerFileSystemProvider(PEGGY_INPUT_SCHEME, memory_fs);
}
