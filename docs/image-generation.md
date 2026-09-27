# Free Image Generation — Mavis MCP Setup

Last verified: 2026-09-27. Landscape changes fast — re-check before adding new providers.

This document lists every **truly-free** image-generation provider that works with Mavis (the local desktop runtime behind MiniMax Code) without paid per-image billing, and shows how to wire each one into your MCP roster. The goal: you can ask the agent to "generate an image of X" and it works, $0.

---

## TL;DR — Active providers

| Server name | MCP endpoint | Auth | Free limits | Quality |
|---|---|---|---|---|
| `free-image` | `https://mcp.pollinations.ai/mcp` (streamable-http) | None | Unlimited | Good (FLUX.1-schnell) |
| `pollinations-stdio` | `npx -y @pollinations/model-context-protocol` (stdio) | None | Unlimited | Good (more tools than HTTP version) |
| `huggingface` | `https://huggingface.co/mcp` (streamable-http) | Anonymous / OAuth | Anonymous works | Decent–good, 100+ models |
| `ideogram` | `https://mcp.ideogram.ai/mcp` (streamable-http) | OAuth on first use | ~10 generations/day | Great text-in-images |
| `flux-bfl` | `https://mcp.bfl.ai` (streamable-http) | OAuth (BFL account, free) | Free FLUX.2 Klein tier | Highest-quality free FLUX |

All five are **no-card-required**. Two (ideogram, flux-bfl) need a one-time OAuth sign-in the first time the agent calls them — a browser window pops up, you click Authorize once, and it stays connected.

---

## How to add them

The fastest path is via the `mavis mcp` CLI:

```bash
# 1. Pollinations via HTTP (image-only, lightest)
mavis mcp create --name free-image \
  --transport streamable-http \
  --url https://mcp.pollinations.ai/mcp \
  --description "Free image generation MCP server (Pollinations.ai, no API key)."

# 2. Pollinations official stdio (image + audio + text)
mavis mcp create --name pollinations-stdio \
  --transport stdio \
  --command npx --args "-y" "@pollinations/model-context-protocol" \
  --description "Official Pollinations stdio MCP — free image + audio + text, no auth."

# 3. HuggingFace (anonymous works, OAuth for higher limits)
mavis mcp create --name huggingface \
  --transport streamable-http \
  --url https://huggingface.co/mcp \
  --description "HuggingFace official MCP — search & run models on the Hub."

# 4. Ideogram (~10 free/day, OAuth on first call)
mavis mcp create --name ideogram \
  --transport streamable-http \
  --url https://mcp.ideogram.ai/mcp \
  --description "Ideogram official MCP — ~10 free generations/day, great text rendering."

# 5. Black Forest Labs FLUX (OAuth, free FLUX.2 Klein)
mavis mcp create --name flux-bfl \
  --transport streamable-http \
  --url https://mcp.bfl.ai \
  --description "Black Forest Labs FLUX MCP — FLUX.2 Klein free tier with OAuth."
```

For a fully scripted setup, see `scripts/setup-image-gen.sh` in this repo.

---

## Providers we considered but excluded (not free anymore in 2026)

| Provider | Why excluded |
|---|---|
| Leonardo.ai API | Free API tier removed — requires paid credits |
| Together.ai | $5 minimum credit purchase on signup |
| Google Gemini image (Nano Banana) | "Image generation has no free tier — free-tier keys get `429 RESOURCE_EXHAUSTED` on every image model" |
| OpenRouter image gen | "No image model carries the `:free` suffix — every generation draws on your credit balance" |
| Stability AI | Requires credit card on file even for free credits |
| OpenAI / xAI / Recraft | Paid only |

Local Stable Diffusion via ComfyUI is **free forever** but is gated on GPU VRAM. On Intel macOS with ≤8 GB VRAM, current ComfyUI nightly requires PyTorch 2.4+ which has no x86_64 macOS wheel — so it's a hard blocker on older Intel Macs.

---

## Using the providers

From Mavis, just ask naturally — the agent picks the best provider for the task:

- "Generate an image of a fox in a forest" → routes to Pollinations (unlimited, fast drafts)
- "Generate something that needs legible text in the image" → routes to Ideogram
- "Generate at FLUX.2 Klein quality" → routes to BFL FLUX
- "Generate using a community model on HuggingFace" → routes to HF MCP

For programmatic use, the MCP tools are exposed to the agent automatically once the server is enabled — no extra config needed.

---

## Asset conventions

- Generated images land in `assets/` with descriptive filenames: `snake_ladder_board.png`, `hero_character.png`, etc.
- Commit generated assets to the repo so teammates can pull them and reuse prompts.
- For large model output volumes, prefer `.gitattributes` LFS for the `*.png` and `*.jpg` patterns.

---

## When to re-check

The free-image landscape moves fast. Leonardo and Together both dropped their free API tiers between 2025 and 2026. Re-run this audit every ~6 months or whenever a provider's free tier changes:

1. Check each MCP endpoint still returns HTTP 200
2. Verify auth requirements haven't changed (e.g., OAuth-only providers can move to paid-only)
3. Watch for new community MCPs — the npm registry `@pollinations/*` and glama.ai/mcp/servers are the best discovery surfaces