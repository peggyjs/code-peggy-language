import commonjs from "@peggyjs/eslint-config/commonjs.js";
import mocha from  "@peggyjs/eslint-config/mocha.js";
import modern from "@peggyjs/eslint-config/modern.js";
import ts from  "@peggyjs/eslint-config/ts.js";

export default [
  {
    ignores: [
      "out/**",
      "dist/**",
      "vendor/**",
      "package-lock.json",
      "esbuild.js",
      "test/*.test.ts",
      ".vscode-test.mjs",
      ".vscode-test/**",
    ],
  },
  ...commonjs,
  ...modern,
  ...mocha,
  ...ts,
];
