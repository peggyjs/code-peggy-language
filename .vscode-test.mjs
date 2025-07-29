import { defineConfig } from "@vscode/test-cli";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  tests: [
    {
      files: "./out/test/**/*.test.js",
      extensionDevelopmentPath: __dirname,
      //
      // srcDir: "./__tests__/__integration__/out/src",
      mocha: {
        timeout: 10000,
      },
      srcDir: `${__dirname}/out/`,
      launchArgs: [
        "--disable-extensions",
        `--extensionDevelopmentPath=${__dirname}`,
      ],
    },
  ],
  coverage: {
    // //
    // // includeAll: true,
    reporter: ["text", "lcov"],
    //
    // include: ["out/**/*", "server/*.ts", "client/*.ts", "common/*.ts"],
    exclude: ["**/node_modules/**"],
  },
});
