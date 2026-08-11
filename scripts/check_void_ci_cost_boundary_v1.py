#!/usr/bin/env python3
"""Fail closed when VOID workflows select an unreviewed runner class."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


MARKER = "VOID_CI_COST_BOUNDARY_V1"
WORKFLOW_GLOBS = ("*.yml", "*.yaml")
ALLOWED_STANDARD_RUNNERS = frozenset(
    {
        "ubuntu-latest",
        "ubuntu-22.04",
        "ubuntu-24.04",
    }
)
QUALIFICATION_WORKFLOW = ".github/workflows/public-release-qualification-v1.yml"
ALLOWED_DYNAMIC_EXPRESSION = "${{ matrix.os }}"
ALLOWED_QUALIFICATION_MATRIX = frozenset({"ubuntu-22.04", "ubuntu-24.04"})

RUNS_ON_RE = re.compile(r"^\s*runs-on\s*:\s*(.*?)\s*$")
MATRIX_OS_RE = re.compile(r"^\s*-\s*os\s*:\s*([^\s#]+)\s*(?:#.*)?$")


class BoundaryError(RuntimeError):
    pass


def normalize_scalar(raw: str) -> str:
    value = raw.strip()
    if " #" in value:
        value = value.split(" #", 1)[0].rstrip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return value


def parse_inline_list(value: str) -> tuple[str, ...] | None:
    if not (value.startswith("[") and value.endswith("]")):
        return None
    items = []
    for raw in value[1:-1].split(","):
        item = normalize_scalar(raw)
        if not item:
            raise BoundaryError("runs-on inline list contains an empty label")
        items.append(item)
    return tuple(items)


def inspect_workflow(relative_path: str, text: str) -> list[str]:
    assignments: list[str] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        match = RUNS_ON_RE.match(line)
        if not match:
            continue
        value = normalize_scalar(match.group(1))
        if not value:
            raise BoundaryError(
                f"{relative_path}:{line_number}: multiline or empty runs-on is not allowed"
            )
        if value in ALLOWED_STANDARD_RUNNERS:
            assignments.append(f"standard:{value}")
            continue
        labels = parse_inline_list(value)
        if labels is not None:
            raise BoundaryError(
                f"{relative_path}:{line_number}: self-hosted or inline runner labels are not allowed: {labels}"
            )
        if value == ALLOWED_DYNAMIC_EXPRESSION:
            if relative_path != QUALIFICATION_WORKFLOW:
                raise BoundaryError(
                    f"{relative_path}:{line_number}: dynamic runner expression is not allowed here"
                )
            matrix_values = {
                normalize_scalar(match.group(1))
                for candidate in text.splitlines()
                if (match := MATRIX_OS_RE.match(candidate))
            }
            if matrix_values != ALLOWED_QUALIFICATION_MATRIX:
                raise BoundaryError(
                    f"{relative_path}:{line_number}: runner matrix mismatch: "
                    f"expected={sorted(ALLOWED_QUALIFICATION_MATRIX)} "
                    f"actual={sorted(matrix_values)}"
                )
            assignments.append("dynamic:qualification-matrix")
            continue
        raise BoundaryError(
            f"{relative_path}:{line_number}: unreviewed runs-on value: {value}"
        )
    return assignments


def workflow_files(repo_root: Path) -> list[Path]:
    root = repo_root / ".github" / "workflows"
    if not root.is_dir():
        raise BoundaryError(f"workflow directory is missing: {root}")
    found: set[Path] = set()
    for pattern in WORKFLOW_GLOBS:
        found.update(path for path in root.glob(pattern) if path.is_file())
    if not found:
        raise BoundaryError("no GitHub workflow files were found")
    return sorted(found)


def scan_repository(repo_root: Path) -> dict[str, int]:
    counts = {"workflow_files": 0, "runner_assignments": 0, "standard": 0, "self_hosted": 0, "dynamic": 0}
    for path in workflow_files(repo_root):
        relative = path.relative_to(repo_root).as_posix()
        assignments = inspect_workflow(relative, path.read_text(encoding="utf-8"))
        counts["workflow_files"] += 1
        counts["runner_assignments"] += len(assignments)
        for assignment in assignments:
            if assignment.startswith("standard:"):
                counts["standard"] += 1
            elif assignment.startswith("self-hosted:"):
                counts["self_hosted"] += 1
            elif assignment.startswith("dynamic:"):
                counts["dynamic"] += 1
    if counts["runner_assignments"] == 0:
        raise BoundaryError("no runs-on assignments were found")
    return counts


def require_rejected(path: str, text: str) -> None:
    try:
        inspect_workflow(path, text)
    except BoundaryError:
        return
    raise AssertionError(f"self-test expected rejection: {path}")


def self_test() -> None:
    assert inspect_workflow(".github/workflows/ok.yml", "jobs:\n  check:\n    runs-on: ubuntu-latest\n") == [
        "standard:ubuntu-latest"
    ]
    require_rejected(
        ".github/workflows/self-hosted-beta-proof.yml",
        "jobs:\n  check:\n    runs-on: [self-hosted, void-node, beta-proof]\n",
    )
    assert inspect_workflow(
        QUALIFICATION_WORKFLOW,
        "jobs:\n  check:\n    runs-on: ${{ matrix.os }}\n    strategy:\n      matrix:\n        include:\n"
        "          - os: ubuntu-22.04\n          - os: ubuntu-24.04\n",
    ) == ["dynamic:qualification-matrix"]

    require_rejected(
        ".github/workflows/paid.yml",
        "jobs:\n  check:\n    runs-on: ubuntu-22.04-16core\n",
    )
    require_rejected(
        ".github/workflows/dynamic.yml",
        "jobs:\n  check:\n    runs-on: ${{ vars.RUNNER }}\n",
    )
    require_rejected(
        ".github/workflows/self.yml",
        "jobs:\n  check:\n    runs-on: [self-hosted, unreviewed]\n",
    )
    require_rejected(
        QUALIFICATION_WORKFLOW,
        "jobs:\n  check:\n    runs-on: ${{ matrix.os }}\n    strategy:\n      matrix:\n        include:\n"
        "          - os: ubuntu-22.04\n          - os: ubuntu-24.04-16core\n",
    )
    require_rejected(
        ".github/workflows/multiline.yml",
        "jobs:\n  check:\n    runs-on:\n      group: paid-runners\n",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.self_test:
            self_test()
            print(f"{MARKER}_SELF_TEST=PASS")
            return 0
        counts = scan_repository(args.repo_root.resolve())
    except (BoundaryError, AssertionError, OSError, UnicodeError) as error:
        print(f"{MARKER}=HOLD", file=sys.stderr)
        print(str(error), file=sys.stderr)
        return 1

    print(f"{MARKER}=PASS")
    for key, value in counts.items():
        print(f"{key}={value}")
    print("unreviewed_or_paid_runner_assignments=0")
    print("billing_api_access=false")
    print("external_paid_service_execution=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
