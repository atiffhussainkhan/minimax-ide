#!/usr/bin/env bash
# MiniMax GitHub setup - finds your repo and wires up the workflows.
# Run once: bash scripts/setup-github.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKFLOW_SRC="$ROOT/.github/workflows"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Colors
B="\033[1m"; G="\033[32m"; Y="\033[33m"; C="\033[36m"; R="\033[0m"
say()  { printf "${C}==>${R} ${B}%s${R}\n" "$*"; }
ok()   { printf "${G}OK${R}   %s\n" "$*"; }
warn() { printf "${Y}WARN${R} %s\n" "$*"; }
fail() { printf "${R}FAIL${R} %s\n" "$*"; exit 1; }

# 1. Find git repos on this Mac
say "Scanning for git repositories under your home folder..."
REPOS=()
while IFS= read -r dir; do
  REPOS+=( "$dir" )
done < <(find /Users/mac -maxdepth 6 -type d -name ".git" 2>/dev/null \
  | sed 's|/\.git$||' \
  | grep -v -E "(node_modules|\.cache|\.minimax|\.codex|\.copilot|\.continue|\.claude|\.ollama|Trash)" \
  | sort -u)

if [ "${#REPOS[@]}" -eq 0 ]; then
  warn "No git repos found."
  echo "Either clone one first:"
  echo "  cd ~/Documents"
  echo "  git clone https://github.com/<your-username>/<your-repo>.git"
  echo "Or tell me the path and I'll add it manually."
  exit 1
fi

# 2. Let user pick
echo ""
echo "Found ${#REPOS[@]} repo(s):"
for i in "${!REPOS[@]}"; do
  printf "  [%2d] %s\n" "$((i+1))" "${REPOS[$i]}"
done
echo "  [s] Skip — let me paste a path"
echo ""

while true; do
  read -r -p "Pick a number, or 's' to type a path: " choice
  if [[ "$choice" == "s" || "$choice" == "S" ]]; then
    read -r -p "Paste the full path to your repo: " REPO
    [ -d "$REPO" ] || fail "Folder not found: $REPO"
    break
  elif [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#REPOS[@]}" ]; then
    REPO="${REPOS[$((choice-1))]}"
    break
  else
    echo "Invalid choice."
  fi
done

ok "Selected: $REPO"

# 3. Confirm it's actually a git repo
cd "$REPO"
[ -d .git ] || fail "$REPO is not a git repo (no .git folder). Run 'git init' first."

# Show remote
REMOTE=$(git remote get-url origin 2>/dev/null || echo "(no remote set)")
echo ""
say "Repo info"
echo "  Path:   $REPO"
echo "  Branch: $(git branch --show-current 2>/dev/null || echo '?')"
echo "  Remote: $REMOTE"
echo ""

# 4. Copy workflows into the repo
say "Installing workflows..."
mkdir -p .github/workflows
cp "$WORKFLOW_SRC/minimax-review.yml"     .github/workflows/
cp "$WORKFLOW_SRC/minimax-assistant.yml"  .github/workflows/
ok "Copied 2 workflow files into .github/workflows/"

# 5. Stage and commit (do NOT push automatically)
say "Staging files..."
git add .github/workflows/
ok "Staged."

read -r -p "Commit now? [Y/n] " do_commit
do_commit=${do_commit:-Y}
if [[ "$do_commit" == "y" || "$do_commit" == "Y" ]]; then
  git -c user.name="MiniMax Setup" -c user.email="setup@local" commit -m "Add MiniMax PR review and issue triage workflows" \
    || warn "Nothing to commit (maybe already committed)."
  ok "Committed."
else
  warn "Skipped commit. Run later: git commit -m 'Add MiniMax workflows'"
fi

# 6. Ask before pushing
read -r -p "Push to origin now? [y/N] " do_push
if [[ "$do_push" == "y" || "$do_push" == "Y" ]]; then
  BRANCH=$(git branch --show-current)
  git push -u origin "$BRANCH" || fail "Push failed. Check your GitHub login."
  ok "Pushed to origin/$BRANCH"
else
  warn "Skipped push. Run later: git push"
fi

# 7. Detect the GitHub URL for the secret page
GH_URL=""
if [[ "$REMOTE" =~ github\.com[:/](.+)/(.+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPNAME="${BASH_REMATCH[2]%.git}"
  GH_URL="https://github.com/$OWNER/$REPNAME"
fi

# 8. Print the exact GitHub.com steps
cat <<EOF

${B}============================================================${R}
${B}Now do this on GitHub.com (2 minutes):${R}
${B}============================================================${R}

${B}Step A.${R} Open your repo's Secrets page:

EOF
if [ -n "$GH_URL" ]; then
  echo "    ${C}${GH_URL}/settings/secrets/actions${R}"
else
  echo "    ${C}https://github.com/<you>/<repo>/settings/secrets/actions${R}"
fi

cat <<EOF

  On that page, click ${B}New repository secret${R}.
  Then fill in:
    ${B}Name${R}   : MINIMAX_API_KEY     (exact spelling, all caps, underscores)
    ${B}Value${R}  : (paste the key from https://platform.minimax.io/user-center/basic-information/interface-key)
  Then click ${B}Add secret${R}.

${B}Step B.${R} Test the PR review workflow:
    1. On GitHub.com, open a Pull Request in your repo.
       If you have nothing to PR, run these in Terminal:
         cd "$REPO"
         git checkout -b test/minimax
         echo "# minimax smoke test" >> README.md
         git add README.md && git commit -m "test: smoke"
         git push -u origin test/minimax
       Then open the PR on GitHub.com.

    2. Wait ~30 seconds. The bot should post a review comment.

${B}Step C.${R} If nothing happens, look at the Actions tab:
EOF
if [ -n "$GH_URL" ]; then
  echo "    ${C}${GH_URL}/actions${R}"
fi
cat <<EOF

  Click the latest run -> click the failed job -> read the red step.
  Most common cause: the secret name is misspelled.

${B}============================================================${R}
EOF