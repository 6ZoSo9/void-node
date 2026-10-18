#!/usr/bin/env python3
"""Exercise the V2 read boundary in disposable, ordinary Git repositories.

No configured helper is installed or executed.  No production plan/apply,
bootstrap, network, credential, or service operation is performed.
"""
from __future__ import annotations

import ast
import fcntl
import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py"
TARGET = ROOT / TARGET_REL
GIT = "/usr/bin/git"
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_INSTALLER_V2_GIT_PROOF_GREEN"
FROZEN = {
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py": "383b84e71b371de65579e4113469e86a59b807ab",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c": "19f9baf8d6d707da43dbd0e247667af1a10e46c5",
    "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json": "f8ff6fbb855aecafc329cd60622cf3af782745a3",
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py": "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
}


def blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise AssertionError(reason)


def snapshot(root: Path) -> dict[str, tuple]:
    result = {}
    for path in sorted(root.rglob("*")):
        metadata = path.lstat()
        name = str(path.relative_to(root))
        if stat.S_ISLNK(metadata.st_mode):
            value = ("link", os.readlink(path))
        elif stat.S_ISDIR(metadata.st_mode):
            value = ("dir",)
        elif stat.S_ISREG(metadata.st_mode):
            value = ("file", hashlib.sha256(path.read_bytes()).hexdigest())
        else:
            value = ("other",)
        result[name] = (stat.S_IMODE(metadata.st_mode), *value)
    return result


def setup_git(root: Path, *args: str) -> bytes:
    environment = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
        "LC_ALL": "C", "TZ": "UTC", "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1", "GIT_TERMINAL_PROMPT": "0",
        "GIT_ALLOW_PROTOCOL": "", "GIT_AUTHOR_NAME": "VOID fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "VOID fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
    }
    completed = subprocess.run(
        [GIT, "-C", str(root), "-c", "core.hooksPath=/dev/null",
         "-c", "core.fsmonitor=false", *args],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env=environment, timeout=20, check=False,
    )
    require(completed.returncode == 0, "fixture_git_failed:" + completed.stderr.decode("utf-8", "replace"))
    return completed.stdout


def expect_hold(module, function, reason: str) -> str:
    try:
        function()
    except module.InstallError as exc:
        return str(exc)
    raise AssertionError("missing_hold:" + reason)


def main() -> None:
    raw = TARGET.read_bytes()
    compile(raw, str(TARGET), "exec", dont_inherit=True)
    for relative, expected in FROZEN.items():
        require(blob((ROOT / relative).read_bytes()) == expected, "frozen_source_changed:" + relative)
    spec = importlib.util.spec_from_file_location("void_inner_v2_git_proof", TARGET)
    require(spec is not None and spec.loader is not None, "import_spec_missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    environment = module._git_env()
    for key, expected in {
        "GIT_ALLOW_PROTOCOL": "", "GIT_NO_LAZY_FETCH": "1",
        "GIT_OPTIONAL_LOCKS": "0", "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
    }.items():
        require(environment.get(key) == expected, "git_environment_guard_missing:" + key)
    source = raw.decode("utf-8")
    parsed = ast.parse(source)
    functions = {node.name: ast.get_source_segment(source, node) for node in parsed.body if isinstance(node, ast.FunctionDef)}
    require("status" not in functions["checkout_snapshot"], "status_conversion_path_retained")
    require("cat-file" in functions["_git_object"], "raw_object_operation_required")
    for guard in ("core.hooksPath=/dev/null", "core.fsmonitor=false", "core.excludesFile=/dev/null", "core.attributesFile=/dev/null"):
        require(guard in functions["_git"], "git_command_guard_missing:" + guard)

    with tempfile.TemporaryDirectory(prefix="void-inner-v2-git-proof-") as temporary:
        checkout = Path(temporary) / "checkout"
        checkout.mkdir()
        setup_git(checkout, "init", "--initial-branch=main")
        (checkout / ".gitignore").write_bytes(b"ignored/\n")
        payload = b"exact raw fixture source\n"
        (checkout / "tracked.txt").write_bytes(payload)
        (checkout / "nested").mkdir()
        (checkout / "nested" / "source.txt").write_bytes(b"nested raw source\n")
        (checkout / "executable.sh").write_bytes(b"#!/bin/sh\nexit 0\n")
        (checkout / "executable.sh").chmod(0o755)
        (checkout / "link").symlink_to("tracked.txt")
        setup_git(checkout, "add", "--", ".gitignore", "tracked.txt", "nested/source.txt", "executable.sh", "link")
        setup_git(checkout, "commit", "-m", "ordinary disposable fixture")
        head = setup_git(checkout, "rev-parse", "HEAD").decode("ascii").strip()
        module.FIXED_CHECKOUT = checkout

        before = snapshot(checkout)
        observed = module.checkout_snapshot(head)
        require(observed["head"] == head and observed["branch"] == "main" and observed["clean"] is True, "clean_fixture_rejected")
        require(snapshot(checkout) == before, "clean_snapshot_mutated_repository")
        object_raw = module._git_object(head, "tracked.txt", expected_blob=blob(payload), expected_bytes=len(payload), expected_sha256=hashlib.sha256(payload).hexdigest())
        require(object_raw == payload, "raw_object_changed")
        require(snapshot(checkout) == before, "object_read_mutated_repository")
        expect_hold(module, lambda: module.checkout_snapshot("A" * 40), "malformed_head")
        expect_hold(module, lambda: module.checkout_snapshot("1" * 40), "wrong_head")

        (checkout / "ignored").mkdir()
        (checkout / "ignored" / "ordinary.txt").write_bytes(b"ignored generated fixture\n")
        module.checkout_snapshot(head)
        (checkout / "unexpected.txt").write_bytes(b"untracked\n")
        expect_hold(module, lambda: module.checkout_snapshot(head), "untracked_file")
        (checkout / "unexpected.txt").unlink()

        (checkout / "tracked.txt").write_bytes(b"changed raw bytes\n")
        expect_hold(module, lambda: module.checkout_snapshot(head), "dirty_raw_content")
        setup_git(checkout, "add", "--", "tracked.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "staged_tree_mismatch")
        (checkout / "tracked.txt").write_bytes(payload)
        setup_git(checkout, "add", "--", "tracked.txt")

        setup_git(checkout, "update-index", "--assume-unchanged", "--", "tracked.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "assume_unchanged")
        setup_git(checkout, "update-index", "--no-assume-unchanged", "--", "tracked.txt")
        setup_git(checkout, "update-index", "--skip-worktree", "--", "tracked.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "skip_worktree")
        setup_git(checkout, "update-index", "--no-skip-worktree", "--", "tracked.txt")

        (checkout / "executable.sh").chmod(0o644)
        expect_hold(module, lambda: module.checkout_snapshot(head), "executable_mode_drift")
        (checkout / "executable.sh").chmod(0o755)
        (checkout / "link").unlink()
        (checkout / "link").symlink_to("ignored/ordinary.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "symlink_target_drift")
        (checkout / "link").unlink()
        (checkout / "link").symlink_to("tracked.txt")

        (checkout / "nested").rename(checkout / "ignored" / "nested")
        (checkout / "nested").symlink_to("ignored/nested", target_is_directory=True)
        expect_hold(module, lambda: module.checkout_snapshot(head), "symlink_parent")
        (checkout / "nested").unlink()
        (checkout / "ignored" / "nested").rename(checkout / "nested")
        module.checkout_snapshot(head)

        setup_git(checkout, "symbolic-ref", "HEAD", "refs/heads/other")
        setup_git(checkout, "update-ref", "refs/heads/other", head)
        expect_hold(module, lambda: module.checkout_snapshot(head), "non_main_branch")
        setup_git(checkout, "symbolic-ref", "HEAD", "refs/heads/main")

        (checkout / "unrelated.txt").write_bytes(b"unrelated fixture addition\n")
        setup_git(checkout, "add", "--", "unrelated.txt")
        setup_git(checkout, "commit", "-m", "unrelated source generation fixture")
        next_head = setup_git(checkout, "rev-parse", "HEAD").decode("ascii").strip()
        require(next_head != head, "alternate_head_not_distinct")
        module.checkout_snapshot(next_head)
        require(module._git_object(next_head, "tracked.txt", expected_blob=blob(payload)) == payload, "unchanged_dependency_rejected_at_new_head")
        expect_hold(module, lambda: module._git_object(next_head, "tracked.txt", expected_blob="0" * 40), "wrong_dependency_blob")

        missing = blob(payload)
        loose = checkout / ".git" / "objects" / missing[:2] / missing[2:]
        require(loose.is_file(), "fixture_loose_object_absent")
        loose.unlink()
        before_missing = snapshot(checkout)
        expect_hold(module, lambda: module._git_object(next_head, "tracked.txt", expected_blob=missing), "missing_object")
        require(snapshot(checkout) == before_missing, "missing_object_read_mutated_repository")

        # The inert mode must import successfully when launched exactly as a sealed
        # Python source descriptor.  This never calls plan(), apply(), or Git.
        source_fd = os.memfd_create("void-inner-v2-source-plan-proof", os.MFD_ALLOW_SEALING)
        try:
            position = 0
            while position < len(raw):
                count = os.write(source_fd, raw[position:])
                require(count > 0, "memfd_short_write")
                position += count
            seals = 0x0001 | 0x0002 | 0x0004 | 0x0008
            fcntl.fcntl(source_fd, getattr(fcntl, "F_ADD_SEALS", 1033), seals)
            run = subprocess.run(
                [sys.executable, "-I", "-B", "/proc/self/fd/" + str(source_fd), "--source-plan"],
                pass_fds=(source_fd,), stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=temporary,
                env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
                timeout=20, check=False,
            )
            require(run.returncode == 0, "sealed_source_plan_failed:" + run.stderr.decode("utf-8", "replace"))
            require(b"source_only=true\n" in run.stdout and b"host_write=false\n" in run.stdout, "sealed_source_plan_authority_changed")
        finally:
            os.close(source_fd)

    print(MARKER)
    for item in (
        "frozen_sources_unchanged", "git_transport_guards_present", "raw_tree_index_file_comparison",
        "clean_fixture_reads_do_not_mutate_repository", "missing_object_fails_without_repository_mutation",
        "dirty_staged_untracked_and_index_flags_rejected", "mode_and_symlink_drift_rejected",
        "distinct_main_heads_with_unchanged_dependency_accepted", "sealed_source_plan_import_green",
    ):
        print(item + "=true")
    for item in ("configured_helper_execution", "production_plan", "production_apply", "bootstrap_execution", "external_network", "credential_access", "service_mutation", "funds_movement"):
        print(item + "=false")


if __name__ == "__main__":
    main()
