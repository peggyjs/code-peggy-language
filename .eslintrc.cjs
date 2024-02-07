"use strict";

module.exports = {
  root: true,
  extends: ["@peggyjs", "@peggyjs/eslint-config/typescript"],
  ignorePatterns: [
    "out",
    "server/out",
  ],
  parserOptions: {
    ecmaVersion: 2020,
    project: true,
  },
};
