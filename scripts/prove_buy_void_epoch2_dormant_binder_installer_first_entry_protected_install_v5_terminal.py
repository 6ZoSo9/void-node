#!/usr/bin/env python3
"""Exercise V5 terminal state and generation fences in disposable filesystem fixtures."""
from __future__ import annotations

import contextlib
import hashlib
import io
import os
from pathlib import Path
import shutil
import stat
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_"
)
V1 = ROOT / (REL + "v1.py")
V2 = ROOT / (REL + "v2.py")
V5 = ROOT / (REL + "v5.py")
V5_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"
V2_BLOB = "69a018c0eccedf3782055c56725579d02463b05e"
V1_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"
MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "PROTECTED_INSTALL_V5_TERMINAL_PROOF_GREEN"
)
FROZEN = {
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py":
        (95062, "242eac04da6e17d32e9a9baa9b57f572cabda7a8"),
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c":
        (60997, "c7d2125b59dcbecc1d6aae8818e84cac8ce85da9"),
    "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf":
        (2380, "a484a7d2e1159ebbef3357ec849af92d7f12cff1"),
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py":
        (127102, "88577de29dddbe61d2c2f59179d0dcb62a49165a"),
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c":
        (106764, "81fc960f1cec597b01875ed944b25e5b6574d34d"),
    "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf":
        (2382, "782f747cda24a214c64e8ec3f49b6791bbb62f97"),
}


def load(path: Path) -> types.ModuleType:
    module = types.ModuleType("fixture_" + path.stem)
    module.__file__ = str(path)
    exec(compile(path.read_bytes(), str(path), "exec"), module.__dict__)
    return module


def blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def root_owned(st: os.stat_result) -> types.SimpleNamespace:
    # Simulate the admitted root identity without requiring chown or root.
    attrs = {
        name: getattr(st, name)
        for name in (
            "st_dev", "st_ino", "st_mode", "st_nlink", "st_size",
            "st_mtime_ns", "st_ctime_ns",
        )
    }
    return types.SimpleNamespace(**attrs, st_uid=0, st_gid=0)


def tree(root: Path) -> dict[str, tuple[str, bytes | str]]:
    result = {}
    if not root.exists():
        return result
    for path in sorted(root.rglob("*")):
        name = str(path.relative_to(root))
        if path.is_symlink():
            result[name] = ("symlink", os.readlink(path))
        elif path.is_dir():
            result[name] = ("directory", b"")
        else:
            result[name] = ("file", path.read_bytes())
    return result


class Fixture:
    def __init__(self, root: Path, scenario: str, close_failure: bool = False):
        self.root = root
        self.scenario = scenario
        self.close_failure = close_failure
        self.module = m = load(V5)
        self.parent_fd: int | None = None
        self.parent_close_calls = 0
        self.fds: set[int] = set()
        self.renames = 0
        self.events: list[str] = []
        self.generation_checks: list[str] = []
        self.before_failure_tree = None
        self.mutation_guard_checks = 0
        m.INSTALL_PARENT = root
        m.INSTALL_ROOT = root / m.INSTALL_NAME
        m.STAGE_ROOT = root / m.STAGE_NAME
        m.LAUNCHER_TARGET = m.INSTALL_ROOT / m.BIN_DIR / m.LAUNCHER_NAME
        m.POLICY_TARGET = m.INSTALL_ROOT / m.POLICY_NAME
        m.RUNTIME_INSTALLER_TARGET = (
            m.INSTALL_ROOT / m.SOURCE_DIR / m.OPS_DIR / m.PRECISION_DIR
            / m.RUNTIME_INSTALLER_NAME
        )
        m.NATIVE_TARGET = m.INSTALL_ROOT / m.INPUT_DIR / m.NATIVE_NAME
        self.payload = {
            m.BIN_DIR + "/" + m.LAUNCHER_NAME: b"fixture launcher, never executed\n",
            m.INPUT_DIR + "/" + m.NATIVE_NAME: b"fixture native, never executed\n",
            m.SOURCE_DIR + "/" + m.OPS_DIR + "/" + m.PRECISION_DIR + "/"
            + m.RUNTIME_INSTALLER_NAME: b"fixture runtime source, never executed\n",
            m.POLICY_NAME: b"fixture policy\n",
        }
        launcher = self.payload[m.BIN_DIR + "/" + m.LAUNCHER_NAME]
        native = self.payload[m.INPUT_DIR + "/" + m.NATIVE_NAME]
        runtime = self.payload[
            m.SOURCE_DIR + "/" + m.OPS_DIR + "/" + m.PRECISION_DIR + "/"
            + m.RUNTIME_INSTALLER_NAME
        ]
        m.LAUNCHER_SHA256, m.LAUNCHER_BYTES = m.sha256(launcher), len(launcher)
        m.NATIVE_SHA256, m.NATIVE_BYTES = m.sha256(native), len(native)
        m.RUNTIME_INSTALLER_SHA256 = m.sha256(runtime)
        m.RUNTIME_INSTALLER_BYTES = len(runtime)
        self.checkout = {"head": "1" * 40, "fixture": True}
        self.python = {"fixture": True}
        self.context = {"fixture_authenticated_parent": True}
        self.authenticated_generation = {
            "checkout": self.checkout,
            "python": self.python,
            "git_tool": {"fixture": True},
            "host_policy_sha256": "3" * 64,
            "host_policy_bytes": 1,
            "source_generation_id": "voidbuye2dormantsourcegen3_" + "4" * 64,
            "manifest_sha256": "4" * 64,
            "manifest_bytes": 1,
        }
        self.plan_id = m.PLAN_PREFIX + "2" * 64
        plan = {
            "plan_id": self.plan_id,
            "body": {
                "protected_state": m.READY_STATE,
                "checkout": self.checkout,
                "python": self.python,
                "source_generation_id": self.authenticated_generation["source_generation_id"],
                "source_manifest_sha256": self.authenticated_generation["manifest_sha256"],
                "source_manifest_bytes": self.authenticated_generation["manifest_bytes"],
                "host_policy_sha256": self.authenticated_generation["host_policy_sha256"],
                "host_policy_bytes": self.authenticated_generation["host_policy_bytes"],
            },
            "launcher_raw": launcher,
            "native_raw": native,
            "runtime_installer_raw": runtime,
            "policy": self.payload[m.POLICY_NAME],
            "authenticated_generation": self.authenticated_generation,
        }
        # Patch host/candidate admission only. The publication state machine,
        # fixed file writer, cleanup and final receipt handler remain real.
        m.collect_plan = lambda *args: plan
        m._require_bootstrap_context = self.require_context
        m._revalidate_authenticated_generation = self.check_generation
        m.checkout_snapshot = lambda *args: self.checkout
        m.python_snapshot = lambda: self.python
        m.accepted_lock = lambda *args: {"fixture": True}
        m._require_secure_apply_context = lambda: None
        m._git = self.forbidden
        m._tool_snapshot = self.forbidden
        m.subprocess = types.SimpleNamespace(run=self.forbidden)
        m._verify_root_generation = self.verify

        proxy = types.SimpleNamespace(**vars(os))
        proxy.geteuid = lambda: 0
        proxy.open = self.open
        proxy.close = self.close
        proxy.stat = self.stat
        proxy.fstat = self.fstat
        proxy.fchown = self.fchown
        proxy.fchmod = self.fchmod
        proxy.fsync = self.fsync
        proxy.mkdir = self.mkdir
        proxy.unlink = self.unlink
        proxy.rmdir = self.rmdir
        proxy.listdir = self.listdir
        m.os = proxy
        self.real_rename = m._renameat2
        m._renameat2 = self.rename
        m.main = self.invoke

    def forbidden(self, *args, **kwargs):
        raise AssertionError("fixture attempted host/Git/process access")

    def require_context(self, operation, head, plan_id, launcher, native):
        assert (operation, head, plan_id) == (
            "installer_apply", "1" * 40, self.plan_id,
        )
        assert launcher == self.root / "synthetic-launcher"
        assert native == self.root / "synthetic-native"
        self.events.append("authenticated_context_required")
        return self.context

    def check_generation(self, context, head):
        assert context is self.context and head == "1" * 40
        m = self.module
        if m.INSTALL_ROOT.exists():
            phase = "after_publication"
            assert "verify_published" in self.events
        elif m.STAGE_ROOT.exists():
            phase = "before_publication"
            assert "verify_stage" in self.events
        else:
            phase = "before_mutation"
            assert "stage_mkdir" not in self.events
        self.generation_checks.append(phase)
        self.events.append("generation:" + phase)
        evidence = dict(self.authenticated_generation)
        drift_phase = {
            "premutation_generation_drift": "before_mutation",
            "prepublication_generation_drift": "before_publication",
            "postpublication_generation_drift": "after_publication",
        }.get(self.scenario)
        if phase == drift_phase:
            evidence["source_generation_id"] = (
                "voidbuye2dormantsourcegen3_" + "5" * 64
            )
        if self.scenario == "prepublication_parent_hold" and phase == "before_publication":
            raise m.InstallError("fixture parent generation changed")
        return evidence

    def guard(self, path, dir_fd=None):
        if dir_fd is not None:
            assert dir_fd in self.fds
            relative = Path(path)
            assert not relative.is_absolute() and ".." not in relative.parts
        else:
            assert Path(path).is_relative_to(self.root)
        self.mutation_guard_checks += 1

    def open(self, path, flags, mode=0o777, *, dir_fd=None):
        self.guard(path, dir_fd)
        if self.scenario == "stage_open_failure" and path == self.module.STAGE_NAME:
            raise OSError("fixture stage open failure")
        fd = os.open(path, flags, mode, dir_fd=dir_fd)
        self.fds.add(fd)
        if dir_fd is None and Path(path) == self.root:
            assert self.parent_fd is None
            self.parent_fd = fd
        return fd

    def close(self, fd):
        assert fd in self.fds
        os.close(fd)
        self.fds.remove(fd)
        if fd == self.parent_fd:
            self.parent_close_calls += 1
            if self.close_failure:
                raise OSError("fixture parent close failure")

    def stat(self, path, *, dir_fd=None, follow_symlinks=True):
        self.guard(path, dir_fd)
        return root_owned(os.stat(path, dir_fd=dir_fd, follow_symlinks=follow_symlinks))

    def fstat(self, fd):
        assert fd in self.fds
        return root_owned(os.fstat(fd))

    def fchown(self, fd, uid, gid):
        assert fd in self.fds and (uid, gid) == (0, 0)

    def fchmod(self, fd, mode):
        assert fd in self.fds
        os.fchmod(fd, mode)

    def fsync(self, fd):
        assert fd in self.fds
        if (
            self.scenario == "postpublication_fsync_failure"
            and fd == self.parent_fd and self.module.INSTALL_ROOT.exists()
        ):
            raise OSError("fixture published parent fsync failure")
        os.fsync(fd)

    def mkdir(self, path, mode=0o777, *, dir_fd=None):
        self.guard(path, dir_fd)
        if path == self.module.STAGE_NAME:
            assert self.generation_checks == ["before_mutation"]
            self.events.append("stage_mkdir")
        os.mkdir(path, mode, dir_fd=dir_fd)

    def unlink(self, path, *, dir_fd=None):
        self.guard(path, dir_fd)
        os.unlink(path, dir_fd=dir_fd)

    def rmdir(self, path, *, dir_fd=None):
        self.guard(path, dir_fd)
        os.rmdir(path, dir_fd=dir_fd)

    def listdir(self, fd):
        assert fd in self.fds
        return os.listdir(fd)

    def rename(self, fd, source, target, flags):
        assert fd == self.parent_fd and fd in self.fds
        assert (source, target, flags) == (
            self.module.STAGE_NAME, self.module.INSTALL_NAME,
            self.module.RENAME_NOREPLACE,
        )
        assert self.generation_checks == ["before_mutation", "before_publication"]
        assert self.events[-1] == "generation:before_publication"
        self.real_rename(fd, source, target, flags)
        self.events.append("published")
        self.renames += 1

    def verify(self, path, *, policy):
        assert path in (self.module.STAGE_ROOT, self.module.INSTALL_ROOT)
        assert policy == self.payload[self.module.POLICY_NAME]
        for name, raw in self.payload.items():
            assert (path / name).read_bytes() == raw
        m = self.module
        if path == m.STAGE_ROOT:
            self.events.append("verify_stage")
            if self.scenario == "stage_substitution":
                saved = self.root / "saved-created-stage"
                path.rename(saved)
                shutil.copytree(saved, path)
                self.before_failure_tree = tree(path)
                raise m.InstallError("fixture stage replaced")
            if self.scenario == "stage_unknown_entry":
                (path / "unknown-entry").write_bytes(b"must remain\n")
                self.before_failure_tree = tree(path)
                raise m.InstallError("fixture unknown stage entry")
            if self.scenario == "stage_child_symlink":
                outside = self.root / "outside-bin"
                (path / m.BIN_DIR).rename(outside)
                (path / m.BIN_DIR).symlink_to(outside, target_is_directory=True)
                self.before_failure_tree = tree(outside)
                raise m.InstallError("fixture stage child replaced")
            if self.scenario == "prepublication_failure":
                raise m.InstallError("fixture prepublication verification failure")
        else:
            self.events.append("verify_published")
            if self.scenario == "postpublication_failure":
                raise m.InstallError("fixture postpublication verification failure")

    def invoke(self):
        m = self.module
        m.apply(
            self.root / "synthetic-launcher",
            self.root / "synthetic-native",
            "1" * 40,
            self.plan_id,
            m.CONFIRM_TOKEN,
        )
        return 0

    def run(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            rc = self.module.entrypoint()
        assert self.parent_close_calls == 1, (self.scenario, self.parent_close_calls)
        assert not self.fds, (self.scenario, self.fds)
        assert self.mutation_guard_checks > 0
        return rc, set(output.getvalue().splitlines())


def prove() -> None:
    assert blob(V5.read_bytes()) == V5_BLOB, "successor V5 source pin changed"
    for relative, (size, expected) in FROZEN.items():
        raw = (ROOT / relative).read_bytes()
        assert len(raw) == size and blob(raw) == expected, relative
    assert blob(V1.read_bytes()) == V1_BLOB, "frozen V1 changed"
    predecessor = load(V1)
    successor = load(V5)
    assert blob(V2.read_bytes()) == V2_BLOB, "frozen V2 changed"
    assert successor.MARKER.endswith("PROTECTED_INSTALL_V5")
    assert successor.PLAN_PREFIX == "voidbuye2dormantfirstentryinstall5_"
    assert successor.CONFIRM_TOKEN == "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY"
    # V5 intentionally advances only the launcher authority from frozen V1
    # to accepted runtime-head V2 while preserving the frozen child namespace.
    assert predecessor.LOCK_REL != successor.LOCK_REL
    assert predecessor.LOCK_GIT_BLOB_SHA1 == "f8ff6fbb855aecafc329cd60622cf3af782745a3"
    assert successor.LOCK_GIT_BLOB_SHA1 == "227c2fa449abf1387925373c706ecd07775d5898"
    assert predecessor.LOCK_ID == (
        "voidbuye2dormantfirstentrylock1_"
        "bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"
    )
    assert successor.LOCK_ID == (
        "voidbuye2dormantfirstentrylock2_"
        "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
    )
    assert predecessor.CANDIDATE_ID == (
        "voidbuye2dormantfirstentrycand1_"
        "b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736"
    )
    assert successor.CANDIDATE_ID == (
        "voidbuye2dormantfirstentrycand2_"
        "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
    )
    assert predecessor.LAUNCHER_SHA256 == (
        "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
    )
    assert successor.LAUNCHER_SHA256 == (
        "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
    )
    assert predecessor.LAUNCHER_SHA256 != successor.LAUNCHER_SHA256

    for name in (
        "LAUNCHER_BYTES", "NATIVE_BYTES", "NATIVE_SHA256",
        "RUNTIME_INSTALLER_REL", "RUNTIME_INSTALLER_GIT_BLOB_SHA1",
        "RUNTIME_INSTALLER_BYTES", "RUNTIME_INSTALLER_SHA256", "POLICY_SCHEMA",
        "INSTALL_PARENT", "INSTALL_NAME", "INSTALL_ROOT", "LAUNCHER_TARGET",
        "POLICY_TARGET", "RUNTIME_INSTALLER_TARGET", "NATIVE_TARGET",
    ):
        assert getattr(predecessor, name) == getattr(successor, name), name

    cases = (
        ("success", False),
        ("success", True),
        ("postpublication_failure", False),
        ("postpublication_failure", True),
        ("postpublication_fsync_failure", True),
        ("prepublication_failure", False),
        ("prepublication_failure", True),
        ("stage_substitution", False),
        ("stage_unknown_entry", False),
        ("stage_child_symlink", False),
        ("stage_open_failure", False),
        ("preexisting_stage", False),
        ("premutation_generation_drift", False),
        ("prepublication_generation_drift", False),
        ("prepublication_parent_hold", False),
        ("postpublication_generation_drift", False),
    )
    for scenario, close_failure in cases:
        with tempfile.TemporaryDirectory(prefix="void-e2-inner-v3-terminal-") as td:
            fixture = Fixture(Path(td), scenario, close_failure)
            m = fixture.module
            if scenario == "preexisting_stage":
                m.STAGE_ROOT.mkdir(mode=0o755)
                (m.STAGE_ROOT / "unowned").write_bytes(b"preserve\n")
                fixture.before_failure_tree = tree(m.STAGE_ROOT)
            rc, lines = fixture.run()
            for line in (
                "launcher_execution=false", "native_execution=false",
                "binder_execution=false", "credential_access=false",
                "private_key_access=false", "signing=false",
                "transaction=false", "rpc_call=false", "funds_movement=false",
            ):
                assert line in lines, (scenario, line)

            published = scenario in (
                "success", "postpublication_failure", "postpublication_fsync_failure",
                "postpublication_generation_drift",
            )
            if published:
                assert fixture.renames == 1
                assert m.INSTALL_ROOT.is_dir() and not m.STAGE_ROOT.exists()
                for relative, raw in fixture.payload.items():
                    assert (m.INSTALL_ROOT / relative).read_bytes() == raw
                assert "publication=true" in lines and "publication=false" not in lines
                if scenario == "success" and not close_failure:
                    assert rc == 0 and "status=GREEN" in lines
                    assert "install_parent_close_completed=true" in lines
                else:
                    assert rc == 2 and "status=HOLD" in lines and "status=GREEN" not in lines
                    assert "receipt_boundary=FINAL_FAILURE_RECEIPT" in lines
                    assert "publication_state=published_needs_inspection" in lines
                    assert "post_publication_rollback=false" in lines
                    close_state = "false" if close_failure else "true"
                    assert "install_parent_close_completed=" + close_state in lines
                    if close_failure:
                        assert "close_failure_reason=fixture parent close failure" in lines
                    if scenario == "success":
                        assert "failure_phase=install_parent_close" in lines
                        assert "final_verification_completed=true" in lines
                    else:
                        assert "failure_phase=post_publication_verification" in lines
                        assert "final_verification_completed=false" in lines
                        if scenario == "postpublication_generation_drift":
                            assert any(
                                line.startswith("original_failure_reason=")
                                and "generation" in line
                                for line in lines
                            )
                        else:
                            expected_reason = (
                                "fixture postpublication verification failure"
                                if scenario == "postpublication_failure"
                                else "fixture published parent fsync failure"
                            )
                            assert "original_failure_reason=" + expected_reason in lines
                    fsync_state = "false" if scenario == "postpublication_fsync_failure" else "true"
                    assert "parent_fsync_completed=" + fsync_state in lines
            else:
                assert fixture.renames == 0 and not m.INSTALL_ROOT.exists()
                assert rc == 2 and "publication=false" in lines and "publication=true" not in lines
                if scenario in (
                    "prepublication_failure", "prepublication_generation_drift",
                    "prepublication_parent_hold",
                ):
                    assert not m.STAGE_ROOT.exists()
                    assert "prepublication_cleanup_attempted=true" in lines
                    assert "prepublication_cleanup_green=true" in lines
                    if close_failure:
                        assert "reason=install_parent_close_failed_before_publication" in lines
                elif scenario == "preexisting_stage":
                    assert tree(m.STAGE_ROOT) == fixture.before_failure_tree
                    assert "prepublication_cleanup_attempted=false" in lines
                elif scenario == "premutation_generation_drift":
                    assert not m.STAGE_ROOT.exists()
                    assert tree(fixture.root) == {}
                    assert "stage_mkdir" not in fixture.events
                    assert "prepublication_cleanup_attempted=false" in lines
                else:
                    assert m.STAGE_ROOT.is_dir()
                    assert "prepublication_cleanup_green=false" in lines
                    if scenario in ("stage_substitution", "stage_unknown_entry"):
                        assert tree(m.STAGE_ROOT) == fixture.before_failure_tree
                    elif scenario == "stage_child_symlink":
                        assert (m.STAGE_ROOT / m.BIN_DIR).is_symlink()
                        assert tree(fixture.root / "outside-bin") == fixture.before_failure_tree
                    if scenario == "stage_substitution":
                        for relative, raw in fixture.payload.items():
                            assert (fixture.root / "saved-created-stage" / relative).read_bytes() == raw

            assert fixture.events.count("authenticated_context_required") >= 1
            if scenario == "preexisting_stage":
                assert fixture.generation_checks == []
            else:
                assert fixture.generation_checks[0] == "before_mutation"
            if scenario in ("prepublication_generation_drift", "prepublication_parent_hold"):
                assert fixture.generation_checks == ["before_mutation", "before_publication"]
                assert "published" not in fixture.events
            if scenario in ("success", "postpublication_generation_drift"):
                assert fixture.generation_checks == [
                    "before_mutation", "before_publication", "after_publication",
                ]

    print(MARKER)
    print("fixture_terminal_cases=" + str(len(cases)))
    print("frozen_v1_blob_preserved=true")
    print("frozen_v2_blob_preserved=true")
    print("accepted_installed_payload_identities_preserved=true")
    print("launcher_v1_to_runtime_head_v2_authority_transition_exact=true")\n    print("v5_plan_confirmation_domain_separate=true")
    print("created_stage_cleanup_exercised=true")
    print("substituted_stage_preserved=true")
    print("unknown_stage_entry_preserved=true")
    print("symlink_child_target_preserved=true")
    print("unidentified_stage_not_deleted=true")
    print("preexisting_stage_not_deleted=true")
    print("postpublication_close_failure_receipt_truthful=true")
    print("original_failure_preserved_with_close_failure=true")
    print("parent_close_attempted_once=true")
    print("fixture_descriptors_closed=true")
    print("generation_checked_before_first_mutation=true")
    print("generation_checked_after_stage_verification_before_publication=true")
    print("generation_checked_after_publication_before_green=true")
    print("premutation_generation_drift_leaves_no_stage=true")
    print("prepublication_generation_or_parent_drift_cleans_created_stage=true")
    print("postpublication_generation_drift_preserves_publication_truth=true")
    print("fixture_apply_exercised=true")
    print("production_apply_executed=false")
    print("host_git_or_process_access=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")


if __name__ == "__main__":
    prove()
