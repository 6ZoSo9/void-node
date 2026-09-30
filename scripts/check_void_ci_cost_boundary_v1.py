#!/usr/bin/env python3
"""Fail closed when VOID workflows exceed reviewed CI cost or trigger fan-out boundaries."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


MARKER = "VOID_CI_COST_BOUNDARY_V1"
WORKFLOW_GLOBS = ("*.yml", "*.yaml")
PUBLIC_NODE_ROOT_INDEX = "public/public-node/index.json"
PR_EVENTS = frozenset({"pull_request", "pull_request_target"})
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

RUNS_ON_RE = re.compile(r"^\\s*runs-on\\s*:\\s*(.*?)\\s*$")
MATRIX_OS_RE = re.compile(r"^\\s*-\\s*os\\s*:\\s*([^\\s#]+)\\s*(?:#.*)?$")
ON_RE = re.compile(r"""^(?:on|"on"|'on')\\s*:\\s*(.*?)\\s*$""")
EVENT_RE = re.compile(r"""^(\\s+)(pull_request|pull_request_target)\\s*:\\s*(.*?)\\s*$""")
PATHS_RE = re.compile(r"^(\\s+)paths\\s*:\\s*(.*?)\\s*$")
LIST_ITEM_RE = re.compile(r"^\\s*-\\s*(.*?)\\s*$")
FULL_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
ZERO_SHA = "0" * 40


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
            raise BoundaryError("inline list contains an empty value")
        items.append(item)
    return tuple(items)


def leading_spaces(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _collect_paths(lines: list[str], start: int, event_indent: int) -> tuple[set[str], bool]:
    paths: set[str] = set()
    found_paths = False
    index = start
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            index += 1
            continue
        indent = leading_spaces(line)
        if indent <= event_indent:
            break
        match = PATHS_RE.match(line)
        if not match:
            index += 1
            continue
        found_paths = True
        paths_indent = len(match.group(1))
        raw = normalize_scalar(match.group(2))
        if raw:
            inline = parse_inline_list(raw)
            if inline is None:
                raise BoundaryError("pull_request paths must use a YAML list")
            paths.update(inline)
            index += 1
            continue
        index += 1
        while index < len(lines):
            candidate = lines[index]
            candidate_stripped = candidate.strip()
            if not candidate_stripped or candidate_stripped.startswith("#"):
                index += 1
                continue
            candidate_indent = leading_spaces(candidate)
            if candidate_indent <= paths_indent:
                break
            item = LIST_ITEM_RE.match(candidate)
            if item:
                value = normalize_scalar(item.group(1))
                if not value:
                    raise BoundaryError("pull_request paths contains an empty value")
                paths.add(value)
            index += 1
        continue
    if found_paths and not paths:
        raise BoundaryError("pull_request paths list is empty")
    return paths, found_paths


def inspect_pull_request_trigger(relative_path: str, text: str) -> dict[str, object]:
    lines = text.splitlines()
    on_index = None
    raw_on = ""
    for index, line in enumerate(lines):
        match = ON_RE.match(line)
        if match:
            on_index = index
            raw_on = normalize_scalar(match.group(1))
            break
    if on_index is None:
        return {"present": False, "broad": False, "paths": frozenset()}

    if raw_on:
        inline = parse_inline_list(raw_on)
        if inline is not None:
            present = any(item in PR_EVENTS for item in inline)
        else:
            present = raw_on in PR_EVENTS or any(event in raw_on for event in PR_EVENTS)
        return {"present": present, "broad": present, "paths": frozenset()}

    event_scopes: list[tuple[bool, set[str]]] = []
    index = on_index + 1
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            index += 1
            continue
        indent = leading_spaces(line)
        if indent == 0:
            break
        match = EVENT_RE.match(line)
        if not match:
            index += 1
            continue
        event_indent = len(match.group(1))
        raw_event = normalize_scalar(match.group(3))
        if raw_event:
            event_scopes.append((True, set()))
            index += 1
            continue
        paths, found_paths = _collect_paths(lines, index + 1, event_indent)
        event_scopes.append((not found_paths, paths))
        index += 1

    if not event_scopes:
        return {"present": False, "broad": False, "paths": frozenset()}
    return {
        "present": True,
        "broad": any(broad for broad, _ in event_scopes),
        "paths": frozenset(path for _, values in event_scopes for path in values),
    }


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
    counts = {
        "workflow_files": 0,
        "runner_assignments": 0,
        "standard": 0,
        "self_hosted": 0,
        "dynamic": 0,
        "broad_pull_request_workflows": 0,
        "public_node_root_index_pull_request_workflows": 0,
    }
    for path in workflow_files(repo_root):
        relative = path.relative_to(repo_root).as_posix()
        text = path.read_text(encoding="utf-8")
        assignments = inspect_workflow(relative, text)
        trigger = inspect_pull_request_trigger(relative, text)
        counts["workflow_files"] += 1
        counts["runner_assignments"] += len(assignments)
        if trigger["broad"]:
            counts["broad_pull_request_workflows"] += 1
        if PUBLIC_NODE_ROOT_INDEX in trigger["paths"]:
            counts["public_node_root_index_pull_request_workflows"] += 1
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


def _git(repo_root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo_root), *args],
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def _base_text(repo_root: Path, base_ref: str, relative_path: str) -> str | None:
    result = _git(repo_root, "show", f"{base_ref}:{relative_path}", check=False)
    return result.stdout if result.returncode == 0 else None


def check_trigger_nonexpansion(
    relative_path: str,
    current_text: str,
    base_text: str | None,
) -> None:
    current = inspect_pull_request_trigger(relative_path, current_text)
    previous = (
        inspect_pull_request_trigger(relative_path, base_text)
        if base_text is not None
        else {"present": False, "broad": False, "paths": frozenset()}
    )
    if current["broad"] and not previous["broad"]:
        raise BoundaryError(
            f"{relative_path}: pull_request trigger expanded to repository-wide scope"
        )
    current_root = PUBLIC_NODE_ROOT_INDEX in current["paths"]
    previous_covers_root = previous["broad"] or PUBLIC_NODE_ROOT_INDEX in previous["paths"]
    if current_root and not previous_covers_root:
        raise BoundaryError(
            f"{relative_path}: new pull_request dependency on {PUBLIC_NODE_ROOT_INDEX}"
        )


def check_changed_workflow_trigger_nonexpansion(repo_root: Path, base_ref: str) -> int:
    if not FULL_SHA_RE.fullmatch(base_ref) or base_ref == ZERO_SHA:
        raise BoundaryError("base ref must be a nonzero lowercase 40-character commit SHA")
    exists = _git(repo_root, "cat-file", "-e", f"{base_ref}^{{commit}}", check=False)
    if exists.returncode != 0:
        raise BoundaryError(f"base ref commit is unavailable: {base_ref}")
    changed = _git(
        repo_root,
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        base_ref,
        "HEAD",
        "--",
        ".github/workflows",
    ).stdout.splitlines()
    compared = 0
    for relative_path in sorted(set(changed)):
        path = repo_root / relative_path
        if path.suffix not in {".yml", ".yaml"} or not path.is_file():
            continue
        current_text = path.read_text(encoding="utf-8")
        base_text = _base_text(repo_root, base_ref, relative_path)
        check_trigger_nonexpansion(relative_path, current_text, base_text)
        compared += 1
    return compared


def require_runner_rejected(path: str, text: str) -> None:
    try:
        inspect_workflow(path, text)
    except BoundaryError:
        return
    raise AssertionError(f"self-test expected runner rejection: {path}")


def require_trigger_rejected(path: str, current: str, previous: str | None) -> None:
    try:
        check_trigger_nonexpansion(path, current, previous)
    except BoundaryError:
        return
    raise AssertionError(f"self-test expected trigger rejection: {path}")


def self_test() -> None:
    assert inspect_workflow(".github/workflows/ok.yml", "jobs:\n  check:\n    runs-on: ubuntu-latest\n") == [
        "standard:ubuntu-latest"
    ]
    require_runner_rejected(
        ".github/workflows/self-hosted-beta-proof.yml",
        "jobs:\n  check:\n    runs-on: [self-hosted, void-node, beta-proof]\n",
    )
    assert inspect_workflow(
        QUALIFICATION_WORKFLOW,
        "jobs:\n  check:\n    runs-on: ${{ matrix.os }}\n    strategy:\n      matrix:\n        include:\n"
        "          - os: ubuntu-22.04\n          - os: ubuntu-24.04\n",
    ) == ["dynamic:qualification-matrix"]
    require_runner_rejected(
        ".github/workflows/paid.yml",
        "jobs:\n  check:\n    runs-on: ubuntu-22.04-16core\n",
    )
    require_runner_rejected(
        ".github/workflows/dynamic.yml",
        "jobs:\n  check:\n    runs-on: ${{ vars.RUNNER }}\n",
    )
    require_runner_rejected(
        ".github/workflows/self.yml",
        "jobs:\n  check:\n    runs-on: [self-hosted, unreviewed]\n",
    )
    require_runner_rejected(
        QUALIFICATION_WORKFLOW,
        "jobs:\n  check:\n    runs-on: ${{ matrix.os }}\n    strategy:\n      matrix:\n        include:\n"
        "          - os: ubuntu-22.04\n          - os: ubuntu-24.04-16core\n",
    )
    require_runner_rejected(
        ".github/workflows/multiline.yml",
        "jobs:\n  check:\n    runs-on:\n      group: paid-runners\n",
    )

    broad = "on:\n  pull_request:\njobs:\n  check:\n    runs-on: ubuntu-latest\n"
    scoped = (
        "on:\n  pull_request:\n    paths:\n      - 'src/**'\n"
        "jobs:\n  check:\n    runs-on: ubuntu-latest\n"
    )
    root_scoped = (
        "on:\n  pull_request:\n    paths:\n      - 'public/public-node/index.json'\n"
        "jobs:\n  check:\n    runs-on: ubuntu-latest\n"
    )
    push_only_root = (
        "on:\n  push:\n    paths:\n      - 'public/public-node/index.json'\n"
        "jobs:\n  check:\n    runs-on: ubuntu-latest\n"
    )
    ignored = (
        "on:\n  pull_request:\n    paths-ignore:\n      - 'docs/**'\n"
        "jobs:\n  check:\n    runs-on: ubuntu-latest\n"
    )
    assert inspect_pull_request_trigger("broad.yml", broad)["broad"] is True
    assert inspect_pull_request_trigger("scoped.yml", scoped)["broad"] is False
    assert PUBLIC_NODE_ROOT_INDEX in inspect_pull_request_trigger("root.yml", root_scoped)["paths"]
    assert inspect_pull_request_trigger("push.yml", push_only_root)["present"] is False
    assert inspect_pull_request_trigger("ignored.yml", ignored)["broad"] is True

    require_trigger_rejected(".github/workflows/new-broad.yml", broad, None)
    require_trigger_rejected(".github/workflows/new-root.yml", root_scoped, scoped)
    check_trigger_nonexpansion(".github/workflows/legacy-broad.yml", broad, broad)
    check_trigger_nonexpansion(".github/workflows/narrowed.yml", root_scoped, broad)
    check_trigger_nonexpansion(".github/workflows/scoped.yml", scoped, scoped)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--base-ref", default="")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.self_test:
            self_test()
            print(f"{MARKER}_SELF_TEST=PASS")
            return 0
        repo_root = args.repo_root.resolve()
        counts = scan_repository(repo_root)
        compared = 0
        if args.base_ref:
            compared = check_changed_workflow_trigger_nonexpansion(repo_root, args.base_ref)
    except (BoundaryError, AssertionError, OSError, UnicodeError, subprocess.SubprocessError) as error:
        print(f"{MARKER}=HOLD", file=sys.stderr)
        print(str(error), file=sys.stderr)
        return 1

    print(f"{MARKER}=PASS")
    for key, value in counts.items():
        print(f"{key}={value}")
    print(f"changed_workflow_files_compared={compared}")
    print("new_broad_pull_request_workflows=0")
    print("new_public_node_root_index_pull_request_dependencies=0")
    print("unreviewed_or_paid_runner_assignments=0")
    print("billing_api_access=false")
    print("external_paid_service_execution=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
