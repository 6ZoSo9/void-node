#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "installed_qualification_v1.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "a03e5879c91bb86fa68897ba6bb4b5e87519a0c6"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "protected_install_v5.py"
)
INSTALLER = ROOT / INSTALLER_REL
INSTALLER_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "INSTALLED_QUALIFICATION_V1"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
installer_raw = INSTALLER.read_bytes()
assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(installer_raw) == INSTALLER_BLOB
source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True, optimize=0)

for required in (
    "INSTALLED_QUALIFICATION_V1",
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "' + INSTALLER_BLOB + '"',
    "triple_snapshot_required",
    "temporary_git_metadata_write_performed",
    "temporary_git_metadata_cleanup_completed",
    "protected_root_write",
    "repository_worktree_write",
    "launcher_execution",
    "native_execution",
    "binder_execution",
    "credential_access",
    "funds_movement",
    "privileged_execution_authorized",
    "non_executing_current_head_plan",
):
    assert required in source, required

for forbidden in (
    "subprocess.",
    "os.exec",
    "os.system(",
    "systemctl",
    "--apply",
    "--installer-apply",
    "eth_send",
    "CREDENTIALS_DIRECTORY",
    "LoadCredential",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source, filename=TARGET_REL)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_direct_source_bytes", "_load_installer", "_snapshot_dir", "_snapshot_file",
    "_installed_snapshot", "collect", "emit", "source_plan", "self_test", "main",
):
    assert name in functions, name

snapshot_dir_source = ast.get_source_segment(source, functions["_snapshot_dir"]) or ""
snapshot_file_source = ast.get_source_segment(source, functions["_snapshot_file"]) or ""
for ownership_check in ("before.st_uid != 0", "before.st_gid != 0"):
    assert ownership_check in snapshot_dir_source, ownership_check
    assert ownership_check in snapshot_file_source, ownership_check
assert "stat.S_IMODE(before.st_mode) != 0o755" in snapshot_dir_source
assert "stat.S_IMODE(before.st_mode) != expected_mode" in snapshot_file_source

# Source-only modes are inert.
for mode, markers in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "exact_installer_generation_bound=true",
            "triple_snapshot_required=true",
            "installed_payload_execution_absent=true",
            "temporary_git_metadata_truthful=true",
            "protected_root_write=false",
            "repository_worktree_write=false",
            "credential_access=false",
            "funds_movement=false",
            "privileged_execution_authorized=false",
        ),
    ),
    (
        "--source-plan",
        (
            MARKER,
            "mode=source-plan",
            "source_only=true",
            "host_read=false",
            "host_write=false",
            "root_required_for_run=true",
            "triple_snapshot_required=true",
            "temporary_git_metadata_write_possible_on_run=true",
            "temporary_git_metadata_cleanup_required=true",
            "protected_root_write=false",
            "repository_worktree_write=false",
            "launcher_execution=false",
            "native_execution=false",
            "binder_execution=false",
            "credential_access=false",
            "funds_movement=false",
            "privileged_execution_authorized=false",
        ),
    ),
):
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(TARGET), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
        },
    )
    assert cp.returncode == 0, (mode, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for marker in markers:
        assert marker in lines, (mode, marker)

spec = importlib.util.spec_from_file_location("first_entry_installed_qualification_v1", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def write_file(path: Path, raw: bytes, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    path.chmod(mode)


with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-installed-qual-v1-") as td:
    td = Path(td)
    installed = td / "installed"
    bin_dir = installed / "bin"
    input_dir = installed / "input"
    precision_dir = installed / "source" / "ops" / "precision"
    for path in (installed, bin_dir, input_dir, installed / "source", installed / "source" / "ops", precision_dir):
        path.mkdir(exist_ok=True)
        path.chmod(0o755)

    launcher_raw = b"fixture-launcher-v2\n"
    native_raw = b"fixture-native-v2\n"
    runtime_raw = b"fixture-runtime-installer\n"
    policy_raw = b"schema=FIXTURE\npython_sha256=" + b"1" * 64 + b"\npython_bytes=123\n"

    launcher = bin_dir / "launcher"
    native = input_dir / "native"
    runtime = precision_dir / "runtime.py"
    policy = installed / "policy-v1.conf"
    write_file(launcher, launcher_raw, 0o555)
    write_file(native, native_raw, 0o444)
    write_file(runtime, runtime_raw, 0o444)
    write_file(policy, policy_raw, 0o444)

    class FakeInstaller:
        MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V5"
        INSTALL_ROOT = installed
        GREEN_STATE = "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN"
        LOCK_ID = "voidbuye2fixturelock_" + "a" * 64
        CANDIDATE_ID = "voidbuye2fixturecandidate_" + "b" * 64
        BIN_DIR = "bin"
        INPUT_DIR = "input"
        SOURCE_DIR = "source"
        OPS_DIR = "ops"
        PRECISION_DIR = "precision"
        LAUNCHER_NAME = "launcher"
        NATIVE_NAME = "native"
        RUNTIME_INSTALLER_NAME = "runtime.py"
        POLICY_NAME = "policy-v1.conf"
        LAUNCHER_TARGET = launcher
        NATIVE_TARGET = native
        RUNTIME_INSTALLER_TARGET = runtime
        POLICY_TARGET = policy
        LAUNCHER_BYTES = len(launcher_raw)
        LAUNCHER_SHA256 = hashlib.sha256(launcher_raw).hexdigest()
        NATIVE_BYTES = len(native_raw)
        NATIVE_SHA256 = hashlib.sha256(native_raw).hexdigest()
        RUNTIME_INSTALLER_BYTES = len(runtime_raw)
        RUNTIME_INSTALLER_SHA256 = hashlib.sha256(runtime_raw).hexdigest()
        _GIT_PRIVATE_ACTIVE = 0
        _GIT_PRIVATE_CLEANUP_FAILED = False
        _GIT_PRIVATE_MUTATION_PERFORMED = True

        @staticmethod
        def checkout_snapshot(expected_head):
            return {"head": expected_head, "tree": "c" * 40, "branch": "main", "clean": True}

        @staticmethod
        def accepted_lock(expected_head):
            return {"lock_id": FakeInstaller.LOCK_ID}

        @staticmethod
        def python_snapshot():
            return {"fixed": "/usr/bin/python3", "realpath": "/usr/bin/python3.12",
                     "sha256": "1" * 64, "bytes": 123, "mode": "0755", "uid": 0, "gid": 0}

        @staticmethod
        def build_policy(python):
            return policy_raw

        @staticmethod
        def protected_state(policy_bytes):
            assert policy_bytes == policy_raw
            return FakeInstaller.GREEN_STATE

    original_loader = module._load_installer
    original_geteuid = module.os.geteuid
    original_path_lstat = Path.lstat
    original_fstat = module.os.fstat

    def root_owned_stat(observed):
        values = list(observed)
        values[4] = 0
        values[5] = 0
        return os.stat_result(values)

    def fixture_lstat(self):
        return root_owned_stat(original_path_lstat(self))

    def fixture_fstat(fd):
        return root_owned_stat(original_fstat(fd))

    try:
        module._load_installer = lambda: FakeInstaller
        module.os.geteuid = lambda: 0
        Path.lstat = fixture_lstat
        module.os.fstat = fixture_fstat
        result = module.collect("a" * 40)
        assert result["installed_identity_green"] is True
        assert result["installed_generation_stable"] is True
        assert result["temporary_git_metadata_write_performed"] is True
        assert result["temporary_git_metadata_cleanup_completed"] is True
        assert result["protected_root_write"] is False
        assert result["repository_worktree_write"] is False
        assert result["launcher_execution"] is False
        assert result["native_execution"] is False
        assert result["binder_execution"] is False
        assert result["credential_access"] is False
        assert result["funds_movement"] is False
        assert result["production_host_evidence_authority"] is True
        assert result["next_gate"] == "non_executing_current_head_plan"
        assert result["privileged_execution_authorized"] is False

        # Visible installed generation drift must HOLD.
        launcher.chmod(0o755)
        try:
            module.collect("a" * 40)
        except module.QualifyError as exc:
            assert "installed_file_metadata_invalid" in str(exc)
        else:
            raise AssertionError("installed_generation_drift_accepted")
        launcher.chmod(0o555)

        # Non-root execution is refused before host qualification.
        module.os.geteuid = lambda: 1000
        try:
            module.collect("a" * 40)
        except module.QualifyError as exc:
            assert str(exc) == "root_required_for_installed_qualification"
        else:
            raise AssertionError("nonroot_qualification_accepted")
    finally:
        module._load_installer = original_loader
        module.os.geteuid = original_geteuid
        Path.lstat = original_path_lstat
        module.os.fstat = original_fstat

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("installer_v5_blob_bound=true")
print("production_root_ownership_checks_preserved=true")
print("fixture_root_metadata_emulated=true")
print("triple_installed_snapshot_exercised=true")
print("installed_generation_drift_rejected=true")
print("temporary_git_metadata_truth_preserved=true")
print("temporary_git_metadata_cleanup_required=true")
print("payload_execution_absent=true")
print("protected_root_write=false")
print("repository_worktree_write=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
print("privileged_execution_authorized=false")
