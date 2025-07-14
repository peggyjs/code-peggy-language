/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */

// @ts-check

"use strict";

const path = require("path");

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  context: __dirname,
  mode: "none", // This leaves the source code as close as possible to the original (when packaging we set this to 'production')
  target: "node", // Extensions run in a node context
  node: {
    __dirname: false, // Leave the __dirname-behaviour intact
  },
  resolve: {
    conditionNames: ["import", "require"],
    mainFields: ["module", "main"],
    extensions: [".ts", ".js"], // Support ts-files and js-files
    symlinks: true,
  },
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        // Configure TypeScript loader:
        // * enable sources maps for end-to-end source maps
        loader: "ts-loader",
        options: {
          compilerOptions: {
            "sourceMap": true,
          },
        },
      }],
    }],
  },
  externals: {
    "vscode": "commonjs vscode", // Ignored because it doesn't exist
  },
  devtool: "source-map",
  entry: {
    "server": "./server/server.ts",
    "client": "./client/index.ts",
    "child": "./node_modules/@peggyjs/from-mem/lib/child.js",
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "out"),
    libraryTarget: "commonjs",
  },
};
