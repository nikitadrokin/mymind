"""
Mind Mirror bridge for mymind.

This script reuses the core Jakhangirs project logic and returns a single JSON
document for easy consumption by the web app.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

import anthropic

from rag.knowledge_base import KnowledgeBase
from swarm.aggregator import aggregate_and_stream
from swarm.orchestrator import SwarmOrchestrator
from swarm.profiler import create_digital_dna


DEFAULT_PROMPT = (
    "Review the current app implementation, find the highest-impact improvements, "
    "and provide concrete next steps with an order of operations."
)


async def run_analysis(notes: str, request: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required for analysis.")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    kb = KnowledgeBase(notes)
    dna = await create_digital_dna(notes, client)
    dna_clean = {k: v for k, v in dna.items() if not k.startswith("_")}

    orchestrator = SwarmOrchestrator(client)
    expert_results = await orchestrator.run(request, dna, kb)
    final_report, agg_stats = await aggregate_and_stream(request, dna, expert_results, client)

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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Mind Mirror analysis and return JSON.",
    )
    parser.add_argument("--notes", required=True, help="Path to notes markdown file.")
    parser.add_argument("--request", default=DEFAULT_PROMPT, help="Prompt for the AI review.")
    args = parser.parse_args()

    notes_path = Path(args.notes)
    notes = notes_path.read_text(encoding="utf-8")
    result = asyncio.run(run_analysis(notes=notes, request=args.request))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
