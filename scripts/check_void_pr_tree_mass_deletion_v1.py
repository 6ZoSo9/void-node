#!/usr/bin/env python3
"""Fail closed on accidental destructive PR tree rewrites. PR/source only."""
from __future__ import annotations

import argparse
import re
import subprocess
import sys

MARK = "VOID_PR_TREE_MASS_DELETION_GUARD_V1"
MAX_DELETIONS = 512
MAX_DIFF_BYTES = 8 * 1024 * 1024
GIT_SHA = re.compile(r"[0-9a-f]{40}\Z")


def deleted_path_count(raw: bytes) -> int:
    if raw and not raw.endswith(b"\0"):
        raise ValueError("unterminated_git_name_stream")
    return raw.count(b"\0")


def self_test() -> None:
    for n in (0, 1, MAX_DELETIONS):
        count = deleted_path_count(b"a\0" * n)
        assert count == n and count <= MAX_DELETIONS
    for n in (MAX_DELETIONS + 1, 10_523):
        assert deleted_path_count(b"a\0" * n) > MAX_DELETIONS
    for malformed in (b"a", b"a\0b", b"a\0b\n"):
        try:
            deleted_path_count(malformed)
        except ValueError:
            pass
        else:
            raise AssertionError("malformed diff path stream accepted")
    assert GIT_SHA.fullmatch("a" * 40)
    assert not GIT_SHA.fullmatch("a" * 39)
    print(MARK + "_SYNTHETIC_GREEN")
    print("exact_pr_base_and_head_sha_required=true")
    print("pr_tree_deleted_path_budget=512")
    print("ten_thousand_path_tree_rewrite_rejected=true")
    print("no_private_pathnames_printed=true")


def run(base_sha: str, head_sha: str) -> int:
    if not GIT_SHA.fullmatch(base_sha) or not GIT_SHA.fullmatch(head_sha):
        print(MARK + "_HOLD invalid_commit_identity", file=sys.stderr)
        return 2
    # Compare exact endpoint TREES, not a mutable branch or the PR merge ref.
    # This conservative two-tree guard can overcount paths newly added to main
    # since branching; exceeding the budget requires explicit review, not a pass.
    try:
        diff = subprocess.run(
            ["git", "diff", "--no-ext-diff", "--name-only", "-z",
             "--diff-filter=D", base_sha, head_sha, "--"],
            capture_output=True,
            check=False,
            timeout=45,
        )
        if diff.returncode or len(diff.stdout) > MAX_DIFF_BYTES:
            raise ValueError("diff_unavailable_or_oversize")
        count = deleted_path_count(diff.stdout)
    except (OSError, subprocess.TimeoutExpired, ValueError):
        print(MARK + "_HOLD diff_unqualified", file=sys.stderr)
        return 2
    print("marker=" + MARK)
    print("deleted_tracked_paths=" + str(count))
    print("max_deleted_tracked_paths=" + str(MAX_DELETIONS))
    print("sensitive_paths_or_file_contents_printed=false")
    print("repository_mutation=false")
    if count > MAX_DELETIONS:
        print("status=HOLD_MASS_DELETE_PR_TREE", file=sys.stderr)
        return 2
    print("status=PR_TREE_DELETION_BUDGET_OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--base-sha")
    parser.add_argument("--head-sha")
    args = parser.parse_args()
    if args.self_test and (args.base_sha or args.head_sha):
        parser.error("self-test excludes live commit arguments")
    if args.self_test:
        self_test()
        return 0
    if not args.base_sha or not args.head_sha:
        parser.error("both --base-sha and --head-sha are required")
    return run(args.base_sha, args.head_sha)


if __name__ == "__main__":
    sys.exit(main())
