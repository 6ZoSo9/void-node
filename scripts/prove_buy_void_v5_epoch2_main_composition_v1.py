#!/usr/bin/env python3
"""Read-only, fail-closed canonical source composition proof. No host authority."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_V5_EPOCH2_MAIN_COMPOSITION_V1"
BASE = "adc5a87d0200aa354b03d9910cbfc1cb2d59bb38"
LOCK_PARENT = "c005ca30ab156427deb7731d596cde52d7a669ac"
MAIN_PARENT = "206d3d61e5051704e9fd0c47068bcfe56a15c85f"
COMPOSED = "38614797be01f2dd7d6d87503874182c5669c22d"
COMPOSED_TREE = "01b460d46c703b619a43c8747b1dc5537a39019e"
LOCK_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json"
LOCK_BLOB = "61a9d85d285f9c9d249adf401580822c44c6dac6"
PROJECTION_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5-lock-projection-v1.json"
PROJECTION_BLOB = "dd849928bc945478a1a8fcf687f374cfca59f4e4"
CANDIDATE_HEAD = "a884c8b69d19523e99da02899ff5fa8ab18e7100"
CANDIDATE_SET = "1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf"
PROTECTED_SHA = "e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3"
ADDED_MAIN = tuple(sorted((
    ".github/workflows/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.yml",
    ".github/workflows/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-v1.yml",
    ".github/workflows/buy-void-epoch2-dormant-binder-installer-first-entry-materializer-v1.yml",
    ".github/workflows/buy-void-epoch2-dormant-binder-installer-first-entry-protected-install-v1.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.md",
    "docs/operators/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-v1.md",
    "docs/operators/buy-void-epoch2-dormant-binder-installer-first-entry-materializer-v1.md",
    "docs/operators/buy-void-epoch2-dormant-binder-installer-first-entry-protected-install-v1.md",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py",
    "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json",
    "scripts/materialize_buy_void_epoch2_dormant_binder_installer_first_entry_v1.py",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_lock_v1.py",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1.py",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_materializer_v1.py",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py",
)))
LOCAL_SCOPE = tuple(sorted((
    ".github/workflows/buy-void-v5-epoch2-main-composition-v1.yml",
    "docs/architecture/buy-void-v5-epoch2-main-composition-v1.md",
    "scripts/prove_buy_void_v5_epoch2_main_composition_v1.py",
)))
ENV = {
    "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
    "LC_ALL": "C", "TZ": "UTC", "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1", "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}

def git(*args: str) -> str:
    command = ["/usr/bin/git", "--no-replace-objects",
               "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
               "-C", str(ROOT), *args]
    result = subprocess.run(command, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=40, env=ENV, check=False)
    if result.returncode or result.stderr:
        raise AssertionError("git_refusal:" + " ".join(args[:4]) + ":" +
                             result.stderr.decode("utf-8", "replace")[-600:])
    return result.stdout.decode("utf-8", "strict").strip()

def check(condition: bool, reason: str) -> None:
    if not condition:
        raise AssertionError(reason)

def delta(a: str, b: str, status: bool = False) -> tuple[str, ...]:
    flag = "--name-status" if status else "--name-only"
    out = git("diff", flag, "--no-renames", a, b, "--")
    return tuple(sorted(x for x in out.splitlines() if x))

def read_tracked(relative: str, blob: str) -> dict:
    absolute = ROOT.joinpath(*relative.split("/"))
    before = absolute.lstat()
    check(stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode) and
          before.st_nlink == 1 and 0 < before.st_size <= 256 * 1024,
          "unsafe_tracked_source:" + relative)
    data = absolute.read_bytes()
    after = absolute.lstat()
    for key in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        check(getattr(before, key) == getattr(after, key),
              "tracked_source_changed:" + relative + ":" + key)
    expected = hashlib.sha1(("blob " + str(len(data)) + "\0").encode("ascii") +
                            data).hexdigest()
    check(expected == blob == git("rev-parse", "HEAD:" + relative),
          "tracked_source_identity_drift:" + relative)
    return json.loads(data.decode("utf-8", "strict"))

def prove() -> None:
    head = git("rev-parse", "HEAD")
    check(git("rev-parse", COMPOSED + "^{tree}") == COMPOSED_TREE,
          "composed_tree_drift")
    check(git("rev-list", "--parents", "-n", "1", COMPOSED) ==
          " ".join((COMPOSED, LOCK_PARENT, MAIN_PARENT)),
          "composition_parents_drift")
    check(git("merge-base", COMPOSED, head) == COMPOSED,
          "composition_not_ancestor")
    check(git("status", "--porcelain=v1", "--untracked-files=all") == "",
          "repository_not_clean")

    main_changes = delta(BASE, MAIN_PARENT, True)
    check(main_changes == tuple("A\t" + p for p in ADDED_MAIN),
          "canonical_epoch2_added_scope_drift")
    econ = delta(BASE, LOCK_PARENT)
    check(len(econ) == 60 and not set(econ).intersection(ADDED_MAIN),
          "economic_lock_scope_or_overlap_drift")
    check(delta(LOCK_PARENT, COMPOSED, True) ==
          tuple("A\t" + p for p in ADDED_MAIN),
          "merged_current_main_paths_changed")
    check(delta(MAIN_PARENT, COMPOSED) == econ,
          "economic_branch_tree_changed_in_composition")
    check(delta(COMPOSED, head, True) ==
          tuple("A\t" + p for p in LOCAL_SCOPE),
          "composition_local_add_only_scope_drift")
    check(git("diff", "--quiet", LOCK_PARENT, COMPOSED, "--", *econ) == "",
          "economic_content_drift")
    check(git("diff", "--quiet", MAIN_PARENT, COMPOSED, "--", *ADDED_MAIN) == "",
          "current_main_content_drift")

    lock = read_tracked(LOCK_REL, LOCK_BLOB)
    projection = read_tracked(PROJECTION_REL, PROJECTION_BLOB)
    check(lock.get("candidate_head") == CANDIDATE_HEAD and
          lock.get("candidate_evidence", {}).get("candidate_enforcement_set_sha256")
          == CANDIDATE_SET, "accepted_candidate_not_exact")
    check(lock.get("current_enforcement_tracked_source_inventory_sha256") ==
          PROTECTED_SHA, "accepted_inventory_digest_drift")
    check(projection.get("candidate_head") == CANDIDATE_HEAD and
          projection.get("candidate_enforcement_set_sha256") == CANDIDATE_SET,
          "projection_candidate_drift")
    rows = projection.get("current_enforcement_tracked_source_inventory_v1")
    check(isinstance(rows, list) and len(rows) == 49, "projection_inventory_size")
    check([r.get("path") for r in rows] ==
          sorted(set(r.get("path") for r in rows)), "projection_inventory_order")
    canonical = json.dumps(rows, sort_keys=True, separators=(",", ":"),
                           ensure_ascii=True).encode("ascii")
    check(hashlib.sha256(canonical).hexdigest() == PROTECTED_SHA,
          "projection_inventory_canonical_hash_invalid")
    for row in rows:
        relative = row["path"]
        check(re.fullmatch(r"[0-9a-f]{40}", row["git_blob_sha1"]) is not None and
              row["git_mode"] in ("100644", "100755"),
              "protected_row_shape_invalid:" + relative)
        actual = git("ls-tree", "HEAD", "--", relative)
        check(actual == row["git_mode"] + " blob " +
              row["git_blob_sha1"] + "\t" + relative,
              "protected_row_changed:" + relative)
    check(projection.get("candidate_enforcement_identity_accepted") is False,
          "candidate_already_accepted")
    check(lock.get("complete_executable_closure_verified") is True and
          lock.get("candidate_enforcement_identity_accepted") is True and
          lock.get("current_enforcement_tracked_source_inventory_verified") is True,
          "lock_not_accepted_source_only")
    for key in ("deployed_artifact_generation_verified", "runtime_mount_authority",
                "production_source_finality_authority_ready", "public_presale_activation",
                "funds_movement"):
        check(lock.get(key) is False and projection.get(key) is False,
              "production_authority_overclaim:" + key)

def main() -> None:
    import sys
    check(sys.argv[1:] in ([], ["--self-test"]), "unsupported_mode")
    prove()
    print(MARKER + "_GREEN")
    print("read_only=true")
    print("canonical_epoch2_added_paths=15")
    print("preserved_economic_paths=60")
    print("protected_source_rows=49")
    print("exact_two_parent_composition_verified=true")
    print("accepted_v5_lock_identity_preserved=true")
    print("deployed_artifact_generation_verified=false")
    print("runtime_mount_authority=false")
    print("production_source_finality_authority_ready=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

if __name__ == "__main__":
    main()
