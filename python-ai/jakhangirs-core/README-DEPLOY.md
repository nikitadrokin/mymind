# Mind Mirror HTTP service

Convex actions call this service; deploy it to any Python host (Fly.io, Railway, Render, etc.).

## Build

```bash
cd python-ai/jakhangirs-core
docker build -t mind-mirror .
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `MIND_MIRROR_SERVICE_SECRET` | Yes | Same value as Convex `MIND_MIRROR_SECRET` |
| `LLM_PROVIDER` | No | `openrouter` (default) or `anthropic` |
| `OPENROUTER_API_KEY` | If OpenRouter | |
| `OPENROUTER_MODEL` | No | Default `openrouter/free` |
| `ANTHROPIC_API_KEY` | If Anthropic | |

## Convex

Set in the Convex dashboard:

- `MIND_MIRROR_URL` — `https://your-host/analyze` (full URL to the `POST /analyze` endpoint)
- `MIND_MIRROR_SECRET` — same string as `MIND_MIRROR_SERVICE_SECRET`

## Health

`GET /health` returns `{"status":"ok"}` (no auth).
