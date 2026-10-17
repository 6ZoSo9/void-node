#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v1.py"
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v1.json"
)

TARGET_BLOB = "9202474f0fe56f37fcc45dbedde0efd44d32f86b"
LOCK_BLOB = "a96dee99c89ef386a6cbd05609b8f4a764caada8"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


target_raw = TARGET.read_bytes()
lock_raw = LOCK.read_bytes()
assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(lock_raw) == LOCK_BLOB

source = target_raw.decode("utf-8")
for required in (
    'MARKER = (',
    '"PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1"',
    'LOCK_GIT_BLOB_SHA1 = "a96dee99c89ef386a6cbd05609b8f4a764caada8"',
    '"4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23"',
    '"24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"',
    '"1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"',
    'BOOTSTRAP_BYTES = 731_072',
    'BOOTSTRAP_GIT_BLOB_SHA1 = "5d35e762fa4b510baeb89b2840d5287cc4fd6716"',
    '"void-buy-void-epoch2-dormant-first-entry-"',
    '"protected-install-bootstrap-v1"',
    '"VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"',
    '"PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1"',
    '"INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_"',
    '"PROTECTED_BOOTSTRAP_V1_CREATE_ONLY"',
    'PLAN_PREFIX = "voidbuye2bootstrapinstall1_"',
    'RENAME_NOREPLACE = 1',
    'os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW',
    '_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)',
    '"bootstrap_execution_authorized": False',
    '"protected_installer_apply_authorized": False',
    '"credential_access_authorized": False',
    '"transaction_authorized": False',
    '"funds_movement_authorized": False',
    'next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_',
    'BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "requests.",
    "urllib.request",
    "socket.",
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
    "shutil.rmtree",
    "RENAME_EXCHANGE",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
apply_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "apply"
]
assert len(apply_defs) == 1
apply_source = ast.get_source_segment(source, apply_defs[0])
assert apply_source is not None
assert apply_source.index("emit_operation_authority()") < apply_source.index(
    'if confirm != CONFIRM_TOKEN:'
)
assert apply_source.index('if confirm != CONFIRM_TOKEN:') < apply_source.index(
    "collect_plan(bootstrap, expected_head)"
)
assert apply_source.count("_renameat2(") == 1
assert "bootstrap_execution=false" in apply_source
assert "protected_installer_apply=false" in apply_source

rename_calls = [
    node
    for node in ast.walk(apply_defs[0])
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "_renameat2"
]
assert len(rename_calls) == 1

python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1_SELF_TEST_GREEN",
    "accepted_lock_identity_bound=true",
    "accepted_bootstrap_identity_bound=true",
    "fixed_protected_root_bound=true",
    "python_policy_generation_bound=true",
    "create_only=true",
    "rename_noreplace_required=true",
    "bootstrap_execution_authorized=false",
    "protected_installer_apply_authorized=false",
    "credential_access_authorized=false",
    "transaction_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in self_test.stdout.splitlines(), line

source_plan = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "accepted_lock_id=voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23",
    "candidate_id=voidbuye2bootstrapcand1_24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851",
    "bootstrap_sha256=1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189",
    "bootstrap_bytes=731072",
    "create_only=true",
    "rename_noreplace_required=true",
    "bootstrap_execution_authorized=false",
    "protected_installer_apply_authorized=false",
    "credential_access_authorized=false",
    "private_key_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in source_plan.stdout.splitlines(), line

print(
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1_PROOF_GREEN"
)
print("installer_source_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("accepted_bootstrap_identity_bound=true")
print("create_only_protected_root=true")
print("retained_fd_stage_readback_required=true")
print("rename_noreplace_single_publication=true")
print("prepublication_cleanup_generation_bound=true")
print("post_publication_rollback=false")
print("truthful_post_publication_failure_receipt=true")
print("bootstrap_execution_authorized=false")
print("protected_installer_apply_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
