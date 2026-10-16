#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installed_qualification_v2r.py"
)
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)

TARGET_BLOB = "54b3222e7d4b6ed3f8ce76ff5434c222ef1508e5"
INSTALLER_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read(relative: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    assert path.is_file() and not path.is_symlink(), relative
    assert before.st_nlink == 1 and before.st_size > 0, relative
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, field) == getattr(after, field), (
            "file_changed:" + relative + ":" + field
        )
    return raw


target_raw = read(TARGET_REL)
installer_raw = read(INSTALLER_REL)
assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(installer_raw) == INSTALLER_BLOB

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V2R",
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"',
    "installer._verify_checkout(expected_head)",
    "installer.accepted_lock(expected_head)",
    "installer.protected_state()",
    "protected_install_not_green",
    "installed_generation_changed_during_qualification",
    "native_self_test_output_changed",
    "native_self_test_descriptor_bound",
    "retained_stage_custody_source_bound",
    "binder_execution",
    "live_binding_execution",
    "customer_safe_to_pay",
    "production_host_evidence_authority",
    "SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING",
):
    assert required in source, required

tree = ast.parse(source)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, ast.FunctionDef)
}
for name in (
    "_installed_snapshot",
    "_run_native_self_test",
    "collect",
    "plan",
):
    assert name in functions, name

installed_source = ast.get_source_segment(source, functions["_installed_snapshot"])
native_source = ast.get_source_segment(source, functions["_run_native_self_test"])
collect_source = ast.get_source_segment(source, functions["collect"])
assert installed_source is not None
assert native_source is not None
assert collect_source is not None

checkout_at = installed_source.index("installer._verify_checkout(expected_head)")
lock_at = installed_source.index("installer.accepted_lock(expected_head)")
state_at = installed_source.index("state = installer.protected_state()")
root_open_at = installed_source.index("root_fd = os.open(")
native_snapshot_at = installed_source.index("native = _file_snapshot(")
binder_snapshot_at = installed_source.index("binder = _file_snapshot(")
root_final_at = installed_source.index("visible_after = root.lstat()")
assert (
    checkout_at
    < lock_at
    < state_at
    < root_open_at
    < native_snapshot_at
    < binder_snapshot_at
    < root_final_at
)

assert 'installer.NATIVE_TARGET.lstat()' in native_source
assert 'os.O_NOFOLLOW' in native_source
assert '"/proc/self/fd/" + str(fd)' in native_source
assert 'pass_fds=(fd,)' in native_source
assert '[exec_path, "--self-test"]' in native_source
assert "installer.BINDER_TARGET" not in native_source
assert "installer.BINDER_NAME" not in native_source
assert '"--run"' not in native_source
assert ".mjs" not in native_source

before_at = collect_source.index("before = _installed_snapshot")
first_at = collect_source.index("first_output, first_sha = _run_native_self_test")
middle_at = collect_source.index("middle = _installed_snapshot")
second_at = collect_source.index("second_output, second_sha = _run_native_self_test")
after_at = collect_source.index("after = _installed_snapshot")
generation_at = collect_source.index(
    "installed_generation_changed_during_qualification"
)
output_at = collect_source.index("native_self_test_output_changed")
assert (
    before_at
    < first_at
    < middle_at
    < second_at
    < after_at
    < generation_at
    < output_at
)

# Binder is data-only. The sole subprocess in the qualification source is the
# retained installed-native self-test; no binder path/name becomes executable.
assert source.count("subprocess.run(") == 1
for line in source.splitlines():
    if "subprocess.run(" in line or "exec_path" in line or "pass_fds" in line:
        assert "BINDER_TARGET" not in line, line
        assert "BINDER_NAME" not in line, line

target = ROOT / TARGET_REL
cmd = [sys.executable, "-I", "-B", str(target)]

self_test = subprocess.run(
    cmd + ["--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/tmp",
        "LANG": "C",
        "LC_ALL": "C",
    },
)
assert self_test.returncode == 0, self_test.stderr + self_test.stdout
self_lines = set(self_test.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V2R_SELF_TEST_GREEN",
    "installer_source_blob_bound=true",
    "binder_execution=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in self_lines, line

plan = subprocess.run(
    cmd + ["--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/tmp",
        "LANG": "C",
        "LC_ALL": "C",
    },
)
assert plan.returncode == 0, plan.stderr + plan.stdout
plan_lines = set(plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V2R",
    "mode=plan",
    "root_required_for_run=true",
    "expected_head_required=true",
    "protected_install_verification_required=true",
    "installed_generation_stability_required=true",
    "retained_stage_custody_source_required=true",
    "double_native_self_test_required=true",
    "descriptor_bound_native_self_test_required=true",
    "native_self_test_execution=false",
    "binder_execution=false",
    "live_binding_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "customer_safe_to_pay=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V2",
):
    assert line in plan_lines, line

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V2R_PROOF_GREEN")
print("hardened_installer_source_blob_bound=true")
print("accepted_v3_lock_rechecked=true")
print("protected_install_state_required_green=true")
print("installed_root_descriptor_bound=true")
print("exact_native_identity_rechecked=true")
print("exact_binder_identity_rechecked=true")
print("installed_generation_before_middle_after_required=true")
print("double_native_self_test_required=true")
print("native_self_test_descriptor_bound=true")
print("binder_execution=false")
print("live_binding_execution=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("customer_safe_to_pay=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
print("next_gate=SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING")
