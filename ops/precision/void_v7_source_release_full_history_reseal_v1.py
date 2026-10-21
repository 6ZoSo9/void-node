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
import pwd
import re
import shutil
import stat
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
ACCOUNT_HOME_ROOT = Path("/home")
EXTRA_RECEIPT_LINE_SEPARATORS = frozenset(("\u0085", "\u2028", "\u2029"))
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
        "-c", "pack.writeReverseIndex=false",
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
    source_git = ROOT / ".git"
    if not source_git.is_dir() or source_git.is_symlink():
        raise ResealError("source_git_dir_not_physical")
    source_objects = source_git / "objects"
    if not source_objects.is_dir() or source_objects.is_symlink():
        raise ResealError("source_objects_dir_invalid")
    for path in _forbidden_metadata(ROOT):
        if path.exists() or path.is_symlink():
            raise ResealError("source_forbidden_git_metadata:" + path.name)
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

def _receipt_safe_path(path: Path, label: str) -> str:
    raw = os.fspath(path)
    if any(
        ord(ch) < 0x20
        or ord(ch) == 0x7f
        or ch in EXTRA_RECEIPT_LINE_SEPARATORS
        for ch in raw
    ):
        raise ResealError(label + "_path_line_or_control_character")
    return raw

def _require_physical_user_directory(path: Path, label: str) -> Path:
    _receipt_safe_path(path, label)
    if not path.is_absolute() or Path(os.path.abspath(os.fspath(path))) != path:
        raise ResealError(label + "_directory_path_not_canonical")
    try:
        st = path.lstat()
        resolved = path.resolve(strict=True)
    except OSError as exc:
        raise ResealError(label + "_directory_unavailable") from exc
    if stat.S_ISLNK(st.st_mode):
        raise ResealError(label + "_directory_alias_forbidden")
    if not stat.S_ISDIR(st.st_mode):
        raise ResealError(label + "_directory_kind_invalid")
    if st.st_uid != os.getuid():
        raise ResealError(label + "_directory_owner_invalid")
    if resolved != path:
        raise ResealError(label + "_directory_alias_forbidden")
    return path

def _require_physical_account_home_root() -> Path:
    root = ACCOUNT_HOME_ROOT
    _receipt_safe_path(root, "account_home_root")
    try:
        st = root.lstat()
        resolved = root.resolve(strict=True)
    except OSError as exc:
        raise ResealError("account_home_root_unavailable") from exc
    if (
        stat.S_ISLNK(st.st_mode)
        or not stat.S_ISDIR(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or resolved != root
    ):
        raise ResealError("account_home_root_not_physical_root_custodied")
    return root

def _validate_account_home_location(home: Path, account_name: str) -> None:
    _receipt_safe_path(home, "account_home")
    if os.getuid() == 0:
        raise ResealError("root_account_forbidden")
    if home.parent != ACCOUNT_HOME_ROOT or home.name != account_name:
        raise ResealError("account_home_outside_allowed_user_root")

def _account_home() -> Path:
    try:
        entry = pwd.getpwuid(os.getuid())
    except KeyError as exc:
        raise ResealError("account_passwd_entry_unavailable") from exc
    home = Path(entry.pw_dir)
    _validate_account_home_location(home, entry.pw_name)
    _require_physical_account_home_root()
    return _require_physical_user_directory(home, "account_home")

def _configured_output_root() -> Path:
    root = _account_home() / "Downloads"
    _receipt_safe_path(root, "candidate_build_write_scope")
    return root

def _physical_output_root() -> Path:
    return _require_physical_user_directory(
        _configured_output_root(),
        "output_root",
    )

def _reject_source_checkout_overlap(path: Path) -> None:
    source_root = ROOT.resolve(strict=True)
    candidate = path.resolve(strict=False)
    if candidate == source_root or source_root in candidate.parents:
        raise ResealError("output_under_source_checkout")

def _validate_output(output: Path) -> Path:
    _receipt_safe_path(output, "output")
    if not output.is_absolute():
        raise ResealError("output_must_be_absolute")
    _reject_source_checkout_overlap(output)

    configured = _configured_output_root()
    lexical_parent = Path(os.path.abspath(os.fspath(output.parent)))
    if lexical_parent != configured and configured not in lexical_parent.parents:
        raise ResealError("output_outside_downloads")

    allowed = _physical_output_root()
    try:
        parent = output.parent.resolve(strict=True)
    except OSError as exc:
        raise ResealError("output_parent_unavailable") from exc
    if parent != output.parent:
        raise ResealError("output_parent_alias_forbidden")
    if parent != allowed and allowed not in parent.parents:
        raise ResealError("output_parent_escaped_downloads")

    current = parent
    while True:
        _require_physical_user_directory(current, "output_parent")
        if current == allowed:
            break
        if current == current.parent or allowed not in current.parents:
            raise ResealError("output_parent_escaped_downloads")
        current = current.parent

    if output.exists() or output.is_symlink():
        raise ResealError("output_already_exists")
    if output.resolve(strict=False) != output:
        raise ResealError("output_path_not_canonical")
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
        pack_dir = output / ".git" / "objects" / "pack"
        pack_prefix = pack_dir / "pack"
        pack_id_raw = _run(
            ROOT,
            "pack-objects",
            "--revs",
            os.fspath(pack_prefix),
            input_data=(TARGET_HEAD + "\n").encode("ascii"),
        )
        try:
            pack_id = pack_id_raw.decode("ascii", "strict").strip()
        except UnicodeDecodeError as exc:
            raise ResealError("pack_id_not_ascii") from exc
        if HEX40.fullmatch(pack_id) is None:
            raise ResealError("pack_id_invalid")
        pack_path = pack_dir / ("pack-" + pack_id + ".pack")
        index_path = pack_dir / ("pack-" + pack_id + ".idx")
        expected_entries = {pack_path.name, index_path.name}
        actual_entries = {entry.name for entry in pack_dir.iterdir()}
        if actual_entries != expected_entries:
            raise ResealError("pack_directory_layout_invalid")
        _run(output, "verify-pack", "-s", os.fspath(index_path))
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
    print("output=" + _receipt_safe_path(output, "output"))
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
    for separator in ("\n", "\r", "\x85", "\u2028", "\u2029"):
        try:
            _receipt_safe_path(
                Path("/tmp/bad" + separator + "status=FORGED"),
                "self_test",
            )
        except ResealError as exc:
            if str(exc) != "self_test_path_line_or_control_character":
                raise
        else:
            raise AssertionError("receipt_line_separator_fixture_not_rejected")
    with tempfile.TemporaryDirectory(prefix="void-v7-reseal-dir-self-test-") as td:
        physical = Path(td) / "physical"
        alias = Path(td) / "alias"
        physical.mkdir()
        alias.symlink_to(physical, target_is_directory=True)
        _require_physical_user_directory(physical, "self_test_physical")
        try:
            _require_physical_user_directory(alias, "self_test_alias")
        except ResealError as exc:
            if str(exc) != "self_test_alias_directory_alias_forbidden":
                raise
        else:
            raise AssertionError("physical_directory_alias_fixture_not_rejected")
    try:
        _validate_account_home_location(Path("/opt/void-service"), "void-service")
    except ResealError as exc:
        if str(exc) != "account_home_outside_allowed_user_root":
            raise
    else:
        raise AssertionError("protected_account_home_fixture_not_rejected")
    try:
        _reject_source_checkout_overlap(ROOT / ".git" / "reseal")
    except ResealError as exc:
        if str(exc) != "output_under_source_checkout":
            raise
    else:
        raise AssertionError("source_checkout_output_fixture_not_rejected")
    print(MARKER + "_SELF_TEST_GREEN")
    print("receipt_line_separators_rejected=true")
    print("passwd_account_home_required=true")
    print("account_home_directly_under_physical_home_root_required=true")
    print("protected_account_home_rejected=true")
    print("physical_downloads_root_required=true")
    print("output_parent_aliases_rejected=true")
    print("source_checkout_output_rejected=true")
    print("exact_target_commit_tree_parents_bound=true")
    print("complete_reachable_object_graph_required=true")
    print("single_process_pack_and_index_generation=true")
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
    print("candidate_build_write_scope=" + _receipt_safe_path(_configured_output_root(), "candidate_build_write_scope"))
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
