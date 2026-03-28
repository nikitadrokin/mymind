"""
Mind Mirror: Active Swarm Core
================================
Usage:
  python main.py [--notes path/to/notes.md] [--request "your idea"]
"""

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from anthropic import APIConnectionError as AnthropicAPIConnectionError
from anthropic import APIStatusError as AnthropicAPIStatusError
from anthropic import AuthenticationError as AnthropicAuthenticationError
from openai import APIConnectionError as OpenAIAPIConnectionError
from openai import APIStatusError as OpenAIAPIStatusError
from openai import AuthenticationError as OpenAIAuthenticationError

from pipeline import run_mind_mirror_analysis

load_dotenv()

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
WHITE = "\033[97m"


def c(color: str, text: str) -> str:
    return f"{color}{text}{RESET}"


def banner() -> None:
    print(
        c(
            CYAN,
            """
╔══════════════════════════════════════════════════════════════╗
║   MIND MIRROR — Profiler → JIT Swarm → Aggregator            ║
╚══════════════════════════════════════════════════════════════╝
""",
        )
    )


async def run_pipeline(notes_path: str, user_request: str | None) -> None:
    notes_file = Path(notes_path)
    if not notes_file.exists():
        print(c(RED, f"✗ Notes file not found: {notes_path}"))
        sys.exit(1)

    user_notes = notes_file.read_text(encoding="utf-8")

    if not user_request:
        print(c(BOLD + WHITE, "  What do you want to explore?"))
        user_request = input(c(CYAN, "  › ")).strip()
        if not user_request:
            print(c(RED, "  No request provided. Exiting."))
            sys.exit(0)

    t0 = time.monotonic()
    result = await run_mind_mirror_analysis(
        user_notes,
        user_request,
        stream_to_console=True,
    )
    elapsed = time.monotonic() - t0

    print()
    print(c(DIM, f"  Done in {elapsed:.1f}s"))
    ks = result.get("knowledge_stats") or {}
    print(
        c(
            DIM,
            f"  Sections: {ks.get('sections_count', '—')} | "
            f"~{ks.get('full_notes_tokens', '—')} tokens (full)",
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Mind Mirror: Active Swarm Core")
    parser.add_argument(
        "--notes",
        default="demo_notes.md",
        help="Path to your personal notes (default: demo_notes.md)",
    )
    parser.add_argument(
        "--request",
        default=None,
        help="Your idea or request (if omitted, will prompt interactively)",
    )
    args = parser.parse_args()

    banner()
    try:
        asyncio.run(run_pipeline(args.notes, args.request))
    except (OpenAIAuthenticationError, AnthropicAuthenticationError):
        provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
        if provider == "anthropic":
            print(c(RED, "\n✗ Anthropic authentication failed."))
            print(c(YELLOW, "  Check ANTHROPIC_API_KEY in .env and try again."))
        else:
            print(c(RED, "\n✗ OpenRouter authentication failed."))
            print(c(YELLOW, "  Check OPENROUTER_API_KEY in .env and try again."))
        sys.exit(1)
    except (OpenAIAPIStatusError, AnthropicAPIStatusError) as exc:
        provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
        provider_label = "Anthropic" if provider == "anthropic" else "OpenRouter"
        print(c(RED, f"\n✗ {provider_label} rejected the request."))
        print(c(YELLOW, f"  Status: {exc.status_code}"))
        print(c(YELLOW, f"  Details: {exc}"))
        sys.exit(1)
    except (OpenAIAPIConnectionError, AnthropicAPIConnectionError) as exc:
        provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
        provider_label = "Anthropic" if provider == "anthropic" else "OpenRouter"
        print(c(RED, f"\n✗ Could not reach {provider_label} API."))
        print(c(YELLOW, f"  Details: {exc}"))
        sys.exit(1)
    except ValueError as exc:
        print(c(RED, f"\n✗ {exc}"))
        sys.exit(1)
    except RuntimeError as exc:
        print(c(RED, f"\n✗ {exc}"))
        sys.exit(1)
    except Exception as exc:
        print(c(RED, "\n✗ Unexpected runtime error."))
        print(c(YELLOW, f"  Details: {exc}"))
        sys.exit(1)


if __name__ == "__main__":
    main()
