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
    "void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
)
LOCK = (
    ROOT / "ops/security/"
    "buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
)
NATIVE_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_preentry_v3.c"
)
RUNNER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
)
QUALIFIER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_user_manager_credential_query_installed_qualification_v3r.py"
)

TARGET_BLOB = "2f1a834e378c3ae8062140079c43beb16fad9d14"
LOCK_BLOB = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"
NATIVE_SOURCE_BLOB = "5021727f1def1ec11f870d735cab65acc1701a5e"
RUNNER_SOURCE_BLOB = "499df9b94b5b89354837570da0c7e47ec280025d"
QUALIFIER_SOURCE_BLOB = "74c69fe8a95ed5f361a39971618f43f7c768c865"

NATIVE_SHA256 = "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES = 726_976
RUNNER_SHA256 = "7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94"
RUNNER_BYTES = 45_147
PREDECESSOR_NATIVE_SHA256 = "09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4"
PREDECESSOR_RUNNER_SHA256 = "f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889"
PREDECESSOR_POLICY_SHA256 = "d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc"


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
assert git_blob(QUALIFIER_SOURCE.read_bytes()) == QUALIFIER_SOURCE_BLOB
assert RUNNER_SOURCE.stat().st_size == RUNNER_BYTES
assert sha256(RUNNER_SOURCE) == RUNNER_SHA256

source = TARGET.read_text("utf-8")
for required in (
    'MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5"',
    'LOCK_GIT_BLOB_SHA1 = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"',
    'RUNNER_SOURCE_BLOB = "499df9b94b5b89354837570da0c7e47ec280025d"',
    'QUALIFIER_BLOB = "74c69fe8a95ed5f361a39971618f43f7c768c865"',
    'STAGE_NAME = ".void-buy-void-epoch2-live-composition-v3.upgrade-v6r2.stage"',
    'PREDECESSOR_NAME = ".void-buy-void-epoch2-live-composition-v3.predecessor-v4"',
    'CONFIRM_TOKEN = "ATOMIC_EXCHANGE_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V4_TO_V6R2"',
    'RENAME_NOREPLACE = 1',
    'RENAME_EXCHANGE = 2',
    'READY_STATE = "EPOCH2_LIVE_COMPOSITION_V3_V4_PREDECESSOR_READY_FOR_V6R2_ATOMIC_UPGRADE"',
    'GREEN_STATE = "EPOCH2_LIVE_COMPOSITION_V3_V6R2_GREEN_WITH_V4_PREDECESSOR"',
    'atomic_root_exchange_required=true',
    'predecessor_retention_required=true',
    'automatic_rollback_required=true',
    'authority_boundary=PRE_MUTATION',
    'filesystem_mutation_performed=false',
    'candidate_files_opened=false',
    'protected_root_opened=false',
    'sys.stdout.flush()',
    '_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_EXCHANGE)',
    '_renameat2(opt_fd, STAGE_NAME, PREDECESSOR_NAME, RENAME_NOREPLACE)',
    '_renameat2(opt_fd, PREDECESSOR_NAME, INSTALL_NAME, RENAME_EXCHANGE)',
    'automatic_rollback_attempted=',
    'automatic_rollback_green=',
    'protected_upgrade_performed=true',
    'predecessor_retained=true',
    'next_action=EPOCH2_V6R2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "DBUS_SESSION_BUS_ADDRESS",
    "CREDENTIALS_DIRECTORY",
    "eth_sendRawTransaction",
    "payment_acceptance=true",
    "public_presale_activation=true",
    "funds_movement=true",
    "candidate_lock_v5",
    "baab733e43c030d24f8d4abd1644f3c4ae55c3b2",
    "70b74ff2f09f5aef86eec39b8f643d8f2ebb63f5",
    "def main() -> int:def main",
    "def inspect_candidates(def inspect_candidates",
    "def _renameat2(def _renameat2",
):
    assert forbidden not in source, forbidden

assert "os.replace(" not in source
assert "expected_plan_id_mismatch" in source
assert "node_generation_changed_before_exchange" in source
assert "checkout_generation_changed_before_exchange" in source
assert "node_generation_changed_after_exchange" in source
assert "checkout_generation_changed_after_exchange" in source
assert "upgrade_auxiliary_root_present" in source
assert "upgrade_predecessor_root_missing" in source
assert "atomic_upgrade_rollback_failed" in source

spec = importlib.util.spec_from_file_location("epoch2_native_upgrade_v4", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()
lock = module.accepted_lock()
assert lock["lock_id"] == module.LOCK_ID
assert lock["candidate_id"] if "candidate_id" in lock else True
assert module.NATIVE_SHA256 == NATIVE_SHA256
assert module.RUNNER_SHA256 == RUNNER_SHA256
assert module.PREDECESSOR_NATIVE_SHA256 == PREDECESSOR_NATIVE_SHA256
assert module.PREDECESSOR_RUNNER_SHA256 == PREDECESSOR_RUNNER_SHA256
assert module.PREDECESSOR_POLICY_SHA256 == PREDECESSOR_POLICY_SHA256

sample = {"sha256": "1" * 64, "bytes": 12_345}
policy = module.build_policy("2" * 40, sample)
assert policy.decode("ascii").splitlines() == [
    "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3",
    "expected_head=" + "2" * 40,
    "runner_sha256=" + RUNNER_SHA256,
    "runner_bytes=" + str(RUNNER_BYTES),
    "node_sha256=" + "1" * 64,
    "node_bytes=12345",
]

# Classify READY/GREEN without touching /opt.
orig_trusted = module._trusted_root_directory
orig_exists = module._exists
orig_verify_new = module._verify_install_root
orig_verify_old = module._verify_predecessor_root
events: list[tuple[str, str]] = []
try:
    module._trusted_root_directory = lambda *_args, **_kwargs: None

    def ready_exists(path):
        if path == module.STAGE_ROOT:
            return False
        if path == module.INSTALL_ROOT:
            return True
        if path == module.PREDECESSOR_ROOT:
            return False
        return False

    module._exists = ready_exists
    module._verify_install_root = lambda _policy: events.append(("new", "install"))
    module._verify_predecessor_root = (
        lambda root=module.INSTALL_ROOT: events.append(("old", str(root)))
    )
    events.clear()
    state = module.protected_state(policy)
    assert state == module.READY_STATE
    assert events == [("old", str(module.INSTALL_ROOT))]

    def green_exists(path):
        if path == module.STAGE_ROOT:
            return False
        if path in (module.INSTALL_ROOT, module.PREDECESSOR_ROOT):
            return True
        return False

    module._exists = green_exists
    events.clear()
    state = module.protected_state(policy)
    assert state == module.GREEN_STATE
    assert events == [
        ("new", "install"),
        ("old", str(module.PREDECESSOR_ROOT)),
    ]

    module._exists = lambda path: path == module.STAGE_ROOT
    try:
        module.protected_state(policy)
    except module.InstallError as exc:
        assert str(exc) == "upgrade_staging_root_present"
    else:
        raise AssertionError("staging residue unexpectedly accepted")

    module._exists = lambda _path: False
    try:
        module.protected_state(policy)
    except module.InstallError as exc:
        assert str(exc) == "upgrade_predecessor_root_missing"
    else:
        raise AssertionError("missing predecessor unexpectedly accepted")
finally:
    module._trusted_root_directory = orig_trusted
    module._exists = orig_exists
    module._verify_install_root = orig_verify_new
    module._verify_predecessor_root = orig_verify_old

# Re-derive the accepted static native identity.
with tempfile.TemporaryDirectory(prefix="void-e2-native-upgrade-v4-proof-") as td:
    td_path = Path(td)
    obj = td_path / "preentry.o"
    elf = td_path / "preentry"
    env = {
        "PATH": "/usr/bin:/bin",
        "LANG": "C",
        "LC_ALL": "C",
        "SOURCE_DATE_EPOCH": "0",
    }
    cp = subprocess.run(
        [
            "/usr/bin/cc",
            "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-fno-ident",
            "-fno-pie", "-c", str(NATIVE_SOURCE), "-o", str(obj),
        ],
        cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    assert cp.returncode == 0, cp.stderr
    cp = subprocess.run(
        [
            "/usr/bin/cc", "-static", "-fno-pie", "-no-pie",
            "-Wl,--build-id=none", str(obj), "-o", str(elf),
        ],
        cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    assert cp.returncode == 0, cp.stderr
    cp = subprocess.run(
        ["/usr/bin/strip", "--strip-all", str(elf)],
        cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    assert cp.returncode == 0, cp.stderr
    assert elf.stat().st_size == NATIVE_BYTES
    assert sha256(elf) == NATIVE_SHA256
    assert stat.S_IMODE(elf.stat().st_mode) & 0o111

    cp = subprocess.run(
        [str(elf), "--self-test"],
        cwd=ROOT,
        env={"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"},
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    assert cp.returncode == 0, cp.stderr
    assert "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN" in cp.stdout

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
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "create_only=false",
    "atomic_root_exchange_required=true",
    "predecessor_retention_required=true",
    "automatic_rollback_required=true",
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
flushed_lines = probe.events[-1][1].splitlines()
assert flushed_lines[:3] == [
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5",
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
    "funds_movement=false",
):
    assert line in flushed_lines, line

wrong_confirm = subprocess.run(
    [
        "/usr/bin/python3", "-I", "-B", str(TARGET), "--apply",
        "--native", "/definitely/not/a/native-v6r2-candidate",
        "--runner", "/definitely/not/a/runner-v3-candidate",
        "--expected-head", "1" * 40,
        "--expected-plan-id", "voidbuye2nativeupgrade5_" + "2" * 64,
        "--confirm", "WRONG_CONFIRMATION",
    ],
    cwd=ROOT,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
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
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5",
    "mode=apply",
    "authority_boundary=PRE_MUTATION",
]
assert "reason=explicit_atomic_upgrade_confirmation_required" in wrong_lines
assert "filesystem_mutation_performed=false" in wrong_lines
assert "candidate_files_opened=false" in wrong_lines
assert "protected_root_opened=false" in wrong_lines
assert wrong_lines.index("authority_boundary=PRE_MUTATION") < wrong_lines.index("status=HOLD")

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5_PROOF_GREEN")
print("accepted_v6r2_lock_bound=true")
print("accepted_native_binary_rederived=true")
print("repaired_runner_bytes_bound=true")
print("repaired_v3r_qualifier_bound=true")
print("predecessor_generation_exact=true")
print("ready_green_state_machine_exercised=true")
print("atomic_root_exchange_primitive_exercised=true")
print("predecessor_retention_required=true")
print("automatic_rollback_required=true")
print("runtime_user_git_checkout_binding=true")
print("expected_plan_id_apply_binding=true")
print("checkout_tool_generation_bracketed=true")
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
