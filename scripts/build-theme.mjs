#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(repoRoot, "src", "theme");
const outputPath = path.join(repoRoot, "themes", "saga-palette-color-theme.json");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(sourceDir, name), "utf8"));
}

const metadata = readJson("metadata.json");
const palette = readJson("palette.json");
const colors = readJson("colors.json");
const tokenColors = readJson("token-colors.json");
const semanticTokenColors = readJson("semantic-token-colors.json");

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
