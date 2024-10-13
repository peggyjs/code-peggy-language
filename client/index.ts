import { activate as activateClient, deactivate } from "./client";
import { ExtensionContext } from "vscode";
import { activate as activateLivePreview } from "./preview";

export function activate(context: ExtensionContext): void {
  activateLivePreview(context);
  activateClient(context);
}

export { deactivate };
