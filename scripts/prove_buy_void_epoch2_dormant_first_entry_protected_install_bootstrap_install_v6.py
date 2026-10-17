#!/usr/bin/env python3
from __future__ import annotations

import ast
import contextlib
import errno
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import shutil
import signal
import stat
import subprocess
import tempfile
import types

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v6.py"
TARGET_BLOB = "70dd0e0feaebbea08c63d8c19549f928c8d70b7a"

LOCK = ROOT / "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
LOCK_BLOB = "f5b03c6b81016edf21f605099e0ef8976f40e107"
MANIFEST = ROOT / "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MANIFEST_BLOB = "6e0630af72111bd9976dcc38cdcdada1904dd067"


def blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
source = target_raw.decode("utf-8")
assert blob(target_raw) == TARGET_BLOB
assert blob(LOCK.read_bytes()) == LOCK_BLOB
assert blob(MANIFEST.read_bytes()) == MANIFEST_BLOB

for required in (
    'MARKER = (',
    '"PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6"',
    '"PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"',
    'PLAN_PREFIX = "voidbuye2bootstrapinstall6_"',
    '"PROTECTED_BOOTSTRAP_V6_CREATE_ONLY"',
    'LOCK_GIT_BLOB_SHA1 = "f5b03c6b81016edf21f605099e0ef8976f40e107"',
    '"5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"',
    '"13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"',
    '"aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"',
    '"c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"',
    '"a91707c3e5803071fc73c3451c9bcb3b774f8b48"',
    '"python_sha256="',
    '"git_sha256="',
    '"source-generation-v3.conf"',
    'RENAME_NOREPLACE = 1',
    'class PublishedInstallError(InstallTerminalError):',
    '"published_needs_inspection" if published else "not_published"',
    '"stage_generation_changed_before_cleanup"',
    '"prepublication_cleanup_completed": str(cleanup_completed).lower()',
    '"bootstrap_execution_authorized": False',
    '"inner_installer_execution_authorized": False',
    '"credential_access_authorized": False',
    '"transaction_authorized": False',
    '"funds_movement_authorized": False',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
apply_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "apply"
]
assert len(apply_defs) == 1
apply_def = apply_defs[0]

rename_calls = [
    node for node in ast.walk(apply_def)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "_renameat2"
]
assert len(rename_calls) == 1
assert any(
    isinstance(arg, ast.Name) and arg.id == "RENAME_NOREPLACE"
    for arg in rename_calls[0].args
)

# No execution primitive for the bootstrap/inner installer may exist in apply.
apply_text = ast.get_source_segment(source, apply_def) or ""
for forbidden in ("execve(", "fexecve(", "systemctl", "subprocess.run("):
    assert forbidden not in apply_text, forbidden



def fresh_target():
    """Execute only the target bytes authenticated above, with no entrypoint."""
    value = types.ModuleType("outer_v6_terminal_fixture")
    value.__file__ = str(TARGET)
    exec(compile(target_raw, str(TARGET), "exec", dont_inherit=True), value.__dict__)
    return value


def identity(value):
    return (value.st_dev, value.st_ino, value.st_mode, value.st_uid, value.st_gid)


class ModuleProxy:
    def __init__(self, original, **overrides):
        self._original = original
        self.__dict__.update(overrides)

    def __getattr__(self, name):
        return getattr(self._original, name)


class TerminalFixture:
    """Real bounded filesystem operations; synthetic admission and inert bytes."""

    def __init__(self, case):
        self.case = case
        self.root = pathlib.Path(tempfile.mkdtemp(prefix="void-e2-outer-v6-terminal-"))
        self.root_identity = identity(self.root.lstat())
        self.parent = self.root / "opt"
        self.parent.mkdir(mode=0o755)
        self.inputs = self.root / "inputs"
        self.inputs.mkdir(mode=0o700)
        self.module = fresh_target()
        self.module.INSTALL_PARENT = self.parent
        self.module.INSTALL_NAME = "bootstrap-root"
        self.module.INSTALL_ROOT = self.parent / self.module.INSTALL_NAME
        self.module.STAGE_NAME = ".bootstrap-root.stage"
        self.module.STAGE_ROOT = self.parent / self.module.STAGE_NAME
        self.bootstrap = self.inputs / "inert-bootstrap"
        self.manifest = self.inputs / "inert-manifest"
        self.bootstrap_raw = b"INERT OUTER TERMINAL FIXTURE - NEVER EXECUTED\n"
        self.manifest_raw = b"schema=inert-terminal-fixture\n"
        for path, raw, mode in (
            (self.bootstrap, self.bootstrap_raw, 0o555),
            (self.manifest, self.manifest_raw, 0o444),
        ):
            with path.open("xb") as stream:
                stream.write(raw)
            path.chmod(mode)
        self.module.BOOTSTRAP_BYTES = len(self.bootstrap_raw)
        self.module.BOOTSTRAP_SHA256 = hashlib.sha256(self.bootstrap_raw).hexdigest()
        self.module.BOOTSTRAP_GIT_BLOB_SHA1 = blob(self.bootstrap_raw)
        self.module.MANIFEST_BYTES = len(self.manifest_raw)
        self.module.MANIFEST_SHA256 = hashlib.sha256(self.manifest_raw).hexdigest()
        self.module.MANIFEST_GIT_BLOB_SHA1 = blob(self.manifest_raw)
        self.policy = self.module.build_policy(
            {"sha256": "1" * 64, "bytes": 123},
            {"sha256": "2" * 64, "bytes": 456},
        )
        self.expected_head = "1" * 40
        self.expected_plan = self.module.PLAN_PREFIX + "2" * 64
        self.owner = (os.getuid(), os.getgid())
        self.parent_fd = None
        self.parent_close_calls = 0
        self.parent_closed = False
        self.open_fds = set()
        self.published = False
        self.binding_calls = 0
        self.unhandled = None
        self.failure = None
        self.saved_stage = self.parent / "retained-original-stage"
        self.sentinel = b"fixture substitution must remain unchanged\n"
        self.rename_calls = 0
        self.cleanup_calls = 0
        self.reconciliation_calls = 0
        self.reconciliation_stat_failed = False
        self.fsync_failed = False
        self.close_failure = case in {
            "publication_success_parent_close_failure",
            "postpublication_verification_and_close_failure",
            "prepublication_failure_and_close_failure",
            "cleanup_failure_and_close_failure",
        }
        self.module.os = ModuleProxy(
            os, open=self.open, close=self.close, fchown=self.fchown,
            fsync=self.fsync, unlink=self.unlink, stat=self.stat, geteuid=lambda: 0,
        )
        # Admission is outside this component proof: no root impersonation is
        # applied to the real process, source reader, tools, or protected paths.
        self.module._require_secure_apply_context = lambda: None
        self.module.collect_plan = self.collect
        self.module._bindings_snapshot = self.bindings
        self.module._trusted_directory = self.trusted_directory
        actual_read = self.module._read_exact_path

        def read(path, **kwargs):
            self.within(path)
            current = path.lstat()
            assert (current.st_uid, current.st_gid) == self.owner
            kwargs["require_root_owner"] = False
            return actual_read(path, **kwargs)

        self.module._read_exact_path = read
        actual_rename = self.module._renameat2

        def rename(fd, old, new, flags):
            assert fd == self.parent_fd
            assert old == self.module.STAGE_NAME
            assert new == self.module.INSTALL_NAME
            assert flags == self.module.RENAME_NOREPLACE
            self.rename_calls += 1
            if self.case == "prepublication_interrupt_before_rename":
                signal.raise_signal(signal.SIGINT)
            if self.case == "rename_noreplace_existing_target":
                self.module.INSTALL_ROOT.mkdir(mode=0o755)
                (self.module.INSTALL_ROOT / "sentinel").write_bytes(self.sentinel)
            actual_rename(fd, old, new, flags)
            self.published = True
            if self.case == "handoff_unknown_after_interrupt":
                os.rename(self.module.INSTALL_ROOT, self.saved_stage)
                self.module.INSTALL_ROOT.mkdir(mode=0o755)
                (self.module.INSTALL_ROOT / "sentinel").write_bytes(self.sentinel)
            if self.case in {
                "postpublication_interrupt_after_rename",
                "handoff_unknown_after_interrupt",
                "handoff_reconciliation_io_failure",
            }:
                # A real Ctrl-C signal after the real scratch rename, before
                # the production caller has recorded publication success.
                signal.raise_signal(signal.SIGINT)

        self.module._renameat2 = rename
        actual_verify = self.module._verify_root_generation

        def verify(policy, manifest):
            actual_verify(policy, manifest)
            if self.case in {
                "postpublication_verification_failure",
                "postpublication_verification_and_close_failure",
            }:
                raise self.module.InstallError("fixture_postpublication_verification")

        self.module._verify_root_generation = verify
        actual_cleanup = self.module._cleanup_stage

        def cleanup(fd, expected):
            self.cleanup_calls += 1
            return actual_cleanup(fd, expected)

        self.module._cleanup_stage = cleanup
        actual_reconcile = self.module._publication_after_handoff

        def reconcile(fd, expected):
            self.reconciliation_calls += 1
            return actual_reconcile(fd, expected)

        self.module._publication_after_handoff = reconcile

        def forbidden(*args, **kwargs):
            raise AssertionError("component_fixture_reached_source_or_tool_execution")

        for name in ("_git", "_git_object", "accepted_lock",
                     "checkout_snapshot", "_tool_snapshot"):
            setattr(self.module, name, forbidden)
        self.module.subprocess = ModuleProxy(
            subprocess, run=forbidden, Popen=forbidden,
            call=forbidden, check_call=forbidden, check_output=forbidden,
        )

    def within(self, path):
        absolute = pathlib.Path(os.path.abspath(os.fspath(path)))
        assert absolute == self.root or self.root in absolute.parents
        return absolute

    def open(self, path, flags, *args, **kwargs):
        raw = os.fspath(path)
        if os.path.isabs(raw):
            self.within(raw)
        else:
            assert kwargs.get("dir_fd") in self.open_fds
            assert "/" not in raw and raw not in ("", ".", "..")
        fd = os.open(path, flags, *args, **kwargs)
        self.open_fds.add(fd)
        if pathlib.Path(raw) == self.parent:
            assert self.parent_fd is None
            self.parent_fd = fd
        return fd

    def close(self, fd):
        assert fd in self.open_fds, ("unexpected_or_repeated_close", fd)
        if fd == self.parent_fd:
            self.parent_close_calls += 1
            os.close(fd)
            self.open_fds.remove(fd)
            self.parent_closed = True
            if self.close_failure:
                # Linux may consume the descriptor despite an error. The
                # operation must preserve its receipt and must not retry it.
                raise OSError(errno.EIO, "fixture_parent_close")
            return
        os.close(fd)
        self.open_fds.remove(fd)

    def fchown(self, fd, uid, gid):
        assert fd in self.open_fds
        assert (uid, gid) == (0, 0)
        current = os.fstat(fd)
        assert (current.st_uid, current.st_gid) == self.owner
        # Only fixture ownership admission is simulated. Real mode, inode,
        # content, timestamps, creation, rename, fsync and deletion remain real.

    def fsync(self, fd):
        if self.case == "postpublication_parent_fsync_failure":
            if fd == self.parent_fd and self.published and not self.fsync_failed:
                self.fsync_failed = True
                raise OSError(errno.EIO, "fixture_parent_fsync")
        os.fsync(fd)

    def unlink(self, path, *args, **kwargs):
        if self.case == "cleanup_failure_and_close_failure":
            if self.cleanup_calls and path == self.module.MANIFEST_NAME:
                raise OSError(errno.EACCES, "fixture_cleanup_unlink")
        return os.unlink(path, *args, **kwargs)

    def stat(self, path, *args, **kwargs):
        if (
            self.case == "handoff_reconciliation_io_failure"
            and self.reconciliation_calls
            and path == self.module.INSTALL_NAME
            and kwargs.get("dir_fd") == self.parent_fd
        ):
            self.reconciliation_stat_failed = True
            raise OSError(errno.EIO, "fixture_reconciliation_stat")
        return os.stat(path, *args, **kwargs)

    def trusted_directory(self, path, exact_mode=None):
        path = self.within(path)
        current = path.lstat()
        assert stat.S_ISDIR(current.st_mode)
        assert not stat.S_ISLNK(current.st_mode)
        assert (current.st_uid, current.st_gid) == self.owner
        assert current.st_mode & 0o022 == 0
        if exact_mode is not None:
            assert stat.S_IMODE(current.st_mode) == exact_mode
        return current

    def collect(self, bootstrap, manifest, expected_head):
        assert (bootstrap, manifest) == (self.bootstrap, self.manifest)
        assert expected_head == self.expected_head
        return {
            "plan_id": self.expected_plan,
            "body": {"protected_state": self.module.READY_STATE,
                     **self.baseline_bindings()},
            "bootstrap_raw": self.bootstrap_raw,
            "manifest_raw": self.manifest_raw,
            "policy": self.policy,
        }

    def baseline_bindings(self):
        return {
            "checkout": {"head": self.expected_head, "fixture": "synthetic"},
            "lock_id": self.module.LOCK_ID,
            "python": {"sha256": "1" * 64, "bytes": 123},
            "git_tool": {"sha256": "2" * 64, "bytes": 456},
        }

    def bindings(self, expected_head):
        assert expected_head == self.expected_head
        self.binding_calls += 1
        if self.binding_calls == 1 and self.case in {
            "plan_python_binding_changed", "plan_git_binding_changed",
        }:
            result = self.baseline_bindings()
            key = "python" if self.case == "plan_python_binding_changed" else "git_tool"
            result[key]["sha256"] = "3" * 64
            return result
        if self.binding_calls == 2 and self.case in {
            "populated_stage_cleanup",
            "substituted_stage_refused",
            "unexpected_stage_entry_refused",
            "prepublication_failure_and_close_failure",
            "cleanup_failure_and_close_failure",
        }:
            if self.case == "substituted_stage_refused":
                os.rename(self.module.STAGE_ROOT, self.saved_stage)
                self.module.STAGE_ROOT.mkdir(mode=0o755)
                (self.module.STAGE_ROOT / "sentinel").write_bytes(self.sentinel)
            if self.case == "unexpected_stage_entry_refused":
                (self.module.STAGE_ROOT / "sentinel").write_bytes(self.sentinel)
            raise self.module.InstallError("fixture_prepublication_verification")
        return self.baseline_bindings()

    def invoke(self):
        def main():
            try:
                self.module.apply(
                    self.bootstrap, self.manifest, self.expected_head,
                    self.expected_plan, self.module.CONFIRM_TOKEN,
                )
            except BaseException as exc:
                self.failure = exc
                raise
            return 0

        self.module.main = main
        self.module.__name__ = "__main__"
        entrypoints = [
            node for node in ast.parse(source).body
            if isinstance(node, ast.If)
            and ast.get_source_segment(source, node.test) == '__name__ == "__main__"'
        ]
        assert len(entrypoints) == 1
        entrypoint = ast.Module(body=entrypoints, type_ignores=[])
        output = io.StringIO()
        errors = io.StringIO()
        code = None
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            try:
                # Exercise the actual authenticated production exception
                # entrypoint around the real apply implementation.
                exec(compile(entrypoint, str(TARGET), "exec"), self.module.__dict__)
            except SystemExit as exc:
                code = exc.code
            except BaseException as exc:
                self.unhandled = type(exc).__name__ + ":" + str(exc)
        assert errors.getvalue() == "", errors.getvalue()
        return code, output.getvalue().splitlines()

    def payload_intact(self, root):
        expected = {
            self.module.BIN_DIR + "/" + self.module.BOOTSTRAP_NAME:
                (self.bootstrap_raw, 0o555),
            self.module.MANIFEST_NAME: (self.manifest_raw, 0o444),
            self.module.POLICY_NAME: (self.policy, 0o444),
        }
        files = {
            str(p.relative_to(root)): p
            for p in root.rglob("*") if p.is_file()
        }
        assert set(files) == set(expected)
        for name, (raw, mode) in expected.items():
            assert files[name].read_bytes() == raw
            assert stat.S_IMODE(files[name].lstat().st_mode) == mode

    def dispose(self):
        for fd in tuple(self.open_fds):
            os.close(fd)
            self.open_fds.remove(fd)
        assert identity(self.root.lstat()) == self.root_identity
        shutil.rmtree(self.root)


def prove_terminal_cases():
    cases = (
        "plan_python_binding_changed",
        "plan_git_binding_changed",
        "populated_stage_cleanup",
        "substituted_stage_refused",
        "unexpected_stage_entry_refused",
        "rename_noreplace_existing_target",
        "prepublication_interrupt_before_rename",
        "postpublication_interrupt_after_rename",
        "handoff_unknown_after_interrupt",
        "handoff_reconciliation_io_failure",
        "postpublication_parent_fsync_failure",
        "postpublication_verification_failure",
        "publication_success_parent_close_failure",
        "postpublication_verification_and_close_failure",
        "prepublication_failure_and_close_failure",
        "cleanup_failure_and_close_failure",
        "publication_success",
    )
    failures = []
    for case in cases:
        fixture = TerminalFixture(case)
        try:
            code, lines = fixture.invoke()
            observed = {
                "returncode": code,
                "unhandled": fixture.unhandled,
                "stage_present": fixture.module.STAGE_ROOT.exists(),
                "target_present": fixture.module.INSTALL_ROOT.exists(),
                "parent_close_calls": fixture.parent_close_calls,
                "cleanup_calls": fixture.cleanup_calls,
            }
            if case in ("plan_python_binding_changed", "plan_git_binding_changed"):
                assert code == 2 and fixture.unhandled is None, observed
                assert "status=HOLD" in lines and "status=GREEN" not in lines
                assert "reason=authorized_plan_binding_changed_before_staging" in lines
                assert fixture.parent_fd is None and fixture.parent_close_calls == 0
                assert not fixture.open_fds and fixture.cleanup_calls == 0
                assert fixture.rename_calls == 0 and not fixture.published
                assert not fixture.module.STAGE_ROOT.exists()
                assert not fixture.module.INSTALL_ROOT.exists()
                print("terminal_case=" + case + ":GREEN")
                continue
            assert fixture.parent_close_calls == 1, observed
            assert fixture.parent_closed, observed
            assert not fixture.open_fds, observed
            if case == "publication_success":
                assert code == 0 and fixture.unhandled is None, observed
                fixture.payload_intact(fixture.module.INSTALL_ROOT)
                assert not fixture.module.STAGE_ROOT.exists(), observed
                for line in (
                    "status=GREEN", "publication=true",
                    "install_parent_close_completed=true",
                    "parent_fsync_completed=true",
                    "final_verification_completed=true",
                ):
                    assert line in lines, (line, observed)
            else:
                assert code == 2 and fixture.unhandled is None, observed
                assert "status=GREEN" not in lines
                assert "status=HOLD" in lines
                if case in {
                    "handoff_unknown_after_interrupt",
                    "handoff_reconciliation_io_failure",
                }:
                    assert fixture.reconciliation_calls == 1
                    assert fixture.cleanup_calls == 0
                    assert fixture.published
                    assert not fixture.module.STAGE_ROOT.exists()
                    assert "publication=unknown" in lines, observed
                    assert "publication_state=unknown_needs_inspection" in lines
                    assert "publication_reconciliation_attempted=true" in lines
                    assert "prepublication_cleanup_attempted=false" in lines
                    assert "prepublication_cleanup_completed=false" in lines
                    assert "original_failure_class=KeyboardInterrupt" in lines
                    assert "parent_fsync_completed=false" in lines
                    assert "final_verification_completed=false" in lines
                    assert "install_parent_close_completed=true" in lines
                    if case == "handoff_unknown_after_interrupt":
                        fixture.payload_intact(fixture.saved_stage)
                        assert (fixture.module.INSTALL_ROOT / "sentinel").read_bytes() == fixture.sentinel
                        assert "reconciliation_failure_class=none" in lines
                    else:
                        fixture.payload_intact(fixture.module.INSTALL_ROOT)
                        assert fixture.reconciliation_stat_failed
                        assert "reconciliation_failure_class=OSError" in lines
                        assert any("fixture_reconciliation_stat" in line for line in lines)
                    print("terminal_case=" + case + ":GREEN")
                    continue
                published = case.startswith("postpublication_") or case == (
                    "publication_success_parent_close_failure"
                )
                if published:
                    fixture.payload_intact(fixture.module.INSTALL_ROOT)
                    assert not fixture.module.STAGE_ROOT.exists(), observed
                    assert fixture.cleanup_calls == 0, observed
                    assert "publication=true" in lines, observed
                    assert "publication_state=published_needs_inspection" in lines
                    assert "post_publication_rollback=false" in lines
                else:
                    assert "publication=false" in lines, observed
                    if case == "substituted_stage_refused":
                        assert (fixture.module.STAGE_ROOT / "sentinel").read_bytes() == fixture.sentinel
                        fixture.payload_intact(fixture.saved_stage)
                        assert "prepublication_cleanup_completed=false" in lines
                        assert any("stage_generation_changed_before_cleanup" in line for line in lines)
                    elif case == "unexpected_stage_entry_refused":
                        assert (fixture.module.STAGE_ROOT / "sentinel").read_bytes() == fixture.sentinel
                        assert "prepublication_cleanup_completed=false" in lines
                        assert any("stage_cleanup_unexpected_entry" in line for line in lines)
                    elif case == "cleanup_failure_and_close_failure":
                        assert (fixture.module.STAGE_ROOT / fixture.module.MANIFEST_NAME).read_bytes() == fixture.manifest_raw
                        assert "prepublication_cleanup_completed=false" in lines
                        assert "cleanup_failure_class=PermissionError" in lines
                        assert "original_failure_reason=fixture_prepublication_verification" in lines
                    else:
                        # Physical absence is tested before receipt assertions:
                        # the old pre-write full-stat fence leaves this stage.
                        assert not fixture.module.STAGE_ROOT.exists(), observed
                        assert "prepublication_cleanup_completed=true" in lines
                    if case == "rename_noreplace_existing_target":
                        assert (fixture.module.INSTALL_ROOT / "sentinel").read_bytes() == fixture.sentinel
                    else:
                        assert not fixture.module.INSTALL_ROOT.exists(), observed
                close_completed = "false" if fixture.close_failure else "true"
                assert "install_parent_close_completed=" + close_completed in lines
                if fixture.close_failure:
                    assert "close_failure_class=OSError" in lines
                    assert any("fixture_parent_close" in line for line in lines)
                if case == "publication_success_parent_close_failure":
                    assert "original_failure_class=none" in lines
                    assert "parent_fsync_completed=true" in lines
                    assert "final_verification_completed=true" in lines
                if case == "postpublication_parent_fsync_failure":
                    assert "parent_fsync_completed=false" in lines
                    assert "final_verification_completed=false" in lines
                if case in (
                    "postpublication_verification_failure",
                    "postpublication_verification_and_close_failure",
                ):
                    assert "original_failure_reason=fixture_postpublication_verification" in lines
                    assert "parent_fsync_completed=true" in lines
                    assert "final_verification_completed=false" in lines
                if case == "prepublication_failure_and_close_failure":
                    assert "original_failure_reason=fixture_prepublication_verification" in lines
                if case in {
                    "prepublication_interrupt_before_rename",
                    "postpublication_interrupt_after_rename",
                }:
                    assert fixture.reconciliation_calls == 1
                    assert "publication_reconciliation_attempted=true" in lines
                    assert "original_failure_class=KeyboardInterrupt" in lines
                    assert "failure_phase=publication_handoff" in lines
                    assert "reconciliation_failure_class=none" in lines
                    assert "parent_fsync_completed=false" in lines
                    assert "final_verification_completed=false" in lines
            print("terminal_case=" + case + ":GREEN")
        except AssertionError as exc:
            failures.append({"case": case, "assertion": repr(exc),
                             "observed": locals().get("observed")})
            print("terminal_case=" + case + ":FAIL")
        finally:
            fixture.dispose()
    if failures:
        raise AssertionError("terminal_regressions:" + json.dumps(failures, sort_keys=True))
    print("terminal_fixture_cases=" + str(len(cases)))
    print("terminal_fixture_scope=synthetic_admission_inert_payload_private_paths")
    print("production_root_admission_proven=false")
    print("production_git_boundary_proven=false")
    print("production_payload_executed=false")
    print("populated_stage_cleanup_verified=true")
    print("substituted_stage_cleanup_refused=true")
    print("publication_close_failure_truth_preserved=true")
    print("original_and_close_failures_preserved=true")
    print("parent_close_attempted_once=true")
    print("authorized_plan_binding_precedes_staging=true")
    print("actual_pre_and_post_rename_sigint_reconciled=true")
    print("ambiguous_handoff_cleanup_refused=true")
    print("handoff_reconciliation_io_failure_preserved=true")


def prove_tool_alias_cases():
    """Read inert tool bytes; only fixture inode ownership/ancestry is admitted."""
    cases = (
        "regular_alias",
        "symlink_alias_0777",
        "alias_read_atime_change",
        "writable_regular_alias",
        "symlink_wrong_uid",
        "symlink_wrong_gid",
        "writable_target",
        "nonexecutable_target",
        "alias_rebound",
        "target_generation_changed",
    )
    failures = []
    for case in cases:
        with tempfile.TemporaryDirectory(prefix="void-e2-outer-v6-tool-") as td:
            root = pathlib.Path(td)
            root_binding = identity(root.lstat())
            target = root / "inert-tool"
            raw = b"INERT TOOL ALIAS FIXTURE - NEVER EXECUTED\n"
            target.write_bytes(raw)
            target.chmod(0o555)
            alias = root / "tool-alias"
            symlink = case not in ("regular_alias", "writable_regular_alias")
            if symlink:
                alias.symlink_to(target.name)
                assert stat.S_IMODE(alias.lstat().st_mode) == 0o777
            else:
                alias = target
            if case == "writable_regular_alias":
                target.chmod(0o775)
            if case == "writable_target":
                target.chmod(0o775)
            if case == "nonexecutable_target":
                target.chmod(0o444)
            if case == "alias_read_atime_change":
                current = alias.lstat()
                os.utime(alias, ns=(1, current.st_mtime_ns), follow_symlinks=False)

            module = fresh_target()
            owned = {
                (p.lstat().st_dev, p.lstat().st_ino)
                for p in (alias, target)
            }
            alias_inode = (alias.lstat().st_dev, alias.lstat().st_ino)
            open_fds = set()
            changed = False
            ancestry_calls = []

            def admitted(value):
                key = (value.st_dev, value.st_ino)
                if key not in owned:
                    return value
                # Only uid/gid are component admission. Every other real stat
                # field, including mode and both mutation timestamps, survives.
                assert (value.st_uid, value.st_gid) == (os.getuid(), os.getgid())
                fields = {
                    name: getattr(value, name)
                    for name in dir(value) if name.startswith("st_")
                }
                fields["st_uid"] = 0
                fields["st_gid"] = 0
                if key == alias_inode:
                    if case == "symlink_wrong_uid":
                        fields["st_uid"] = 12345
                    if case == "symlink_wrong_gid":
                        fields["st_gid"] = 12345
                return types.SimpleNamespace(**fields)

            class FixturePath(type(pathlib.Path())):
                def lstat(self):
                    return admitted(super().lstat())

            def ancestry(path):
                assert str(path) == str(target)
                assert identity(root.lstat()) == root_binding
                assert not root.is_symlink() and not target.is_symlink()
                ancestry_calls.append(str(path))

            def opened(path, flags, *args, **kwargs):
                assert str(path) == str(target) and not args and not kwargs
                assert flags == os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW
                fd = os.open(path, flags)
                open_fds.add(fd)
                return fd

            def close(fd):
                assert fd in open_fds
                os.close(fd)
                open_fds.remove(fd)

            def read(fd, count):
                nonlocal changed
                assert fd in open_fds
                result = os.read(fd, count)
                if result and not changed:
                    changed = True
                    if case == "alias_rebound":
                        alias.rename(root / "retained-alias")
                        alias.symlink_to(target.name)
                    elif case == "target_generation_changed":
                        target.chmod(0o755)
                        with target.open("r+b") as stream:
                            stream.write(b"X")
                        target.chmod(0o555)
                return result

            def forbidden(*args, **kwargs):
                raise AssertionError("tool_fixture_execution_or_unbounded_access")
            module.pathlib = ModuleProxy(pathlib, Path=FixturePath)
            module.os = ModuleProxy(
                os, open=opened, close=close, read=read,
                fstat=lambda fd: admitted(os.fstat(fd)),
            )
            module._root_ancestry = ancestry
            module.subprocess = ModuleProxy(
                subprocess, run=forbidden, Popen=forbidden, call=forbidden,
                check_call=forbidden, check_output=forbidden,
            )
            expected = {
                "writable_regular_alias": "tool_alias_invalid:",
                "symlink_wrong_uid": "tool_alias_invalid:",
                "symlink_wrong_gid": "tool_alias_invalid:",
                "writable_target": "tool_target_invalid:",
                "nonexecutable_target": "tool_target_invalid:",
                "alias_rebound": "tool_alias_changed:",
                "target_generation_changed": "tool_target_changed:",
            }.get(case)
            try:
                result = None
                error = None
                try:
                    result = module._tool_snapshot(FixturePath(alias), len(raw))
                except module.InstallError as exc:
                    error = str(exc)
                if expected is None:
                    assert error is None, error
                    assert result == {
                        "fixed": str(alias), "realpath": str(target),
                        "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
                        "uid": 0, "gid": 0, "mode": "0555",
                    }
                    assert ancestry_calls == [str(target)]
                else:
                    assert error and error.startswith(expected), (case, error)
                    assert result is None
                assert not open_fds
                assert identity(root.lstat()) == root_binding
                print("tool_alias_case=" + case + ":GREEN")
            except AssertionError as exc:
                failures.append({"case": case, "assertion": repr(exc)})
                print("tool_alias_case=" + case + ":FAIL")
            finally:
                for fd in tuple(open_fds):
                    os.close(fd)
                    open_fds.remove(fd)
                assert identity(root.lstat()) == root_binding
    if failures:
        raise AssertionError("tool_alias_regressions:" + json.dumps(failures, sort_keys=True))
    print("tool_alias_fixture_cases=" + str(len(cases)))
    print("tool_alias_fixture_scope=inert_bytes_inode_scoped_owner_and_ancestry_admission")
    print("root_owned_symlink_alias_0777_admitted=true")
    print("regular_alias_and_target_mode_checks_preserved=true")
    print("alias_and_target_generation_changes_refused=true")
    print("tool_alias_targets_executed=false")


spec = importlib.util.spec_from_file_location("v6_install", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def prove_tool_snapshot_alias_handling(module):
    import os as host_os
    import stat as host_stat
    from types import SimpleNamespace
    from unittest.mock import patch

    cases = []
    payload = b"fixture-python-executable\n"
    fixed = pathlib.Path("/fixture/python3")
    linked_target = pathlib.Path("/fixture/python3.12")
    retargeted_path = pathlib.Path("/fixture/python3.13")

    def metadata(mode, *, ino=30, uid=0, gid=0, size=None):
        return SimpleNamespace(
            st_mode=mode,
            st_dev=1,
            st_ino=ino,
            st_uid=uid,
            st_gid=gid,
            st_nlink=1,
            st_size=len(payload) if size is None else size,
            st_mtime_ns=100,
            st_ctime_ns=100,
        )

    def run_case(
        name, *, linked=False, alias_changes=None, target_changes=None,
        ancestor_changes=None, retarget=None, expected_error=None
    ):
        alias = metadata(
            host_stat.S_IFLNK | 0o777, ino=20, size=len("python3.12")
        ) if linked else metadata(host_stat.S_IFREG | 0o555)
        target = metadata(host_stat.S_IFREG | 0o555) if linked else alias
        for key, value in (alias_changes or {}).items():
            setattr(alias, key, value)
        for key, value in (target_changes or {}).items():
            setattr(target, key, value)
        root = metadata(host_stat.S_IFDIR | 0o755, ino=1, size=4096)
        ancestor = metadata(host_stat.S_IFDIR | 0o755, ino=2, size=4096)
        for key, value in (ancestor_changes or {}).items():
            setattr(ancestor, key, value)
        canonical = linked_target if linked else fixed
        visible = {"/": root, "/fixture": ancestor, str(fixed): alias}
        visible[str(canonical)] = target
        state = {"offset": 0, "opened": 0, "closed": 0, "retargeted": False}
        fixture_fd = 71

        def fake_lstat(path):
            path = str(path)
            assert path in visible, (name, "unexpected_metadata_path", path)
            return visible[path]

        def fake_realpath(path):
            if pathlib.Path(path) == fixed:
                if state["retargeted"] and retarget == "realpath":
                    return str(retargeted_path)
                return str(canonical)
            assert pathlib.Path(path) == canonical, (name, "unexpected_realpath", str(path))
            return str(canonical)

        def fake_open(path, flags):
            assert str(path) == str(canonical), (name, "unexpected_open", str(path))
            assert flags == (
                host_os.O_RDONLY | host_os.O_CLOEXEC | host_os.O_NOFOLLOW
            ), (name, "unexpected_open_flags", flags)
            state["opened"] += 1
            assert state["opened"] == 1, (name, "multiple_opens")
            return fixture_fd

        def fake_fstat(fd):
            assert fd == fixture_fd, (name, "unexpected_fstat_fd", fd)
            return target

        def fake_read(fd, count):
            assert fd == fixture_fd, (name, "unexpected_read_fd", fd)
            chunk = payload[state["offset"]:state["offset"] + count]
            state["offset"] += len(chunk)
            if chunk and retarget and not state["retargeted"]:
                state["retargeted"] = True
                if retarget == "alias_metadata":
                    visible[str(fixed)] = SimpleNamespace(
                        **{**vars(alias), "st_ino": alias.st_ino + 1}
                    )
            return chunk

        def fake_close(fd):
            assert fd == fixture_fd, (name, "unexpected_close_fd", fd)
            state["closed"] += 1

        # Replace this imported module's os namespace, not the process-wide os
        # module, so an unintended operation cannot fall through to a host path.
        fixture_os = SimpleNamespace(
            path=SimpleNamespace(realpath=fake_realpath),
            open=fake_open,
            fstat=fake_fstat,
            read=fake_read,
            close=fake_close,
            O_RDONLY=host_os.O_RDONLY,
            O_CLOEXEC=host_os.O_CLOEXEC,
            O_NOFOLLOW=host_os.O_NOFOLLOW,
        )
        with (
            patch.object(module, "os", fixture_os),
            patch.object(module.pathlib.Path, "lstat", fake_lstat),
        ):
            try:
                observed = module._tool_snapshot(fixed, 1024)
            except module.InstallError as exc:
                assert expected_error is not None, (
                    name, "unexpected_rejection", str(exc)
                )
                assert str(exc) == expected_error + ":" + str(
                    pathlib.Path("/fixture")
                    if expected_error == "trusted_directory_invalid"
                    else fixed
                ), (name, str(exc))
            else:
                assert expected_error is None, (name, "unexpected_acceptance")
                assert observed == {
                    "fixed": str(fixed),
                    "realpath": str(canonical),
                    "bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                    "uid": 0,
                    "gid": 0,
                    "mode": format(host_stat.S_IMODE(target.st_mode), "04o"),
                }, (name, observed)
                assert state["offset"] == len(payload), (name, "incomplete_hash")
        assert state["opened"] == state["closed"], (name, "descriptor_leak")
        if expected_error in {"tool_alias_invalid", "tool_target_invalid", "trusted_directory_invalid"}:
            assert state["opened"] == 0, (name, "rejection_after_open")
        else:
            assert state["opened"] == 1, (name, "snapshot_not_exercised")
        cases.append(name)

    run_case("root_regular_0555")
    run_case("root_regular_0755", alias_changes={"st_mode": host_stat.S_IFREG | 0o755})
    run_case("root_symlink_0777", linked=True)
    for linked in (False, True):
        for field in ("st_uid", "st_gid"):
            run_case(
                "untrusted_alias_" + str(linked) + "_" + field,
                linked=linked, alias_changes={field: 1000},
                expected_error="tool_alias_invalid",
            )
    for mode in (host_stat.S_IFDIR | 0o755, host_stat.S_IFIFO | 0o600):
        run_case(
            "wrong_alias_type_" + str(mode),
            alias_changes={"st_mode": mode}, expected_error="tool_alias_invalid",
        )
    for writable in (0o020, 0o002):
        run_case(
            "writable_regular_alias_" + str(writable),
            alias_changes={"st_mode": host_stat.S_IFREG | 0o755 | writable},
            expected_error="tool_alias_invalid",
        )
    for field in ("st_uid", "st_gid"):
        run_case(
            "untrusted_target_" + field, linked=True,
            target_changes={field: 1000}, expected_error="tool_target_invalid",
        )
    for mode in (
        host_stat.S_IFREG | 0o644,
        host_stat.S_IFREG | 0o775,
        host_stat.S_IFREG | 0o757,
        host_stat.S_IFLNK | 0o777,
    ):
        run_case(
            "invalid_target_mode_" + str(mode), linked=True,
            target_changes={"st_mode": mode}, expected_error="tool_target_invalid",
        )
    run_case(
        "writable_target_ancestry", linked=True,
        ancestor_changes={"st_mode": host_stat.S_IFDIR | 0o775},
        expected_error="trusted_directory_invalid",
    )
    for retarget in ("alias_metadata", "realpath"):
        run_case(
            "symlink_retarget_during_read_" + retarget, linked=True,
            retarget=retarget, expected_error="tool_alias_changed",
        )

    return len(cases)

tool_alias_cases = prove_tool_snapshot_alias_handling(module)

assert module.build_policy(
    {"sha256": "1" * 64, "bytes": 123},
    {"sha256": "2" * 64, "bytes": 456},
) == (
    "schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
    "python_sha256=" + "1" * 64 + "\n"
    "python_bytes=123\n"
    "git_sha256=" + "2" * 64 + "\n"
    "git_bytes=456\n"
).encode("ascii")

# Wrong confirmation must fail before collect_plan/candidate/host generation reads.
original_collect = module.collect_plan
def forbidden_collect(*args, **kwargs):
    raise AssertionError("collect_plan_reached_before_confirmation")
module.collect_plan = forbidden_collect
try:
    try:
        module.apply(
            pathlib.Path("/nonexistent/bootstrap"),
            pathlib.Path("/nonexistent/manifest"),
            "1" * 40,
            "voidbuye2bootstrapinstall6_" + "2" * 64,
            "WRONG_CONFIRM",
        )
    except module.InstallError as exc:
        assert str(exc) == "explicit_create_only_confirmation_required"
    else:
        raise AssertionError("wrong confirmation accepted")
finally:
    module.collect_plan = original_collect

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr
for marker in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6_SELF_TEST_GREEN",
    "accepted_bootstrap_v6_lock_bound=true",
    "accepted_bootstrap_v6_binary_bound=true",
    "source_generation_v3_manifest_bound=true",
    "python_and_git_host_policy_bound=true",
    "create_only_publication=true",
    "rename_noreplace_exercised=true",
    "post_publication_rollback=false",
    "bootstrap_execution=false",
    "inner_installer_execution=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert marker in self_test.stdout.splitlines(), marker

source_plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stderr
for marker in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "create_only=true",
    "rename_noreplace_required=true",
    "python_and_git_host_policy_required=true",
    "bootstrap_execution_authorized=false",
    "inner_installer_execution_authorized=false",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement_authorized=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

prove_terminal_cases()
prove_tool_alias_cases()


# Reviewed private-Git component fixtures follow completed terminal cases.
import contextlib
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
from types import SimpleNamespace
from unittest import mock
import zlib


FIXTURE_GIT = "/usr/bin/git"
MAX_FIXTURE_BYTES = 8 * 1024 * 1024
MAX_FIXTURE_ENTRIES = 2000
FILES = {
    ".gitattributes": b"*.txt -text\n",
    ".gitignore": b"ignored-output\n",
    "README.md": b"outer witness fixture\n",
    "early/first.txt": b"earlier exact raw bytes\n",
    "later/last.txt": b"later exact raw bytes\n",
    "name:colon.txt": b"literal colon pathname\n",
    "bin/executable": b"tracked executable-mode data; never executed\n",
}


def require(condition, label):
    if not condition:
        raise AssertionError(label)


def blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def git(repo, *args):
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_ATTR_NOSYSTEM": "1",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_AUTHOR_NAME": "Bounded fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "Bounded fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "2000-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE": "2000-01-01T00:00:00Z",
        "GIT_INDEX_VERSION": "2",
    }
    result = subprocess.run(
        [
            FIXTURE_GIT, "--no-pager", "--no-replace-objects",
            "-c", "core.hooksPath=/dev/null",
            "-c", "core.fsmonitor=false",
            "-c", "safe.directory=" + str(repo),
            "-C", str(repo), *args,
        ],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env=env, timeout=20, check=False,
    )
    require(result.returncode == 0, "fixture_git_failed:" + args[0])
    require(len(result.stdout) <= MAX_FIXTURE_BYTES, "fixture_git_output_oversize")
    return result.stdout


@contextlib.contextmanager
def repository(module):
    """Create the entire repository before invoking any reader under test."""
    with tempfile.TemporaryDirectory(prefix="void-c6-outer-cases-", dir="/tmp") as td:
        root = Path(td)
        repo = root / "checkout"
        template = root / "empty-template"
        repo.mkdir()
        template.mkdir()
        git(repo, "init", "--quiet", "--initial-branch=main",
            "--object-format=sha1", "--template=" + str(template))
        (repo / ".git/info").mkdir(exist_ok=True)
        (repo / ".git/objects/info").mkdir(exist_ok=True)
        for relative, raw in FILES.items():
            path = repo / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        (repo / "bin/executable").chmod(0o755)
        (repo / "tracked-link").symlink_to("README.md")
        git(repo, "add", "--", *FILES, "tracked-link")
        git(repo, "commit", "--quiet", "-m", "bounded fixture")
        head = git(repo, "rev-parse", "HEAD").decode("ascii").strip()
        with mock.patch.object(module, "FIXED_CHECKOUT", repo):
            yield repo, head


def record(st):
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_gid, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def census(root):
    """Observe bytes/identity/mtime/ctime; atime is deliberately not claimed."""
    result = {}
    total = 0
    todo = [(Path(root), "")]
    while todo:
        path, relative = todo.pop()
        st = path.lstat()
        require(len(result) < MAX_FIXTURE_ENTRIES, "fixture_census_entries_oversize")
        if stat.S_ISLNK(st.st_mode):
            payload = os.readlink(path)
        elif stat.S_ISREG(st.st_mode):
            total += st.st_size
            require(total <= MAX_FIXTURE_BYTES, "fixture_census_bytes_oversize")
            payload = hashlib.sha256(path.read_bytes()).hexdigest()
        elif stat.S_ISDIR(st.st_mode):
            payload = None
            for child in sorted(path.iterdir(), key=lambda value: value.name):
                todo.append((child, relative + "/" + child.name))
        else:
            payload = "special"
        result[relative] = (record(st), payload)
    return result


def hold(module, call, label):
    try:
        call()
    except module.InstallError as exc:
        return str(exc)
    raise AssertionError("expected_hold:" + label)


@contextlib.contextmanager
def observe_private(module):
    """Record reader-owned resources without changing their construction."""
    roots = set()
    owned_fds = set()
    original = module._RepositorySnapshot._run

    def observed(reader, *args, **kwargs):
        roots.add(str(reader.private))
        owned_fds.update(reader._fds)
        return original(reader, *args, **kwargs)

    with mock.patch.object(module._RepositorySnapshot, "_run", observed):
        yield roots, owned_fds
    for root in roots:
        require(not os.path.lexists(root), "private_metadata_not_removed")
    for fd in owned_fds:
        try:
            os.fstat(fd)
        except OSError as exc:
            require(exc.errno == errno.EBADF, "unexpected_private_fd_close_error")
        else:
            raise AssertionError("private_descriptor_not_closed")


def checkout(module, head):
    with module._RepositorySnapshot(head) as reader:
        result = reader.checkout()
        require(result["head"] == head and result["branch"] == "main",
                "checkout_result_identity_invalid")
        require(result["clean"] is True, "checkout_result_not_clean")
        require(result["git_boundary_policy"] == module.GIT_BOUNDARY_POLICY,
                "checkout_policy_missing")
        require("/tmp/" not in json.dumps(result) and "/proc/" not in json.dumps(result),
                "private_path_in_stable_checkout_identity")
        for relative in ("README.md", "name:colon.txt"):
            raw = FILES[relative]
            require(reader.blob(relative, expected_blob=blob(raw),
                                expected_bytes=len(raw),
                                expected_sha256=hashlib.sha256(raw).hexdigest()) == raw,
                    "pinned_source_blob_mismatch")
        return result


def prove_private_git_boundary(module):
    """No host fixed checkout, root-owner mock, native context, or namespaces."""
    positive = 0
    negative = 0
    reasons = {}
    with repository(module) as (repo, head):
        before = census(repo)
        with observe_private(module) as (roots, _):
            first = checkout(module, head)
            second = checkout(module, head)
        require(first == second, "private_temp_identity_changed_stable_result")
        require(len(roots) == 2, "standalone_views_not_independently_created")
        require(census(repo) == before, "ordinary_reader_changed_source")
        positive += 1

    with repository(module) as (repo, head):
        git(repo, "repack", "-ad")
        git(repo, "prune-packed")
        git(repo, "pack-refs", "--all", "--prune")
        require(not (repo / ".git/refs/heads/main").exists(), "refs_not_packed")
        require(bool(list((repo / ".git/objects/pack").glob("*.pack"))),
                "objects_not_packed")
        before = census(repo)
        with observe_private(module):
            checkout(module, head)
        require(census(repo) == before, "packed_reader_changed_source")
        positive += 1

    with repository(module) as (repo, _):
        # Commit the inert attributes before defining the nonexistent driver.
        (repo / ".gitattributes").write_bytes(b"*.txt -text filter=fixture\n")
        git(repo, "add", "--", ".gitattributes")
        git(repo, "commit", "--quiet", "-m", "inert attributes")
        head = git(repo, "rev-parse", "HEAD").decode("ascii").strip()
        missing = str(repo.parent / "nonexistent-configured-helper")
        require(not os.path.lexists(missing), "configured_helper_unexpectedly_exists")
        for key, value in (
            ("core.fsmonitor", missing), ("core.hooksPath", missing),
            ("filter.fixture.clean", missing), ("filter.fixture.process", missing),
            ("filter.fixture.required", "true"), ("include.path", missing),
        ):
            git(repo, "config", key, value)
        (repo / ".git/info/attributes").write_bytes(b"* filter=fixture\n")
        git(repo, "config", "core.repositoryFormatVersion", "99")
        before = census(repo)
        with observe_private(module):
            checkout(module, head)
        require(census(repo) == before, "inert_config_reader_changed_source")
        positive += 1

    def mutation_case(label, mutate, operation=None):
        nonlocal negative
        with repository(module) as (repo, head):
            mutate(repo, head)
            before = census(repo)
            with observe_private(module):
                reasons[label] = hold(
                    module,
                    lambda: operation(repo, head) if operation else checkout(module, head),
                    label,
                )
            require(census(repo) == before, "reader_changed_source:" + label)
        negative += 1

    def dirty_index(repo, _):
        (repo / "README.md").write_bytes(b"staged changed bytes\n")
        git(repo, "add", "--", "README.md")

    def assume(repo, _):
        git(repo, "update-index", "--assume-unchanged", "--", "README.md")
        (repo / "README.md").write_bytes(b"hidden by assume-unchanged\n")

    def skip(repo, _):
        git(repo, "update-index", "--skip-worktree", "--", "README.md")
        (repo / "README.md").write_bytes(b"hidden by skip-worktree\n")

    def split(repo, _):
        git(repo, "update-index", "--split-index")
        shared = list((repo / ".git").glob("sharedindex.*"))
        require(bool(shared), "split_index_not_created")
        for path in shared:
            os.utime(path, ns=(946684800000000000, 946684800000000000))

    def sparse(repo, _):
        git(repo, "sparse-checkout", "init", "--cone", "--sparse-index")
        git(repo, "sparse-checkout", "set", "early")

    def detached(repo, head):
        git(repo, "checkout", "--quiet", "--detach", head)

    def other_branch(repo, _):
        git(repo, "symbolic-ref", "HEAD", "refs/heads/other")

    def ref_drift(repo, _):
        (repo / ".git/refs/heads/main").write_text("f" * 40 + "\n")

    def pointer(repo, _):
        (repo / ".git").rename(repo / ".saved-git")
        (repo / ".git").write_text("gitdir: .saved-git\n")

    def symlink_git(repo, _):
        (repo / ".git").rename(repo / ".saved-git")
        (repo / ".git").symlink_to(".saved-git", target_is_directory=True)

    def wrong_symlink(repo, _):
        (repo / "tracked-link").unlink()
        (repo / "tracked-link").symlink_to("later/last.txt")

    cases = (
        ("raw_worktree", lambda p, h: (p / "README.md").write_bytes(b"changed\n")),
        ("raw_attributes", lambda p, h: (p / ".gitattributes").write_bytes(b"* -text\n")),
        ("staged", dirty_index),
        ("untracked", lambda p, h: (p / "untracked").write_bytes(b"unexpected\n")),
        ("assume_unchanged", assume),
        ("skip_worktree", skip),
        ("split_index", split),
        ("sparse_index", sparse),
        ("index_v4", lambda p, h: git(p, "update-index", "--index-version=4")),
        ("owner_executable", lambda p, h: (p / "bin/executable").chmod(0o655)),
        ("tracked_symlink", wrong_symlink),
        ("detached_head", detached),
        ("non_main_symbolic_head", other_branch),
        ("main_ref_drift", ref_drift),
        ("git_directory_pointer", pointer),
        ("git_directory_symlink", symlink_git),
        ("commondir", lambda p, h: (p / ".git/commondir").write_bytes(b".\n")),
        ("shallow", lambda p, h: (p / ".git/shallow").write_bytes(b"")),
        ("grafts", lambda p, h: (p / ".git/info/grafts").write_bytes(b"")),
        ("alternates", lambda p, h: (p / ".git/objects/info/alternates").write_bytes(b"/nonexistent\n")),
        ("http_alternates", lambda p, h: (p / ".git/objects/info/http-alternates").write_bytes(b"")),
        ("reftable", lambda p, h: (p / ".git/reftable").mkdir()),
    )
    for label, mutate in cases:
        mutation_case(label, mutate)
    mutation_case("wrong_expected_head", lambda p, h: None,
                  lambda p, h: checkout(module, "f" * 40))

    def corrupt_tree(repo, head):
        oid = git(repo, "rev-parse", head + ":early").decode("ascii").strip()
        raw = git(repo, "cat-file", "tree", oid)
        member = b"first.txt\0" + bytes.fromhex(blob(FILES["early/first.txt"]))
        replacement = FILES["later/last.txt"]
        require(raw.count(member) == 1, "raw_tree_fixture_member_missing")
        changed = raw.replace(member, b"first.txt\0" + bytes.fromhex(blob(replacement)))
        (repo / "early/first.txt").write_bytes(replacement)
        git(repo, "add", "--", "early/first.txt")
        object_path = repo / ".git/objects" / oid[:2] / oid[2:]
        object_path.chmod(0o600)
        object_path.write_bytes(zlib.compress(b"tree " + str(len(changed)).encode() + b"\0" + changed))
        require(hashlib.sha1(b"tree " + str(len(changed)).encode() + b"\0" + changed).hexdigest() != oid,
                "corrupt_tree_hash_unchanged")

    mutation_case("raw_nested_tree_authentication", corrupt_tree)

    def read_blob(repo, head, relative="README.md", expected=None):
        with module._RepositorySnapshot(head) as reader:
            reader.checkout()
            return reader.blob(relative, expected_blob=expected or blob(FILES["README.md"]))

    def missing_blob(repo, _):
        oid = blob(FILES["README.md"])
        (repo / ".git/objects" / oid[:2] / oid[2:]).unlink()

    mutation_case("missing_pinned_blob", missing_blob, read_blob)
    mutation_case("wrong_tree_path_membership", lambda p, h: None,
                  lambda p, h: read_blob(p, h, "early/first.txt"))

    with repository(module) as (repo, head):
        before_git = census(repo / ".git")
        original = module._RepositorySnapshot._worktree_file
        changed = []

        def drift(reader, relative, *args, **kwargs):
            result = original(reader, relative, *args, **kwargs)
            if relative == b"early/first.txt" and not changed:
                (repo / "early/first.txt").write_bytes(b"injected after real earlier read\n")
                changed.append(relative)
            return result

        with observe_private(module), mock.patch.object(module._RepositorySnapshot, "_worktree_file", drift):
            hold(module, lambda: checkout(module, head), "earlier_file_final_fence")
        require(changed == [b"early/first.txt"], "earlier_file_drift_not_exercised")
        require(census(repo / ".git") == before_git, "drift_reader_changed_git")
        negative += 1

    with repository(module) as (repo, head):
        before_git = census(repo / ".git")

        def later_component_drift():
            with module._RepositorySnapshot(head) as reader:
                first = reader.checkout()
                reader.blob("README.md", expected_blob=blob(FILES["README.md"]))
                second = reader.checkout()
                require(first == second, "reused_witness_stable_identity_changed")
                # Represents a later component, after the final source read.
                (repo / "early/first.txt").write_bytes(b"later component injected drift\n")

        with observe_private(module):
            hold(module, later_component_drift, "witness_lifetime_after_later_component")
        require(census(repo / ".git") == before_git, "later_drift_reader_changed_git")
        negative += 1

    return {
        "ordinary_real_git_positive_cases": positive,
        "ordinary_real_git_rejection_cases": negative,
        "only_checkout_location_rebound_for_repository_cases": True,
        "root_tool_admission_simulated_for_repository_cases": False,
        "native_parent_authority_simulated": False,
        "configured_helper_created_or_executed": False,
        "source_bytes_identity_mtime_ctime_preserved": True,
        "private_metadata_and_descriptors_cleanup_checked": True,
        "raw_tree_and_final_earlier_file_fence_exercised": True,
        "source_components_after_checkout_remain_inside_fence": True,
        "temporary_identity_excluded_from_checkout_result": True,
        "production_fixed_checkout_access": False,
        "namespace_execution": False,
    }


def changed_stat(value, **changes):
    fields = {
        key: getattr(value, key)
        for key in ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
                    "st_size", "st_mtime_ns", "st_ctime_ns")
    }
    fields.update(changes)
    return SimpleNamespace(**fields)


def prove_tool_admission(module):
    """Real valid admission, followed by explicit metadata/FD simulations."""
    python = module.FIXED_PYTHON
    alias_is_symlink = stat.S_ISLNK(python.lstat().st_mode)
    python_snapshot = module._tool_snapshot(python, module.MAX_PYTHON_BYTES)
    require(python_snapshot["uid"] == 0 and python_snapshot["gid"] == 0,
            "real_python_tool_not_root_custodied")
    real_lstat = Path.lstat
    metadata_cases = 0
    for label, change in (
        ("alias_owner", {"st_uid": 1000}),
        ("alias_group", {"st_gid": 1000}),
    ):
        def invalid(path, *args, **kwargs):
            current = real_lstat(path, *args, **kwargs)
            if path == module.FIXED_GIT:
                return changed_stat(current, **change)
            return current

        with mock.patch.object(Path, "lstat", invalid):
            hold(module, lambda: module._tool_snapshot(module.FIXED_GIT, module.MAX_GIT_BYTES), label)
        metadata_cases += 1

    with repository(module) as (_, head):
        with observe_private(module):
            with module._RepositorySnapshot(head) as reader:
                execution_fd = reader._git_execution_fd
                state = os.fstat(execution_fd)
                seals = fcntl.fcntl(execution_fd, getattr(fcntl, "F_GET_SEALS", 1034))
                require(stat.S_ISREG(state.st_mode) and stat.S_IMODE(state.st_mode) == 0o500,
                        "actual_sealed_git_metadata_invalid")
                require(seals & 0xF == 0xF, "actual_git_missing_required_seals")
                require(state.st_uid == os.geteuid(), "actual_memfd_not_owned_by_caller")
                before = reader.checkout()
                # This replacement is never executed. It targets only our
                # reader-owned FD and tests the mandatory revalidation seam.
                replacement = os.memfd_create("void-c6-unsealed-fixture",
                                               os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
                saved = os.dup(execution_fd)
                try:
                    os.write(replacement, b"inert descriptor substitution\n")
                    os.fchmod(replacement, 0o500)
                    os.dup2(replacement, execution_fd, inheritable=False)
                    hold(module, reader._check_git_execution, "unsealed_execution_fd_substitution")
                finally:
                    os.dup2(saved, execution_fd, inheritable=False)
                    os.close(saved)
                    os.close(replacement)
                reader._check_git_execution()
                require(reader.checkout() == before, "restored_git_generation_not_stable")

    return {
        "real_root_custodied_python_alias_admission": True,
        "real_python_symlink_alias_observed": alias_is_symlink,
        "real_sealed_git_execution_descriptor_admitted": True,
        "metadata_fault_injection_cases": metadata_cases,
        "reader_owned_unsealed_descriptor_substitution_rejected": True,
        "tool_metadata_fault_cases_are_simulated": True,
        "native_parent_authority_simulated": False,
        "substituted_descriptor_executed": False,
        "production_tool_path_mutation": False,
    }


def prove_private_cleanup_failure(module):
    """Inject one cleanup failure; remove only the retained owned temp object."""
    cleanup_failure_before = getattr(module, "_GIT_PRIVATE_CLEANUP_FAILED", False)
    temporary = None
    original_cleanup = None
    private_path = None
    try:
        with repository(module) as (_, head):
            def attempted():
                nonlocal temporary, original_cleanup, private_path
                with module._RepositorySnapshot(head) as reader:
                    reader.checkout()
                    temporary = reader._temporary
                    original_cleanup = temporary.cleanup
                    private_path = Path(temporary.name)

                    def failure():
                        raise OSError("inert fixture private cleanup failure")

                    temporary.cleanup = failure

            hold(module, attempted, "private_cleanup_failure")
            require(module._GIT_PRIVATE_CLEANUP_FAILED is True, "cleanup_failure_receipt_state_missing")
    finally:
        if original_cleanup is not None:
            temporary.cleanup = original_cleanup
            original_cleanup()
        if private_path is not None:
            require(not os.path.lexists(private_path), "fixture_owned_private_cleanup_incomplete")
        module._GIT_PRIVATE_CLEANUP_FAILED = cleanup_failure_before
    return {
        "private_cleanup_failure_is_explicit_injection": True,
        "private_cleanup_failure_holds": True,
        "private_cleanup_failure_state_preserved_until_receipt": True,
        "fixture_removed_only_its_retained_private_temporary": True,
    }


git_component_target = fresh_target()
git_case_results = {}
for group, operation in (
    ("repository", prove_private_git_boundary),
    ("tool", prove_tool_admission),
    ("cleanup", prove_private_cleanup_failure),
):
    for key, value in operation(git_component_target).items():
        receipt_key = "git_component_" + key
        assert receipt_key not in git_case_results or git_case_results[receipt_key] == value
        git_case_results[receipt_key] = value
for key, value in sorted(git_case_results.items()):
    print(key + "=" + (str(value).lower() if isinstance(value, bool) else str(value)))
assert git_component_target.git_boundary_receipt()["temporary_git_metadata_cleanup_completed"] is True

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6_PROOF_GREEN")
print("target_blob_bound=true")
print("accepted_bootstrap_v6_lock_bound=true")
print("source_generation_v3_manifest_bound=true")
print("accepted_bootstrap_v6_binary_bound=true")
print("python_and_git_host_policy_bound=true")
print("tool_alias_regression_cases=" + str(tool_alias_cases))
print("root_owned_python_symlink_accepted=true")
print("unsafe_tool_aliases_and_targets_rejected=true")
print("tool_alias_generation_drift_rejected=true")
print("wrong_confirmation_precedes_host_reads=true")
print("single_rename_noreplace_publication=true")
print("generation_bound_stage_cleanup_required=true")
print("prepublication_cleanup_failure_fail_closed=true")
print("post_publication_failure_truth_monotonic=true")
print("post_publication_rollback=false")
print("bootstrap_execution=false")
print("inner_installer_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
print("production_filesystem_mutation=false")
print("fixture_filesystem_mutation=true")
print("native_parent_authority_claimed=false")
print("private_git_boundary_proven=true")
