#!/usr/bin/env python3
from __future__ import annotations

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
    "void_buy_void_epoch2_live_composition_native_protected_install_v1.py"
)
LOCK = (
    ROOT / "ops/security/"
    "buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
)
NATIVE_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_preentry_v1.c"
)
RUNNER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
)

TARGET_BLOB = "f572868ea0edacbb3404771b793c4c60f9471abb"
LOCK_BLOB = "57f965a944031eac90d69b4104b0f8f2473e66cc"
NATIVE_SOURCE_BLOB = "4aa091e7835b32aa5c4e7b8e4059651c69a64eb3"
RUNNER_SOURCE_BLOB = "92e8c8696ea7e2bb81b6ef089db8baa657188935"

NATIVE_SHA256 = "78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
NATIVE_BYTES = 726_976
RUNNER_SHA256 = "2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73"
RUNNER_BYTES = 30_103


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert git_blob(TARGET.read_bytes()) == TARGET_BLOB
assert git_blob(LOCK.read_bytes()) == LOCK_BLOB
assert git_blob(NATIVE_SOURCE.read_bytes()) == NATIVE_SOURCE_BLOB
assert git_blob(RUNNER_SOURCE.read_bytes()) == RUNNER_SOURCE_BLOB
assert RUNNER_SOURCE.stat().st_size == RUNNER_BYTES
assert sha256(RUNNER_SOURCE) == RUNNER_SHA256

source = TARGET.read_text("utf-8")
for required in (
    'FIXED_CHECKOUT = pathlib.Path("/home/zoso/dev/void-node")',
    'INSTALL_NAME = "void-buy-void-epoch2-live-composition-v2"',
    'STAGE_NAME = ".void-buy-void-epoch2-live-composition-v2.stage"',
    'POLICY_SCHEMA = "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V3_CREATE_ONLY"',
    'RENAME_NOREPLACE = 1',
    'READY_STATE = "EPOCH2_LIVE_COMPOSITION_ROOT_ABSENT_READY_FOR_CREATE_ONLY"',
    'GREEN_STATE = "EPOCH2_LIVE_COMPOSITION_PROTECTED_INSTALL_GREEN"',
    '"--no-new-privs"',
    '"--reuid=" + str(RUNTIME_UID)',
    '"--regid=" + str(RUNTIME_GID)',
    '"--clear-groups"',
    'node_generation_bound_at_plan_apply=true',
    'expected_main_head_bound_at_plan_apply=true',
    'truthful_post_publication_failure_receipt_required=true',
    'next_action=SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_CREATE_ONLY_INSTALL',
    'next_action=EPOCH2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "DBUS_SESSION_BUS_ADDRESS",
    "CREDENTIALS_DIRECTORY",
    "eth_sendRawTransaction",
    "transaction_broadcast",
    "payment_acceptance=true",
    "public_presale_activation=true",
    "funds_movement=true",
):
    assert forbidden not in source, forbidden

assert "os.replace(" not in source
assert "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)" in source
assert "expected_plan_id_mismatch" in source
assert "node_generation_changed_before_publication" in source
assert "git_generation_changed_before_publication" in source
assert "setpriv_generation_changed_before_publication" in source
assert "checkout_generation_changed_before_publication" in source
assert "post_publication_node_generation_changed" in source
assert "post_publication_checkout_generation_changed" in source
assert "expected_mode=0o555" in source
assert "expected_mode=0o444" in source

spec = importlib.util.spec_from_file_location("epoch2_native_install_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()
assert module.accepted_lock()["lock_id"] == module.LOCK_ID
assert module.INSTALL_ROOT == Path("/opt/void-buy-void-epoch2-live-composition-v2")
assert module.NATIVE_TARGET.name == module.NATIVE_NAME
assert module.RUNNER_TARGET.name == module.RUNNER_NAME
assert module.POLICY_TARGET.name == "policy-v1.conf"

sample = {
    "sha256": "1" * 64,
    "bytes": 12_345,
}
policy = module.build_policy("2" * 40, sample)
assert policy.decode("ascii").splitlines() == [
    "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1",
    "expected_head=" + "2" * 40,
    "runner_sha256=" + RUNNER_SHA256,
    "runner_bytes=" + str(RUNNER_BYTES),
    "node_sha256=" + "1" * 64,
    "node_bytes=12345",
]

with tempfile.TemporaryDirectory(prefix="void-e2-native-install-proof-") as td:
    td_path = Path(td)
    obj = td_path / "preentry.o"
    elf = td_path / "preentry"
    env = {
        "PATH": "/usr/bin:/bin",
        "LANG": "C",
        "LC_ALL": "C",
        "SOURCE_DATE_EPOCH": "0",
    }
    compile_cp = subprocess.run(
        [
            "/usr/bin/cc",
            "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-fno-ident",
            "-fno-pie", "-c", str(NATIVE_SOURCE), "-o", str(obj),
        ],
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    assert compile_cp.returncode == 0, compile_cp.stderr
    link_cp = subprocess.run(
        [
            "/usr/bin/cc",
            "-static", "-fno-pie", "-no-pie", "-Wl,--build-id=none",
            str(obj), "-o", str(elf),
        ],
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    assert link_cp.returncode == 0, link_cp.stderr
    strip_cp = subprocess.run(
        ["/usr/bin/strip", "--strip-all", str(elf)],
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    assert strip_cp.returncode == 0, strip_cp.stderr
    assert elf.stat().st_size == NATIVE_BYTES
    assert sha256(elf) == NATIVE_SHA256

    mode = stat.S_IMODE(elf.stat().st_mode)
    assert (mode & 0o111) != 0

    self_cp = subprocess.run(
        [str(elf), "--self-test"],
        cwd=ROOT,
        env={"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"},
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    assert self_cp.returncode == 0, self_cp.stderr
    self_lines = set(self_cp.stdout.splitlines())
    for marker in (
        "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1_SELF_TEST_GREEN",
        "fixed_self_path=true",
        "fixed_runner_path=true",
        "fixed_node_path=true",
        "runner_sha256_policy_bound=true",
        "node_sha256_policy_bound=true",
        "expected_head_policy_bound=true",
        "runner_descriptor_retained=true",
        "node_descriptor_fexecve=true",
        "stdin_javascript_source_forbidden=true",
        "credential_content_access=false",
        "transaction=false",
        "funds_movement=false",
    ):
        assert marker in self_lines, marker

source_plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    env={"PATH": "/usr/bin:/bin", "HOME": "/tmp", "LANG": "C", "LC_ALL": "C"},
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
)
plan_lines = set(source_plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "create_only=true",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "node_generation_bound_at_plan_apply=true",
    "expected_main_head_bound_at_plan_apply=true",
    "truthful_post_publication_failure_receipt_required=true",
    "protected_install_authorized=false",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "private_key_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "payment_acceptance_authorized=false",
    "public_presale_activation_authorized=false",
    "wc_void_market_activation_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in plan_lines, line

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1_PROOF_GREEN")
print("accepted_v3_lock_bound=true")
print("accepted_native_binary_rederived=true")
print("accepted_runner_bytes_bound=true")
print("fixed_node_measured_not_installed=true")
print("runtime_user_git_checkout_binding=true")
print("expected_plan_id_apply_binding=true")
print("create_only_atomic_publication=true")
print("truthful_post_publication_failure_receipt=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("wc_void_market_activation_authorized=false")
print("funds_movement_authorized=false")
