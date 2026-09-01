import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const palette = JSON.parse(await readFile(join(root, "palette/one-dark-two.json"), "utf8"));
const s = palette.standard;
const b = palette.bright;
const t = palette.terminal;
const generated = [];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

async function emit(relative, contents) {
  const target = join(dist, relative);
  await mkdir(dirname(target), { recursive: true });
  const normalized = typeof contents === "string" && !contents.endsWith("\n") ? `${contents}\n` : contents;
  await writeFile(target, normalized);
  generated.push(relative);
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const rgb = (hex) => hex.slice(1).match(/../g).map((part) => Number.parseInt(part, 16));
const unit = (hex) => rgb(hex).map((value) => Number((value / 255).toFixed(6)));
const xmlEscape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const plistHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`;

function itermColor(hex) {
  const [red, green, blue] = unit(hex);
  return `<dict>
    <key>Alpha Component</key><real>1</real>
    <key>Blue Component</key><real>${blue}</real>
    <key>Color Space</key><string>sRGB</string>
    <key>Green Component</key><real>${green}</real>
    <key>Red Component</key><real>${red}</real>
  </dict>`;
}

const itermEntries = [
  ...t.ansi.map((color, index) => [`Ansi ${index} Color`, color]),
  ["Background Color", t.background], ["Bold Color", t.foreground],
  ["Cursor Color", t.cursor], ["Cursor Text Color", t.background],
  ["Foreground Color", t.foreground], ["Link Color", s.blue],
  ["Selected Text Color", t.foreground], ["Selection Color", t.selection],
].map(([key, color]) => `  <key>${key}</key>\n  ${itermColor(color)}`).join("\n");
await emit("terminal/One Dark Two.itermcolors", `${plistHeader}\n<dict>\n${itermEntries}\n</dict>\n</plist>`);

await cp(join(root, "vendor/One Dark Two.terminal"), join(dist, "terminal/One Dark Two.terminal"));
generated.push("terminal/One Dark Two.terminal");

await emit("moshi/one-dark-two.json", json({
  v: 1,
  name: palette.name,
  mode: "dark",
  colors: {
    background: t.background, foreground: t.foreground, cursor: t.cursor,
    black: t.ansi[0], red: t.ansi[1], green: t.ansi[2], yellow: t.ansi[3],
    blue: t.ansi[4], magenta: t.ansi[5], cyan: t.ansi[6], white: t.ansi[7],
    brightBlack: t.ansi[8], brightRed: t.ansi[9], brightGreen: t.ansi[10],
    brightYellow: t.ansi[11], brightBlue: t.ansi[12], brightMagenta: t.ansi[13],
    brightCyan: t.ansi[14], brightWhite: t.ansi[15], selectionBackground: t.selection,
  },
}));

const tmScopes = [
  ["Comment", "comment, punctuation.definition.comment", s.overlay2, null, "italic"],
  ["Strings", "string, constant.other.symbol", s.green],
  ["Numbers and constants", "constant.numeric, constant.language, constant.character", s.orange],
  ["Keywords", "keyword, storage.type, storage.modifier", s.magenta],
  ["Functions", "entity.name.function, support.function", s.blue],
  ["Types", "entity.name.type, entity.name.class, support.type", s.yellow],
  ["Variables", "variable, variable.other.readwrite", s.red],
  ["Parameters", "variable.parameter", s.orange],
  ["Properties", "variable.other.property, support.variable.property", s.cyan],
  ["Tags", "entity.name.tag", s.red],
  ["Attributes", "entity.other.attribute-name", s.yellow],
  ["Invalid", "invalid, invalid.illegal", s.text, s.red],
  ["Diff inserted", "markup.inserted, meta.diff.header.to-file", s.green],
  ["Diff deleted", "markup.deleted, meta.diff.header.from-file", s.red],
  ["Diff changed", "markup.changed", s.yellow],
];
const tmSettings = tmScopes.map(([name, scope, foreground, background, fontStyle]) => {
  const settings = [`<key>foreground</key><string>${foreground}</string>`];
  if (background) settings.push(`<key>background</key><string>${background}</string>`);
  if (fontStyle) settings.push(`<key>fontStyle</key><string>${fontStyle}</string>`);
  return `<dict><key>name</key><string>${xmlEscape(name)}</string><key>scope</key><string>${xmlEscape(scope)}</string><key>settings</key><dict>${settings.join("")}</dict></dict>`;
}).join("\n");
const tmTheme = `${plistHeader}
<dict>
  <key>name</key><string>One Dark Two</string>
  <key>semanticClass</key><string>theme.dark.one-dark-two</string>
  <key>settings</key><array>
    <dict><key>settings</key><dict>
      <key>background</key><string>${s.base}</string>
      <key>caret</key><string>${s.text}</string>
      <key>foreground</key><string>${s.text}</string>
      <key>invisibles</key><string>${s.overlay0}</string>
      <key>lineHighlight</key><string>${s.surface0}</string>
      <key>selection</key><string>${s.surface1}</string>
    </dict></dict>
    ${tmSettings}
  </array>
  <key>uuid</key><string>65C9434D-2D95-4EF4-A8C4-4AE6CE847D20</string>
</dict>
</plist>`;
await emit("textmate/One Dark Two.tmTheme", tmTheme);

await emit("claude/one-dark-two.json", json({
  name: "One Dark Two",
  base: "dark",
  overrides: {
    claude: s.magenta, text: s.text, inverseText: s.crust, dimText: s.subtext0,
    error: s.red, warning: s.yellow, success: s.green, info: s.blue, link: s.cyan,
    suggestion: s.overlay2, planMode: s.cyan, promptBorder: s.blue,
    diffAdded: s.green, diffRemoved: s.red, userMessageBackground: s.surface0,
  },
}));

await emit("gemini/one-dark-two.json", json({
  name: "One Dark Two", type: "custom",
  background: { primary: s.base, diff: { added: s.surface0, removed: s.crust } },
  text: { primary: s.text, secondary: s.subtext0, link: s.cyan, accent: s.magenta },
  border: { default: s.surface2, focused: s.blue },
  status: { success: s.green, warning: s.yellow, error: s.red },
  ui: { comment: s.overlay2, symbol: s.cyan, gradient: [s.magenta, s.blue, s.cyan] },
}));

const cursorTheme = {
  name: "One Dark Two",
  type: "dark",
  colors: {
    "editor.background": s.base, "editor.foreground": s.text,
    "editorCursor.foreground": s.text, "editor.selectionBackground": `${s.surface1}cc`,
    "editor.lineHighlightBackground": s.surface0, "editorLineNumber.foreground": s.overlay0,
    "editorLineNumber.activeForeground": s.subtext1, "editorWhitespace.foreground": s.surface2,
    "editorIndentGuide.background1": s.surface1, "editorIndentGuide.activeBackground1": s.overlay0,
    "activityBar.background": s.crust, "activityBar.foreground": s.text,
    "sideBar.background": s.mantle, "sideBar.foreground": s.subtext1,
    "sideBar.border": s.crust, "statusBar.background": s.crust,
    "statusBar.foreground": s.subtext1, "titleBar.activeBackground": s.mantle,
    "titleBar.activeForeground": s.text, "panel.background": s.mantle,
    "panel.border": s.surface1, "input.background": s.surface0,
    "input.foreground": s.text, "input.border": s.surface2,
    "focusBorder": s.blue, "button.background": s.blue, "button.foreground": s.crust,
    "list.activeSelectionBackground": s.surface1, "list.activeSelectionForeground": s.text,
    "list.hoverBackground": s.surface0, "badge.background": s.magenta,
    "badge.foreground": s.crust, "progressBar.background": s.blue,
    "notificationCenterHeader.background": s.mantle, "notifications.background": s.base,
    "terminal.background": t.background, "terminal.foreground": t.foreground,
    "terminalCursor.foreground": t.cursor, "terminal.selectionBackground": t.selection,
    ...Object.fromEntries(t.ansi.map((color, index) => {
      const names = ["Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White", "BrightBlack", "BrightRed", "BrightGreen", "BrightYellow", "BrightBlue", "BrightMagenta", "BrightCyan", "BrightWhite"];
      return [`terminal.ansi${names[index]}`, color];
    })),
    "gitDecoration.addedResourceForeground": s.green,
    "gitDecoration.modifiedResourceForeground": s.yellow,
    "gitDecoration.deletedResourceForeground": s.red,
    "diffEditor.insertedTextBackground": `${s.green}22`,
    "diffEditor.removedTextBackground": `${s.red}22`,
  },
  tokenColors: tmScopes.map(([name, scope, foreground, background, fontStyle]) => ({
    name, scope: scope.split(", "), settings: { foreground, ...(background ? { background } : {}), ...(fontStyle ? { fontStyle } : {}) },
  })),
};
const cursorRoot = "cursor/one-dark-two-everywhere";
await emit(`${cursorRoot}/package.json`, json({
  name: "one-dark-two-everywhere", displayName: "One Dark Two Everywhere",
  description: "The exact One Dark Two palette for Cursor and VS Code.",
  version: "1.0.0", publisher: "redhillsmediafl", license: "MIT",
  icon: "extension.png", files: ["themes/**", "extension.png", "README.md", "LICENSE"],
  repository: { type: "git", url: "https://github.com/RedHillsMediaFL/one-dark-two-everywhere" },
  engines: { vscode: "^1.85.0" }, categories: ["Themes"],
  contributes: { themes: [{ label: "One Dark Two", uiTheme: "vs-dark", path: "./themes/one-dark-two-color-theme.json" }] },
}));
await emit(`${cursorRoot}/themes/one-dark-two-color-theme.json`, json(cursorTheme));
await emit(`${cursorRoot}/README.md`, "# One Dark Two Everywhere\n\nExact One Dark Two theme for Cursor and VS Code.");
await emit(`${cursorRoot}/LICENSE`, await readFile(join(root, "LICENSE"), "utf8"));
await cp(join(root, "vendor/one-dark-two-logo.png"), join(dist, `${cursorRoot}/extension.png`));
generated.push(`${cursorRoot}/extension.png`);

const novaCss = `meta {
  -theme-interface-style: dark;
  -theme-vibrancy: none;
  -theme-accent-color: ${s.blue};
}
window { background-color: ${s.mantle}; color: ${s.text}; }
content { background-color: ${s.base}; }
editor { background-color: ${s.base}; color: ${s.text}; selected-text-background-color: ${s.surface1}; }
terminal { background-color: ${t.background}; color: ${t.foreground}; }
syntax.comment { color: ${s.overlay2}; font-style: italic; }
syntax.string { color: ${s.green}; }
syntax.number, syntax.value { color: ${s.orange}; }
syntax.keyword, syntax.storage { color: ${s.magenta}; }
syntax.function, syntax.identifier.function { color: ${s.blue}; }
syntax.type, syntax.class { color: ${s.yellow}; }
syntax.variable { color: ${s.red}; }
syntax.property { color: ${s.cyan}; }
syntax.invalid { color: ${s.text}; background-color: ${s.red}; }
`;
const novaRoot = "nova/One Dark Two Everywhere.novaextension";
await emit(`${novaRoot}/extension.json`, json({
  identifier: "fl.redhillsmedia.one-dark-two-everywhere", name: "One Dark Two Everywhere",
  organization: "Red Hills Media", description: "Exact One Dark Two theme.",
  version: "1.0.0", categories: ["themes"], minimum_nova_version: "10.0",
  homepage: "https://github.com/RedHillsMediaFL/one-dark-two-everywhere",
  bugs: "https://github.com/RedHillsMediaFL/one-dark-two-everywhere/issues",
}));
await emit(`${novaRoot}/Themes/One Dark Two.css`, novaCss);
await emit(`${novaRoot}/README.md`, "# One Dark Two Everywhere\n\nNative Nova theme port.");
await emit(`${novaRoot}/CHANGELOG.md`, "# Changelog\n\n## 1.0.0\n\n- Initial One Dark Two theme release.\n");
await emit(`${novaRoot}/LICENSE`, await readFile(join(root, "LICENSE"), "utf8"));
await cp(join(root, "vendor/one-dark-two-logo.png"), join(dist, `${novaRoot}/extension.png`));
generated.push(`${novaRoot}/extension.png`);

const xcode = `${plistHeader}
<dict>
  <key>DVTConsoleDebuggerInputTextColor</key><string>${unit(s.text).join(" ")} 1</string>
  <key>DVTConsoleDebuggerOutputTextColor</key><string>${unit(s.subtext1).join(" ")} 1</string>
  <key>DVTConsoleDebuggerPromptTextColor</key><string>${unit(s.blue).join(" ")} 1</string>
  <key>DVTConsoleExectuableInputTextColor</key><string>${unit(s.text).join(" ")} 1</string>
  <key>DVTConsoleExectuableOutputTextColor</key><string>${unit(s.subtext1).join(" ")} 1</string>
  <key>DVTConsoleTextBackgroundColor</key><string>${unit(s.mantle).join(" ")} 1</string>
  <key>DVTConsoleTextInsertionPointColor</key><string>${unit(s.text).join(" ")} 1</string>
  <key>DVTConsoleTextSelectionColor</key><string>${unit(s.surface1).join(" ")} 1</string>
  <key>DVTFontAndColorVersion</key><integer>1</integer>
  <key>DVTLineSpacing</key><real>1.0</real>
  <key>DVTSourceTextBackground</key><string>${unit(s.base).join(" ")} 1</string>
  <key>DVTSourceTextCurrentLineHighlightColor</key><string>${unit(s.surface0).join(" ")} 1</string>
  <key>DVTSourceTextInsertionPointColor</key><string>${unit(s.text).join(" ")} 1</string>
  <key>DVTSourceTextSelectionColor</key><string>${unit(s.surface1).join(" ")} 1</string>
  <key>DVTSourceTextSyntaxColors</key><dict>
    <key>xcode.syntax.attribute</key><string>${unit(s.yellow).join(" ")} 1</string>
    <key>xcode.syntax.character</key><string>${unit(s.green).join(" ")} 1</string>
    <key>xcode.syntax.comment</key><string>${unit(s.overlay2).join(" ")} 1</string>
    <key>xcode.syntax.comment.doc</key><string>${unit(s.overlay2).join(" ")} 1</string>
    <key>xcode.syntax.identifier.class</key><string>${unit(s.yellow).join(" ")} 1</string>
    <key>xcode.syntax.identifier.class.system</key><string>${unit(b.yellow).join(" ")} 1</string>
    <key>xcode.syntax.identifier.constant</key><string>${unit(s.orange).join(" ")} 1</string>
    <key>xcode.syntax.identifier.function</key><string>${unit(s.blue).join(" ")} 1</string>
    <key>xcode.syntax.identifier.function.system</key><string>${unit(b.blue).join(" ")} 1</string>
    <key>xcode.syntax.identifier.macro</key><string>${unit(s.magenta).join(" ")} 1</string>
    <key>xcode.syntax.identifier.type</key><string>${unit(s.yellow).join(" ")} 1</string>
    <key>xcode.syntax.identifier.variable</key><string>${unit(s.red).join(" ")} 1</string>
    <key>xcode.syntax.keyword</key><string>${unit(s.magenta).join(" ")} 1</string>
    <key>xcode.syntax.mark</key><string>${unit(s.cyan).join(" ")} 1</string>
    <key>xcode.syntax.number</key><string>${unit(s.orange).join(" ")} 1</string>
    <key>xcode.syntax.plain</key><string>${unit(s.text).join(" ")} 1</string>
    <key>xcode.syntax.preprocessor</key><string>${unit(s.magenta).join(" ")} 1</string>
    <key>xcode.syntax.string</key><string>${unit(s.green).join(" ")} 1</string>
    <key>xcode.syntax.url</key><string>${unit(s.cyan).join(" ")} 1</string>
  </dict>
  <key>DVTSourceTextSyntaxFonts</key><dict>
    ${["attribute","character","comment","comment.doc","identifier.class","identifier.class.system","identifier.constant","identifier.function","identifier.function.system","identifier.macro","identifier.type","identifier.variable","keyword","mark","number","plain","preprocessor","string","url"].map((key) => `<key>xcode.syntax.${key}</key><string>SFMono-Regular - 11.0</string>`).join("\n    ")}
  </dict>
</dict>
</plist>`;
await emit("xcode/One Dark Two.xccolortheme", xcode);

const vim = `" One Dark Two — generated from palette/one-dark-two.json
set background=dark
hi clear
if exists('syntax_on') | syntax reset | endif
let g:colors_name = 'one-dark-two'
hi Normal guifg=${s.text} guibg=${s.base}
hi Comment guifg=${s.overlay2} gui=italic
hi Constant guifg=${s.orange}
hi String guifg=${s.green}
hi Identifier guifg=${s.red}
hi Function guifg=${s.blue}
hi Statement guifg=${s.magenta}
hi PreProc guifg=${s.magenta}
hi Type guifg=${s.yellow}
hi Special guifg=${s.cyan}
hi Error guifg=${s.text} guibg=${s.red}
hi Visual guibg=${s.surface1}
hi CursorLine guibg=${s.surface0}
hi LineNr guifg=${s.overlay0} guibg=${s.base}
hi CursorLineNr guifg=${s.subtext1} guibg=${s.surface0}
hi Pmenu guifg=${s.text} guibg=${s.mantle}
hi PmenuSel guifg=${s.text} guibg=${s.surface1}
hi DiffAdd guifg=${s.green} guibg=${s.surface0}
hi DiffDelete guifg=${s.red} guibg=${s.crust}
hi DiffChange guifg=${s.yellow} guibg=${s.surface0}
`;
await emit("vim/colors/one-dark-two.vim", vim);

await emit("tmux/one-dark-two.conf", `set -g status-style "bg=${s.mantle},fg=${s.subtext1}"
set -g status-left-style "bg=${s.blue},fg=${s.crust},bold"
set -g status-right-style "bg=${s.mantle},fg=${s.subtext0}"
set -g window-status-style "bg=${s.mantle},fg=${s.overlay2}"
set -g window-status-current-style "bg=${s.surface1},fg=${s.text},bold"
set -g pane-border-style "fg=${s.surface1}"
set -g pane-active-border-style "fg=${s.blue}"
set -g message-style "bg=${s.surface1},fg=${s.text}"
set -g mode-style "bg=${s.blue},fg=${s.crust}"
`);

await emit("btop/one-dark-two.theme", `theme[main_bg]="${s.base}"
theme[main_fg]="${s.text}"
theme[title]="${s.blue}"
theme[hi_fg]="${s.magenta}"
theme[selected_bg]="${s.surface1}"
theme[selected_fg]="${s.text}"
theme[inactive_fg]="${s.overlay1}"
theme[graph_text]="${s.subtext0}"
theme[meter_bg]="${s.surface1}"
theme[proc_misc]="${s.cyan}"
theme[cpu_box]="${s.blue}"
theme[mem_box]="${s.magenta}"
theme[net_box]="${s.cyan}"
theme[proc_box]="${s.green}"
theme[div_line]="${s.surface2}"
theme[temp_start]="${s.green}"
theme[temp_mid]="${s.yellow}"
theme[temp_end]="${s.red}"
theme[cpu_start]="${s.cyan}"
theme[cpu_mid]="${s.blue}"
theme[cpu_end]="${s.magenta}"
theme[free_start]="${s.green}"
theme[free_mid]="${s.cyan}"
theme[free_end]="${s.blue}"
theme[cached_start]="${s.blue}"
theme[cached_mid]="${s.magenta}"
theme[cached_end]="${s.red}"
theme[available_start]="${s.yellow}"
theme[available_mid]="${s.green}"
theme[available_end]="${s.cyan}"
theme[used_start]="${s.yellow}"
theme[used_mid]="${s.orange}"
theme[used_end]="${s.red}"
theme[download_start]="${s.cyan}"
theme[download_mid]="${s.blue}"
theme[download_end]="${s.magenta}"
theme[upload_start]="${s.green}"
theme[upload_mid]="${s.yellow}"
theme[upload_end]="${s.orange}"
`);

await emit("lazygit/one-dark-two.yml", `gui:
  theme:
    activeBorderColor: ['${s.blue}', bold]
    inactiveBorderColor: ['${s.surface2}']
    searchingActiveBorderColor: ['${s.yellow}', bold]
    optionsTextColor: ['${s.cyan}']
    selectedLineBgColor: ['${s.surface0}']
    inactiveViewSelectedLineBgColor: ['${s.mantle}']
    cherryPickedCommitBgColor: ['${s.surface1}']
    cherryPickedCommitFgColor: ['${s.magenta}']
    markedBaseCommitBgColor: ['${s.yellow}']
    markedBaseCommitFgColor: ['${s.crust}']
    unstagedChangesColor: ['${s.red}']
    defaultFgColor: ['${s.text}']
`);

await emit("fzf/one-dark-two.sh", `export FZF_DEFAULT_OPTS="\${FZF_DEFAULT_OPTS:+$FZF_DEFAULT_OPTS }--color=bg:${s.base},bg+:{s.surface0},fg:${s.text},fg+:{s.text},hl:${s.magenta},hl+:{b.magenta},info:${s.cyan},marker:${s.green},prompt:${s.blue},spinner:${s.yellow},pointer:${s.red},header:${s.subtext0},border:${s.surface2},label:${s.subtext1},query:${s.text}"
`);

await emit("shell/truecolor.sh", `# Source from zshenv/bash startup; do not use *-direct TERM identities.
case \${TERM-} in
  ''|dumb) ;;
  *)
    export COLORTERM=truecolor
    if [ -t 0 ] || [ -t 1 ] || [ -n "\${SSH_TTY-}" ] || [ -n "\${TMUX-}" ]; then
      unset NO_COLOR
    fi
    ;;
esac
`);

await emit("ghostty/one-dark-two", `palette = 0=${t.ansi[0]}
${t.ansi.slice(1).map((color, index) => `palette = ${index + 1}=${color}`).join("\n")}
background = ${t.background}
foreground = ${t.foreground}
cursor-color = ${t.cursor}
selection-background = ${t.selection}
selection-foreground = ${t.foreground}
`);
await emit("kitty/one-dark-two.conf", `${t.ansi.map((color, index) => `color${index} ${color}`).join("\n")}
background ${t.background}
foreground ${t.foreground}
cursor ${t.cursor}
selection_background ${t.selection}
selection_foreground ${t.foreground}
`);
await emit("alacritty/one-dark-two.toml", `[colors.primary]
background = '${t.background}'
foreground = '${t.foreground}'

[colors.cursor]
cursor = '${t.cursor}'
text = '${t.background}'

[colors.selection]
background = '${t.selection}'
text = '${t.foreground}'

[colors.normal]
${["black","red","green","yellow","blue","magenta","cyan","white"].map((name, index) => `${name} = '${t.ansi[index]}'`).join("\n")}

[colors.bright]
${["black","red","green","yellow","blue","magenta","cyan","white"].map((name, index) => `${name} = '${t.ansi[index + 8]}'`).join("\n")}
`);
await emit("wezterm/one-dark-two.toml", `[colors]
ansi = [${t.ansi.slice(0, 8).map((color) => `'${color}'`).join(", ")}]
brights = [${t.ansi.slice(8).map((color) => `'${color}'`).join(", ")}]
background = '${t.background}'
foreground = '${t.foreground}'
cursor_bg = '${t.cursor}'
cursor_fg = '${t.background}'
selection_bg = '${t.selection}'
selection_fg = '${t.foreground}'
`);
await emit("windows-terminal/one-dark-two.json", json({
  name: "One Dark Two", background: t.background, foreground: t.foreground,
  cursorColor: t.cursor, selectionBackground: t.selection,
  black: t.ansi[0], red: t.ansi[1], green: t.ansi[2], yellow: t.ansi[3],
  blue: t.ansi[4], purple: t.ansi[5], cyan: t.ansi[6], white: t.ansi[7],
  brightBlack: t.ansi[8], brightRed: t.ansi[9], brightGreen: t.ansi[10],
  brightYellow: t.ansi[11], brightBlue: t.ansi[12], brightPurple: t.ansi[13],
  brightCyan: t.ansi[14], brightWhite: t.ansi[15],
}));

const manifestFiles = [];
for (const relative of generated.sort()) {
  const data = await readFile(join(dist, relative));
  manifestFiles.push({ path: relative, bytes: data.byteLength, sha256: createHash("sha256").update(data).digest("hex") });
}
await emit("manifest.json", json({
  name: palette.name, version: "1.0.0", generatedBy: "scripts/generate.mjs",
  paletteSource: "palette/one-dark-two.json", files: manifestFiles,
}));

console.log(`generated ${manifestFiles.length} theme assets`);
