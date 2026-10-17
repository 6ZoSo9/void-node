#!/usr/bin/env python3
"""Fail-closed, read-only provenance proof for exact V5/Epoch-2 composition V2."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_V5_EPOCH2_MAIN_COMPOSITION_V2"
MAIN_V1 = "206d3d61e5051704e9fd0c47068bcfe56a15c85f"
MAIN_V2 = "42dacb5b66e37e1e8814c5c96ab8cbafa5925b2b"
LOCK_PARENT = "c005ca30ab156427deb7731d596cde52d7a669ac"
V1_HEAD = "fd2fa4e0fbe412cdf31aad12b3f28d93761b013a"
COMPOSED_V2 = "c997196f4990a13615665e96a443d7b593754c08"
COMPOSED_V2_TREE = "cee12d1beb53e20c2ea6b12a10fdd6452101e696"
V1_PROOF = "scripts/prove_buy_void_v5_epoch2_main_composition_v1.py"
V1_PROOF_BLOB = "7acba5c006281e27a0735944416b54a0a6a0a785"
LOCK_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json"
LOCK_BLOB = "61a9d85d285f9c9d249adf401580822c44c6dac6"
PROJECTION_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5-lock-projection-v1.json"
PROJECTION_BLOB = "dd849928bc945478a1a8fcf687f374cfca59f4e4"
CANDIDATE_HEAD = "a884c8b69d19523e99da02899ff5fa8ab18e7100"
CANDIDATE_SET = "1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf"
PROTECTED_SHA = "e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3"
NEW_MAIN = tuple(sorted((
    ".github/workflows/buy-void-epoch2-dormant-binder-native-materializer-v1.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-native-materializer-v1.md",
    "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py",
    "scripts/prove_buy_void_epoch2_dormant_binder_native_materializer_v1.py",
)))
LOCAL = tuple(sorted((
    ".github/workflows/buy-void-v5-epoch2-main-composition-v2.yml",
    "docs/architecture/buy-void-v5-epoch2-main-composition-v2.md",
    "scripts/prove_buy_void_v5_epoch2_main_composition_v2.py",
)))
ENV = {
    "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
    "LC_ALL": "C", "TZ": "UTC", "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1", "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}

def check(value: bool, reason: str) -> None:
    if not value:
        raise AssertionError(reason)

def git(*args: str) -> str:
    argv = [
        "/usr/bin/git", "--no-replace-objects", "-c",
        "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
        "-C", str(ROOT), *args,
    ]
    result = subprocess.run(argv, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=45, env=ENV, check=False)
    check(result.returncode == 0, "git_command_refusal:" +
          " ".join(args[:4]) + ":" +
          result.stderr.decode("utf-8", "replace")[-300:])
    return result.stdout.decode("utf-8", "strict").strip()

def path_delta(a: str, b: str, status: bool = False) -> tuple[str, ...]:
    flag = "--name-status" if status else "--name-only"
    out = git("diff", "--no-renames", flag, a, b, "--")
    return tuple(sorted(line for line in out.splitlines() if line))

def pin_bytes(relative: str, blob: str, max_size: int = 256 * 1024) -> bytes:
    check(not Path(relative).is_absolute() and all(
          part not in ("", ".", "..") for part in relative.split("/")),
          "unsafe_path:" + relative)
    p = ROOT.joinpath(*relative.split("/"))
    before = p.lstat()
    check(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and
          0 < before.st_size <= max_size, "invalid_tracked_file:" + relative)
    data = p.read_bytes()
    after = p.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        check(getattr(before, field) == getattr(after, field),
              "tracked_file_changed:" + relative + ":" + field)
    observed = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") +
                            b"\0" + data).hexdigest()
    check(observed == blob == git("rev-parse", "HEAD:" + relative),
          "tracked_file_identity_drift:" + relative)
    return data

def prove() -> None:
    head = git("rev-parse", "HEAD")
    check(git("status", "--porcelain=v1", "--untracked-files=all") == "",
          "checkout_dirty")
    check(git("rev-parse", COMPOSED_V2 + "^{tree}") == COMPOSED_V2_TREE,
          "composed_v2_tree_changed")
    check(git("rev-list", "--parents", "-n", "1", COMPOSED_V2) ==
          " ".join((COMPOSED_V2, V1_HEAD, MAIN_V2)),
          "composed_v2_parent_order_changed")
    check(git("merge-base", COMPOSED_V2, head) == COMPOSED_V2,
          "required_composition_not_ancestor")

    new_main = path_delta(MAIN_V1, MAIN_V2, status=True)
    check(new_main == tuple("A\t" + p for p in NEW_MAIN),
          "new_main_four_file_scope_changed")
    local = path_delta(COMPOSED_V2, head, status=True)
    check(local == tuple("A\t" + p for p in LOCAL),
          "v2_local_three_file_scope_changed")
    composed_from_prior = path_delta(V1_HEAD, COMPOSED_V2, status=True)
    check(composed_from_prior == tuple("A\t" + p for p in NEW_MAIN),
          "composed_v2_main_delta_changed")
    economic_prior = path_delta(MAIN_V1, V1_HEAD)
    check(len(economic_prior) == 63 and
          set(economic_prior).isdisjoint(NEW_MAIN),
          "previous_integration_scope_unexpected")
    check(path_delta(MAIN_V2, COMPOSED_V2) == economic_prior,
          "economic_v1_scope_not_preserved")
    check(git("diff", "--quiet", "--no-ext-diff", "--no-textconv",
              V1_HEAD, COMPOSED_V2, "--", *economic_prior) == "",
          "economic_v1_bytes_or_modes_changed")
    check(git("diff", "--quiet", "--no-ext-diff", "--no-textconv",
              MAIN_V2, COMPOSED_V2, "--", *NEW_MAIN) == "",
          "new_canonical_main_bytes_or_modes_changed")

    check(git("rev-parse", V1_HEAD + ":" + V1_PROOF) == V1_PROOF_BLOB,
          "frozen_v1_proof_not_preserved")
    pin_bytes(V1_PROOF, V1_PROOF_BLOB)
    for name in NEW_MAIN:
        observed = git("ls-tree", "HEAD", "--", name)
        expected = git("ls-tree", MAIN_V2, "--", name)
        check(observed == expected and observed.startswith("100644 blob "),
              "new_main_mode_or_blob_drift:" + name)

    lock = json.loads(pin_bytes(LOCK_REL, LOCK_BLOB))
    projection = json.loads(pin_bytes(PROJECTION_REL, PROJECTION_BLOB))
    check(lock.get("candidate_head") == CANDIDATE_HEAD and
          lock.get("candidate_evidence", {}).get(
              "candidate_enforcement_set_sha256") == CANDIDATE_SET,
          "accepted_v5_lock_not_exact")
    check(lock.get("current_enforcement_tracked_source_inventory_sha256") ==
          PROTECTED_SHA, "accepted_v5_inventory_sha_drift")
    check(projection.get("candidate_head") == CANDIDATE_HEAD and
          projection.get("candidate_enforcement_set_sha256") == CANDIDATE_SET,
          "accepted_v5_projection_not_exact")
    rows = projection.get("current_enforcement_tracked_source_inventory_v1")
    check(isinstance(rows, list) and len(rows) == 49, "protected_inventory_count")
    names = [row.get("path") for row in rows]
    check(names == sorted(set(names)), "protected_inventory_order")
    digest = hashlib.sha256(json.dumps(
        rows, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
    ).encode("ascii")).hexdigest()
    check(digest == PROTECTED_SHA, "protected_inventory_canonical_digest_drift")
    for row in rows:
        relative, blob, mode = row["path"], row["git_blob_sha1"], row["git_mode"]
        check(re.fullmatch(r"[0-9a-f]{40}", blob) is not None and
              mode in ("100644", "100755"), "protected_row_invalid")
        check(git("ls-tree", "HEAD", "--", relative) ==
              mode + " blob " + blob + "\t" + relative,
              "protected_blob_or_mode_changed:" + relative)
    check(projection.get("candidate_enforcement_identity_accepted") is False,
          "projection_authority_overclaim")
    check(lock.get("complete_executable_closure_verified") is True and
          lock.get("candidate_enforcement_identity_accepted") is True and
          lock.get("current_enforcement_tracked_source_inventory_verified") is True,
          "reviewed_v5_source_lock_not_accepted")
    for flag in ("deployed_artifact_generation_verified",
                 "runtime_mount_authority",
                 "production_source_finality_authority_ready",
                 "public_presale_activation", "funds_movement"):
        check(lock.get(flag) is False and projection.get(flag) is False,
              "live_authority_overclaim:" + flag)

def main() -> None:
    check(sys.argv[1:] in ([], ["--self-test"]), "unsupported_mode")
    prove()
    print(MARKER + "_GREEN")
    print("read_only=true")
    print("native_materializer_added_paths=4")
    print("preserved_v1_economic_and_test_paths=63")
    print("protected_source_rows=49")
    print("two_parent_v2_composition_verified=true")
    print("accepted_v5_source_lock_preserved=true")
    print("candidate_enforcement_identity_accepted=true")
    print("deployed_artifact_generation_verified=false")
    print("runtime_mount_authority=false")
    print("production_source_finality_authority_ready=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

if __name__ == "__main__":
    main()
