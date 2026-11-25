"""CLI entrypoint for `python -m backend.rag` reading JSON from stdin and outputting JSON to stdout."""

from __future__ import annotations

from .graph import main

if __name__ == "__main__":
    raise SystemExit(main())
