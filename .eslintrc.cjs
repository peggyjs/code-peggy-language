"use strict";

module.exports = {
  root: true,
  extends: "@peggyjs",
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: [
    "out",
    "server/out"
  ],
};
