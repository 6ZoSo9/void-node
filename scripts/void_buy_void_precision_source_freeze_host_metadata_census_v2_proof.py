#!/usr/bin/env python3
"""Offline regression: synthetic Git fixtures only, never Precision host --run."""
from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
V1 = HERE / "void_buy_void_precision_source_freeze_host_metadata_census_v1.py"
V2 = HERE / "void_buy_void_precision_source_freeze_host_metadata_census_v2.py"
FROZEN_V1_SHA256 = "c633dfa693695c5e364600dcf9ce94bd3ef772f367b7b064f2bbedebe669b61e"


def load_probe(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def snapshot(root: Path) -> dict[str, tuple]:
    """Compare contents, path types and modes; reads may change access times."""
    result = {}
    for path in [root, *sorted(root.rglob("*"))]:
        info = path.lstat()
        kind = stat.S_IFMT(info.st_mode)
        value = (path.read_bytes() if stat.S_ISREG(info.st_mode)
                 else os.readlink(path) if stat.S_ISLNK(info.st_mode) else None)
        result[str(path.relative_to(root))] = (kind, stat.S_IMODE(info.st_mode), value)
    return result


def main() -> None:
    if sys.argv[1:] != ["--self-test"]:
        raise SystemExit("usage: census_v2_proof.py --self-test")
    original = V1.read_bytes()
    assert hashlib.sha256(original).hexdigest() == FROZEN_V1_SHA256
    baseline = load_probe(V1, "census_v1_fixture")
    probe = load_probe(V2, "census_v2_fixture")
    assert probe.ENV["GIT_NO_LAZY_FETCH"] == "1"
    assert probe.ENV["GIT_ALLOW_PROTOCOL"] == ""
    assert probe.ENV["GIT_OPTIONAL_LOCKS"] == "0"
    for name in ("FROZEN_PR_HEAD", "FROZEN_SOURCE_COMMIT", "FROZEN_SOURCE_TREE",
                 "FROZEN_MANIFEST_PATH", "FROZEN_MANIFEST_BLOB", "V5_LOCK_PATH",
                 "V5_LOCK_BLOB", "REPOSITORY_ROOT", "READ_ONLY_PATHS"):
        assert getattr(probe, name) == getattr(baseline, name), name

    setup_env = {
        **probe.ENV,
        "GIT_ALLOW_PROTOCOL": "file",
        "GIT_AUTHOR_NAME": "Synthetic fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "Synthetic fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "2000-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE": "2000-01-01T00:00:00Z",
    }

    def git(*args: object, data: bytes | None = None) -> str:
        result = subprocess.run(
            ["/usr/bin/git", *map(str, args)], env=setup_env,
            input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            check=True, timeout=10,
        )
        return result.stdout.decode("utf-8", "strict").strip()

    result = {"git_version": git("--version")}
    with tempfile.TemporaryDirectory(prefix="void-census-v2-proof-") as directory:
        task = Path(directory)
        remote = task / "synthetic-remote.git"
        git("init", "--bare", remote)
        blob = git("-C", remote, "hash-object", "-w", "--stdin", data=b"fixture source\n")
        tree = git("-C", remote, "mktree", data=f"100644 blob {blob}\tsource.txt\n".encode())
        source_commit = git("-C", remote, "commit-tree", tree, data=b"fixture source\n")
        manifest_blob = git("-C", remote, "hash-object", "-w", "--stdin", data=b'{"manifest":1}\n')
        lock_blob = git("-C", remote, "hash-object", "-w", "--stdin", data=b'{"lock":1}\n')
        security_tree = git("-C", remote, "mktree", data=(
            f"100644 blob {manifest_blob}\t{Path(probe.FROZEN_MANIFEST_PATH).name}\n"
            f"100644 blob {lock_blob}\t{Path(probe.V5_LOCK_PATH).name}\n"
        ).encode())
        ops_tree = git("-C", remote, "mktree", data=f"040000 tree {security_tree}\tsecurity\n".encode())
        freeze_tree = git("-C", remote, "mktree", data=(
            f"040000 tree {ops_tree}\tops\n100644 blob {blob}\tsource.txt\n"
        ).encode())
        freeze_commit = git("-C", remote, "commit-tree", freeze_tree, "-p", source_commit,
                            data=b"fixture freeze\n")
        git("-C", remote, "update-ref", "refs/heads/main", freeze_commit)
        git("-C", remote, "symbolic-ref", "HEAD", "refs/heads/main")
        for module in (baseline, probe):
            module.FROZEN_PR_HEAD = freeze_commit
            module.FROZEN_SOURCE_COMMIT = source_commit
            module.FROZEN_SOURCE_TREE = tree
            module.FROZEN_MANIFEST_BLOB = manifest_blob
            module.V5_LOCK_BLOB = lock_blob

        def promisor_fixture(name: str) -> tuple[Path, Path]:
            repo = task / name
            calls = task / (name + "-upload-pack-calls.txt")
            helper = task / (name + "-upload-pack.sh")
            helper.write_text(
                "#!/bin/sh\n"
                + "printf 'called\\n' >> " + shlex.quote(str(calls)) + "\n"
                + 'exec /usr/bin/git upload-pack "$@"\n', encoding="utf-8",
            )
            helper.chmod(0o700)
            git("init", repo)
            for key, value in {
                "remote.origin.url": str(remote),
                "remote.origin.promisor": "true",
                "remote.origin.partialclonefilter": "blob:none",
                "remote.origin.uploadpack": str(helper),
                "protocol.file.allow": "always",
            }.items():
                git("-C", repo, "config", key, value)
            return repo, calls

        # Positive control: the frozen V1 really launches a local transport and
        # writes objects. The only permitted fixture remote is a local path.
        repo, calls = promisor_fixture("v1-positive-control")
        baseline.REPOSITORY_ROOT = repo
        before = snapshot(repo)
        observation = baseline.source_metadata()
        assert observation["frozen_pr_commit_locally_present"] is True
        assert observation["frozen_source_commit_locally_present"] is True
        assert calls.exists() and calls.read_text("utf-8").splitlines()
        assert snapshot(repo) != before
        result["v1_lazy_fetch_reproduced"] = True

        # Full V2, then remove the new Git variable to exercise the older-Git
        # fallback independently. Per-protocol 'always' must not bypass it.
        guarded_env = dict(probe.ENV)
        for name, drop_lazy_guard in (("v2-both-guards", False), ("v2-protocol-fallback", True)):
            repo, calls = promisor_fixture(name)
            probe.REPOSITORY_ROOT = repo
            probe.ENV = dict(guarded_env)
            if drop_lazy_guard:
                del probe.ENV["GIT_NO_LAZY_FETCH"]
            before = snapshot(repo)
            observation = probe.source_metadata()
            assert observation["head_sha"] is None
            for key in ("frozen_pr_commit_locally_present", "frozen_source_commit_locally_present",
                        "frozen_source_tree_locally_present", "checked_out_head_matches_frozen_pr",
                        "tracked_freeze_manifest_matches", "tracked_v5_lock_matches"):
                assert observation[key] is False, (name, key)
            assert not calls.exists(), name
            assert snapshot(repo) == before, name
            result[name] = {"transport_helper_calls": 0, "repository_unchanged": True}

        # A complete ordinary clone must still resolve every expected identity.
        complete = task / "complete-clone"
        git("clone", "--local", "--no-hardlinks", remote, complete)
        probe.REPOSITORY_ROOT = complete
        probe.ENV = dict(guarded_env)
        before = snapshot(complete)
        observation = probe.source_metadata()
        assert observation["head_sha"] == freeze_commit
        for key in ("frozen_pr_commit_locally_present", "frozen_source_commit_locally_present",
                    "frozen_source_tree_locally_present", "checked_out_head_matches_frozen_pr",
                    "tracked_freeze_manifest_matches", "tracked_v5_lock_matches"):
            assert observation[key] is True, key
        assert snapshot(complete) == before
        result["complete_clone_identity_checks"] = True

        # An inaccessible checkout produces explicit negative metadata without
        # consulting Git or converting the observation into readiness.
        with patch.object(probe.os, "lstat", side_effect=PermissionError("fixture_inaccessible")), \
             patch.object(probe, "local_git", side_effect=AssertionError("unexpected_git_access")):
            unavailable = probe.source_metadata()
        assert unavailable == {
            "repository_directory_state": "METADATA_PERMISSION_HOLD",
            "head_sha": None,
            "frozen_pr_commit_locally_present": False,
            "frozen_source_commit_locally_present": False,
            "frozen_source_tree_locally_present": False,
            "checked_out_head_matches_frozen_pr": False,
            "tracked_freeze_manifest_matches": False,
            "tracked_v5_lock_matches": False,
        }
        result["inaccessible_checkout_holds_without_git"] = True

        # Host report shape is exercised only through explicit fixture paths.
        # Never query the three actual Precision paths from this proof.
        receipt = task / "fixture-receipt.json"
        receipt.write_bytes(b"synthetic metadata fixture\n")
        receipt.chmod(0o600)
        custody = task / "fixture-custody"
        custody.mkdir()
        epoch = task / "fixture-epoch"
        epoch.symlink_to(custody, target_is_directory=True)
        paths = {"source_finality_deployment_receipt": str(receipt),
                 "allocation_custody_mount": str(custody),
                 "epoch2_live_composition_root": str(epoch)}
        output = io.StringIO()
        with patch.object(probe, "READ_ONLY_PATHS", paths), \
             patch.object(probe.os, "geteuid", return_value=1000), \
             patch.object(probe.platform, "node", return_value=probe.PRECISION_HOSTNAME), \
             contextlib.redirect_stdout(output):
            probe.run()
        report = json.loads(output.getvalue())
        assert report["status"] == "HOST_RELEASE_EVIDENCE_HOLD"
        assert report["schema"].endswith("_v2")
        assert report["fixed_path_metadata"]["epoch2_live_composition_root"]["state"] == "SYMLINK_HOLD"
        for key in ("network_contact", "secret_or_receipt_content_access", "credential_or_wallet_access",
                    "signing_or_transaction", "service_or_filesystem_mutation",
                    "customer_payment_acceptance_authorized", "public_presale_activation_authorized",
                    "wc_void_activation_authorized", "funds_movement"):
            assert report[key] is False, key
        assert snapshot(complete) == before
        result["fixture_report_retains_hold_and_authority"] = True

        # A copied standalone script has no dependency on the current directory.
        downloads = task / "Downloads"
        downloads.mkdir()
        standalone = downloads / V2.name
        shutil.copyfile(V2, standalone)
        for flag, should_succeed in (("--self-test", True), ("--apply", False)):
            process = subprocess.run(
                [sys.executable, "-I", "-B", str(standalone), flag], cwd=downloads,
                env=guarded_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                check=False, timeout=10,
            )
            assert (process.returncode == 0) is should_succeed, flag
        assert not list(downloads.rglob("__pycache__"))
        result["standalone_self_test_and_apply_refusal"] = True

        # Root refusal precedes all metadata or Git access.
        with patch.object(probe.os, "geteuid", return_value=0), \
             patch.object(probe, "metadata_only", side_effect=AssertionError("unexpected_metadata_access")), \
             patch.object(probe, "local_git", side_effect=AssertionError("unexpected_git_access")):
            try:
                probe.run()
            except AssertionError as error:
                assert str(error) == "root_execution_not_required_or_allowed"
            else:
                raise AssertionError("root_execution_unexpectedly_accepted")
        result["root_refusal_precedes_host_access"] = True
    assert V1.read_bytes() == original
    result["frozen_v1_unchanged"] = True
    result["external_network_contact"] = False
    result["real_host_run"] = False
    result["marker"] = "VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V2_PROOF_GREEN"
    print(json.dumps(result, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
