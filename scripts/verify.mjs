import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const palette = JSON.parse(await readFile(join(root, "palette/one-dark-two.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "dist/manifest.json"), "utf8"));
const hex = /^#[0-9a-f]{6}$/;

for (const [group, colors] of Object.entries({ standard: palette.standard, bright: palette.bright })) {
  for (const [name, color] of Object.entries(colors)) {
    if (!hex.test(color)) throw new Error(`${group}.${name} is not normalized hex: ${color}`);
  }
}
if (palette.terminal.ansi.length !== 16 || !palette.terminal.ansi.every((color) => hex.test(color))) {
  throw new Error("terminal ANSI palette must contain exactly 16 normalized colors");
}

function luminance(color) {
  const channels = color.slice(1).match(/../g).map((part) => Number.parseInt(part, 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
if (contrast(palette.terminal.foreground, palette.terminal.background) < 7) {
  throw new Error("terminal foreground/background contrast is below WCAG AAA");
}

for (const entry of manifest.files) {
  const data = await readFile(join(root, "dist", entry.path));
  const digest = createHash("sha256").update(data).digest("hex");
  if (digest !== entry.sha256 || data.byteLength !== entry.bytes) throw new Error(`manifest mismatch: ${entry.path}`);
  if (entry.path.endsWith(".json")) JSON.parse(data);
}

const required = [
  "terminal/One Dark Two.itermcolors", "terminal/One Dark Two.terminal",
  "textmate/One Dark Two.tmTheme", "claude/one-dark-two.json",
  "gemini/one-dark-two.json", "moshi/one-dark-two.json",
  "cursor/one-dark-two-everywhere/themes/one-dark-two-color-theme.json",
  "nova/One Dark Two Everywhere.novaextension/Themes/One Dark Two.css",
  "xcode/One Dark Two.xccolortheme", "shell/truecolor.sh",
];
const paths = new Set(manifest.files.map((entry) => entry.path));
for (const path of required) if (!paths.has(path)) throw new Error(`missing required port: ${path}`);

const trackedText = await Promise.all(manifest.files.map(async (entry) => {
  const data = await readFile(join(root, "dist", entry.path), "utf8");
  return data.includes("\0") ? "" : data;
}));
const corpus = trackedText.join("\n");
if (/ak_[A-Za-z0-9_-]{20,}|gh[opsu]_[A-Za-z0-9]{20,}|BEGIN [A-Z ]+PRIVATE KEY/.test(corpus)) {
  throw new Error("credential-like content found in generated assets");
}
if (/\{[sb]\.[a-zA-Z0-9_]+\}/.test(corpus)) {
  throw new Error("unexpanded palette token found in generated assets");
}

console.log(`verified ${manifest.files.length} assets; contrast ${contrast(palette.terminal.foreground, palette.terminal.background).toFixed(2)}:1`);
