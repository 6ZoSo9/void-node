#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v3.py"
)
LOCK = (
    ROOT / "ops/security/"
    "buy-void-epoch2-live-composition-native-candidate-lock-v5.json"
)
NATIVE_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_preentry_v3.c"
)
RUNNER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
)

TARGET_BLOB = "0f09b2062d306d4368963018de2ac1a1a935c545"
LOCK_BLOB = "db59358bab68a0fa33d0840bd9afe967dd809e61"
NATIVE_SOURCE_BLOB = "5021727f1def1ec11f870d735cab65acc1701a5e"
RUNNER_SOURCE_BLOB = "baab733e43c030d24f8d4abd1644f3c4ae55c3b2"

NATIVE_SHA256 = "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES = 726_976
RUNNER_SHA256 = "f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889"
RUNNER_BYTES = 40_616


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
    'INSTALL_NAME = "void-buy-void-epoch2-live-composition-v3"',
    'STAGE_NAME = ".void-buy-void-epoch2-live-composition-v3.stage"',
    'POLICY_SCHEMA = "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V5_CREATE_ONLY"',
    'RENAME_NOREPLACE = 1',
    'READY_STATE = "EPOCH2_LIVE_COMPOSITION_V3_ROOT_ABSENT_READY_FOR_CREATE_ONLY"',
    'GREEN_STATE = "EPOCH2_LIVE_COMPOSITION_V3_PROTECTED_INSTALL_GREEN"',
    '"--no-new-privs"',
    '"--reuid=" + str(RUNTIME_UID)',
    '"--regid=" + str(RUNTIME_GID)',
    '"--clear-groups"',
    'node_generation_bound_at_plan_apply=true',
    'expected_main_head_bound_at_plan_apply=true',
    'truthful_post_publication_failure_receipt_required=true',
    'def emit_operation_authority() -> None:',
    'authority_boundary=PRE_MUTATION',
    'filesystem_mutation_possible=true',
    'filesystem_mutation_performed=false',
    'candidate_files_opened=false',
    'protected_root_opened=false',
    'sys.stdout.flush()',
    'pre_mutation_authority_boundary=true',
    'pre_mutation_authority_flush_required=true',
    'next_action=SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_CREATE_ONLY_INSTALL',
    'next_action=EPOCH2_V3_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION',
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

spec = importlib.util.spec_from_file_location("epoch2_native_install_v3", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()
assert module.accepted_lock()["lock_id"] == module.LOCK_ID
assert module.INSTALL_ROOT == Path("/opt/void-buy-void-epoch2-live-composition-v3")
assert module.NATIVE_TARGET.name == module.NATIVE_NAME
assert module.RUNNER_TARGET.name == module.RUNNER_NAME
assert module.POLICY_TARGET.name == "policy-v3.conf"

sample = {
    "sha256": "1" * 64,
    "bytes": 12_345,
}
policy = module.build_policy("2" * 40, sample)
assert policy.decode("ascii").splitlines() == [
    "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3",
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
        "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN",
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
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V3",
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
    "treasury_liquidity_action_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in plan_lines, line

class FlushProbe:
    def __init__(self) -> None:
        self.parts: list[str] = []
        self.events: list[tuple[str, str]] = []
        self.flush_count = 0

    def write(self, text: str) -> int:
        self.parts.append(text)
        self.events.append(("write", text))
        return len(text)

    def flush(self) -> None:
        self.flush_count += 1
        self.events.append(("flush", "".join(self.parts)))


probe = FlushProbe()
saved_stdout = sys.stdout
try:
    sys.stdout = probe
    module.emit_operation_authority()
finally:
    sys.stdout = saved_stdout

assert probe.flush_count == 1
assert probe.events[-1][0] == "flush"
flush_events = [event for event in probe.events if event[0] == "flush"]
assert len(flush_events) == 1
flushed_lines = flush_events[0][1].splitlines()
assert flushed_lines[:3] == [
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V3",
    "mode=apply",
    "authority_boundary=PRE_MUTATION",
]
for line in (
    "filesystem_mutation_possible=true",
    "filesystem_mutation_performed=false",
    "candidate_files_opened=false",
    "protected_root_opened=false",
    "native_execution=false",
    "runner_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "treasury_liquidity_action=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert line in flushed_lines, line

wrong_confirm = subprocess.run(
    [
        "/usr/bin/python3",
        "-I",
        "-B",
        str(TARGET),
        "--apply",
        "--native",
        "/definitely/not/a/native-v5-candidate",
        "--runner",
        "/definitely/not/a/runner-v3-candidate",
        "--expected-head",
        "1" * 40,
        "--expected-plan-id",
        "voidbuye2nativeinstallplan3_" + "2" * 64,
        "--confirm",
        "WRONG_CONFIRMATION",
    ],
    cwd=ROOT,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
    },
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
)
assert wrong_confirm.returncode == 2, wrong_confirm.stderr
assert wrong_confirm.stderr == ""
wrong_lines = wrong_confirm.stdout.splitlines()
assert wrong_lines[:3] == [
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V3",
    "mode=apply",
    "authority_boundary=PRE_MUTATION",
]
for line in (
    "filesystem_mutation_performed=false",
    "candidate_files_opened=false",
    "protected_root_opened=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "treasury_liquidity_action=false",
    "funds_movement=false",
):
    assert line in wrong_lines, line
assert wrong_lines.index("authority_boundary=PRE_MUTATION") < wrong_lines.index("status=HOLD")
assert "reason=explicit_create_only_confirmation_required" in wrong_lines


print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V3_PROOF_GREEN")
print("accepted_v5_lock_bound=true")
print("accepted_native_binary_rederived=true")
print("accepted_runner_bytes_bound=true")
print("fixed_node_measured_not_installed=true")
print("runtime_user_git_checkout_binding=true")
print("expected_plan_id_apply_binding=true")
print("create_only_atomic_publication=true")
print("truthful_post_publication_failure_receipt=true")
print("pre_mutation_authority_boundary=true")
print("pre_mutation_authority_flush_required=true")
print("wrong_confirmation_pre_mutation_hold_exercised=true")
print("candidate_files_unopened_before_confirmation=true")
print("protected_root_unopened_before_confirmation=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("wc_void_market_activation_authorized=false")
print("treasury_liquidity_action_authorized=false")
print("funds_movement_authorized=false")
