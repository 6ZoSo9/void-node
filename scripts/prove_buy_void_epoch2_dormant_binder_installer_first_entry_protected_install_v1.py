#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
)
LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
RUNTIME_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
RUNTIME_INSTALLER_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V1"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


raw = TARGET.read_bytes()
source = raw.decode("utf-8")
assert git_blob(raw) == TARGET_BLOB
assert git_blob((ROOT / LOCK_REL).read_bytes()) == LOCK_BLOB
assert git_blob((ROOT / RUNTIME_INSTALLER_REL).read_bytes()) == RUNTIME_INSTALLER_BLOB

for required in (
    'LOCK_ID = (',
    '"voidbuye2dormantfirstentrylock1_"',
    '"bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"',
    '"voidbuye2dormantfirstentrycand1_"',
    '"b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736"',
    '"4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"',
    '"ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"',
    '"602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY"',
    'PLAN_PREFIX = "voidbuye2dormantfirstentryinstall1_"',
    'RENAME_NOREPLACE = 1',
    'READY_STATE = "DORMANT_FIRST_ENTRY_ROOT_ABSENT_READY_FOR_CREATE_ONLY"',
    'GREEN_STATE = "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN"',
    "accepted_lock(expected_head)",
    "_verify_root_generation(STAGE_ROOT, policy=policy)",
    "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)",
    "checkout_generation_changed_before_publication",
    "python_generation_changed_before_publication",
    "post_publication_rollback=false",
    "truthful_post_publication_failure_receipt=true",
    "launcher_execution=false",
    "native_execution=false",
    "binder_execution=false",
    "credential_access=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "requests.",
    "urllib.request",
    "socket.",
    "subprocess.Popen",
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
assert apply_source.index("if confirm != CONFIRM_TOKEN") < apply_source.index(
    "collect_plan(launcher, native, expected_head)"
)
assert apply_source.index("if os.geteuid() != 0") < apply_source.index(
    "collect_plan(launcher, native, expected_head)"
)

spec = importlib.util.spec_from_file_location(
    "void_e2_dormant_first_entry_install_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

policy = module.build_policy({"sha256": "1" * 64, "bytes": 99})
assert policy == (
    "schema=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1\n"
    + "python_sha256=" + "1" * 64 + "\n"
    + "python_bytes=99\n"
).encode("ascii")

with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-install-rename-proof-") as td:
    root = Path(td)
    (root / "stage").mkdir()
    dir_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
    try:
        module._renameat2(
            dir_fd,
            "stage",
            "published",
            module.RENAME_NOREPLACE,
        )
        assert not (root / "stage").exists()
        assert (root / "published").is_dir()

        (root / "stage2").mkdir()
        (root / "occupied").mkdir()
        try:
            module._renameat2(
                dir_fd,
                "stage2",
                "occupied",
                module.RENAME_NOREPLACE,
            )
        except module.InstallError:
            pass
        else:
            raise AssertionError("RENAME_NOREPLACE overwrote existing target")
        assert (root / "stage2").is_dir()
        assert (root / "occupied").is_dir()
    finally:
        os.close(dir_fd)

wrong = subprocess.run(
    [
        "/usr/bin/python3",
        "-I",
        "-B",
        str(TARGET),
        "--apply",
        "--launcher",
        "/definitely/not/a/launcher",
        "--native",
        "/definitely/not/a/native",
        "--expected-head",
        "1" * 40,
        "--expected-plan-id",
        "voidbuye2dormantfirstentryinstall1_" + "2" * 64,
        "--confirm",
        "WRONG_CONFIRM",
    ],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
)
assert wrong.returncode == 2
wrong_lines = set(wrong.stdout.splitlines())
for marker in (
    MARKER,
    "mode=apply",
    "authority_boundary=PRE_MUTATION",
    "filesystem_mutation_performed_at_pre_mutation_boundary=false",
    "status=HOLD",
    "reason=explicit_create_only_confirmation_required",
    "publication=false",
    "launcher_execution=false",
    "native_execution=false",
    "binder_execution=false",
    "credential_access=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert marker in wrong_lines, marker

source_plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
)
assert source_plan.returncode == 0, source_plan.stderr
source_lines = set(source_plan.stdout.splitlines())
for marker in (
    MARKER,
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "create_only=true",
    "rename_noreplace_required=true",
    "launcher_execution_authorized=false",
    "native_execution_authorized=false",
    "binder_execution_authorized=false",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement_authorized=false",
):
    assert marker in source_lines, marker

print(
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V1_PROOF_GREEN"
)
print("installer_source_blob_bound=true")
print("accepted_first_entry_lock_blob_bound=true")
print("runtime_installer_source_blob_bound=true")
print("wrong_confirmation_precedes_candidate_and_root_access=true")
print("rename_noreplace_kernel_behavior_exercised=true")
print("existing_target_not_overwritten=true")
print("exact_runtime_namespace_bound=true")
print("root_python_policy_binding_required=true")
print("create_only=true")
print("operation_bound_plan_id_required=true")
print("prepublication_cleanup_required=true")
print("post_publication_rollback=false")
print("truthful_post_publication_failure_receipt=true")
print("launcher_execution=false")
print("native_execution=false")
print("binder_execution=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
