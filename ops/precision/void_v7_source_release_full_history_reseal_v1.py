#!/usr/bin/env python3
import sys

MARKER = "VOID_V7_SOURCE_RELEASE_FULL_HISTORY_RESEAL_V1"
if sys.flags.isolated != 1:
    print(MARKER); print("status=HOLD"); print("reason=python_isolation_required"); raise SystemExit(2)
if sys.flags.optimize != 0 or not __debug__:
    print(MARKER); print("status=HOLD"); print("reason=python_optimization_forbidden"); raise SystemExit(2)

import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TARGET_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
TARGET_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
TARGET_PARENTS = (
    "5752b69a7253a44fd3fabe2964476174b3a80c40",
    "6b7fc90219676a96f5a2c34619e4cfdf3f002244",
)
EXPECTED_REACHABLE_COMMITS = 17931
ALLOWED_OUTPUT_ROOT = Path("/home/zoso/Downloads")
CONFIG_TEXT = (
    "[core]\n"
    "\trepositoryformatversion = 0\n"
    "\tfilemode = true\n"
    "\tbare = false\n"
    "\tlogallrefupdates = true\n"
)
HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_OUTPUT = 64 * 1024 * 1024

class ResealError(RuntimeError):
    pass

def _env():
    return {
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
        "GIT_ASKPASS": "/bin/false",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_PAGER": "",
    }

def _git_args(root: Path, *args: str):
    return [
        "/usr/bin/git",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "submodule.recurse=false",
        "--no-replace-objects",
        "-C", os.fspath(root),
        *args,
    ]

def _run(root: Path, *args: str, input_data: bytes | None = None, allowed=(0,)) -> bytes:
    try:
        cp = subprocess.run(
            _git_args(root, *args),
            input=input_data,
            stdin=None if input_data is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_env(),
            timeout=180,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ResealError("git_exec_or_timeout:" + (args[0] if args else "unknown")) from exc
    if cp.returncode not in allowed or cp.stderr:
        raise ResealError("git_failed:" + (args[0] if args else "unknown"))
    if len(cp.stdout) > MAX_OUTPUT:
        raise ResealError("git_output_too_large")
    return cp.stdout

def _text(root: Path, *args: str) -> str:
    try:
        return _run(root, *args).decode("utf-8", "strict").strip()
    except UnicodeDecodeError as exc:
        raise ResealError("git_output_not_utf8") from exc

def _parents(root: Path, commit: str) -> tuple[str, ...]:
    raw = _text(root, "cat-file", "-p", commit)
    parents = tuple(line[7:] for line in raw.splitlines() if line.startswith("parent "))
    if any(HEX40.fullmatch(p) is None for p in parents):
        raise ResealError("parent_shape_invalid")
    return parents

def _forbidden_metadata(root: Path):
    g = root / ".git"
    return (
        g / "commondir",
        g / "config.worktree",
        g / "shallow",
        g / "info" / "grafts",
        g / "objects" / "info" / "alternates",
        g / "objects" / "info" / "http-alternates",
    )

def _config_exact(root: Path) -> None:
    raw = (root / ".git" / "config").read_text("utf-8")
    if raw != CONFIG_TEXT:
        raise ResealError("git_config_not_exact_closed_form")

def _complete_graph(root: Path) -> None:
    missing = _text(root, "rev-list", "--objects", "--missing=print", TARGET_HEAD)
    for line in missing.splitlines():
        if line.startswith("?"):
            raise ResealError("missing_reachable_object")
    count = int(_text(root, "rev-list", "--count", TARGET_HEAD))
    if count != EXPECTED_REACHABLE_COMMITS:
        raise ResealError("reachable_commit_count_mismatch")

def verify_source() -> dict[str, object]:
    top = Path(_text(ROOT, "rev-parse", "--show-toplevel")).resolve()
    if top != ROOT.resolve():
        raise ResealError("source_toplevel_mismatch")
    if _text(ROOT, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise ResealError("source_branch_not_main")
    if _text(ROOT, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise ResealError("source_checkout_not_clean")
    if _text(ROOT, "rev-parse", "--is-shallow-repository") != "false":
        raise ResealError("source_repository_shallow")
    if _text(ROOT, "rev-parse", TARGET_HEAD + "^{tree}") != TARGET_TREE:
        raise ResealError("target_tree_mismatch")
    if _parents(ROOT, TARGET_HEAD) != TARGET_PARENTS:
        raise ResealError("target_parent_set_mismatch")
    _complete_graph(ROOT)
    return {
        "source_head": _text(ROOT, "rev-parse", "HEAD"),
        "target_head": TARGET_HEAD,
        "target_tree": TARGET_TREE,
        "target_parents": TARGET_PARENTS,
        "reachable_commits": EXPECTED_REACHABLE_COMMITS,
    }

def verify_candidate(root: Path) -> None:
    if root.resolve(strict=True) != root or not root.is_dir() or root.is_symlink():
        raise ResealError("candidate_root_invalid")
    g = root / ".git"
    if not g.is_dir() or g.is_symlink():
        raise ResealError("candidate_git_dir_not_physical")
    if (g / "objects").is_symlink() or not (g / "objects").is_dir():
        raise ResealError("candidate_objects_dir_invalid")
    for path in _forbidden_metadata(root):
        if path.exists() or path.is_symlink():
            raise ResealError("candidate_forbidden_git_metadata:" + path.name)
    _config_exact(root)
    if _text(root, "rev-parse", "--is-shallow-repository") != "false":
        raise ResealError("candidate_repository_shallow")
    if _text(root, "rev-parse", "HEAD") != TARGET_HEAD:
        raise ResealError("candidate_head_mismatch")
    if _text(root, "rev-parse", "HEAD^{tree}") != TARGET_TREE:
        raise ResealError("candidate_tree_mismatch")
    if _text(root, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise ResealError("candidate_branch_not_main")
    if _parents(root, TARGET_HEAD) != TARGET_PARENTS:
        raise ResealError("candidate_parent_set_mismatch")
    _complete_graph(root)
    if _text(root, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise ResealError("candidate_worktree_not_clean")
    if _text(root, "write-tree") != TARGET_TREE:
        raise ResealError("candidate_index_tree_mismatch")
    fsck = _run(root, "fsck", "--full", "--strict", "--no-reflogs", TARGET_HEAD)
    if fsck:
        raise ResealError("candidate_fsck_output_nonempty")

def _validate_output(output: Path) -> Path:
    if not output.is_absolute():
        raise ResealError("output_must_be_absolute")
    parent = output.parent.resolve(strict=True)
    allowed = ALLOWED_OUTPUT_ROOT.resolve(strict=True)
    if parent != allowed and allowed not in parent.parents:
        raise ResealError("output_outside_downloads")
    if output.exists() or output.is_symlink():
        raise ResealError("output_already_exists")
    return output

def build(output: Path) -> None:
    verify_source()
    output = _validate_output(output)
    output.mkdir(mode=0o700)
    try:
        subprocess.run(
            ["/usr/bin/git", "init", "--quiet", os.fspath(output)],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=_env(), timeout=30, check=True,
        )
        (output / ".git" / "config").write_text(CONFIG_TEXT, "utf-8")
        pack = subprocess.Popen(
            _git_args(ROOT, "pack-objects", "--stdout", "--revs"),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=_env(),
        )
        index = subprocess.Popen(
            _git_args(output, "index-pack", "--stdin"),
            stdin=pack.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=_env(),
        )
        assert pack.stdout is not None and pack.stdin is not None
        pack.stdout.close()
        pack.stdin.write((TARGET_HEAD + "\n").encode("ascii"))
        pack.stdin.close()
        index_out, index_err = index.communicate(timeout=180)
        pack_err = pack.stderr.read() if pack.stderr is not None else b""
        pack_rc = pack.wait(timeout=30)
        if pack_rc != 0 or index.returncode != 0 or pack_err or index_err:
            raise ResealError("pack_or_index_failed")
        if len(index_out) > 1024:
            raise ResealError("index_pack_output_unexpected")
        _run(output, "update-ref", "refs/heads/main", TARGET_HEAD)
        _run(output, "symbolic-ref", "HEAD", "refs/heads/main")
        _run(output, "reset", "--hard", TARGET_HEAD)
        (output / ".git" / "config").write_text(CONFIG_TEXT, "utf-8")
        verify_candidate(output)
    except BaseException:
        shutil.rmtree(output, ignore_errors=True)
        raise
    print(MARKER)
    print("status=FULL_HISTORY_RESEAL_CANDIDATE_GREEN")
    print("output=" + os.fspath(output))
    print("target_head=" + TARGET_HEAD)
    print("target_tree=" + TARGET_TREE)
    print("reachable_commits=" + str(EXPECTED_REACHABLE_COMMITS))
    print("source_repository_mutation=false")
    print("protected_filesystem_mutation=false")
    print("network=false")
    print("protected_replace_authorized=false")

def self_test() -> None:
    if len(TARGET_PARENTS) != 2 or any(HEX40.fullmatch(p) is None for p in TARGET_PARENTS):
        raise AssertionError("parent_constants_invalid")
    if CONFIG_TEXT.count("[core]") != 1:
        raise AssertionError("config_contract_invalid")
    with tempfile.TemporaryDirectory(prefix="void-v7-reseal-self-test-") as td:
        p = Path(td) / "candidate"
        p.mkdir()
        (p / ".git").mkdir()
        (p / ".git" / "objects").mkdir()
        (p / ".git" / "config").write_text(CONFIG_TEXT, "utf-8")
        _config_exact(p)
        (p / ".git" / "shallow").write_text(TARGET_HEAD + "\n", "ascii")
        if not any(x.name == "shallow" and x.exists() for x in _forbidden_metadata(p)):
            raise AssertionError("shallow_fixture_not_detected")
    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_target_commit_tree_parents_bound=true")
    print("complete_reachable_object_graph_required=true")
    print("closed_git_config_required=true")
    print("shallow_graft_alternate_commondir_rejected=true")
    print("output_restricted_to_downloads=true")
    print("protected_filesystem_mutation=false")
    print("network=false")

def plan() -> None:
    result = verify_source()
    print(MARKER)
    print("mode=plan")
    print("source_only=true")
    for key, value in result.items():
        if isinstance(value, tuple):
            print(key + "=" + ",".join(value))
        else:
            print(key + "=" + str(value))
    print("candidate_build_write_scope=/home/zoso/Downloads")
    print("protected_filesystem_mutation=false")
    print("network=false")
    print("protected_replace_authorized=false")

def main() -> int:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--build", action="store_true")
    ap.add_argument("--output", type=Path)
    ns = ap.parse_args()
    if ns.self_test:
        self_test(); return 0
    if ns.plan:
        plan(); return 0
    if ns.output is None:
        raise ResealError("output_required")
    build(ns.output)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ResealError, OSError, subprocess.SubprocessError, ValueError) as exc:
        print(MARKER); print("status=HOLD"); print("reason=" + re.sub(r"[^A-Za-z0-9_:./-]", "_", str(exc)[:500]))
        print("source_repository_mutation=false"); print("protected_filesystem_mutation=false"); print("network=false")
        print("protected_replace_authorized=false"); raise SystemExit(2)
