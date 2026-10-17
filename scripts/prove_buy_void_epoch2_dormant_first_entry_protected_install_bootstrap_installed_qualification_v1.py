#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_installed_qualification_v1.py"
)
TARGET_BLOB = "95b06692ff041054f6ef593197e6aa447574555f"

INSTALL_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v1.py"
)
INSTALL_BLOB = "eea423b5a6d556b5dec91365a4da39b83b9507ec"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v1.json"
)
LOCK_BLOB = "a96dee99c89ef386a6cbd05609b8f4a764caada8"

BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v1.c"
)
BOOTSTRAP_SOURCE_BLOB = "243583d4ed0522796b2bbf448abd4e9c28958f50"

PROTECTED_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_protected_install_v1.py"
)
PROTECTED_INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"

MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v1.py"
)
MATERIALIZER_BLOB = "a445ce8f0172a4f09a03afdf86ebc767aec65ada"

CANDIDATE_MERGE = "0ea097a3fa43dc95a1a0a5272c61afe570361fc7"
CANDIDATE_TREE = "681e9387826f2c0fe8c0336604dfd6e57ff16d93"
LOCK_ID = (
    "voidbuye2bootstraplock1_"
    "4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23"
)
CANDIDATE_ID = (
    "voidbuye2bootstrapcand1_"
    "24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"
)
BOOTSTRAP_SHA256 = (
    "1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"
)
BOOTSTRAP_GIT_BLOB = "5d35e762fa4b510baeb89b2840d5287cc4fd6716"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_"
    "BOOTSTRAP_INSTALLED_QUALIFICATION_V1"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
install_raw = pin(INSTALL_REL, INSTALL_BLOB)
lock_raw = pin(LOCK_REL, LOCK_BLOB)
bootstrap_source_raw = pin(BOOTSTRAP_SOURCE_REL, BOOTSTRAP_SOURCE_BLOB)
pin(PROTECTED_INSTALLER_REL, PROTECTED_INSTALLER_BLOB)
pin(MATERIALIZER_REL, MATERIALIZER_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'CANDIDATE_MERGE = "' + CANDIDATE_MERGE + '"',
    'CANDIDATE_TREE = "' + CANDIDATE_TREE + '"',
    'LOCK_GIT_BLOB_SHA1 = "' + LOCK_BLOB + '"',
    BOOTSTRAP_SHA256,
    BOOTSTRAP_GIT_BLOB,
    'BOOTSTRAP_TARGET = INSTALL_ROOT / BIN_DIR / BOOTSTRAP_NAME',
    'POLICY_TARGET = INSTALL_ROOT / POLICY_NAME',
    'bootstrap_compile_head_matches_current_checkout',
    'protected_installer_execution_readiness',
    'reason=bootstrap_compile_expected_head_not_current_checkout',
    'installed_identity_green=true',
    'bootstrap_execution_performed=false',
    'protected_installer_apply_performed=false',
    'filesystem_write=false',
    'service_mutation=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    "os.unlink(",
    ".unlink(",
    "os.remove(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "subprocess.Popen",
    "systemctl",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "checkout_snapshot",
    "accepted_lock",
    "inspect_installed_root",
    "inspect_current_installer",
    "collect",
    "emit",
    "source_plan",
    "self_test",
):
    assert name in functions, name

run_calls_outside_git: list[str] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr == "run"
            and name != "_git"
        ):
            run_calls_outside_git.append(name)
assert run_calls_outside_git == []

collect_source = ast.get_source_segment(source, functions["collect"]) or ""
assert "inspect_installed_root(policy)" in collect_source
assert "inspect_current_installer(expected_head)" in collect_source
assert "expected_head == CANDIDATE_MERGE" in collect_source
assert '"bootstrap_execution_performed": False' in collect_source
assert '"protected_installer_apply_performed": False' in collect_source
assert '"filesystem_write": False' in collect_source

emit_source = ast.get_source_segment(source, functions["emit"]) or ""
assert 'print("status=GREEN")' in emit_source
assert 'print("status=HOLD")' in emit_source
assert "bootstrap_compile_expected_head_not_current_checkout" in emit_source
assert "return 2" in emit_source

lock = json.loads(lock_raw.decode("utf-8", "strict"))
assert lock["lock_id"] == LOCK_ID
assert lock["candidate_source_head"] == CANDIDATE_MERGE
assert lock["candidate_source_tree"] == CANDIDATE_TREE
assert lock["candidate_accepted"] is True
assert lock["bootstrap_binary_identity_accepted"] is True
assert lock["protected_bootstrap_install_authorized"] is False
assert lock["protected_installer_apply_authorized"] is False
assert lock["funds_movement_authorized"] is False
report = lock["candidate_report"]
assert report["candidate_id"] == CANDIDATE_ID
assert report["bootstrap_binary_sha256"] == BOOTSTRAP_SHA256
assert report["bootstrap_binary_git_blob_sha1"] == BOOTSTRAP_GIT_BLOB

install_source = install_raw.decode("utf-8", "strict")
for required in (
    "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_",
    "PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1",
    "bootstrap_execution=false",
    "protected_installer_apply=false",
):
    assert required in install_source, required

bootstrap_source = bootstrap_source_raw.decode("utf-8", "strict")
for required in (
    '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD=',
    '#define EXPECTED_HEAD VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD',
    'strcmp(argv[7],EXPECTED_HEAD)',
):
    assert required in bootstrap_source, required

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "accepted_bootstrap_lock_bound=true",
            "exact_installed_bootstrap_identity_required=true",
            "exact_policy_generation_required=true",
            "exact_protected_installer_source_required=true",
            "bootstrap_compile_head_alignment_classified=true",
            "bootstrap_execution=false",
            "protected_installer_apply=false",
            "filesystem_write=false",
            "service_mutation=false",
            "funds_movement=false",
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
            "read_only=true",
            "accepted_lock_id=" + LOCK_ID,
            "candidate_id=" + CANDIDATE_ID,
            "bootstrap_compile_expected_head=" + CANDIDATE_MERGE,
            "installed_bootstrap_execution=false",
            "protected_installer_apply=false",
            "filesystem_write=false",
            "service_mutation=false",
            "funds_movement=false",
        ),
    ),
):
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(target), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 0, (mode, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for expected in expected_lines:
        assert expected in lines, (mode, expected)

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("protected_bootstrap_install_source_bound=true")
print("accepted_bootstrap_lock_bound=true")
print("materializer_generation_bound=true")
print("bootstrap_source_expected_head_contract_bound=true")
print("protected_installer_source_generation_bound=true")
print("read_only_no_mutation_calls=true")
print("installed_bootstrap_execution_absent=true")
print("protected_installer_apply_absent=true")
print("compile_head_alignment_classified=true")
print("compile_head_mismatch_fails_closed=true")
print("filesystem_write=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
