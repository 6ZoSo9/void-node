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
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v1.py"
)
INSTALLER = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v1.py"
)

TARGET_BLOB = "e026046ec5eff21add2220a16e313d7a1129903b"
INSTALLER_BLOB = "f572868ea0edacbb3404771b793c4c60f9471abb"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(TARGET.read_bytes()) == TARGET_BLOB
assert git_blob(INSTALLER.read_bytes()) == INSTALLER_BLOB

source = TARGET.read_text("utf-8")
for required in (
    "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1",
    "installed_generation_changed_during_qualification",
    "native_self_test_output_changed",
    "double_native_self_test_required=true",
    "native_self_test_verified_fd_execution_required=true",
    "native_self_test_execution=false",
    "runner_execution=false",
    "live_composition_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "funds_movement=false",
    "SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_LIVE_COMPOSITION_V2",
):
    assert required in source, required

assert source.count("_run_native_self_test(") == 3
assert 'exec_path = "/proc/self/fd/" + str(native_fd)' in source
assert "pass_fds=(native_fd,)" in source
assert "[str(installer.NATIVE_TARGET), \"--self-test\"]" not in source
assert "native_self_test_target_changed_during_exec" in source
assert "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2" not in source
assert "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs" not in source
assert "CREDENTIALS_DIRECTORY" not in source
assert "eth_sendRawTransaction" not in source

spec = importlib.util.spec_from_file_location("epoch2_native_installed_qualification_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

def _native_snapshot(st: os.stat_result, digest: str) -> dict[str, object]:
    return {
        "dev": st.st_dev,
        "ino": st.st_ino,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "bytes": st.st_size,
        "sha256": digest,
        "mtime_ns": st.st_mtime_ns,
        "ctime_ns": st.st_ctime_ns,
    }


def _green_native_stdout() -> str:
    return "\n".join(
        (
            "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1_SELF_TEST_GREEN",
            "fixed_self_path=true",
            "fixed_runner_path=true",
            "fixed_node_path=true",
            "root_owned_policy_required=true",
            "runner_sha256_policy_bound=true",
            "node_sha256_policy_bound=true",
            "expected_head_policy_bound=true",
            "runner_descriptor_retained=true",
            "node_descriptor_fexecve=true",
            "stdin_javascript_source_forbidden=true",
            "credential_content_access=false",
            "transaction=false",
            "public_presale_activation=false",
            "funds_movement=false",
            "",
        )
    )


with tempfile.TemporaryDirectory(prefix="void-e2-native-fd-bind-") as td:
    native = Path(td) / "native"
    native.write_bytes(b"exact-native-fixture")
    native.chmod(0o555)
    raw = native.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    st = native.lstat()
    installer = types.SimpleNamespace(
        NATIVE_TARGET=native,
        NATIVE_BYTES=len(raw),
        NATIVE_SHA256=digest,
    )
    expected = _native_snapshot(st, digest)

    real_geteuid = module.os.geteuid
    real_run = module.subprocess.run
    try:
        module.os.geteuid = lambda: 0

        def positive_run(argv, **kwargs):
            assert argv[0].startswith("/proc/self/fd/")
            assert argv[1:] == ["--self-test"]
            passed = kwargs.get("pass_fds")
            assert isinstance(passed, tuple) and len(passed) == 1
            assert argv[0] == "/proc/self/fd/" + str(passed[0])
            assert kwargs.get("close_fds") is True
            return types.SimpleNamespace(
                returncode=0,
                stdout=_green_native_stdout(),
                stderr="",
            )

        module.subprocess.run = positive_run
        out, out_sha = module._run_native_self_test(installer, expected)
        assert out == _green_native_stdout()
        assert out_sha.startswith("sha256:")

        def swap_during_exec(argv, **kwargs):
            retained = kwargs.get("pass_fds")
            assert isinstance(retained, tuple) and len(retained) == 1
            assert argv[0] == "/proc/self/fd/" + str(retained[0])
            old = native.with_name("native.old")
            native.rename(old)
            native.write_bytes(raw)
            native.chmod(0o555)
            return types.SimpleNamespace(
                returncode=0,
                stdout=_green_native_stdout(),
                stderr="",
            )

        module.subprocess.run = swap_during_exec
        try:
            module._run_native_self_test(installer, expected)
        except module.QualificationError as exc:
            assert str(exc) == "native_self_test_target_changed_during_exec"
        else:
            raise AssertionError("visible native swap during exec unexpectedly accepted")
    finally:
        module.os.geteuid = real_geteuid
        module.subprocess.run = real_run

self_cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    env={"PATH": "/usr/bin:/bin", "HOME": "/tmp", "LANG": "C", "LC_ALL": "C"},
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
)
assert (
    "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1_SELF_TEST_GREEN"
    in self_cp.stdout.splitlines()
)

plan_cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    env={"PATH": "/usr/bin:/bin", "HOME": "/tmp", "LANG": "C", "LC_ALL": "C"},
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
)
plan_lines = set(plan_cp.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1",
    "mode=plan",
    "root_required_for_run=true",
    "exact_expected_head_required=true",
    "installed_generation_verification_required=true",
    "node_generation_binding_required=true",
    "checkout_generation_binding_required=true",
    "double_native_self_test_required=true",
    "native_self_test_verified_fd_execution_required=true",
    "native_self_test_execution=false",
    "runner_execution=false",
    "live_composition_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION",
):
    assert line in plan_lines, line

print("VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1_PROOF_GREEN")
print("installer_source_blob_bound=true")
print("exact_installed_root_required=true")
print("expected_head_policy_binding_required=true")
print("node_generation_binding_required=true")
print("checkout_generation_binding_required=true")
print("double_native_self_test_required=true")
print("native_self_test_verified_fd_execution=true")
print("visible_native_swap_during_exec_rejected=true")
print("runner_execution=false")
print("live_composition_execution=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
