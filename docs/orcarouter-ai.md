# Rook OrcaRouter AI Backend

Rook supports **OrcaRouter** as a secondary shared inference provider. OrcaRouter is an OpenAI-compatible gateway at `https://api.orcarouter.ai/v1`; all model requests originate from the Rook server and the OrcaRouter key is never bundled into Expo, returned by tRPC, or stored in a user workroom. Each Bot stores only a public model identifier.

## Configured models

Rook exposes a fixed set of zero-cost OrcaRouter models:

- `deepseek/deepseek-v4-pro-0813-free` — DeepSeek V4 Pro
- `qwen/qwen3.8-max-free` — Qwen 3.8 Max
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` — Nemotron Nano Omni

These are listed as `orcarouter:`-prefixed IDs in the live model catalog so the client can separate them from OpenRouter and ChatGPT models. The prefix is stripped before the request reaches OrcaRouter.

## Runtime architecture

OrcaRouter lives in `server/ai/orcarouter.ts` and is dispatched from the provider-neutral boundary `server/ai/index.ts`. OpenAI-compatible message, tool, and response-format normalization is shared with the OpenRouter provider via `server/ai/openai-compat.ts`. The workroom agent and Excel tool loop never import a provider SDK directly.

Chat requests hit `POST https://api.orcarouter.ai/v1/chat/completions` with an `Authorization: Bearer <ORCAROUTER_API_KEY>` header. Client-provided model IDs are validated against the fixed catalog before use; an unknown ID falls back to the first configured model, and any OrcaRouter failure falls back to `openrouter/free`.

## Production setup

Create an OrcaRouter API key and set it as a **server-only** production environment variable:

```text
ORCAROUTER_API_KEY=sk-orca-...
```

Do not prefix the key with `EXPO_PUBLIC_`. After updating the Vercel environment, redeploy the production project. Account → AI backend → OrcaRouter should then report **Online**, and the provider switch will offer OrcaRouter as a model source.

## User experience

The Account screen shows a dedicated OrcaRouter card with provider health and the number of available zero-cost models. Users can pick OrcaRouter as the default AI provider from Account, or choose a specific OrcaRouter model per Bot; that choice persists in the existing workroom sync payload. If the OrcaRouter key is missing or a request fails, Rook falls back safely to `openrouter/free` rather than becoming unusable.