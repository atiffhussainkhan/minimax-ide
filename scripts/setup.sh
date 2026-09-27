#!/usr/bin/env bash
# MiniMax VS Code + GitHub setup helper for macOS.
# Run once: bash scripts/setup.sh
# It does NOT store your API key. It only links config files into the right places.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VSCODE_USER_DIR="$HOME/Library/Application Support/Code/User"
CONTINUE_DIR="$HOME/.continue"
CLINE_DIR="$VSCODE_USER_DIR/globalStorage/saoudrizwan.claude-dev"

echo "==> MiniMax setup helper"
echo "Root: $ROOT"
echo ""

read -p "Continue.dev config -> $CONTINUE_DIR/config.json ? [y/N] " a
if [[ "$a" == "y" || "$a" == "Y" ]]; then
  mkdir -p "$CONTINUE_DIR"
  cp "$ROOT/vscode/continue-config.json" "$CONTINUE_DIR/config.json"
  echo "  -> installed. Edit the file and replace <YOUR_MINIMAX_API_KEY>."
fi

read -p "Cline MCP config -> $CLINE_DIR/settings/cline_mcp_settings.json ? [y/N] " a
if [[ "$a" == "y" || "$a" == "Y" ]]; then
  mkdir -p "$CLINE_DIR/settings"
  cp "$ROOT/vscode/cline-mcp.json" "$CLINE_DIR/settings/cline_mcp_settings.json"
  echo "  -> installed. Edit the file and replace <YOUR_MINIMAX_API_KEY>."
fi

read -p "Workspace VS Code settings -> $ROOT/vscode/settings.json ? [y/N] " a
if [[ "$a" == "y" || "$a" == "Y" ]]; then
  mkdir -p "$ROOT/.vscode"
  cp "$ROOT/vscode/settings.json" "$ROOT/.vscode/settings.json"
  echo "  -> installed at $ROOT/.vscode/settings.json"
fi

cat <<EOF

==> Remaining manual steps:

1. Get an API key:
   https://platform.minimax.io/user-center/basic-information/interface-key

2. Open every copied config and replace <YOUR_MINIMAX_API_KEY> with your real key.
   Do NOT commit these files. Add to .gitignore.

3. For GitHub Actions: push the .github/ folder, then in your GitHub repo go to
   Settings -> Secrets and variables -> Actions -> New repository secret
     Name: MINIMAX_API_KEY
     Value: (paste your key)

4. (Optional) install the Cline extension in VS Code:
   code --install-extension saoudrizwan.claude-dev

5. (Optional) install Continue:
   code --install-extension Continue.continue

EOF