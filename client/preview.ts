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
import { MemFS } from "../vendor/vscode-extension-samples/fileSystemProvider";
import { debounce } from "../common/debounce";
import { fileURLToPath } from "url";
import fromMem from "@peggyjs/from-mem";

const PEGGY_INPUT_SCHEME = "peggyjsin";

interface GrammarConfig {
  name: string;
  key: string;
  start_rule: string | undefined;
  grammar_uri: Uri;
  input_uri: Uri;
  timeout?: NodeJS.Timeout;
}

async function executeAndDisplayResults(
  output: OutputChannel,
  config: GrammarConfig
): Promise<void> {
  output.show(true);
  let out = `// ${config.name}${config.start_rule ? ` (${config.start_rule})` : ""}\n`;

  const [grammar_document, input_document] = [
    await workspace.openTextDocument(config.grammar_uri),
    await workspace.openTextDocument(config.input_uri),
  ];

  // Never leave it dirty; it's saved in memory anyway.
  // Don't bother to wait for the promise.
  input_document.save();
  const input = input_document.getText();
  const filename = fileURLToPath(grammar_document.uri.toString());

  try {
    const grammar_text = grammar_document.getText();

    const format = await fromMem.guessModuleType(filename);
    const pbo: peggy.SourceBuildOptions<"source"> = {
      output: "source",
      format,
    };
    if (config.start_rule) {
      pbo.allowedStartRules = [config.start_rule];
    }
    const parserSource = peggy.generate(grammar_text, pbo);

    const consoleOutput: fromMem.ConsoleOutErr = {};
    const parseOpts: PEG.ParserOptions = {
      grammarSource: config.name,
    };
    if (config.start_rule) {
      parseOpts.startRule = config.start_rule;
    }

    const result = await fromMem(parserSource, {
      filename,
      format,
      consoleOutput,
      exec: `
        const util = await import("node:util");
        try {
          const res = IMPORTED.parse(...arg);
          return util.inspect(res, {
            depth: Infinity,
            colors: false,
            maxArrayLength: Infinity,
            maxStringLength: Infinity,
            breakLength: 40,
            sorted: true,
          });
        } catch (er) {
          if (typeof er.format === "function") {
            er.message = er.format([{
              source: arg[1].grammarSource,
              text: arg[0],
            }]);
          }
          throw er;
        }
      `,
      arg: [input, parseOpts],
      colorMode: false,
    });

    consoleOutput.capture?.();
    if (consoleOutput.out) {
      consoleOutput.out = consoleOutput.out.trimEnd();
      out += "\n" + consoleOutput.out.replace(/^/gm, "// stdout: ") + "\n";
    }
    if (consoleOutput.err) {
      consoleOutput.err = consoleOutput.err.trimEnd();
      out += "\n" + consoleOutput.err.replace(/^/gm, "// stderr: ") + "\n";
    }
    out += "\n";
    out += result;
    out += "\n";
  } catch (error) {
    out += error.toString();
  }
  if (!out.endsWith("\n")) {
    out += "\n";
  }

  // Replace once.  Causes trailing spaces to be deleted in input doc,
  // seemingly.
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

  async function trackGrammar(
    grammar_document_uri: Uri,
    start_rule?: string
  ): Promise<GrammarConfig> {
    const grammar_name = grammarNameFromUri(grammar_document_uri);
    const key = `${grammar_name}:${start_rule || "*"}`;

    const input_document_uri = start_rule
      ? Uri.parse(`${PEGGY_INPUT_SCHEME}:/(${start_rule})__${grammar_name}`)
      : Uri.parse(`${PEGGY_INPUT_SCHEME}:/${grammar_name}`);

    const is_input_document_open = workspace.textDocuments.find(
      d => d.uri === input_document_uri
    );

    if (!is_input_document_open) {
      await workspace.fs.writeFile(input_document_uri, Buffer.from(""));
      await window.showTextDocument(input_document_uri, {
        viewColumn: ViewColumn.Beside,
        preserveFocus: false,
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
        debounceExecution(peggy_output, config);
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
    commands.registerTextEditorCommand("editor.peggyLive", async editor => {
      const grammar_config = await trackGrammar(editor.document.uri);
      debounceExecution(peggy_output, grammar_config);
    }),
    commands.registerTextEditorCommand("editor.peggyLiveFromRule", async editor => {
      const word_range = editor.document.getWordRangeAtPosition(
        editor.selection.start,
        /[\p{ID_Start}][\p{ID_Continue}]*/u
      );

      if (word_range !== null) {
        const rule_name = editor.document.getText(word_range);
        const grammar_config = await trackGrammar(
          editor.document.uri,
          rule_name
        );

        debounceExecution(peggy_output, grammar_config);
      }
    })
  );
  workspace.registerFileSystemProvider(PEGGY_INPUT_SCHEME, memory_fs);
}
