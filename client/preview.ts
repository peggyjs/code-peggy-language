import * as path from "path";
import * as peggy from "peggy";
import * as util from "node-inspect-extracted";
import {
  ExtensionContext,
  OutputChannel,
  Uri,
  ViewColumn,
  commands,
  window,
  workspace,
} from "vscode";
import { MemFS } from "../vendor/vscode-extension-samples/fileSystemProvider";
import { debounce } from "../common/debounce";

const PEGGY_INPUT_SCHEME = "peggyjsin";

interface GrammarConfig {
  name: string;
  key: string;
  start_rule: string | undefined;
  grammar_uri: Uri;
  input_uri: Uri;
  timeout?: NodeJS.Timeout;
  grammar_text?: string;
  parser?: any;
}

async function executeAndDisplayResults(
  output: OutputChannel,
  config: GrammarConfig
): Promise<void> {
  output.show(true);
  let out = `// ${config.name} ${config.start_rule ? `(${config.start_rule})` : ""}\n`;

  try {
    const [grammar_document, input_document] = [
      await workspace.openTextDocument(config.grammar_uri),
      await workspace.openTextDocument(config.input_uri),
    ];

    // Never leave it dirty; it's saved in memory anyway.
    // Don't bother to wait for the promise.
    input_document.save();
    const grammar_text = grammar_document.getText();

    if (grammar_text !== config.grammar_text) {
      config.parser = peggy.generate(
        grammar_text,
        config.start_rule
          ? {
              allowedStartRules: [config.start_rule],
            }
          : undefined
      );
      config.grammar_text = grammar_text;
    }

    const input = input_document.getText();
    const result = config.parser.parse(
      input,
      config.start_rule ? { startRule: config.start_rule } : undefined
    );

    out += util.inspect(result, {
      depth: Infinity,
      colors: false,
      maxArrayLength: Infinity,
      maxStringLength: Infinity,
      breakLength: 40,
      sorted: true,
    });
    out += "\n";
  } catch (error) {
    out += error.toString();
    out += "\n";
  }
  // Replace once, since addLine causes issues with trailing spaces.
  output.replace(out);
}

const debounceExecution = debounce(executeAndDisplayResults, 300);

export function activate(context: ExtensionContext): void {
  const peggy_output = window.createOutputChannel("Peggy Live", "javascript");
  const memory_fs = new MemFS();
  const grammars = new Map<string, GrammarConfig>();

  function grammarNameFromUri(uri: Uri): string {
    return path
      .basename(uri.fsPath)
      .replace(/\.(pegjs|peggy)$/, "")
      .replace(/^[(][^)]+[)]__/, "");
  }

  function trackGrammar(
    grammar_document_uri: Uri,
    start_rule?: string
  ): GrammarConfig {
    const grammar_name = grammarNameFromUri(grammar_document_uri);
    const key = `${grammar_name}:${start_rule || "*"}`;

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
    const config = {
      name: grammar_name,
      key,
      start_rule,
      grammar_uri: grammar_document_uri,
      input_uri: input_document_uri,
    };
    grammars.set(key, config);
    return config;
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
