# One Dark Two Everywhere

One exact palette for modern terminals, editors, TUIs, and coding-agent CLIs.
This repository turns Beat Reichenbach's high-contrast One Dark Two palette
into deterministic, checksum-pinned assets.

## Included ports

- iTerm2 and Apple Terminal
- Cursor / VS Code (installable VSIX) and Nova
- Xcode, TextMate, Codex, and bat
- Claude Code and Gemini CLI
- Moshi, tmux, Vim/Neovim, btop, fzf, and LazyGit
- Ghostty, Kitty, Alacritty, WezTerm, and Windows Terminal
- A portable truecolor capability fragment

OpenCode's `system` theme is the recommended integration: it consumes the
terminal's One Dark Two ANSI palette directly instead of painting a second,
conflicting palette over it.

## Build and verify

```sh
npm run check
npm run package:cursor
```

`palette/one-dark-two.json` is the source of truth. `npm run generate`
recreates `dist/`, including `dist/manifest.json` with SHA-256 checksums.

## Quick install

```sh
# iTerm2: Preferences → Profiles → Colors → Color Presets → Import
open "dist/terminal/One Dark Two.itermcolors"

# Apple Terminal
open "dist/terminal/One Dark Two.terminal"

# Cursor
cursor --install-extension dist/cursor/one-dark-two-everywhere-1.0.1.vsix

# Codex / bat
mkdir -p ~/.codex/themes ~/.config/bat/themes
cp "dist/textmate/One Dark Two.tmTheme" ~/.codex/themes/
cp "dist/textmate/One Dark Two.tmTheme" ~/.config/bat/themes/
```

See each generated file for the relevant target path. The project never
contains credentials and CI scans every commit with Gitleaks.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
