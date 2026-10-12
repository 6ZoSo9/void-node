#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import tempfile


MARKER = "VOID_READ_REPLICA_CONTENT_CONVERGENCE_V1"


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    need(spec is not None and spec.loader is not None, "module spec unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_manifest(
    release: Path,
    release_id: str,
    content_root: str,
) -> None:
    meta = release / "meta"
    meta.mkdir(parents=True)
    (meta / "manifest-v1.json").write_text(
        json.dumps({
            "release_id": release_id,
            "content_root_sha256": content_root,
            "manifest_sha256": "fixture-manifest",
            "file_count": 1,
            "total_bytes": 1,
        })
        + "\n",
        encoding="utf-8",
    )


def test_classifier(classifier) -> None:
    same = classifier.classify(
        {
            "release_id": "local-old",
            "content_root_sha256": "a" * 64,
        },
        {
            "release_id": "remote-new",
            "content_root_sha256": "a" * 64,
        },
    )
    need(same["content_converged"] is True, "equal roots were not converged")
    need(
        same["release_id_converged"] is False,
        "different release IDs were incorrectly equal",
    )
    need(
        same["release_id_difference_is_metadata_only"] is True,
        "equal-root release-ID difference was not metadata-only",
    )
    need(
        same["safe_to_treat_replica_content_as_current"] is True,
        "equal-root replica was not current",
    )

    changed = classifier.classify(
        {
            "release_id": "local",
            "content_root_sha256": "a" * 64,
        },
        {
            "release_id": "remote",
            "content_root_sha256": "b" * 64,
        },
    )
    need(
        changed["content_converged"] is False,
        "different roots were incorrectly converged",
    )
    need(
        changed["safe_to_treat_replica_content_as_current"] is False,
        "different-root replica was marked current",
    )


def test_pull_equal_content_schema(pull) -> None:
    with tempfile.TemporaryDirectory(
        prefix="void-pull-convergence-proof-"
    ) as raw:
        root = Path(raw)
        releases = root / "releases"
        release = releases / "local-old"
        write_manifest(release, "local-old", "c" * 64)
        current = root / "current"
        current.symlink_to("releases/local-old")

        original = (
            pull.LOCAL_ROOT,
            pull.LOCAL_INCOMING,
            pull.LOCAL_CURRENT,
            pull.LOCAL_ACTIVATOR,
            pull.run,
        )
        pull.LOCAL_ROOT = root
        pull.LOCAL_INCOMING = root / "incoming"
        pull.LOCAL_CURRENT = current
        pull.LOCAL_ACTIVATOR = root / "never-run.py"

        def forbidden_run(*_args, **_kwargs):
            raise AssertionError(
                "equal-content pull attempted external execution"
            )

        pull.run = forbidden_run
        try:
            result = pull.pull_release({
                "release_id": "remote-new",
                "content_root_sha256": "c" * 64,
            })
        finally:
            (
                pull.LOCAL_ROOT,
                pull.LOCAL_INCOMING,
                pull.LOCAL_CURRENT,
                pull.LOCAL_ACTIVATOR,
                pull.run,
            ) = original

        need(
            result["skipped_same_content"] is True,
            "equal-content pull was not skipped",
        )
        need(
            result["content_converged"] is True,
            "equal-content pull did not report convergence",
        )
        need(
            result["release_id_converged"] is False,
            "different release IDs were reported converged",
        )
        need(
            result["local_release_id"] == "local-old",
            "local release ID missing",
        )
        need(
            result["remote_release_id"] == "remote-new",
            "remote release ID missing",
        )
        need(result["rsync_performed"] is False, "equal content used rsync")
        need(result["activated"] is False, "equal content activated")


def test_publisher_static(publisher_path: Path) -> None:
    text = publisher_path.read_text(encoding="utf-8")
    for marker in (
        "candidate_release_id",
        "reused_current_release",
        "content_changed",
        'current_manifest.get("content_root_sha256")',
        "== candidate_content_root",
    ):
        need(marker in text, f"publisher convergence marker absent: {marker}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--publisher", type=Path, required=True)
    parser.add_argument("--pull", type=Path, required=True)
    parser.add_argument("--classifier", type=Path, required=True)
    args = parser.parse_args()

    pull = load(args.pull.resolve(), "void_read_replica_pull_candidate_v1")
    classifier = load(
        args.classifier.resolve(),
        "void_read_replica_classifier_candidate_v1",
    )

    tests = [
        ("classifier", lambda: test_classifier(classifier)),
        ("pull_equal_content_schema", lambda: test_pull_equal_content_schema(pull)),
        ("publisher_static", lambda: test_publisher_static(args.publisher.resolve())),
    ]
    results = []
    for name, test in tests:
        test()
        results.append({"name": name, "status": "PASS"})
        print(f"proof={name} status=PASS")

    print(json.dumps({
        "marker": MARKER,
        "test_count": len(results),
        "tests": results,
        "production_state_read": False,
        "production_state_mutated": False,
        "service_action": False,
        "timer_mutation": False,
        "publisher_execution": False,
        "pull_execution": False,
        "payment_execution": False,
        "work_credit_write": False,
        "fund_movement": False,
    }, indent=2, sort_keys=True))
    print(f"{MARKER}=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
