"""
Shared async Mind Mirror pipeline for CLI, bridge, and HTTP server.
"""

from __future__ import annotations

import os
from typing import Any, Literal, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from rag.knowledge_base import KnowledgeBase
from swarm.aggregator import aggregate_and_stream
from swarm.orchestrator import SwarmOrchestrator
from swarm.profiler import create_digital_dna

Provider = Literal["openrouter", "anthropic"]


def get_llm_config() -> Tuple[str, str, Provider]:
    """Resolve provider label, model id, and provider key from environment."""
    raw = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
    if raw not in {"openrouter", "anthropic"}:
        raise ValueError(
            f'Unsupported LLM_PROVIDER "{raw}". Use "openrouter" or "anthropic".',
        )
    provider: Provider = raw  # type: ignore[assignment]
    if provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        model = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-6")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.")
    else:
        api_key = os.getenv("OPENROUTER_API_KEY")
        model = os.getenv("OPENROUTER_MODEL", "openrouter/free")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter.")
    return api_key, model, provider


def create_llm_client() -> Tuple[Any, str, Provider]:
    """Build provider client and return (client, model, provider)."""
    api_key, model, provider = get_llm_config()
    if provider == "anthropic":
        client: Any = AsyncAnthropic(api_key=api_key)
    else:
        client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "http://localhost"),
                "X-OpenRouter-Title": os.getenv("OPENROUTER_APP_NAME", "Mind Mirror"),
            },
        )
    return client, model, provider


async def run_mind_mirror_analysis(
    notes: str,
    request: str,
    *,
    stream_to_console: bool = False,
) -> dict:
    """
    Run profiler → swarm → aggregator and return a JSON-serializable result dict.

    :param notes: Full markdown knowledge base (e.g. mind cards).
    :param request: User question or build request for the swarm.
    :param stream_to_console: When True, print aggregator chunks (CLI). HTTP/bridge use False.
    """
    client, model, provider = create_llm_client()
    kb = KnowledgeBase(notes)
    dna = await create_digital_dna(notes, client, model, provider=provider)
    dna_clean = {k: v for k, v in dna.items() if not k.startswith("_")}

    orchestrator = SwarmOrchestrator(client, model, provider=provider)
    expert_results = await orchestrator.run(request, dna, kb)
    final_report, agg_stats = await aggregate_and_stream(
        request,
        dna,
        expert_results,
        client,
        model,
        provider=provider,
        stream_to_console=stream_to_console,
    )

    token_stats = kb.token_estimate()
    return {
        "request": request,
        "dna": dna_clean,
        "report": final_report,
        "knowledge_stats": token_stats,
        "aggregator_stats": {
            "input_tokens": agg_stats.get("input_tokens", 0),
            "output_tokens": agg_stats.get("output_tokens", 0),
            "cache_read": agg_stats.get("cache_read", 0),
            "cache_created": agg_stats.get("cache_created", 0),
        },
    }
