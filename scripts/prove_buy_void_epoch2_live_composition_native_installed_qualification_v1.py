#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v1.py"
)
INSTALLER = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v1.py"
)

TARGET_BLOB = "9722996a3a062fda61d3a35980a2a07242f54dcd"
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
    "descriptor_bound_native_self_test_required=true",
    "native_self_test_descriptor_bound",
    '"/proc/self/fd/" + str(fd)',
    "pass_fds=(fd,)",
    "native_visible_generation_changed_during_execution",
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

tree=ast.parse(source)
collect_defs=[
    node for node in tree.body
    if isinstance(node,ast.FunctionDef) and node.name=="collect"
]
assert len(collect_defs)==1
self_test_calls=[
    node for node in ast.walk(collect_defs[0])
    if isinstance(node,ast.Call)
    and isinstance(node.func,ast.Name)
    and node.func.id=="_run_native_self_test"
]
assert len(self_test_calls)==2
assert all(
    len(call.args)>=2
    and isinstance(call.args[0],ast.Name)
    and call.args[0].id=="installer"
    for call in self_test_calls
)
bound_generations=[]
for call in self_test_calls:
    arg=call.args[1]
    assert isinstance(arg,ast.Subscript)
    assert isinstance(arg.value,ast.Name)
    assert isinstance(arg.slice,ast.Constant)
    assert arg.slice.value=="native"
    bound_generations.append(arg.value.id)
assert bound_generations==["before","middle"]
assert "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2" not in source
assert "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs" not in source
assert "CREDENTIALS_DIRECTORY" not in source
assert "eth_sendRawTransaction" not in source

spec = importlib.util.spec_from_file_location("epoch2_native_installed_qualification_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

with tempfile.TemporaryDirectory(prefix="void-e2-installed-native-fd-swap-") as td:
    root=Path(td)
    source_a=root/"a.c"
    source_b=root/"b.c"
    native=root/"native"
    replacement=root/"replacement"
    saved=root/"native.saved"
    source_a.write_text("int main(void){return 0;}\n",encoding="utf-8")
    source_b.write_text("int main(void){return 17;}\n",encoding="utf-8")
    for source_file,target in ((source_a,native),(source_b,replacement)):
        cp=subprocess.run(
            [
                "/usr/bin/cc","-O2","-Wl,--build-id=none",
                str(source_file),"-o",str(target),
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=30,
            env={"PATH":"/usr/bin:/bin","LANG":"C","LC_ALL":"C"},
        )
        assert cp.returncode==0,cp.stderr
        target.chmod(0o555)

    native_raw=native.read_bytes()
    native_st=native.lstat()
    expected_native={
        "dev":native_st.st_dev,
        "ino":native_st.st_ino,
        "uid":native_st.st_uid,
        "gid":native_st.st_gid,
        "mode":format(stat.S_IMODE(native_st.st_mode),"04o"),
        "nlink":native_st.st_nlink,
        "bytes":native_st.st_size,
        "sha256":hashlib.sha256(native_raw).hexdigest(),
        "mtime_ns":native_st.st_mtime_ns,
        "ctime_ns":native_st.st_ctime_ns,
    }

    class FakeInstaller:
        NATIVE_TARGET=native
        NATIVE_BYTES=len(native_raw)
        NATIVE_SHA256=expected_native["sha256"]

    def swap_visible_path():
        os.rename(native,saved)
        os.rename(replacement,native)

    real_geteuid=module.os.geteuid
    module.os.geteuid=lambda:0
    try:
        try:
            module._run_native_self_test(
                FakeInstaller,
                expected_native,
                _test_before_exec_hook=swap_visible_path,
            )
        except module.QualificationError as exc:
            assert str(exc)=="native_visible_generation_changed_during_execution"
        else:
            raise AssertionError("pathname swap unexpectedly qualified")
    finally:
        module.os.geteuid=real_geteuid

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
    "descriptor_bound_native_self_test_required=true",
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
print("descriptor_bound_native_self_test_required=true")
print("pathname_swap_during_self_test_rejected=true")
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
