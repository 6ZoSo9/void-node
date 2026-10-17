#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_installed_qualification_v6.py"
TARGET_BLOB = "e16b0ce71a4522b21762fa824c96aefb58e3a25b"
INSTALLER = ROOT / (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
INSTALLER_BLOB = "c9dd842b620f2ed7c3fdd5876c222a419b6b0c68"


def blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
source = target_raw.decode("utf-8")
assert blob(target_raw) == TARGET_BLOB
assert blob(INSTALLER.read_bytes()) == INSTALLER_BLOB

for required in (
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6",
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "c9dd842b620f2ed7c3fdd5876c222a419b6b0c68"',
    "double_descriptor_bound_bootstrap_self_test_required=true",
    "before_middle_after_stability_required=true",
    "python_and_git_policy_binding_required=true",
    "bootstrap_execution_beyond_self_test=false",
    "inner_installer_execution=false",
    "protected_installer_apply=false",
    "credential_access=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
    "_test_before_exec_hook(path, fd)",
    "pass_fds=(fd,)",
    'executable = f"/proc/self/fd/{fd}"',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
):
    assert forbidden not in source, forbidden

spec = importlib.util.spec_from_file_location("v6_qualification", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

installer = module._load_installer()
assert installer.LOCK_ID == (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
assert installer.CANDIDATE_ID == (
    "voidbuye2dormantbootstrapcand3_"
    "13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"
)
assert installer.BOOTSTRAP_BYTES == 874_608
assert installer.BOOTSTRAP_SHA256 == (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
assert installer.MANIFEST_SHA256 == (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)
policy = installer.build_policy(
    {"sha256": "1" * 64, "bytes": 123},
    {"sha256": "2" * 64, "bytes": 456},
)
assert policy == (
    "schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
    "python_sha256=" + "1" * 64 + "\n"
    "python_bytes=123\n"
    "git_sha256=" + "2" * 64 + "\n"
    "git_bytes=456\n"
).encode("ascii")

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
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6_SELF_TEST_GREEN",
    "installer_source_blob_bound=true",
    "accepted_bootstrap_v6_lock_bound=true",
    "installed_three_file_root_required=true",
    "python_and_git_policy_binding_required=true",
    "double_descriptor_bound_bootstrap_self_test_required=true",
    "before_middle_after_stability_required=true",
    "bootstrap_execution_beyond_self_test=false",
    "inner_installer_execution=false",
    "protected_installer_apply=false",
    "filesystem_write=false",
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
    "read_only=true",
    "double_descriptor_bound_bootstrap_self_test_required=true",
    "bootstrap_execution_beyond_self_test=false",
    "inner_installer_execution=false",
    "protected_installer_apply=false",
    "filesystem_write=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

# Prove the retained descriptor is execution authority and pathname drift is rejected.
with tempfile.TemporaryDirectory(
    prefix="void-e2-bootstrap-v6-qualification-path-swap-"
) as td:
    root = Path(td)
    bin_dir = root / "bin"
    bin_dir.mkdir()
    visible = bin_dir / "bootstrap"
    original = Path("/usr/bin/true")
    replacement = Path("/usr/bin/false")
    shutil.copyfile(original, visible)
    os.chmod(visible, 0o555)
    before = visible.lstat()
    raw = visible.read_bytes()
    expected = {
        **module._record(before),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "git_blob_sha1": blob(raw),
    }
    fixture = types.SimpleNamespace(
        INSTALL_ROOT=root,
        BIN_DIR="bin",
        BOOTSTRAP_NAME="bootstrap",
        BOOTSTRAP_SHA256=hashlib.sha256(raw).hexdigest(),
    )

    def swap(path: Path, fd: int) -> None:
        assert path == visible
        assert os.fstat(fd).st_ino == before.st_ino
        staged = root / "replacement"
        shutil.copyfile(replacement, staged)
        os.chmod(staged, 0o555)
        os.replace(staged, visible)

    try:
        module._run_bootstrap_self_test(
            fixture,
            expected,
            _test_before_exec_hook=swap,
        )
    except module.QualifyError as exc:
        assert str(exc) == "bootstrap_generation_changed_during_self_test"
    else:
        raise AssertionError("visible bootstrap path substitution accepted")

    # The retained descriptor executed /usr/bin/true. A pathname-following
    # execution would have used /usr/bin/false; generation drift is still HOLD.
    assert visible.read_bytes() == replacement.read_bytes()

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6_PROOF_GREEN")
print("target_blob_bound=true")
print("installer_v6_blob_bound=true")
print("accepted_bootstrap_v6_lock_bound=true")
print("accepted_bootstrap_v6_binary_bound=true")
print("source_generation_v3_manifest_bound=true")
print("python_and_git_policy_binding_required=true")
print("retained_bootstrap_fd_execution_required=true")
print("visible_path_swap_rejected_after_retained_fd_execution=true")
print("before_middle_after_stability_required=true")
print("double_self_test_required=true")
print("bootstrap_execution_beyond_self_test=false")
print("inner_installer_execution=false")
print("protected_installer_apply=false")
print("filesystem_write=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
