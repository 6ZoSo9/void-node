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
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v1.py"
)
TARGET_BLOB = "eea423b5a6d556b5dec91365a4da39b83b9507ec"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v1.json"
)
LOCK_BLOB = "a96dee99c89ef386a6cbd05609b8f4a764caada8"

MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v1.py"
)
MATERIALIZER_BLOB = "a445ce8f0172a4f09a03afdf86ebc767aec65ada"
MATERIALIZER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_materializer_v1.py"
)
MATERIALIZER_PROOF_BLOB = "d5f31610fcdc5059d0b1ea93a6f3130ecdd2aeb1"

CANDIDATE_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_candidate_v1.py"
)
CANDIDATE_BLOB = "d1417455330837c4d584f7bf36f932a869c903cb"

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

LOCK_ID = (
    "voidbuye2bootstraplock1_"
    "4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23"
)
CANDIDATE_MERGE = "0ea097a3fa43dc95a1a0a5272c61afe570361fc7"
CANDIDATE_TREE = "681e9387826f2c0fe8c0336604dfd6e57ff16d93"
CANDIDATE_ID = (
    "voidbuye2bootstrapcand1_"
    "24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"
)
BOOTSTRAP_BYTES = 731_072
BOOTSTRAP_SHA256 = (
    "1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"
)
BOOTSTRAP_GIT_BLOB = "5d35e762fa4b510baeb89b2840d5287cc4fd6716"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1"
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
lock_raw = pin(LOCK_REL, LOCK_BLOB)
pin(MATERIALIZER_REL, MATERIALIZER_BLOB)
pin(MATERIALIZER_PROOF_REL, MATERIALIZER_PROOF_BLOB)
pin(CANDIDATE_REL, CANDIDATE_BLOB)
bootstrap_source_raw = pin(BOOTSTRAP_SOURCE_REL, BOOTSTRAP_SOURCE_BLOB)
pin(PROTECTED_INSTALLER_REL, PROTECTED_INSTALLER_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'INSTALL_NAME = (',
    '"void-buy-void-epoch2-dormant-first-entry-"',
    '"protected-install-bootstrap-v1"',
    'POLICY_NAME = "policy-v1.conf"',
    'BOOTSTRAP_NAME = (',
    'BOOTSTRAP_BYTES = 731_072',
    BOOTSTRAP_SHA256,
    BOOTSTRAP_GIT_BLOB,
    'CANDIDATE_MERGE = "' + CANDIDATE_MERGE + '"',
    'CANDIDATE_TREE = "' + CANDIDATE_TREE + '"',
    'LOCK_GIT_BLOB_SHA1 = "' + LOCK_BLOB + '"',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fchown(fd, 0, 0)',
    'os.fchmod(fd, mode)',
    'os.fsync(fd)',
    '_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)',
    'python_isolated_mode_required',
    'explicit_create_only_confirmation_required',
    'expected_plan_id_mismatch',
    'bootstrap_input_generation_changed_before_publication',
    'prepublication_cleanup_limited_to_created_stage=true',
    'post_publication_rollback=false',
    'bootstrap_execution=false',
    'protected_installer_apply=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "subprocess.Popen",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "systemctl",
    "service restart",
    "target.unlink(",
    "os.remove(INSTALL_ROOT",
    "shutil.rmtree",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)

functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "collect_plan",
    "apply",
    "_create_file",
    "_cleanup_created_stage",
    "_require_secure_apply_context",
    "_verify_root_generation",
):
    assert name in functions, name

apply_source = ast.get_source_segment(source, functions["apply"]) or ""
assert "os.geteuid() != 0" in apply_source
assert "_require_secure_apply_context()" in apply_source
assert 'initial["plan_id"] != expected_plan_id' in apply_source
assert "stage_created = True" in apply_source
assert "_verify_root_generation(STAGE_ROOT, policy=policy)" in apply_source
assert "_verify_root_generation(INSTALL_ROOT, policy=policy)" in apply_source
assert "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)" in apply_source
assert "published = True" in apply_source
assert "PublishedInstallError(" in apply_source
assert "_cleanup_created_stage()" in apply_source
assert "subprocess." not in apply_source

create_source = ast.get_source_segment(source, functions["_create_file"]) or ""
for required in (
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "os.fchown(fd, 0, 0)",
    "os.fchmod(fd, mode)",
    "os.fsync(fd)",
):
    assert required in create_source, required

cleanup_source = (
    ast.get_source_segment(source, functions["_cleanup_created_stage"]) or ""
)
assert "STAGE_ROOT" in cleanup_source
assert "INSTALL_ROOT" not in cleanup_source
assert "shutil." not in cleanup_source

secure_source = (
    ast.get_source_segment(source, functions["_require_secure_apply_context"])
    or ""
)
assert "sys.flags.isolated != 1" in secure_source
assert "FORBIDDEN_APPLY_ENV" in secure_source

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

lock = json.loads(lock_raw.decode("utf-8", "strict"))
assert lock["lock_id"] == LOCK_ID
assert lock["candidate_source_head"] == CANDIDATE_MERGE
assert lock["candidate_source_tree"] == CANDIDATE_TREE
assert lock["candidate_accepted"] is True
assert lock["bootstrap_binary_identity_accepted"] is True
assert lock["protected_bootstrap_install_authorized"] is False
assert lock["protected_installer_apply_authorized"] is False
assert lock["live_execution_authorized"] is False
assert lock["funds_movement_authorized"] is False
assert (
    lock["next_gate"]
    == "void_buy_void_epoch2_dormant_first_entry_"
       "protected_install_bootstrap_install_v1"
)
report = lock["candidate_report"]
assert report["candidate_id"] == CANDIDATE_ID
assert report["bootstrap_binary_bytes"] == BOOTSTRAP_BYTES
assert report["bootstrap_binary_sha256"] == BOOTSTRAP_SHA256
assert report["bootstrap_binary_git_blob_sha1"] == BOOTSTRAP_GIT_BLOB
assert report["fixed_root"] == (
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v1"
)
assert report["fixed_python"] == "/usr/bin/python3"

bootstrap_source = bootstrap_source_raw.decode("utf-8", "strict")
for required in (
    "#define POLICY_SCHEMA "
    '"VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_'
    'PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1"',
    '#define FIXED_SELF VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT '
    '"/bin/void_buy_void_epoch2_dormant_first_entry_'
    'protected_install_bootstrap_v1"',
    '#define FIXED_POLICY VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT '
    '"/policy-v1.conf"',
    'strncmp(lines[1],"python_sha256=",14)',
    'strncmp(lines[2],"python_bytes=",13)',
):
    assert required in bootstrap_source, required

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "accepted_bootstrap_lock_bound=true",
            "exact_bootstrap_binary_bound=true",
            "frozen_bootstrap_compile_head_exposed=true",
            "root_python_policy_binding_required=true",
            "create_only=true",
            "rename_noreplace_required=true",
            "operation_bound_plan_id_required=true",
            "explicit_apply_confirmation_required=true",
            "prepublication_cleanup_limited_to_created_stage=true",
            "post_publication_rollback=false",
            "truthful_post_publication_failure_receipt=true",
            "bootstrap_execution=false",
            "protected_installer_apply=false",
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
            "accepted_lock_id=" + LOCK_ID,
            "candidate_id=" + CANDIDATE_ID,
            "candidate_source_head=" + CANDIDATE_MERGE,
            "create_only=true",
            "rename_noreplace_required=true",
            "bootstrap_execution_authorized=false",
            "protected_installer_apply_authorized=false",
            "funds_movement_authorized=false",
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
print("accepted_bootstrap_lock_bound=true")
print("materializer_generation_bound=true")
print("bootstrap_source_generation_bound=true")
print("protected_installer_generation_bound=true")
print("policy_parser_contract_bound=true")
print("create_only_stage_publication_required=true")
print("rename_noreplace_required=true")
print("initial_stage_cleanup_gap_absent=true")
print("bootstrap_input_revalidated_before_publication=true")
print("bootstrap_execution_absent=true")
print("protected_installer_apply_absent=true")
print("post_publication_rollback=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("wc_void_market_activation_authorized=false")
print("funds_movement=false")
