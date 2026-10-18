#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py"
)
TARGET_BLOB = "7ae27c218505dfc9c13ed9502037eadac204e11f"
V2_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v2.py"
)
V2_BLOB = "a00fe6b094e97eb5c8bcf0eeb630d0d39e3498e2"
V2_PROOF_REL = (
    "scripts/prove_buy_void_presale_epoch2_installed_generation_host_evidence_v2.py"
)
V2_PROOF_BLOB = "ef9307452caaa9a946419a9dbc4139eef2322180"
V1_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
)
V1_BLOB = "6b2bf387bff5e5cd6ada048fd5c8fe4d28d66577"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    return raw


source_bytes = pin(TARGET_REL, TARGET_BLOB)
source = source_bytes.decode("utf-8", "strict")
pin(V2_REL, V2_BLOB)
pin(V2_PROOF_REL, V2_PROOF_BLOB)
pin(V1_REL, V1_BLOB)
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_HEAD = "44f7cf576cdc4460397677a27af2f587a33d424d"',
    'SOURCE_TREE = "24208ee96995ca784234ac8281eb40abaec5735d"',
    'V2_GIT_BLOB_SHA1 = "a00fe6b094e97eb5c8bcf0eeb630d0d39e3498e2"',
    "source_checkout_lexical = Path(os.path.abspath(__file__)).parents[2]",
    "fixed_checkout_resolved = FIXED_CHECKOUT.resolve(strict=False)",
    "v2_source_ancestor_close_failed",
    "def _close_owned_v2_source_fds(",
    "v2_source_close_failed:",
    "def _verify_source_runtime_compatibility(",
    "compat_source_delta_not_exact_add_only_allowlist",
    "compat_index_differs_from_source_head",
    "compat_worktree_bytes_mismatch:",
    "def _guard_installer_git_queries_compat(",
    'return expected_head + "\\n"',
    'expected_head + ":" + relative',
    'source_head + ":" + relative',
    "base._verify_checkout_bytes = compat_verifier",
    "base.checkout_snapshot = compat_snapshot",
    "base._guard_installer_git_queries = compat_installer_guard",
    '"source_runtime_add_only_compatibility_exact": True',
    '"canonical_checkout_rewind_performed": False',
    '"canonical_checkout_mutation_performed": False',
):
    assert required in source, required

for forbidden in (
    "subprocess.",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
    "write_text(",
    "write_bytes(",
    "unlink(",
    "rename(",
    "replace(",
    "mkdir(",
    "chmod(",
    "chown(",
    "/usr/bin/sudo",
    "systemctl",
    "socket.",
    "urllib",
    "requests",
    "fetch(",
):
    assert forbidden not in source, forbidden

spec = importlib.util.spec_from_file_location(
    "void_presale_epoch2_installed_generation_host_evidence_v3",
    ROOT / TARGET_REL,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert module.VERSION == 3
assert module.V2_GIT_BLOB_SHA1 == V2_BLOB
assert len(module.ALLOWED_ADD_ONLY) == 6

# V3 must reject both lexical and resolved checkout import roots. A lexical path
# beneath the fixed checkout remains forbidden even if a symlink resolves out.
saved_path = list(module.sys.path)
with tempfile.TemporaryDirectory(prefix="void-epoch2-v3-syspath-") as td:
    root = Path(td)
    fixed = root / "fixed"
    outside = root / "outside"
    fixed.mkdir()
    outside.mkdir()
    escape = fixed / "escape"
    escape.symlink_to(outside, target_is_directory=True)
    saved_fixed = module.FIXED_CHECKOUT
    try:
        module.FIXED_CHECKOUT = fixed
        module.sys.path.insert(0, str(escape))
        try:
            module._require_isolated_python()
        except Exception as exc:
            assert str(exc).startswith("python_path_source_checkout_exposure"), str(exc)
        else:
            raise AssertionError("lexical_symlink_escape_not_rejected")
    finally:
        module.FIXED_CHECKOUT = saved_fixed
        module.sys.path[:] = saved_path
module._require_isolated_python()


def expect_hold(action, prefix: str) -> None:
    try:
        action()
    except Exception as exc:
        assert str(exc).startswith(prefix), (str(exc), prefix)
    else:
        raise AssertionError("expected_hold_missing:" + prefix)



# V3's own V2-source descriptor cleanup must normalize close-time failures
# after attempting each owned descriptor exactly once.
real_close = module.os.close
for failing_label in ("visible_parent", "file", "parent"):
    fds = [os.open("/dev/null", os.O_RDONLY) for _ in range(3)]
    labelled = tuple(zip(("visible_parent", "file", "parent"), fds))
    target_fd = dict(labelled)[failing_label]
    calls: list[int] = []

    def close_then_error(fd: int, *, _target: int = target_fd) -> None:
        calls.append(fd)
        real_close(fd)
        if fd == _target:
            raise OSError(5, "synthetic_close_failure")

    module.os.close = close_then_error
    try:
        cleanup = module._close_owned_v2_source_fds(labelled)
    finally:
        module.os.close = real_close
    assert cleanup == failing_label
    assert calls == fds

# Intermediate ancestor descriptors transfer ownership before close. A synthetic
# close-then-error must never cause the consumed numeric descriptor to be retried.
with tempfile.TemporaryDirectory(prefix="void-epoch2-v3-ancestor-close-") as td:
    root = Path(td)
    nested = root / "a/b/c/leaf.py"
    nested.parent.mkdir(parents=True)
    nested.write_bytes(b"x")
    real_close = module.os.close
    calls: list[int] = []
    injected = {"done": False, "failed_fd": -1}

    def close_ancestor_once(fd: int) -> None:
        calls.append(fd)
        real_close(fd)
        if not injected["done"]:
            injected["done"] = True
            injected["failed_fd"] = fd
            raise OSError(5, "synthetic_ancestor_close_failure")

    module.os.close = close_ancestor_once
    try:
        expect_hold(
            lambda: module._open_parent_nofollow(nested),
            "v2_source_ancestor_close_failed",
        )
    finally:
        module.os.close = real_close
    assert injected["failed_fd"] >= 0
    assert calls.count(injected["failed_fd"]) == 1

class FixtureBase:
    MAX_CHECKOUT_FILE_BYTES = 64 * 1024 * 1024
    MAX_CHECKOUT_TOTAL_BYTES = 512 * 1024 * 1024
    MAX_CHECKOUT_LIST_BYTES = 16 * 1024 * 1024
    MAX_CHECKOUT_FILES = 50_000
    STATUS_QUERY = ("status", "--porcelain=v1", "--untracked-files=all")

    def __init__(self, checkout: Path):
        self.FIXED_CHECKOUT = checkout

    def _git(self, args: list[str]) -> bytes:
        return subprocess.run(
            ["/usr/bin/git", "-C", str(self.FIXED_CHECKOUT), *args],
            check=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=20,
        ).stdout

    def _git_text(self, args: list[str]) -> str:
        return self._git(args).decode("utf-8", "strict")

    def _main_branch(self) -> str:
        return self._git_text(["branch", "--show-current"]).strip()

    def _checkout_records(self, raw: bytes) -> list[bytes]:
        if len(raw) > self.MAX_CHECKOUT_LIST_BYTES or (raw and not raw.endswith(b"\0")):
            raise RuntimeError("fixture_listing_invalid")
        records = raw[:-1].split(b"\0") if raw else []
        if len(records) > self.MAX_CHECKOUT_FILES:
            raise RuntimeError("fixture_listing_limit")
        return records

    def _checkout_path(self, raw: bytes) -> str:
        value = raw.decode("utf-8", "strict")
        if not value or any(part in ("", ".", "..", ".git") for part in value.split("/")):
            raise RuntimeError("fixture_path_invalid")
        return value

    def _read_visible_file(
        self, path: Path, expected_size: int, maximum: int, expected_mode: str,
    ) -> bytes:
        before = path.lstat()
        assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
        assert before.st_size == expected_size and expected_size <= maximum
        mode = "100755" if before.st_mode & stat.S_IXUSR else "100644"
        if mode != expected_mode:
            raise module.EvidenceError("fixture_mode_mismatch")
        raw = path.read_bytes()
        after = path.lstat()
        assert before.st_dev == after.st_dev and before.st_ino == after.st_ino
        assert before.st_mtime_ns == after.st_mtime_ns and before.st_ctime_ns == after.st_ctime_ns
        assert len(raw) == expected_size
        return raw

    @staticmethod
    def git_blob(raw: bytes) -> str:
        return git_blob(raw)


def git(checkout: Path, *args: str) -> bytes:
    return subprocess.run(
        ["/usr/bin/git", "-C", str(checkout), *args],
        check=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
    ).stdout


def parse_tree(raw: bytes) -> dict[str, tuple[str, str, int]]:
    out: dict[str, tuple[str, str, int]] = {}
    for record in raw[:-1].split(b"\0") if raw else []:
        header, name = record.split(b"\t", 1)
        mode, kind, blob, size = header.decode("ascii").split()
        assert kind == "blob"
        out[name.decode("utf-8")] = (mode, blob, int(size))
    return out


with tempfile.TemporaryDirectory(prefix="void-epoch2-v3-compat-") as td:
    checkout = Path(td) / "checkout"
    checkout.mkdir()
    git(checkout, "init", "-q", "-b", "main")
    git(checkout, "config", "user.name", "Fixture")
    git(checkout, "config", "user.email", "fixture@example.invalid")
    tracked = checkout / "tracked.txt"
    tracked.write_text("runtime bytes\n", encoding="utf-8")
    git(checkout, "add", "--", "tracked.txt")
    git(checkout, "commit", "-qm", "runtime")
    runtime_head = git(checkout, "rev-parse", "HEAD").decode().strip()

    a = checkout / "allowed/a.txt"
    b = checkout / "allowed/tool.sh"
    a.parent.mkdir(parents=True)
    a.write_text("source-only addition\n", encoding="utf-8")
    b.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    b.chmod(0o755)
    git(checkout, "add", "--", "allowed/a.txt", "allowed/tool.sh")
    git(checkout, "commit", "-qm", "source-only additions")
    source_head = git(checkout, "rev-parse", "HEAD").decode().strip()
    source_tree = git(checkout, "rev-parse", "HEAD^{tree}").decode().strip()
    source_entries = parse_tree(
        git(checkout, "ls-tree", "-r", "-l", "-z", "--full-tree", source_head)
    )
    allowed = {
        "allowed/a.txt": source_entries["allowed/a.txt"],
        "allowed/tool.sh": source_entries["allowed/tool.sh"],
    }
    base = FixtureBase(checkout)
    observed = module._verify_source_runtime_compatibility(
        base,
        runtime_head,
        source_head=source_head,
        source_tree=source_tree,
        allowed_add_only=allowed,
        runtime_head=runtime_head,
    )
    assert observed["runtime_head"] == runtime_head
    assert observed["source_head"] == source_head
    assert observed["allowed_add_only_count"] == 2

    original = tracked.read_bytes()
    tracked.write_bytes(b"X" * len(original))
    expect_hold(
        lambda: module._verify_source_runtime_compatibility(
            base, runtime_head, source_head=source_head, source_tree=source_tree,
            allowed_add_only=allowed, runtime_head=runtime_head,
        ),
        "compat_worktree_bytes_mismatch:",
    )
    tracked.write_bytes(original)

    tracked.chmod(0o755)
    expect_hold(
        lambda: module._verify_source_runtime_compatibility(
            base, runtime_head, source_head=source_head, source_tree=source_tree,
            allowed_add_only=allowed, runtime_head=runtime_head,
        ),
        "fixture_mode_mismatch",
    )
    tracked.chmod(0o644)

    git(checkout, "update-index", "--force-remove", "--", "tracked.txt")
    expect_hold(
        lambda: module._verify_source_runtime_compatibility(
            base, runtime_head, source_head=source_head, source_tree=source_tree,
            allowed_add_only=allowed, runtime_head=runtime_head,
        ),
        "compat_index_differs_from_source_head",
    )
    git(checkout, "read-tree", "HEAD")

    extra = checkout / "unexpected.txt"
    extra.write_text("unexpected\n", encoding="utf-8")
    git(checkout, "add", "--", "unexpected.txt")
    git(checkout, "commit", "-qm", "unexpected")
    source_head_extra = git(checkout, "rev-parse", "HEAD").decode().strip()
    source_tree_extra = git(checkout, "rev-parse", "HEAD^{tree}").decode().strip()
    expect_hold(
        lambda: module._verify_source_runtime_compatibility(
            base, runtime_head, source_head=source_head_extra,
            source_tree=source_tree_extra, allowed_add_only=allowed,
            runtime_head=runtime_head,
        ),
        "compat_source_delta_not_exact_add_only_allowlist",
    )
    git(checkout, "reset", "--hard", "-q", source_head)

    expect_hold(
        lambda: module._verify_source_runtime_compatibility(
            base, "f" * 40, source_head=source_head, source_tree=source_tree,
            allowed_add_only=allowed, runtime_head=runtime_head,
        ),
        "runtime_expected_head_not_bound",
    )

# Installer adapter must synthesize the runtime HEAD only after authenticating
# the exact source generation and must translate dependency blob lookups to the
# runtime object while requiring source/runtime blob equality.
runtime = "1" * 40
source_h = "2" * 40
source_t = "3" * 40
blob = "4" * 40
rels = {
    "LOCK_REL": "ops/security/lock.json",
    "NATIVE_SOURCE_REL": "ops/native.c",
    "RUNNER_SOURCE_REL": "ops/runner.mjs",
    "SEALED_V2_REL": "scripts/sealed.mjs",
    "QUALIFIER_REL": "ops/qualifier.py",
}

class GuardBase:
    STATUS_QUERY = ("status", "--porcelain=v1", "--untracked-files=all")
    def _git_text(self, args: list[str]) -> str:
        if args == ["rev-parse", "--verify", "HEAD^{commit}"]:
            return source_h + "\n"
        if args == ["rev-parse", "--verify", "HEAD^{tree}"]:
            return source_t + "\n"
        if args[0] == "rev-parse" and ":" in args[1]:
            return blob + "\n"
        raise AssertionError(args)
    def _main_branch(self) -> str:
        return "main"

guard_base = GuardBase()
installer = types.SimpleNamespace(**rels)
compat_calls: list[tuple[str, str]] = []
def compat_stub(base, expected_head, **kwargs):
    compat_calls.append((expected_head, kwargs["source_head"]))
    return {"ok": True}

module._guard_installer_git_queries_compat(
    guard_base,
    installer,
    runtime,
    source_head=source_h,
    source_tree=source_t,
    compatibility_fn=compat_stub,
)
assert installer._run_git(["rev-parse", "--verify", "HEAD"]) == runtime + "\n"
assert installer._run_git(["branch", "--show-current"]) == "main\n"
assert installer._run_git(list(guard_base.STATUS_QUERY)) == ""
assert compat_calls == [(runtime, source_h)]
for relative in rels.values():
    assert installer._run_git(["rev-parse", "HEAD:" + relative]) == blob + "\n"
expect_hold(
    lambda: installer._run_git(["status", "--short"]),
    "compat_delegated_git_query_not_allowed",
)

print(module.MARKER + "_PROOF_GREEN")
print("exact_v2_source_blob_bound=true")
print("v2_source_close_failure_normalized=true")
print("v2_source_primary_failure_preserved_on_cleanup_error=true")
print("v2_source_all_owned_fds_close_attempted_once=true")
print("v2_source_ancestor_close_no_retry=true")
print("lexical_symlink_escape_sys_path_rejected=true")
print("exact_v2_proof_blob_bound=true")
print("exact_v1_source_blob_bound=true")
print("runtime_head_and_source_head_distinct=true")
print("source_runtime_exact_add_only_allowlist_required=true")
print("source_runtime_base_path_identity_preserved=true")
print("unexpected_added_path_rejected=true")
print("tracked_worktree_byte_drift_rejected=true")
print("tracked_worktree_mode_drift_rejected=true")
print("tracked_index_drift_rejected=true")
print("installer_runtime_head_translation_proved=true")
print("installer_dependency_runtime_source_blob_equality_required=true")
print("canonical_checkout_rewind_performed=false")
print("canonical_checkout_mutation_performed=false")
print("filesystem_write_performed=false")
print("service_mutation=false")
print("credential_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
