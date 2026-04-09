#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(repoRoot, "src", "theme");
const outputPath = path.join(repoRoot, "themes", "saga-palette-color-theme.json");

function readJson(name) {
  return JSON.parse(stripJsonComments(fs.readFileSync(path.join(sourceDir, name), "utf8")));
}

function stripJsonComments(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const current = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (current === "\n") {
        inLineComment = false;
        output += current;
      }
      continue;
    }

    if (inBlockComment) {
      if (current === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += current;
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === "\"") {
        inString = false;
      }
      continue;
    }

    if (current === "\"") {
      inString = true;
      output += current;
      continue;
    }

    if (current === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (current === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    output += current;
  }

  return output;
}

const metadata = readJson("metadata.jsonc");
const palette = readJson("palette.jsonc");
const colors = readJson("colors.jsonc");
const tokenColors = readJson("token-colors.jsonc");
const semanticTokenColors = readJson("semantic-token-colors.jsonc");

function resolvePaletteRef(value) {
  if (typeof value === "string") {
    const match = value.match(/^@palette\.([A-Za-z0-9_]+)(?:\/([0-9a-fA-F]{2}))?$/);
    if (!match) {
      return value;
    }

    const [, token, alpha = ""] = match;
    const base = palette[token];
    if (!base) {
      throw new Error(`Unknown palette token: ${token}`);
    }

    return `${base}${alpha}`;
  }

  if (Array.isArray(value)) {
    return value.map(resolvePaletteRef);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolvePaletteRef(child)]),
    );
  }

  return value;
}

const theme = {
  ...metadata,
  semanticTokenColors: resolvePaletteRef(semanticTokenColors),
  colors: resolvePaletteRef(colors),
  tokenColors: resolvePaletteRef(tokenColors),
};

fs.writeFileSync(outputPath, `${JSON.stringify(theme, null, 2)}\n`);

console.log(`Built ${path.relative(repoRoot, outputPath)}`);
