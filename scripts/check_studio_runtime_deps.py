#!/usr/bin/env python3
# Copyright (c) 2026 Skuld, LLC. All rights reserved.
# Proprietary and confidential. Reverse engineering prohibited.

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
MAIN_RS = ROOT / "src-tauri" / "src" / "main.rs"


def fail(message: str) -> None:
    print(f"[runtime-deps] FAIL: {message}", file=sys.stderr)
    sys.exit(1)


source = MAIN_RS.read_text(encoding="utf-8")

required_tokens = [
    "compiler_requirements_path",
    "executor_requirements_path",
    "dependency_inputs_newer_than_marker",
    "runtime_python_imports_available",
    "import jinja2",
    "import pydantic",
    "import yaml",
    "import skuldbot_compiler",
    'install_requirements(&pip_exe, &executor_requirements_path, "Executor")',
    'install_requirements(&pip_exe, &compiler_requirements_path, "Compiler")',
    'install_python_package(&pip_exe, &engine_path, "Executor")',
    'install_python_package(&pip_exe, &compiler_path, "Compiler")',
]

for token in required_tokens:
    if token not in source:
        fail(f"missing required runtime dependency bootstrap token: {token}")

marker_write = source.find('std::fs::write(&marker_path, "installed")')
final_import_check = source.find("&& runtime_python_imports_available(&python_exe)")

if marker_write == -1:
    fail("dependency marker write is missing")

if final_import_check == -1:
    fail("final import check before marker write is missing")

if marker_write < final_import_check:
    fail("dependency marker is written before the final import check")

legacy_single_requirements_check = (
    "let requirements_modified = std::fs::metadata(&requirements_path)" in source
)
if legacy_single_requirements_check:
    fail("legacy single requirements.txt mtime check is still present")

print("[runtime-deps] PASS: Studio Python runtime bootstrap checks compiler deps and imports.")
