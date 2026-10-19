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

TARGET_BLOB = "fd7a06490ccf6fb14831d8b0372a892e2764c9dc"
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
    'publication_state=atomic_exchange_verified',
    'final_state_verified=true',
    'install_parent_close_failed_after_upgrade',
    'published_verified_close_failed',
    'post_upgrade_close_receipt_truthful=true',
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


def run_synthetic_apply_case(case: str):
    events: list[tuple] = []
    expected_head = "3" * 40
    plan_id = "voidbuye2nativeupgrade5_" + "4" * 64
    body = {
        "protected_state": module.READY_STATE,
        "git_tool": {"sha256": "5" * 64},
        "setpriv_tool": {"sha256": "6" * 64},
        "node": {"sha256": "7" * 64, "bytes": 12345},
        "checkout": {"head": expected_head, "branch": "main"},
    }
    policy = b"synthetic-policy\n"
    counts = {
        "open": 0,
        "fsync": 0,
        "rename": 0,
        "install_verify": 0,
        "node": 0,
        "checkout": 0,
    }

    originals = {
        "emit_operation_authority": module.emit_operation_authority,
        "_require_secure_apply_context": module._require_secure_apply_context,
        "inspect_candidates": module.inspect_candidates,
        "collect_plan": module.collect_plan,
        "_exists": module._exists,
        "_verify_predecessor_root": module._verify_predecessor_root,
        "_verify_install_root": module._verify_install_root,
        "_verify_root_generation": module._verify_root_generation,
        "checkout_snapshot_with_tools": module.checkout_snapshot_with_tools,
        "node_snapshot": module.node_snapshot,
        "_create_file": module._create_file,
        "_renameat2": module._renameat2,
        "_cleanup_stage": module._cleanup_stage,
        "geteuid": module.os.geteuid,
        "open": module.os.open,
        "mkdir": module.os.mkdir,
        "fchown": module.os.fchown,
        "fchmod": module.os.fchmod,
        "fsync": module.os.fsync,
        "close": module.os.close,
    }

    module.emit_operation_authority = lambda: events.append(("authority",))
    module._require_secure_apply_context = lambda: events.append(("secure_context",))
    module.inspect_candidates = lambda _native, _runner: (b"native", b"runner")
    module.collect_plan = lambda _native, _runner, _head: {
        "plan_id": plan_id,
        "body": body,
        "policy": policy,
    }
    module._exists = lambda _path: False

    def verify_predecessor(root=module.INSTALL_ROOT):
        events.append(("verify_predecessor", str(root)))

    module._verify_predecessor_root = verify_predecessor

    def verify_install(_policy):
        counts["install_verify"] += 1
        events.append(("verify_install", counts["install_verify"]))
        if case in (
            "after_first_exchange_failure",
            "rollback_cleanup_ambiguous",
            "rollback_failure",
        ) and counts["install_verify"] == 1:
            raise module.InstallError("synthetic_after_first_exchange")
        if case == "after_predecessor_retention_failure" and counts["install_verify"] == 2:
            raise module.InstallError("synthetic_after_predecessor_retention")

    module._verify_install_root = verify_install
    module._verify_root_generation = (
        lambda root, **_kwargs: events.append(("verify_stage", str(root)))
    )
    def synthetic_checkout(_head, **_kwargs):
        counts["checkout"] += 1
        if case == "checkout_binding_drift_after_exchange" and counts["checkout"] >= 2:
            return {
                "checkout": {"head": "9" * 40, "branch": "main"},
                "git_tool": body["git_tool"],
                "setpriv_tool": body["setpriv_tool"],
            }
        return {
            "checkout": body["checkout"],
            "git_tool": body["git_tool"],
            "setpriv_tool": body["setpriv_tool"],
        }

    def synthetic_node_snapshot():
        counts["node"] += 1
        if case == "node_binding_drift_after_exchange" and counts["node"] >= 2:
            return {"sha256": "8" * 64, "bytes": 12345}
        return body["node"]

    module.checkout_snapshot_with_tools = synthetic_checkout
    module.node_snapshot = synthetic_node_snapshot
    module._create_file = (
        lambda _fd, name, _raw, **_kwargs: events.append(("create_file", name))
    )

    def rename(_fd, source, target, flags):
        counts["rename"] += 1
        events.append(("rename", source, target, flags))
        if case == "rollback_failure" and counts["rename"] == 2:
            raise module.InstallError("synthetic_rollback_rename_failure")

    module._renameat2 = rename

    def cleanup(_fd):
        green = case != "rollback_cleanup_ambiguous"
        events.append(("cleanup_stage", green))
        return green

    module._cleanup_stage = cleanup
    module.os.geteuid = lambda: 0

    def fake_open(*_args, **_kwargs):
        counts["open"] += 1
        fd = 100 if counts["open"] == 1 else 101
        events.append(("open", fd))
        return fd

    module.os.open = fake_open
    module.os.mkdir = (
        lambda name, mode, **_kwargs: events.append(("mkdir", name, mode))
    )
    module.os.fchown = lambda fd, uid, gid: events.append(("fchown", fd, uid, gid))
    module.os.fchmod = lambda fd, mode: events.append(("fchmod", fd, mode))

    def fake_fsync(fd):
        counts["fsync"] += 1
        events.append(("fsync", fd, counts["fsync"]))
        if case == "fsync_after_exchange_failure" and counts["fsync"] == 2:
            raise OSError(5, "synthetic_post_exchange_fsync_failure")

    module.os.fsync = fake_fsync

    def fake_close(fd):
        events.append(("close", fd))
        if case == "success_close_failure" and fd == 100:
            raise OSError(5, "synthetic_success_close_failure")

    module.os.close = fake_close

    probe = FlushProbe()
    saved_stdout = sys.stdout
    caught = None
    try:
        sys.stdout = probe
        try:
            module.apply(
                Path("/synthetic/native"),
                Path("/synthetic/runner"),
                expected_head,
                plan_id,
                module.CONFIRM_TOKEN,
            )
        except BaseException as exc:
            caught = exc
    finally:
        sys.stdout = saved_stdout
        module.emit_operation_authority = originals["emit_operation_authority"]
        module._require_secure_apply_context = originals["_require_secure_apply_context"]
        module.inspect_candidates = originals["inspect_candidates"]
        module.collect_plan = originals["collect_plan"]
        module._exists = originals["_exists"]
        module._verify_predecessor_root = originals["_verify_predecessor_root"]
        module._verify_install_root = originals["_verify_install_root"]
        module._verify_root_generation = originals["_verify_root_generation"]
        module.checkout_snapshot_with_tools = originals["checkout_snapshot_with_tools"]
        module.node_snapshot = originals["node_snapshot"]
        module._create_file = originals["_create_file"]
        module._renameat2 = originals["_renameat2"]
        module._cleanup_stage = originals["_cleanup_stage"]
        module.os.geteuid = originals["geteuid"]
        module.os.open = originals["open"]
        module.os.mkdir = originals["mkdir"]
        module.os.fchown = originals["fchown"]
        module.os.fchmod = originals["fchmod"]
        module.os.fsync = originals["fsync"]
        module.os.close = originals["close"]

    return caught, events, "".join(probe.parts).splitlines()


success_exc, success_events, success_lines = run_synthetic_apply_case("success")
assert success_exc is None
assert "protected_upgrade_performed=true" in success_lines
assert "publication_state=atomic_exchange_verified" in success_lines
assert "final_state_verified=true" in success_lines
assert [
    event for event in success_events if event[0] == "rename"
] == [
    ("rename", module.STAGE_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
    ("rename", module.STAGE_NAME, module.PREDECESSOR_NAME, module.RENAME_NOREPLACE),
]

first_exc, first_events, first_lines = run_synthetic_apply_case(
    "after_first_exchange_failure"
)
assert isinstance(first_exc, module.PublishedInstallError)
assert str(first_exc) == "atomic_upgrade_rolled_back_after_failure"
first_receipt = module._failure_receipt(first_exc)
assert first_receipt["protected_upgrade_performed"] == "true"
assert first_receipt["publication"] == "true"
assert first_receipt["publication_state"] == "published_rolled_back_green"
assert first_receipt["final_state_verified"] == "true"
assert first_receipt["parent_fsync_completed"] == "true"
assert first_receipt["final_verification_completed"] == "false"
assert first_receipt["rollback_attempted"] == "true"
assert first_receipt["rollback_green"] == "true"
assert first_receipt["rollback_final_state_verified"] == "true"
assert "automatic_rollback_final_state_verified=true" in first_lines
assert first_receipt["original_failure_class"] == "InstallError"
assert "automatic_rollback_attempted=true" in first_lines
assert "automatic_rollback_green=true" in first_lines
assert [
    event for event in first_events if event[0] == "rename"
] == [
    ("rename", module.STAGE_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
    ("rename", module.STAGE_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
]

retained_exc, retained_events, retained_lines = run_synthetic_apply_case(
    "after_predecessor_retention_failure"
)
assert isinstance(retained_exc, module.PublishedInstallError)
assert str(retained_exc) == "atomic_upgrade_rolled_back_after_failure"
retained_receipt = module._failure_receipt(retained_exc)
assert retained_receipt["publication"] == "true"
assert retained_receipt["publication_state"] == "published_rolled_back_green"
assert retained_receipt["final_state_verified"] == "true"
assert retained_receipt["rollback_attempted"] == "true"
assert retained_receipt["rollback_green"] == "true"
assert retained_receipt["rollback_final_state_verified"] == "true"
assert retained_receipt["original_failure_class"] == "InstallError"
assert "automatic_rollback_attempted=true" in retained_lines
assert "automatic_rollback_green=true" in retained_lines
assert [
    event for event in retained_events if event[0] == "rename"
] == [
    ("rename", module.STAGE_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
    ("rename", module.STAGE_NAME, module.PREDECESSOR_NAME, module.RENAME_NOREPLACE),
    ("rename", module.PREDECESSOR_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
    ("rename", module.PREDECESSOR_NAME, module.STAGE_NAME, module.RENAME_NOREPLACE),
]

fsync_exc, fsync_events, fsync_lines = run_synthetic_apply_case(
    "fsync_after_exchange_failure"
)
assert isinstance(fsync_exc, module.PublishedInstallError)
assert str(fsync_exc) == "atomic_upgrade_rolled_back_after_failure"
fsync_receipt = module._failure_receipt(fsync_exc)
assert fsync_receipt["publication"] == "true"
assert fsync_receipt["publication_state"] == "published_rolled_back_green"
assert fsync_receipt["final_state_verified"] == "true"
assert fsync_receipt["parent_fsync_completed"] == "false"
assert fsync_receipt["rollback_attempted"] == "true"
assert fsync_receipt["rollback_green"] == "true"
assert fsync_receipt["rollback_final_state_verified"] == "true"
assert fsync_receipt["original_failure_class"] == "OSError"
assert fsync_receipt["original_failure_reason"] == "os_error_5"
assert "automatic_rollback_attempted=true" in fsync_lines
assert "automatic_rollback_green=true" in fsync_lines
assert len([event for event in fsync_events if event[0] == "rename"]) == 2

ambiguous_exc, ambiguous_events, ambiguous_lines = run_synthetic_apply_case(
    "rollback_cleanup_ambiguous"
)
assert isinstance(ambiguous_exc, module.PublishedInstallError)
assert str(ambiguous_exc) == "atomic_upgrade_rollback_failed"
ambiguous_receipt = module._failure_receipt(ambiguous_exc)
assert ambiguous_receipt["protected_upgrade_performed"] == "true"
assert ambiguous_receipt["publication"] == "true"
assert ambiguous_receipt["publication_state"] == "published_needs_inspection"
assert ambiguous_receipt["final_state_verified"] == "false"
assert ambiguous_receipt["publication_failure_phase"] == "atomic_upgrade_rollback"
assert ambiguous_receipt["rollback_attempted"] == "true"
assert ambiguous_receipt["rollback_green"] == "false"
assert ambiguous_receipt["rollback_final_state_verified"] == "false"
assert "automatic_rollback_attempted=true" in ambiguous_lines
assert "automatic_rollback_green=false" in ambiguous_lines
assert ("cleanup_stage", False) in ambiguous_events
assert [
    event for event in ambiguous_events if event[0] == "rename"
] == [
    ("rename", module.STAGE_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
    ("rename", module.STAGE_NAME, module.INSTALL_NAME, module.RENAME_EXCHANGE),
]

rollback_exc, rollback_events, rollback_lines = run_synthetic_apply_case(
    "rollback_failure"
)
assert isinstance(rollback_exc, module.PublishedInstallError)
assert str(rollback_exc) == "atomic_upgrade_rollback_failed"
rollback_receipt = module._failure_receipt(rollback_exc)
assert rollback_receipt["protected_upgrade_performed"] == "true"
assert rollback_receipt["publication"] == "true"
assert rollback_receipt["publication_state"] == "published_needs_inspection"
assert rollback_receipt["final_state_verified"] == "false"
assert rollback_receipt["rollback_attempted"] == "true"
assert rollback_receipt["rollback_green"] == "false"
assert rollback_receipt["rollback_final_state_verified"] == "false"
assert "automatic_rollback_green=false" in rollback_lines
assert len([event for event in rollback_events if event[0] == "rename"]) == 2

node_drift_exc, node_drift_events, node_drift_lines = run_synthetic_apply_case(
    "node_binding_drift_after_exchange"
)
assert isinstance(node_drift_exc, module.PublishedInstallError)
assert str(node_drift_exc) == "atomic_upgrade_rolled_back_after_failure"
node_drift_receipt = module._failure_receipt(node_drift_exc)
assert node_drift_receipt["publication_state"] == "published_rolled_back_green"
assert node_drift_receipt["rollback_attempted"] == "true"
assert node_drift_receipt["rollback_green"] == "true"
assert node_drift_receipt["rollback_final_state_verified"] == "false"
assert node_drift_receipt["final_state_verified"] == "false"
assert node_drift_receipt["original_failure_class"] == "InstallError"
assert "automatic_rollback_green=true" in node_drift_lines
assert "automatic_rollback_final_state_verified=false" in node_drift_lines
assert len([event for event in node_drift_events if event[0] == "rename"]) == 2

checkout_drift_exc, checkout_drift_events, checkout_drift_lines = run_synthetic_apply_case(
    "checkout_binding_drift_after_exchange"
)
assert isinstance(checkout_drift_exc, module.PublishedInstallError)
assert str(checkout_drift_exc) == "atomic_upgrade_rolled_back_after_failure"
checkout_drift_receipt = module._failure_receipt(checkout_drift_exc)
assert checkout_drift_receipt["publication_state"] == "published_rolled_back_green"
assert checkout_drift_receipt["rollback_attempted"] == "true"
assert checkout_drift_receipt["rollback_green"] == "true"
assert checkout_drift_receipt["rollback_final_state_verified"] == "false"
assert checkout_drift_receipt["final_state_verified"] == "false"
assert checkout_drift_receipt["original_failure_class"] == "InstallError"
assert "automatic_rollback_green=true" in checkout_drift_lines
assert "automatic_rollback_final_state_verified=false" in checkout_drift_lines
assert len([event for event in checkout_drift_events if event[0] == "rename"]) == 2

close_exc, close_events, _close_lines = run_synthetic_apply_case(
    "success_close_failure"
)
assert isinstance(close_exc, module.PublishedInstallError)
assert str(close_exc) == "install_parent_close_failed_after_upgrade"
close_receipt = module._failure_receipt(close_exc)
assert close_receipt == {
    "protected_upgrade_performed": "true",
    "publication": "true",
    "publication_state": "published_verified_close_failed",
    "final_state_verified": "true",
    "publication_failure_phase": "install_parent_close",
    "parent_fsync_completed": "true",
    "final_verification_completed": "true",
    "rollback_attempted": "false",
    "rollback_green": "unknown",
    "rollback_final_state_verified": "unknown",
    "original_failure_class": "OSError",
    "original_failure_reason": "os_error_5",
    "install_parent_close_completed": "false",
    "close_failure_class": "OSError",
    "close_failure_reason": "os_error_5",
}
assert ("close", 100) in close_events

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
print("production_apply_state_machine_synthetic_exercised=true")
print("post_first_exchange_rollback_exercised=true")
print("post_predecessor_retention_rollback_exercised=true")
print("green_rollback_publication_receipt_truthful=true")
print("post_exchange_oserror_receipt_truthful=true")
print("post_rollback_plan_binding_revalidation=true")
print("node_drift_after_rollback_final_state_unverified=true")
print("checkout_drift_after_rollback_final_state_unverified=true")
print("rollback_cleanup_ambiguity_exercised=true")
print("rollback_cleanup_publication_receipt_truthful=true")
print("rollback_failure_receipt_exercised=true")
print("post_exchange_fsync_failure_exercised=true")
print("success_close_receipt_truthful=true")
print("post_upgrade_close_receipt_truthful=true")
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
