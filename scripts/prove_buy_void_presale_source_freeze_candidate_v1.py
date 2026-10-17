#!/usr/bin/env python3
"""Fail-closed source freeze qualification. Read-only: NEVER a deployment tool."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_CANDIDATE_V1"
BASE = "0ea097a3fa43dc95a1a0a5272c61afe570361fc7"
ECON = "ae1db243066db8c99d778245526c0f5a023444fd"
MAIN = "f77e586807a7a6bdd92324138fe6bf2b50903835"
SNAPSHOT = "5e514e4b6e2151c18cf7459bd7a697287eebbd4c"
SNAPSHOT_TREE = "47a0c6eb9408b97226472d1297115633b0b3d799"
MANIFEST_PATH = "ops/security/buy-void-presale-source-freeze-candidate-v1.json"
MANIFEST_BLOB = "91d2d7877bc3066e3030337576ca2dddeb55bfc8"
LOCK_PATH = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json"
LOCK_BLOB = "61a9d85d285f9c9d249adf401580822c44c6dac6"
PROJECTION_PATH = "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5-lock-projection-v1.json"
PROJECTION_BLOB = "dd849928bc945478a1a8fcf687f374cfca59f4e4"
ACCEPTED_SET = "1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf"
CANDIDATE_HEAD = "a884c8b69d19523e99da02899ff5fa8ab18e7100"
PROTECTED_SHA = "e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3"
NEW_MAIN_FILES = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.yml",
    "docs/operators/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.md",
    "ops/security/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.json",
    "scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_lock_v1.py",
)
LOCAL_ADDITIONS = (
    ".github/workflows/buy-void-presale-source-freeze-candidate-v1.yml",
    "docs/architecture/buy-void-presale-source-freeze-candidate-v1.md",
    MANIFEST_PATH,
    "scripts/prove_buy_void_presale_source_freeze_candidate_v1.py",
)
ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}

def require(ok: bool, reason: str) -> None:
    if not ok:
        raise AssertionError(reason)

def git(*args: str) -> str:
    command = [
        "/usr/bin/git", "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
        "-C", str(ROOT), *args,
    ]
    r = subprocess.run(command, stdin=subprocess.DEVNULL,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       env=ENV, timeout=40, check=False)
    require(r.returncode == 0, "git_refusal:" + " ".join(args[:4]) + ":" +
            r.stderr.decode("utf-8", "replace")[-350:])
    return r.stdout.decode("utf-8", "strict").strip()

def delta(a: str, b: str, status: bool = False) -> tuple[str, ...]:
    option = "--name-status" if status else "--name-only"
    data = git("diff", "--no-renames", option, a, b, "--")
    return tuple(sorted(x for x in data.splitlines() if x))

def read_pinned(relative: str, expected_blob: str) -> dict:
    require(not Path(relative).is_absolute() and all(
        v not in ("", ".", "..") for v in relative.split("/")),
        "unsafe_tracked_path:" + relative)
    path = ROOT.joinpath(*relative.split("/"))
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and
            0 < before.st_size < 256 * 1024, "unsafe_tracked_file:" + relative)
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        require(getattr(before, field) == getattr(after, field),
                "tracked_file_changed:" + relative + ":" + field)
    sha = hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") +
                       b"\x00" + raw).hexdigest()
    require(sha == expected_blob == git("rev-parse", "HEAD:" + relative),
            "tracked_blob_drift:" + relative)
    return json.loads(raw.decode("utf-8", "strict"))

def verify() -> None:
    require(git("status", "--porcelain=v1", "--untracked-files=all") == "",
            "source_worktree_not_clean")
    head = git("rev-parse", "HEAD")
    require(git("merge-base", SNAPSHOT, head) == SNAPSHOT,
            "source_snapshot_missing")
    require(git("rev-parse", SNAPSHOT + "^{tree}") == SNAPSHOT_TREE,
            "frozen_source_tree_changed")
    require(git("rev-list", "--parents", "-n", "1", SNAPSHOT) ==
            " ".join((SNAPSHOT, ECON, MAIN)),
            "source_snapshot_parent_order_changed")

    main_delta = delta(BASE, MAIN, status=True)
    require(main_delta == tuple("A\t" + x for x in sorted(NEW_MAIN_FILES)),
            "canonical_bootstrap_scope_mismatch")
    econ_delta = delta(BASE, ECON)
    require(len(econ_delta) == 63 and set(econ_delta).isdisjoint(NEW_MAIN_FILES),
            "reviewed_economic_scope_mismatch")
    require(delta(ECON, SNAPSHOT, status=True) == main_delta,
            "bootstrap_files_not_exact")
    require(delta(MAIN, SNAPSHOT) == econ_delta,
            "economic_files_not_exact")
    require(delta(SNAPSHOT, head, status=True) ==
            tuple("A\t" + x for x in sorted(LOCAL_ADDITIONS)),
            "unreviewed_local_freeze_file")
    # Git tree comparison proves every path and executable mode, not just contents.
    require(git("diff", "--name-only", ECON, SNAPSHOT, "--", *econ_delta) == "",
            "economic_bytes_or_modes_changed")
    require(git("diff", "--name-only", MAIN, SNAPSHOT, "--", *NEW_MAIN_FILES) == "",
            "bootstrap_bytes_or_modes_changed")

    m = read_pinned(MANIFEST_PATH, MANIFEST_BLOB)
    require(m.get("marker") == MARKER and m.get("version") == 1 and
            m.get("repository") == "6ZoSo9/void-node", "manifest_header_invalid")
    freeze = m.get("source_snapshot", {})
    for key, val in (
        ("composed_commit", SNAPSHOT),
        ("composed_tree", SNAPSHOT_TREE),
        ("economic_first_parent", ECON),
        ("canonical_main_second_parent", MAIN),
        ("reviewed_economic_paths_preserved", 63),
        ("canonical_bootstrap_lock_paths_added", 4),
        ("exact_source_snapshot_fixed", True),
        ("auto_adopt_new_main_commits", False),
        ("later_main_changes_require_separate_review", True),
    ):
        require(freeze.get(key) == val, "manifest_freeze_field_invalid:" + key)
    boot = m.get("canonical_bootstrap_lock_additions", [])
    require(isinstance(boot, list) and len(boot) == 4 and
            [row.get("path") for row in boot] == list(NEW_MAIN_FILES),
            "bootstrap_manifest_inventory_invalid")
    for row in boot:
        path = row["path"]
        require(row["git_mode"] == "100644" and
                re.fullmatch(r"[0-9a-f]{40}", row["git_blob_sha1"]) is not None,
                "bootstrap_row_invalid:" + path)
        expected = "100644 blob " + row["git_blob_sha1"] + "\t" + path
        require(git("ls-tree", "HEAD", "--", path) == expected ==
                git("ls-tree", MAIN, "--", path),
                "bootstrap_blob_or_mode_drift:" + path)

    reviewed = m.get("reviewed_v5_source_enforcement", {})
    for key, val in (
        ("candidate_head", CANDIDATE_HEAD),
        ("candidate_enforcement_set_sha256", ACCEPTED_SET),
        ("accepted_lock_path", LOCK_PATH),
        ("accepted_lock_git_blob_sha1", LOCK_BLOB),
        ("candidate_projection_path", PROJECTION_PATH),
        ("candidate_projection_git_blob_sha1", PROJECTION_BLOB),
        ("protected_inventory_canonical_sha256", PROTECTED_SHA),
        ("protected_source_count", 49),
        ("accepted_source_identity_only", True),
    ):
        require(reviewed.get(key) == val,
                "manifest_enforcement_field_invalid:" + key)
    lock = read_pinned(LOCK_PATH, LOCK_BLOB)
    projection = read_pinned(PROJECTION_PATH, PROJECTION_BLOB)
    require(lock.get("candidate_head") == CANDIDATE_HEAD and
            lock.get("candidate_evidence", {}).get(
                "candidate_enforcement_set_sha256") == ACCEPTED_SET,
            "lock_identity_mismatch")
    require(lock.get("current_enforcement_tracked_source_inventory_sha256") ==
            PROTECTED_SHA, "lock_protected_inventory_invalid")
    require(projection.get("candidate_head") == CANDIDATE_HEAD and
            projection.get("candidate_enforcement_set_sha256") == ACCEPTED_SET,
            "projection_identity_mismatch")
    rows = projection.get("current_enforcement_tracked_source_inventory_v1")
    require(isinstance(rows, list) and len(rows) == 49,
            "protected_rows_missing")
    names = [row.get("path") for row in rows]
    require(names == sorted(set(names)), "protected_rows_out_of_order")
    digest = hashlib.sha256(
        json.dumps(rows, sort_keys=True, separators=(",", ":"),
                   ensure_ascii=True).encode("ascii")
    ).hexdigest()
    require(digest == PROTECTED_SHA, "protected_rows_digest_invalid")
    for row in rows:
        path, blob, mode = row["path"], row["git_blob_sha1"], row["git_mode"]
        require(not Path(path).is_absolute() and all(
            p not in ("", ".", "..") for p in path.split("/")),
            "protected_path_unsafe")
        require(re.fullmatch(r"[0-9a-f]{40}", blob) is not None and
                mode in ("100644", "100755"), "protected_row_shape_invalid")
        require(git("ls-tree", "HEAD", "--", path) ==
                mode + " blob " + blob + "\t" + path,
                "protected_source_drift:" + path)

    require(lock.get("complete_executable_closure_verified") is True and
            lock.get("candidate_enforcement_identity_accepted") is True and
            projection.get("candidate_enforcement_identity_accepted") is False,
            "reviewed_source_identity_not_accepted")
    gates = m.get("release_gate", {})
    require(gates.get("btc_void_presale_and_wc_void_pool_coupled") is True,
            "wc_void_launch_not_coupled")
    for flag in (
        "host_install_qualified", "live_runtime_evidence_qualified",
        "customer_payment_acceptance_authorized",
        "source_finality_runtime_authority_ready",
        "public_presale_activation", "wc_void_activation",
        "wallet_or_signing_authority", "transaction_submission_authorized",
        "treasury_or_liquidity_action_authorized", "funds_movement",
    ):
        require(gates.get(flag) is False,
                "manifest_live_authority_overclaim:" + flag)
    for flag in (
        "deployed_artifact_generation_verified", "runtime_mount_authority",
        "production_source_finality_authority_ready",
        "public_presale_activation", "funds_movement",
    ):
        require(lock.get(flag) is False and projection.get(flag) is False,
                "v5_lock_runtime_authority_overclaim:" + flag)

def main() -> None:
    require(sys.argv[1:] in ([], ["--self-test"]), "unsupported_mode")
    verify()
    print(MARKER + "_GREEN")
    print("read_only=true")
    print("source_snapshot_fixed=true")
    print("auto_adopt_new_main_commits=false")
    print("reviewed_economic_paths_preserved=63")
    print("canonical_bootstrap_lock_paths_preserved=4")
    print("protected_v5_source_rows=49")
    print("candidate_enforcement_identity_accepted=true")
    print("host_install_qualified=false")
    print("customer_payment_acceptance_authorized=false")
    print("public_presale_activation=false")
    print("wc_void_activation=false")
    print("funds_movement=false")

if __name__ == "__main__":
    main()
