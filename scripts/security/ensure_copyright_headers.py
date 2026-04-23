#!/usr/bin/env python3
# Copyright (c) 2026 Skuld, LLC. All rights reserved.
# Proprietary and confidential. Reverse engineering prohibited.
"""Enforce proprietary copyright headers on source files."""

from __future__ import annotations

import argparse
import pathlib
import sys

YEAR = "2026"
PY_HEADER = [
    f"# Copyright (c) {YEAR} Skuld, LLC. All rights reserved.",
    "# Proprietary and confidential. Reverse engineering prohibited.",
]
LINE_HEADER = [
    f"// Copyright (c) {YEAR} Skuld, LLC. All rights reserved.",
    "// Proprietary and confidential. Reverse engineering prohibited.",
]

EXT_STYLE = {
    ".py": PY_HEADER,
    ".ts": LINE_HEADER,
    ".tsx": LINE_HEADER,
    ".js": LINE_HEADER,
    ".jsx": LINE_HEADER,
    ".rs": LINE_HEADER,
}


def apply_or_check(path: pathlib.Path, check_only: bool) -> bool:
    ext = path.suffix.lower()
    header = EXT_STYLE.get(ext)
    if not header:
        return True

    original = path.read_text(encoding="utf-8")
    lines = original.splitlines()

    first_content_idx = 0
    if lines and lines[0].startswith("#!"):
        first_content_idx = 1

    current = lines[first_content_idx:first_content_idx + len(header)]
    if current == header:
        return True

    if check_only:
        print(f"missing header: {path}")
        return False

    new_lines = lines[:first_content_idx] + header + [""] + lines[first_content_idx:]
    path.write_text("\n".join(new_lines) + ("\n" if original.endswith("\n") else ""), encoding="utf-8")
    print(f"header inserted: {path}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if header is missing")
    parser.add_argument("files", nargs="*", help="Files to process")
    args = parser.parse_args()

    if not args.files:
        return 0

    ok = True
    for fp in args.files:
        p = pathlib.Path(fp)
        if not p.exists() or not p.is_file():
            continue
        if not apply_or_check(p, check_only=args.check):
            ok = False

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
