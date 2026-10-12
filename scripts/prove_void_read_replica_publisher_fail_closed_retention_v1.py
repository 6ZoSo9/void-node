#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import stat
import sys
import tempfile
from typing import Any


MARKER = "VOID_READ_REPLICA_PUBLISHER_FAIL_CLOSED_RETENTION_V1"
REQUIRED_DESTINATIONS = [
    "public-site/work",
    "public-site/work/agent-economic-loop",
    "public-site/.well-known/void-agent-work.json",
    "paid-work/submissions",
    "paid-work/reviews",
    "paid-work/entitlements",
    "wc",
    "datanet",
]


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_publisher(path: Path):
    spec = importlib.util.spec_from_file_location(
        "void_read_replica_publisher_candidate_v1",
        path,
    )
    need(spec is not None and spec.loader is not None, "module spec unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@contextlib.contextmanager
def isolated_roots(module):
    with tempfile.TemporaryDirectory(prefix="void-retention-proof-") as raw:
        state_root = Path(raw) / "state"
        releases = state_root / "releases"
        current = state_root / "current"
        releases.mkdir(parents=True)
        original = (module.STATE_ROOT, module.RELEASES, module.CURRENT)
        module.STATE_ROOT = state_root
        module.RELEASES = releases
        module.CURRENT = current
        try:
            yield state_root, releases, current
        finally:
            module.STATE_ROOT, module.RELEASES, module.CURRENT = original
            make_writable(Path(raw))


def make_writable(root: Path) -> None:
    if not root.exists() or root.is_symlink():
        return
    for current, directories, _names in os.walk(root, topdown=False):
        for directory in directories:
            path = Path(current) / directory
            if not path.is_symlink():
                path.chmod(0o700)
        Path(current).chmod(0o700)


def add_release(
    releases: Path,
    name: str,
    mtime_ns: int,
    *,
    seal: bool = True,
) -> Path:
    release = releases / name
    nested = release / "paid-work/entitlements"
    nested.mkdir(parents=True)
    payload = nested / f"voids_{name}.json"
    payload.write_text('{"ok":true}\n', encoding="utf-8")
    os.utime(release, ns=(mtime_ns, mtime_ns))
    if seal:
        payload.chmod(0o444)
        for current, directories, _names in os.walk(release, topdown=False):
            for directory in directories:
                (Path(current) / directory).chmod(0o555)
            Path(current).chmod(0o555)
    return release


def set_current(current: Path, release: Path) -> None:
    current.symlink_to(f"releases/{release.name}")


def test_read_only_prune(module) -> None:
    with isolated_roots(module) as (_state, releases, current):
        rows = [add_release(releases, f"release-{index}", index) for index in range(6)]
        set_current(current, rows[-1])
        result = module.prune_releases(keep=5)
        need(result["status"] == "ok", f"read-only prune degraded: {result}")
        need(not rows[0].exists(), "oldest sealed release was not removed")
        need(all(path.exists() for path in rows[1:]), "a protected release was removed")
        need(len(result["removed"]) == 1, "unexpected removal count")


def test_current_is_never_pruned(module) -> None:
    with isolated_roots(module) as (_state, releases, current):
        oldest_current = add_release(releases, "current-oldest", 1)
        newer = [add_release(releases, f"newer-{index}", index + 2) for index in range(3)]
        set_current(current, oldest_current)
        result = module.prune_releases(keep=1)
        need(result["status"] == "ok", f"current-protection prune degraded: {result}")
        need(oldest_current.exists(), "current release was pruned")
        need(all(not path.exists() for path in newer), "non-current release retained")


def test_symlink_escape_blocks_all_deletion(module) -> None:
    with isolated_roots(module) as (state, releases, current):
        oldest = add_release(releases, "oldest", 1, seal=False)
        middle = add_release(releases, "middle", 2)
        newest = add_release(releases, "newest", 3)
        outside = state / "outside"
        outside.mkdir()
        marker = outside / "marker.txt"
        marker.write_text("untouched\n", encoding="utf-8")
        (oldest / "escape").symlink_to(outside, target_is_directory=True)
        make_writable(oldest)
        for current_path, directories, _names in os.walk(oldest, topdown=False):
            for directory in directories:
                path = Path(current_path) / directory
                if not path.is_symlink():
                    path.chmod(0o555)
            Path(current_path).chmod(0o555)
        set_current(current, newest)
        result = module.prune_releases(keep=1)
        need(result["status"] == "degraded", "symlink tree was not blocked")
        need(oldest.exists() and middle.exists(), "preflight failure allowed deletion")
        need(marker.read_text(encoding="utf-8") == "untouched\n", "symlink target changed")


def test_owner_device_and_boundary_guards(module) -> None:
    with isolated_roots(module) as (_state, releases, _current):
        release = add_release(releases, "guarded", 1)
        for operation, kwargs in [
            ("foreign_owner", {"expected_uid": os.getuid() + 1}),
            ("foreign_device", {"expected_device": releases.lstat().st_dev + 1}),
        ]:
            try:
                module.inspect_owned_release_tree(release, releases, **kwargs)
            except module.Hold:
                pass
            else:
                raise AssertionError(f"{operation} guard did not hold")
        outside = releases.parent / "outside-release"
        outside.mkdir()
        try:
            module.inspect_owned_release_tree(outside, releases)
        except module.Hold:
            pass
        else:
            raise AssertionError("direct-child boundary guard did not hold")


def test_invalid_current_and_remove_failure_are_bounded(module) -> None:
    with isolated_roots(module) as (_state, releases, current):
        old = add_release(releases, "old", 1)
        new = add_release(releases, "new", 2)
        current.write_text("not-a-symlink\n", encoding="utf-8")
        result = module.prune_releases(keep=1)
        need(result["status"] == "degraded", "invalid current was not bounded")
        need(old.exists() and new.exists(), "invalid current allowed deletion")

    with isolated_roots(module) as (_state, releases, current):
        old = add_release(releases, "old", 1)
        new = add_release(releases, "new", 2)
        set_current(current, new)
        original = module.remove_read_only_tree

        def fail_remove(*_args, **_kwargs):
            raise PermissionError("fixture delete denial")

        module.remove_read_only_tree = fail_remove
        try:
            result = module.prune_releases(keep=1)
        finally:
            module.remove_read_only_tree = original
        need(result["status"] == "degraded", "delete denial was not bounded")
        need(result["publication_blocked"] is False, "retention blocked publication")
        need(old.exists() and new.exists(), "delete denial mutated release set")


def test_publisher_lock_is_exclusive(module) -> None:
    with isolated_roots(module) as (state, _releases, _current):
        first = module.acquire_publisher_lock(state)
        try:
            try:
                second = module.acquire_publisher_lock(state)
            except module.Hold:
                pass
            else:
                second.close()
                raise AssertionError("concurrent publisher lock was granted")
        finally:
            first.close()


def test_main_push_precedes_nonfatal_retention(module, candidate: Path) -> None:
    with isolated_roots(module) as (_state, _releases, _current):
        with tempfile.TemporaryDirectory(prefix="void-source-proof-") as source_raw:
            source = Path(source_raw)
            (source / "fixture.json").write_text('{"fixture":true}\n', encoding="utf-8")
            original_specs = module.SOURCE_SPECS
            original_push = module.push_release
            original_prune = module.prune_releases
            original_argv = sys.argv
            events: list[str] = []
            module.SOURCE_SPECS = [
                (destination, source, "tree")
                for destination in REQUIRED_DESTINATIONS
            ]

            def fake_push(_release: Path, remote: str) -> dict[str, Any]:
                events.append("push")
                return {"remote": remote, "fixture": True}

            def fake_prune(keep: int = 5) -> dict[str, Any]:
                events.append("prune")
                return {
                    "schema": "void-read-replica-retention-v1",
                    "status": "degraded",
                    "keep": keep,
                    "blocked": [{"error": "fixture"}],
                    "publication_blocked": False,
                }

            module.push_release = fake_push
            module.prune_releases = fake_prune
            sys.argv = [str(candidate), "--push-to", "fixture@example"]
            stdout = io.StringIO()
            try:
                with contextlib.redirect_stdout(stdout):
                    returncode = module.main()
            finally:
                module.SOURCE_SPECS = original_specs
                module.push_release = original_push
                module.prune_releases = original_prune
                sys.argv = original_argv
            value = json.loads(stdout.getvalue())
            need(returncode == 0 and value["ok"] is True, "publication did not succeed")
            need(events == ["push", "prune"], f"unsafe operation order: {events}")
            need(value["retention_degraded"] is True, "degradation was not surfaced")


def test_unchanged_content_reuses_current(module, candidate: Path) -> None:
    with isolated_roots(module) as (_state, releases, _current):
        with tempfile.TemporaryDirectory(
            prefix="void-no-change-source-proof-"
        ) as source_raw:
            source = Path(source_raw)
            (source / "fixture.json").write_text(
                '{"fixture":true}\n',
                encoding="utf-8",
            )
            original_specs = module.SOURCE_SPECS
            original_stamp = module.stamp
            original_iso_now = module.iso_now
            original_argv = sys.argv
            stamps = iter([
                "20260101T000000Z",
                "20260101T000001Z",
                "20260101T000500Z",
                "20260101T000501Z",
            ])
            module.SOURCE_SPECS = [
                (destination, source, "tree")
                for destination in REQUIRED_DESTINATIONS
            ]
            module.stamp = lambda: next(stamps)
            module.iso_now = lambda: "2026-01-01T00:00:00Z"
            sys.argv = [str(candidate)]
            values = []
            try:
                for _index in range(2):
                    stdout = io.StringIO()
                    with contextlib.redirect_stdout(stdout):
                        returncode = module.main()
                    need(returncode == 0, "publisher main failed")
                    values.append(json.loads(stdout.getvalue()))
            finally:
                module.SOURCE_SPECS = original_specs
                module.stamp = original_stamp
                module.iso_now = original_iso_now
                sys.argv = original_argv

            first, second = values
            need(
                first["content_changed"] is True,
                "first publication was not content-changing",
            )
            need(
                first["reused_current_release"] is False,
                "first publication incorrectly reused current",
            )
            need(
                second["content_changed"] is False,
                "unchanged publication was not classified as no-change",
            )
            need(
                second["reused_current_release"] is True,
                "unchanged publication did not reuse current",
            )
            need(
                second["release_id"] == first["release_id"],
                "unchanged publication minted a new release ID",
            )
            need(
                second["candidate_release_id"] != first["release_id"],
                "fixture did not exercise timestamped candidate churn",
            )
            release_directories = [
                item
                for item in releases.iterdir()
                if item.is_dir() and not item.name.startswith(".")
            ]
            need(
                len(release_directories) == 1,
                "unchanged publication created another release directory",
            )


def test_static_authority(candidate: Path) -> None:
    tree = ast.parse(candidate.read_text(encoding="utf-8"), filename=str(candidate))
    rmtree_calls = []
    chown_calls = []
    main_calls: dict[str, int] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if (
                isinstance(node.func.value, ast.Name)
                and node.func.value.id == "shutil"
                and node.func.attr == "rmtree"
            ):
                rmtree_calls.append(node.lineno)
            if node.func.attr == "chown":
                chown_calls.append(node.lineno)
        if isinstance(node, ast.FunctionDef) and node.name == "main":
            for child in ast.walk(node):
                if isinstance(child, ast.Call) and isinstance(child.func, ast.Name):
                    if child.func.id in {"push_release", "prune_releases"}:
                        main_calls[child.func.id] = child.lineno
    need(len(rmtree_calls) == 1, f"unexpected rmtree authority: {rmtree_calls}")
    need(not chown_calls, f"ownership mutation present: {chown_calls}")
    need(
        main_calls.get("push_release", 10**9) < main_calls.get("prune_releases", -1),
        f"push does not precede retention: {main_calls}",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--candidate",
        type=Path,
        default=Path("ops/mainnet0/publish_void_read_replica_snapshot_v1.py"),
    )
    args = parser.parse_args()
    candidate = args.candidate.resolve()
    need(candidate.is_file(), f"candidate missing: {candidate}")
    module = load_publisher(candidate)

    tests = [
        ("read_only_prune", lambda: test_read_only_prune(module)),
        ("current_protection", lambda: test_current_is_never_pruned(module)),
        ("symlink_escape", lambda: test_symlink_escape_blocks_all_deletion(module)),
        ("owner_device_boundary", lambda: test_owner_device_and_boundary_guards(module)),
        ("failure_bounding", lambda: test_invalid_current_and_remove_failure_are_bounded(module)),
        ("publisher_lock", lambda: test_publisher_lock_is_exclusive(module)),
        (
            "unchanged_content_reuse",
            lambda: test_unchanged_content_reuses_current(
                module,
                candidate,
            ),
        ),
        ("publication_order", lambda: test_main_push_precedes_nonfatal_retention(module, candidate)),
        ("static_authority", lambda: test_static_authority(candidate)),
    ]
    results = []
    for name, test in tests:
        test()
        results.append({"name": name, "status": "PASS"})
        print(f"proof={name} status=PASS")

    print(json.dumps({
        "marker": MARKER,
        "candidate": str(candidate),
        "test_count": len(results),
        "tests": results,
        "production_state_read": False,
        "production_state_mutated": False,
        "service_restart": False,
        "git_mutation": False,
        "payment_execution": False,
        "work_credit_write": False,
        "fund_movement": False,
    }, indent=2, sort_keys=True))
    print(f"{MARKER}=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
