"""
Mind Mirror bridge for mymind: JSON to stdout for subprocess callers.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv

from pipeline import run_mind_mirror_analysis

load_dotenv()

DEFAULT_PROMPT = (
    "Review the current app implementation, find the highest-impact improvements, "
    "and provide concrete next steps with an order of operations."
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Mind Mirror analysis and return JSON.",
    )
    parser.add_argument("--notes", required=True, help="Path to notes markdown file.")
    parser.add_argument("--request", default=DEFAULT_PROMPT, help="Prompt for the AI review.")
    args = parser.parse_args()

    notes_path = Path(args.notes)
    notes = notes_path.read_text(encoding="utf-8")
    result = asyncio.run(
        run_mind_mirror_analysis(notes=notes, request=args.request, stream_to_console=False)
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
