#!/usr/bin/env python3
"""Offline regression for accepted-freeze Precision metadata census V3."""
from __future__ import annotations

import contextlib
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
V3 = HERE / "void_buy_void_precision_source_freeze_host_metadata_census_v3.py"


def load_probe(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def snapshot(root: Path) -> dict[str, tuple]:
    result = {}
    for item in [root, *sorted(root.rglob("*"))]:
        info = item.lstat()
        kind = stat.S_IFMT(info.st_mode)
        value = (
            item.read_bytes()
            if stat.S_ISREG(info.st_mode)
            else os.readlink(item)
            if stat.S_ISLNK(info.st_mode)
            else None
        )
        result[str(item.relative_to(root))] = (
            kind,
            stat.S_IMODE(info.st_mode),
            value,
        )
    return result


def main() -> None:
    if sys.argv[1:] != ["--self-test"]:
        raise SystemExit("usage: census_v3_proof.py --self-test")

    probe = load_probe(V3, "census_v3_fixture")
    assert probe.ENV["GIT_NO_LAZY_FETCH"] == "1"
    assert probe.ENV["GIT_ALLOW_PROTOCOL"] == ""
    assert probe.ENV["GIT_OPTIONAL_LOCKS"] == "0"
    assert probe.ENV["GIT_NO_REPLACE_OBJECTS"] == "1"

    source_text = V3.read_text("utf-8")
    for forbidden in (
        "os.O_WRONLY",
        "os.O_RDWR",
        "os.O_CREAT",
        "os.mkdir(",
        ".write_text(",
        ".write_bytes(",
        ".unlink(",
        "os.remove(",
        "os.rename(",
        "os.replace(",
        "shutil.rmtree",
        "systemctl",
    ):
        assert forbidden not in source_text, forbidden

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
        cp = subprocess.run(
            ["/usr/bin/git", *map(str, args)],
            env=setup_env,
            input=data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=15,
        )
        return cp.stdout.decode("utf-8", "strict").strip()

    result: dict[str, object] = {"git_version": git("--version")}

    with tempfile.TemporaryDirectory(prefix="void-census-v3-proof-") as directory:
        task = Path(directory)
        source = task / "source"
        source.mkdir()
        git("init", source)

        fixture_files = {
            probe.FREEZE_MANIFEST_PATH: b'{"freeze":2}\n',
            probe.SUCCESSOR_PATH: b'{"successor":1}\n',
            probe.ACCEPTANCE_PATH: b'{"acceptance":2}\n',
            probe.ENFORCEMENT_LOCK_PATH: b'{"enforcement":2}\n',
            probe.BOOTSTRAP_LOCK_PATH: b'{"bootstrap":6}\n',
        }
        for relative, raw in fixture_files.items():
            target = source.joinpath(*relative.split("/"))
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        git("-C", source, "add", ".")
        git("-C", source, "commit", "-m", "fixture accepted freeze")
        fixture_commit = git("-C", source, "rev-parse", "HEAD")
        fixture_tree = git("-C", source, "rev-parse", "HEAD^{tree}")

        remote = task / "synthetic-remote.git"
        git("clone", "--bare", source, remote)

        fixture_blobs = {
            relative: git("-C", source, "rev-parse", "HEAD:" + relative)
            for relative in fixture_files
        }

        probe.FREEZE_REVIEW_HEAD = fixture_commit
        probe.FREEZE_SOURCE_COMMIT = fixture_commit
        probe.FREEZE_SOURCE_TREE = fixture_tree
        probe.SUCCESSOR_REVIEW_HEAD = fixture_commit
        probe.ACCEPTANCE_REVIEW_HEAD = fixture_commit
        probe.FREEZE_MANIFEST_BLOB = fixture_blobs[probe.FREEZE_MANIFEST_PATH]
        probe.SUCCESSOR_BLOB = fixture_blobs[probe.SUCCESSOR_PATH]
        probe.ACCEPTANCE_BLOB = fixture_blobs[probe.ACCEPTANCE_PATH]
        probe.ENFORCEMENT_LOCK_BLOB = fixture_blobs[probe.ENFORCEMENT_LOCK_PATH]
        probe.BOOTSTRAP_LOCK_BLOB = fixture_blobs[probe.BOOTSTRAP_LOCK_PATH]

        def promisor_fixture(name: str) -> tuple[Path, Path]:
            checkout = task / name
            calls = task / (name + "-upload-pack-calls.txt")
            helper = task / (name + "-upload-pack.sh")
            helper.write_text(
                "#!/bin/sh\n"
                + "printf 'called\\n' >> " + shlex.quote(str(calls)) + "\n"
                + 'exec /usr/bin/git upload-pack "$@"\n',
                encoding="utf-8",
            )
            helper.chmod(0o700)
            git("init", checkout)
            for key, value in {
                "remote.origin.url": str(remote),
                "remote.origin.promisor": "true",
                "remote.origin.partialclonefilter": "blob:none",
                "remote.origin.uploadpack": str(helper),
                "protocol.file.allow": "always",
            }.items():
                git("-C", checkout, "config", key, value)
            return checkout, calls

        guarded_env = dict(probe.ENV)
        for name, drop_lazy_guard in (
            ("v3-both-guards", False),
            ("v3-protocol-fallback", True),
        ):
            checkout, calls = promisor_fixture(name)
            probe.REPOSITORY_ROOT = checkout
            probe.ENV = dict(guarded_env)
            if drop_lazy_guard:
                del probe.ENV["GIT_NO_LAZY_FETCH"]

            before = snapshot(checkout)
            observation = probe.source_metadata()
            assert observation["head_sha"] is None
            for key in (
                "freeze_review_head_locally_present",
                "freeze_source_commit_locally_present",
                "freeze_source_tree_locally_present",
                "successor_review_head_locally_present",
                "acceptance_review_head_locally_present",
                "tracked_freeze_manifest_matches",
                "tracked_enforcement_successor_matches",
                "tracked_freeze_acceptance_matches",
                "tracked_historical_enforcement_lock_matches",
                "tracked_repaired_epoch2_bootstrap_lock_matches",
            ):
                assert observation[key] is False, (name, key)
            assert not calls.exists(), name
            assert snapshot(checkout) == before, name
            result[name] = {
                "transport_helper_calls": 0,
                "repository_unchanged": True,
            }

        complete = task / "complete-clone"
        git("clone", "--local", "--no-hardlinks", remote, complete)
        probe.REPOSITORY_ROOT = complete
        probe.ENV = dict(guarded_env)
        before_complete = snapshot(complete)
        observation = probe.source_metadata()
        assert observation["head_sha"] == fixture_commit
        for key in (
            "freeze_review_head_locally_present",
            "freeze_source_commit_locally_present",
            "freeze_source_tree_locally_present",
            "successor_review_head_locally_present",
            "acceptance_review_head_locally_present",
            "tracked_freeze_manifest_matches",
            "tracked_enforcement_successor_matches",
            "tracked_freeze_acceptance_matches",
            "tracked_historical_enforcement_lock_matches",
            "tracked_repaired_epoch2_bootstrap_lock_matches",
        ):
            assert observation[key] is True, key
        assert snapshot(complete) == before_complete
        result["complete_clone_identity_checks"] = True

        with (
            patch.object(
                probe.os,
                "lstat",
                side_effect=PermissionError("fixture_inaccessible"),
            ),
            patch.object(
                probe,
                "local_git",
                side_effect=AssertionError("unexpected_git_access"),
            ),
        ):
            unavailable = probe.source_metadata()
        assert unavailable["repository_directory_state"] == "METADATA_PERMISSION_HOLD"
        assert unavailable["head_sha"] is None
        assert all(
            unavailable[key] is False
            for key in unavailable
            if key not in ("repository_directory_state", "head_sha")
        )
        result["inaccessible_checkout_holds_without_git"] = True

        receipt = task / "fixture-receipt.json"
        receipt.write_bytes(b"synthetic metadata fixture\n")
        receipt.chmod(0o600)
        custody = task / "fixture-custody"
        custody.mkdir()
        epoch = task / "fixture-epoch"
        epoch.symlink_to(custody, target_is_directory=True)
        paths = {
            "source_finality_deployment_receipt": str(receipt),
            "allocation_custody_mount": str(custody),
            "epoch2_live_composition_root": str(epoch),
        }

        output = io.StringIO()
        with (
            patch.object(probe, "READ_ONLY_PATHS", paths),
            patch.object(probe.os, "geteuid", return_value=1000),
            patch.object(
                probe.platform,
                "node",
                return_value=probe.PRECISION_HOSTNAME,
            ),
            contextlib.redirect_stdout(output),
        ):
            probe.run()
        report = json.loads(output.getvalue())
        assert report["status"] == "HOST_RELEASE_EVIDENCE_HOLD"
        assert report["schema"].endswith("_v3")
        assert report["read_only"] is True
        assert report["network_contact"] is False
        assert report["git_lazy_fetch"] is False
        assert report["git_transport_allowed"] is False
        assert report["fixed_path_metadata"]["epoch2_live_composition_root"]["state"] == "SYMLINK_HOLD"
        for key in (
            "secret_or_receipt_content_access",
            "credential_or_wallet_access",
            "signing_or_transaction",
            "service_or_filesystem_mutation",
            "source_freeze_acceptance_authority_claimed",
            "installed_receipt_authenticity_verified",
            "host_install_qualified",
            "live_process_generation_verified",
            "payment_rail_policy_accepted",
            "customer_payment_acceptance_authorized",
            "one_payment_one_fulfillment_verified",
            "wc_void_launch_coupling_verified",
            "public_presale_activation_authorized",
            "wc_void_activation_authorized",
            "funds_movement",
            "production_host_evidence_authority",
        ):
            assert report[key] is False, key
        assert report["expected_freeze_id"].startswith("voidbuypresalefreeze2_")
        assert report["expected_successor_id"].startswith("voidbuypresaleenfsucc1_")
        assert report["expected_acceptance_id"].startswith("voidbuypresalefreezeaccept2_")
        assert report["next_gate"] == (
            "RETURN_JSON_FOR_VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_"
            "HOST_INSTALL_QUALIFICATION_V2"
        )
        assert snapshot(complete) == before_complete
        result["fixture_report_retains_hold_and_authority"] = True

        downloads = task / "Downloads"
        downloads.mkdir()
        standalone = downloads / V3.name
        shutil.copyfile(V3, standalone)
        for flag, should_succeed in (("--self-test", True), ("--apply", False)):
            process = subprocess.run(
                [sys.executable, "-I", "-B", str(standalone), flag],
                cwd=downloads,
                env=guarded_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                timeout=10,
            )
            assert (process.returncode == 0) is should_succeed, flag
        assert not list(downloads.rglob("__pycache__"))
        result["standalone_self_test_and_apply_refusal"] = True

        with (
            patch.object(probe.os, "geteuid", return_value=0),
            patch.object(
                probe,
                "metadata_only",
                side_effect=AssertionError("unexpected_metadata_access"),
            ),
            patch.object(
                probe,
                "local_git",
                side_effect=AssertionError("unexpected_git_access"),
            ),
        ):
            try:
                probe.run()
            except AssertionError as error:
                assert str(error) == "root_execution_not_required_or_allowed"
            else:
                raise AssertionError("root_execution_unexpectedly_accepted")
        result["root_refusal_precedes_host_access"] = True

    result["external_network_contact"] = False
    result["real_host_run"] = False
    result["marker"] = (
        "VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V3_PROOF_GREEN"
    )
    print(json.dumps(result, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
