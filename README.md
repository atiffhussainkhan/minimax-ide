# MiniMax + VS Code + GitHub

This folder wires MiniMax models into your VS Code editor and your GitHub workflow.

## What's inside

| Path | Purpose |
|---|---|
| `vscode/settings.json` | Workspace VS Code settings (Cline, Continue). Uses `${env:MINIMAX_API_KEY}`. |
| `vscode/continue-config.json` | Continue.dev model config. Copy to `~/.continue/config.json`. |
| `vscode/cline-mcp.json` | Cline MCP server config for MiniMax. |
| `vscode/image-gen-mcp.json` | MCP config template for free image-gen providers (Cline / Continue / Claude Desktop). |
| `.github/workflows/minimax-review.yml` | Auto-review PRs with MiniMax M3. |
| `.github/workflows/minimax-assistant.yml` | Auto-triage new issues with MiniMax M3. |
| `scripts/setup.sh` | macOS helper that links the configs into place. |
| `scripts/setup-image-gen.sh` | Adds 5 free image-gen MCPs to your Mavis profile. |
| `docs/image-generation.md` | Full free image-gen landscape + audit notes. |
| `assets/` | Generated images committed to the repo (snake-and-ladder game art, etc.). |
| `.gitignore` | Keeps secrets out of git. |

## One-time setup

### 1. Get your API key
https://platform.minimax.io/user-center/basic-information/interface-key

### 2. Run the helper (macOS)
```bash
bash scripts/setup.sh
```
It copies the configs into `~/.continue/config.json` and the Cline settings folder. You'll then edit those files to replace `<YOUR_MINIMAX_API_KEY>` with your real key.

### 3. Install VS Code extensions
```bash
code --install-extension saoudrizwan.claude-dev     # Cline
code --install-extension Continue.continue         # Continue
```

### 4. Wire the key into Actions
In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
- Name: `MINIMAX_API_KEY`
- Value: your MiniMax API key

### 5. (Optional) Anthropic-compatible endpoint
Some tools want Anthropic format. Base: `https://api.minimax.io/anthropic`, model `MiniMax-M3`.

## Manual API check

```bash
export MINIMAX_API_KEY=sk-...
curl https://api.minimax.io/v1/chat/completions \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"MiniMax-M3","messages":[{"role":"user","content":"ping"}]}'
```

If you see `"choices"`, you're good to go.

## Free image generation (no paid APIs)

This repo also wires up **5 free image-gen providers** into Mavis (the MiniMax Code runtime). See `docs/image-generation.md` for the full audit, then run:

```bash
bash scripts/setup-image-gen.sh
```

That script is idempotent and adds: Pollinations (×2 — HTTP + stdio), HuggingFace, Ideogram (~10/day free), and Black Forest Labs FLUX (free FLUX.2 Klein via OAuth). No card required for any of them. Generated images land in `assets/`.

## Docs
- Token Plan integrations: https://platform.minimax.io/docs/token-plan/intro.md
- BYOK setup: https://agent.minimax.io/docs/code/account/byok.md
- OpenAI-compatible Messages: https://platform.minimax.io/docs/api-reference/text-chat-openai.md
- Anthropic-compatible Messages: https://platform.minimax.io/docs/api-reference/text-chat-anthropic.md