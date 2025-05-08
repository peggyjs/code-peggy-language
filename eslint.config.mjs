import commonjs from "@peggyjs/eslint-config/commonjs.js";
import mocha from  "@peggyjs/eslint-config/mocha.js";
import modern from "@peggyjs/eslint-config/modern.js";
import ts from  "@peggyjs/eslint-config/ts.js";

export default [
  {
    ignores: [
      "out/**",
      "vendor/**",
      "package-lock.json",
    ],
  },
  ...commonjs,
  ...modern,
  ...mocha,
  ...ts,
];
