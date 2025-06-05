Peggy Language Support
======================

Syntax highlighting and error reporting for [Peggy](http://peggyjs.org) in Visual Studio Code.

## Install

See the [Marketplace](https://marketplace.visualstudio.com/items?itemName=PeggyJS.peggy-language).

## Preferences

- `peggyLanguageServer.consoleInfo` [default: *false*]: Show info messages
  that don't have locations in the console.  Examples include diagnostics
  about which compiler passes have been run.  This is mostly useful for
  debugging the extension.
- `peggyLanguageServer.markInfo` [default: *true*]: Mark all diagnostics, even
  merely informative ones.  Some grammar compiler passes will give informative
  messages about optimizations.  Those may be more annoying to you than
  helpful, depending on your approach to grammar writing.

## Syntax Highlighting

![Syntax Highlighting](/images/highlighting.png)

## Error Reporting

Errors in the grammar are highlighted.

![Error Reporting](/images/error.png)

## Go to / Peek Definition

Right-click a rule name, and go to its definition.

![Go To Definition](/images/GoToDefinition.png)

## Go to / Peek References

Right click a rule name, and see all of the places it is used.

![Go To References](/images/GoToReferences.png)

## Rename Symbol

Rename a rule and all of the places that it is used.

![Rename Symbol](/images/renameSymbol.png)

## Outline / Symbol Support

See the current rule in the breadcrumbs at the top of the editor, and a list
of all of the rules in the Outline view.

![Breadcrumbs](/images/breadcrumbs.png)

![Outline](/images/outline.png)

## Live Preview

Live edit and test your Grammars, optionally starting at the rule under cursor.

## Problem Matchers

Report problems of your code in the Problems view when `peggy` is run in a task.
The extension provides two problem matchers: `$peggy` and `$peggy-watch`.

Configure them like the following in your `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: compile (peggy)",
      "type": "npm",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "script": "compile",
      "problemMatcher": "$peggy"
    },
    {
      "label": "npm: watch (peggy)",
      "type": "npm",
      "group": "build",
      "script": "watch",
      "isBackground": true,
      "problemMatcher": "$peggy-watch"
    }
  ]
}
```

and in your `package.json`:

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "compile": "peggy grammar.peggy",
    "watch": "peggy --watch grammar.peggy"
  },
  "devDependencies": {
    "peggy": "^5.0.3"
  }
}
```

Then you can compile your grammar via the command palette with "Tasks: Run Task".
See [Task / VS Code Extension API](https://code.visualstudio.com/docs/debugtest/tasks) for more details.

### Tips

Name your grammar like this for optimal experience: grammar_name.language_extension.peggy. Where language_extension is the extension of the language you're parsing. This will provide syntax highlighting if you have a matching language server installed.

## Contributing

Feel free to contribute to this extension [here](https://github.com/peggyjs/code-peggy-language).
Please read the [CONTRIBUTING.md](/CONTRIBUTING.md).

## Origins

Based on [code-pegjs-language](https://github.com/SrTobi/code-pegjs-language) by [Tobias Kahlert](https://github.com/SrTobi)
