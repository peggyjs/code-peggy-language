"use strict";

module.exports = [
  {
    ignores: [
      "out/**",
    ],
  },
  {
    ...require("@peggyjs/eslint-config/flat/js"),
    languageOptions: {
      globals: require("@peggyjs/eslint-config/flat/globals").node,
      ecmaVersion: 2022,
      sourceType: "commonjs",
    },
  },
  require("@peggyjs/eslint-config/flat/mocha"),
  require("@peggyjs/eslint-config/flat/ts"),
];
