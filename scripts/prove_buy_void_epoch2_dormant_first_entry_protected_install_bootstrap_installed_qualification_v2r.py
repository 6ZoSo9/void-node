#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_"
    "BOOTSTRAP_INSTALLED_QUALIFICATION_V2R"
)

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_installed_qualification_v2r.py"
)
TARGET_BLOB = "c6b1236de5eac88dd29ea84ef8b66ccd6e71a043"

INSTALL_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v2r.py"
)
INSTALL_BLOB = "f8355b728b4c6870b92b10a0c19f154cf9c2ab51"
INSTALL_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v2r.py"
)
INSTALL_PROOF_BLOB = "bfae4e1c9a3875b07e92c2b4051f31d56510e0ca"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v3.json"
)
LOCK_BLOB = "64c9a42ca1108a9e8f88218c34d53e50668c653e"

MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v2r.py"
)
MATERIALIZER_BLOB = "f79e52b5d0af99194b0cf89a73ae5bf3285d3840"
MATERIALIZER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_materializer_v2r.py"
)
MATERIALIZER_PROOF_BLOB = "c66bcd1f1d0d4751de475d5d6c1c98cab1eba31a"

BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v2.c"
)
BOOTSTRAP_SOURCE_BLOB = "19f9baf8d6d707da43dbd0e247667af1a10e46c5"

PROTECTED_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_protected_install_v1.py"
)
PROTECTED_INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"

CANDIDATE_MERGE = "344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b"
CANDIDATE_TREE = "4085987d856fa303b8bc81087e3b5a207bc8964f"
LOCK_ID = (
    "voidbuye2bootstraplock3_"
    "690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f"
)
CANDIDATE_ID = (
    "voidbuye2bootstrapcand2_"
    "b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def"
)
BOOTSTRAP_SHA256 = (
    "37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276"
)
BOOTSTRAP_GIT_BLOB = "45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62"


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
pin(INSTALL_PROOF_REL, INSTALL_PROOF_BLOB)
lock_raw = pin(LOCK_REL, LOCK_BLOB)
materializer_raw = pin(MATERIALIZER_REL, MATERIALIZER_BLOB)
pin(MATERIALIZER_PROOF_REL, MATERIALIZER_PROOF_BLOB)
bootstrap_source_raw = pin(BOOTSTRAP_SOURCE_REL, BOOTSTRAP_SOURCE_BLOB)
pin(PROTECTED_INSTALLER_REL, PROTECTED_INSTALLER_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'LOCK_GIT_BLOB_SHA1 = "' + LOCK_BLOB + '"',
    'CANDIDATE_MERGE = "' + CANDIDATE_MERGE + '"',
    'CANDIDATE_TREE = "' + CANDIDATE_TREE + '"',
    BOOTSTRAP_SHA256,
    BOOTSTRAP_GIT_BLOB,
    'BOOTSTRAP_TARGET = INSTALL_ROOT / BIN_DIR / BOOTSTRAP_NAME',
    'POLICY_TARGET = INSTALL_ROOT / POLICY_NAME',
    '"bootstrap_runtime_head_compile_bound": False',
    '"runtime_expected_head_strict_lowercase_hex": True',
    '"runtime_expected_head_forwarded_unchanged": True',
    '"canonical_main_candidate_authority": True',
    '"superseded_v2_lock_install_authority": False',
    '"protected_installer_execution_readiness": True',
    'runtime_head_contract_green=true',
    '"GIT_NO_LAZY_FETCH": "1"',
    '"GIT_ALLOW_PROTOCOL": ""',
    '"core.hooksPath=/dev/null"',
    '"core.fsmonitor=false"',
    'next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_',
    'PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V2R',
    'bootstrap_execution_performed=false',
    'protected_installer_apply_performed=false',
    'filesystem_write=false',
    'service_mutation=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "bootstrap_compile_head_matches_current_checkout",
    "bootstrap_compile_expected_head_not_current_checkout",
    "REQUIRE_BOOTSTRAP_EXPECTED_HEAD_ALIGNMENT",
    "bootstrap_compile_expected_head=",
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V1",
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
for required in (
    "inspect_installed_root(policy)",
    "inspect_current_installer(expected_head)",
    '"bootstrap_runtime_head_compile_bound": False',
    '"runtime_expected_head_strict_lowercase_hex": True',
    '"runtime_expected_head_forwarded_unchanged": True',
    '"canonical_main_candidate_authority": True',
    '"superseded_v2_lock_install_authority": False',
    '"protected_installer_execution_readiness": True',
    '"bootstrap_execution_performed": False',
    '"protected_installer_apply_performed": False',
    '"filesystem_write": False',
):
    assert required in collect_source, required
assert "expected_head == CANDIDATE_MERGE" not in collect_source

emit_source = ast.get_source_segment(source, functions["emit"]) or ""
assert 'print("status=GREEN")' in emit_source
assert "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V2R" in emit_source
assert "bootstrap_compile_expected_head_not_current_checkout" not in emit_source
assert "REQUIRE_BOOTSTRAP_EXPECTED_HEAD_ALIGNMENT" not in emit_source

lock = json.loads(lock_raw.decode("utf-8", "strict"))
assert lock["lock_id"] == LOCK_ID
assert lock["candidate_source_head"] == CANDIDATE_MERGE
assert lock["candidate_source_tree"] == CANDIDATE_TREE
assert lock["candidate_merge"] == CANDIDATE_MERGE
assert lock["candidate_accepted"] is True
assert lock["bootstrap_binary_identity_accepted"] is True
assert lock["bootstrap_source_identity_bound"] is True
assert lock["installer_source_identity_bound"] is True
assert lock["runtime_head_contract_accepted"] is True
assert lock["canonical_main_candidate_authority"] is True
assert lock["superseded_v2_lock_install_authority"] is False
assert lock["superseded_v1_lock_install_authority"] is False
assert lock["protected_bootstrap_install_authorized"] is False
assert lock["protected_installer_apply_authorized"] is False
assert lock["funds_movement_authorized"] is False

report = lock["candidate_report"]
assert report["candidate_id"] == CANDIDATE_ID
assert report["bootstrap_binary_sha256"] == BOOTSTRAP_SHA256
assert report["bootstrap_binary_git_blob_sha1"] == BOOTSTRAP_GIT_BLOB
assert report["runtime_expected_head_compile_bound"] is False
assert report["runtime_expected_head_strict_lowercase_hex"] is True
assert report["runtime_expected_head_forwarded_unchanged"] is True
assert report["repository_head_not_embedded_in_bootstrap"] is True

install_source = install_raw.decode("utf-8", "strict")
for required in (
    "PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V2R",
    "bootstrap_runtime_head_compile_bound",
    "runtime_expected_head_strict_lowercase_hex",
    "runtime_expected_head_forwarded_unchanged",
    "canonical_main_candidate_authority",
    "superseded_v2_lock_install_authority",
    "bootstrap_execution=false",
    "protected_installer_apply=false",
    "prepublication_cleanup_stage_generation_bound=true",
    "post_publication_close_failure_receipt_truthful=true",
    "stage_dev = stage_identity.st_dev",
    "stage_ino = stage_identity.st_ino",
    "_cleanup_created_stage(stage_dev, stage_ino)",
    '"published_install_close_failed"',
    'phase="install_parent_close"',
):
    assert required in install_source, required

materializer_source = materializer_raw.decode("utf-8", "strict")
materializer_tree = ast.parse(materializer_source)

def materializer_constant(name: str) -> object:
    for node in materializer_tree.body:
        if isinstance(node, ast.Assign):
            if any(
                isinstance(target, ast.Name) and target.id == name
                for target in node.targets
            ):
                return ast.literal_eval(node.value)
        if (
            isinstance(node, ast.AnnAssign)
            and isinstance(node.target, ast.Name)
            and node.target.id == name
        ):
            return ast.literal_eval(node.value)
    raise AssertionError("materializer_constant_missing:" + name)

assert materializer_constant("LOCK_REL") == LOCK_REL
assert materializer_constant("LOCK_BLOB") == LOCK_BLOB
assert materializer_constant("LOCK_ID") == LOCK_ID
assert materializer_constant("CANDIDATE_MERGE") == CANDIDATE_MERGE
assert materializer_constant("CANDIDATE_TREE") == CANDIDATE_TREE
assert materializer_constant("EXPECTED_CANDIDATE_ID") == CANDIDATE_ID
assert materializer_constant("EXPECTED_BINARY_SHA256") == BOOTSTRAP_SHA256
assert materializer_constant("EXPECTED_BINARY_GIT_BLOB") == BOOTSTRAP_GIT_BLOB
for required in (
    '"canonical_main_candidate_authority": True',
    '"superseded_v2_lock_install_authority": False',
):
    assert required in materializer_source, required

bootstrap_source = bootstrap_source_raw.decode("utf-8", "strict")
assert "VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" not in bootstrap_source
for required in (
    'hexn(argv[7],40)',
    'snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7])',
    '(char*)"--expected-head",q.expected_head',
):
    assert required in bootstrap_source, required

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "accepted_bootstrap_lock_v3_bound=true",
            "canonical_main_candidate_authority_required=true",
            "exact_installed_bootstrap_identity_required=true",
            "exact_policy_generation_required=true",
            "exact_protected_installer_source_required=true",
            "runtime_expected_head_compile_bound=false",
            "runtime_expected_head_strict_lowercase_hex=true",
            "runtime_expected_head_forwarded_unchanged=true",
            "frozen_head_alignment_not_required=true",
            "git_lazy_fetch_suppressed=true",
            "git_transport_denied=true",
            "git_hooks_disabled=true",
            "git_fsmonitor_disabled=true",
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
            "candidate_source_head=" + CANDIDATE_MERGE,
            "bootstrap_runtime_head_compile_bound=false",
            "runtime_expected_head_strict_lowercase_hex=true",
            "runtime_expected_head_forwarded_unchanged=true",
            "canonical_main_candidate_authority=true",
            "superseded_v2_lock_install_authority=false",
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
print("protected_bootstrap_install_v2r_source_bound=true")
print("protected_bootstrap_install_v2r_proof_bound=true")
print("accepted_bootstrap_lock_v3_bound=true")
print("materializer_v2r_generation_bound=true")
print("materializer_v2r_constants_semantically_bound=true")
print("materializer_v2r_proof_bound=true")
print("bootstrap_source_runtime_head_contract_bound=true")
print("protected_installer_source_generation_bound=true")
print("read_only_no_mutation_calls=true")
print("installed_bootstrap_execution_absent=true")
print("protected_installer_apply_absent=true")
print("runtime_head_contract_bound=true")
print("canonical_main_candidate_authority=true")
print("frozen_head_alignment_not_required=true")
print("git_lazy_fetch_suppressed=true")
print("git_transport_denied=true")
print("git_hooks_disabled=true")
print("git_fsmonitor_disabled=true")
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
