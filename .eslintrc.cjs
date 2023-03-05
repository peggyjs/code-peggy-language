"use strict";

module.exports = {
  root: true,
  extends: ["@peggyjs", "@peggyjs/eslint-config/typescript"],
  ignorePatterns: [
    "out",
    "server/out",
  ],
};
