#!/usr/bin/env bash
# Wire the free image-generation MCP servers into your Mavis (MiniMax Code) profile.
# Idempotent — safe to re-run.
#
# Usage:
#   bash scripts/setup-image-gen.sh           # add all 5 free providers
#   bash scripts/setup-image-gen.sh --list    # show what's already configured
#   bash scripts/setup-image-gen.sh --remove  # remove all 5 (for cleanup)

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

say()   { printf "${CYAN}==>${RESET} %s\n" "$*"; }
ok()    { printf "${GREEN} OK${RESET}  %s\n" "$*"; }
warn()  { printf "${YELLOW}WARN${RESET} %s\n" "$*"; }
fail()  { printf "${RED}FAIL${RESET} %s\n" "$*"; exit 1; }

PROVIDERS=(
  "free-image|streamable-http|https://mcp.pollinations.ai/mcp|||Free Pollinations image gen (HTTP), unlimited, no auth."
  "pollinations-stdio|stdio|||npx -y @pollinations/model-context-protocol|Official Pollinations stdio MCP (image+audio+text), no auth."
  "huggingface|streamable-http|https://huggingface.co/mcp|||HuggingFace MCP, anonymous OK, OAuth for higher limits."
  "ideogram|streamable-http|https://mcp.ideogram.ai/mcp|||Ideogram MCP, ~10 free/day, OAuth on first use."
  "flux-bfl|streamable-http|https://mcp.bfl.ai|||Black Forest Labs FLUX MCP, free FLUX.2 Klein via OAuth."
)

if [[ "${1:-}" == "--list" ]]; then
  say "Current MCP roster:"
  mavis mcp list 2>/dev/null || warn "mavis CLI not available — open Mavis desktop to view."
  exit 0
fi

if [[ "${1:-}" == "--remove" ]]; then
  say "Removing all 5 image-gen providers..."
  for entry in "${PROVIDERS[@]}"; do
    IFS='|' read -r name _ _ _ _ _ <<< "$entry"
    if mavis mcp delete --name "$name" 2>/dev/null; then
      ok "Removed: $name"
    else
      warn "Could not remove: $name (may not exist)"
    fi
  done
  exit 0
fi

if ! command -v mavis >/dev/null 2>&1; then
  fail "mavis CLI not found on PATH. Are you running this inside MiniMax Code's Terminal?"
fi

say "Adding 5 free image-generation providers to your Mavis MCP roster..."

for entry in "${PROVIDERS[@]}"; do
  IFS='|' read -r name transport url cmd args desc <<< "$entry"
  say "  $name"

  if [[ "$transport" == "streamable-http" ]]; then
    if mavis mcp create \
        --name "$name" \
        --transport streamable-http \
        --url "$url" \
        --description "$desc" \
        --enabled 2>/dev/null; then
      ok "    added (streamable-http)"
    else
      warn "    already exists or failed — skipping"
    fi
  else
    # stdio transport — args is space-separated
    # shellcheck disable=SC2206
    args_arr=( $args )
    if mavis mcp create \
        --name "$name" \
        --transport stdio \
        --command "$cmd" \
        --args "${args_arr[@]}" \
        --description "$desc" \
        --enabled 2>/dev/null; then
      ok "    added (stdio)"
    else
      warn "    already exists or failed — skipping"
    fi
  fi
done

cat <<EOF

${GREEN}============================================================${RESET}
${GREEN}Done.${RESET}
${GREEN}============================================================${RESET}

Next steps:

1. Open Mavis (MiniMax Code). The 5 servers should appear under
   Settings → MCP Servers. The first time the agent calls
   ideogram or flux-bfl, a browser window will pop up for
   one-time OAuth sign-in.

2. Test it — ask the agent:
     "Generate a snake-and-ladder board game illustration"

3. Generated images land in  /Users/mac/Documents/Mini AI/assets/
   and are committed to this repo (see .gitattributes if you
   want LFS for large images).

${YELLOW}Heads-up:${RESET} Leonardo.ai, Together.ai, Google Gemini image
generation, and OpenRouter image generation all moved to
paid-only in 2026. This stack is the complete free path
as of 2026-09-27. Re-audit every 6 months.

EOF