#!/usr/bin/env python3
import hashlib
import pathlib
import struct
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_v7_full_history_protected_replica_root_launcher_v2.c"
INSTALLER = ROOT / "ops/precision/void_v7_full_history_protected_replica_install_v1.py"
PLAN = ROOT / "ops/security/buy-void-v7-create-only-persistent-seal-plan-v1.json"
ACCEPTANCE = ROOT / "ops/security/buy-void-v7-create-only-closed-tree-acceptance-v1.json"
BOOTSTRAP = ROOT / "ops/precision/void_buy_void_v7_create_only_closed_tree_bootstrap_v1.c"
BOOTSTRAP_PROOF = ROOT / "scripts/prove_buy_void_v7_create_only_closed_tree_bootstrap_v1.py"

MARKER = "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V2_PROOF"
SOURCE_BLOB = "19b89e92df6f640c017cb9f544ddbf094d69f6eb"
INSTALLER_BLOB = "a4d5762fe0e1c41b0919b8abb827123e556552ca"
PLAN_BLOB = "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
ACCEPTANCE_BLOB = "919db72903a5fcff59dec7635a4288f41d1753d9"
BOOTSTRAP_BLOB = "2a8397c85d698d168f2257ec801557281b73c04d"
BOOTSTRAP_PROOF_BLOB = "2bec40bb30b26f229e5a9a290ce262cd40e344c5"
PREDECESSOR_BLOB = "5dbfbb6af8451d55967e367f09f8896d72d30807"
INSTALLER_BYTES = 126743
INSTALLER_SHA256 = "794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37"
SOURCE_BASE = "7ce37b04a45e835d260a8741b0f90827c7fc7a26"


def git_text(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=30,
        check=False,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_ASKPASS": "/bin/false",
            "GIT_NO_LAZY_FETCH": "1",
            "GIT_PROTOCOL_FROM_USER": "0",
            "GIT_ALLOW_PROTOCOL": "",
        },
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()


def require_static_elf(raw: bytes) -> None:
    assert raw[:4] == b"\x7fELF"
    assert raw[4] == 2 and raw[5] == 1
    fields = struct.unpack_from("<HHIQQQIHHHHHH", raw, 16)
    assert fields[0] == 2
    assert fields[1] == 62
    e_phoff, e_phentsize, e_phnum = fields[4], fields[8], fields[9]
    assert e_phentsize >= 56 and e_phnum > 0
    assert e_phoff + e_phentsize * e_phnum <= len(raw)
    seen_load = False
    for index in range(e_phnum):
        off = e_phoff + index * e_phentsize
        p_type = struct.unpack_from("<I", raw, off)[0]
        assert p_type not in (2, 3)
        if p_type == 1:
            seen_load = True
    assert seen_load


assert git_text("rev-parse", "HEAD:" + SOURCE.relative_to(ROOT).as_posix()) == SOURCE_BLOB
assert git_text("rev-parse", "HEAD:" + INSTALLER.relative_to(ROOT).as_posix()) == INSTALLER_BLOB
assert git_text("rev-parse", "HEAD:" + PLAN.relative_to(ROOT).as_posix()) == PLAN_BLOB
assert git_text("rev-parse", "HEAD:" + ACCEPTANCE.relative_to(ROOT).as_posix()) == ACCEPTANCE_BLOB
assert git_text("rev-parse", "HEAD:" + BOOTSTRAP.relative_to(ROOT).as_posix()) == BOOTSTRAP_BLOB
assert git_text("rev-parse", "HEAD:" + BOOTSTRAP_PROOF.relative_to(ROOT).as_posix()) == BOOTSTRAP_PROOF_BLOB
assert git_text("rev-parse", "HEAD:ops/precision/void_v7_full_history_protected_replica_root_launcher_v1.c") == PREDECESSOR_BLOB
assert git_text("merge-base", "--is-ancestor", SOURCE_BASE, "HEAD") == ""

installer_raw = INSTALLER.read_bytes()
assert len(installer_raw) == INSTALLER_BYTES
assert hashlib.sha256(installer_raw).hexdigest() == INSTALLER_SHA256

source_text = SOURCE.read_text("utf-8")
for required in (
    '#define MARKER "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V2"',
    '#define POLICY_SCHEMA "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_POLICY_V2"',
    '#define RECEIPT_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1"',
    '#define SEAL_MODE "CREATE_ONLY_CLOSED_TREE_V1"',
    '#define PLAN_CONTRACT_ID "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"',
    '#define PLAN_CONTRACT_BLOB "' + PLAN_BLOB + '"',
    '#define ACCEPTANCE_ID "voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3"',
    '#define FIXED_ROOT "/opt/void-v7-full-history-protected-replica-closed-tree-v1"',
    '#define SELF_REL "bin/void_v7_full_history_protected_replica_root_launcher_v2"',
    'require_exact_dir_entries(FIXED_BIN,"void_v7_full_history_protected_replica_root_launcher_v2",NULL)',
    '#define POLICY_REL "policy-v2.conf"',
    '#define RECEIPT_REL "install-receipt-v1.conf"',
    '#define INSTALLER_REL "source/ops/precision/void_v7_full_history_protected_replica_install_v1.py"',
    '#define INSTALLER_BYTES 126743U',
    '#define INSTALLER_SHA256 "' + INSTALLER_SHA256 + '"',
    '#define PLAN_PREFIX "voidv7fullhistoryreplicainstall1_"',
    '#define APPLY_CONFIRM "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"',
    'const char *expected_head;',
    'const char *expected_tree;',
    'args[n++]="--expected-head"',
    'args[n++]="--expected-tree"',
    'receipt_v1 receipt=parse_receipt',
    'bind_receipt_root(&receipt)',
    'bind_receipt_directories(&receipt)',
    'bind_receipt_file(&receipt,SELF_REL,self_fd,self_id)',
    'bind_receipt_file(&receipt,POLICY_REL,policy_fd,policy_id)',
    'bind_receipt_file(&receipt,INSTALLER_REL,installer_fd,installer_id)',
    'bind_receipt_file(&receipt,PYTHON_REL,python_fd,python_id)',
    'bind_receipt_file(&receipt,STDLIB_REL,stdlib_fd,stdlib_id)',
    'source/.git/refs/heads/main',
    'fexecve(python_fd,args,envp)',
    'closed_tree_receipt_before_python_exec_required=true',
    'receipt_bound_inode_hash_mode_nlink_required=true',
    'replica_expected_head_tree_required=true',
    'existing_replica_launcher_v1_unchanged=true',
    'production_payload_manifest_accepted=false',
    'launcher_install_authorized=false',
    'root_execution_authorized=false',
    'protected_replica_apply_authorized=false',
):
    assert required in source_text, required

for forbidden in (
    "FS_IOC_MEASURE_VERITY",
    "FS_VERITY_HASH_ALG_SHA256",
    "linux/fsverity.h",
    "require_fsverity_sha256",
    "--native",
    "--selector",
    "--expected-full-history-content-sha256",
    "native_path",
    "selector_path",
    "expected_full_history_content_sha256",
    "void_buy_void_v7_protected_substrate_install_v5.py",
    "voidv7substrateinstallplan5_",
    "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY",
    "getenv(",
    "system(",
    "execvp(",
    "execlp(",
    "O_WRONLY",
    "O_RDWR",
    "O_CREAT",
    "rename(",
    "unlink(",
    "chmod(",
    "chown(",
    "socket(",
    "connect(",
    "listen(",
):
    assert forbidden not in source_text, forbidden

with tempfile.TemporaryDirectory(prefix="void-v7-replica-closed-tree-launcher-v2-proof-") as td:
    td_path = pathlib.Path(td)
    outputs = [td_path / "launcher-a", td_path / "launcher-b"]
    prefix = [
        "/usr/bin/gcc", "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
        "-static", "-Wl,--build-id=none",
    ]
    for output in outputs:
        cp = subprocess.run(
            [*prefix, "-o", str(output), str(SOURCE)],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=90,
            check=False,
            env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
        )
        assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")

    raw_a = outputs[0].read_bytes()
    raw_b = outputs[1].read_bytes()
    assert raw_a == raw_b
    require_static_elf(raw_a)

    self_test = subprocess.run(
        [str(outputs[0]), "--self-test"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=30,
        check=False,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
    )
    assert self_test.returncode == 0, self_test.stdout + self_test.stderr
    assert self_test.stderr == ""
    for marker in (
        "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V2_SELF_TEST_GREEN",
        "closed_tree_receipt_before_python_exec_required=true",
        "create_only_closed_tree_seal_mode_required=true",
        "existing_replica_launcher_v1_unchanged=true",
        "replica_expected_head_tree_required=true",
        "duplicate_request_arguments_rejected=true",
        "production_payload_manifest_accepted=false",
        "launcher_install_authorized=false",
        "root_execution_authorized=false",
        "protected_replica_apply_authorized=false",
        "service_mutation=false",
        "credential_access=false",
        "signing=false",
        "payment_acceptance=false",
        "public_presale_activation=false",
        "funds_movement=false",
    ):
        assert marker in self_test.stdout.splitlines(), marker

print(MARKER + "_GREEN")
print("source_blob=" + SOURCE_BLOB)
print("installer_blob=" + INSTALLER_BLOB)
print("persistent_seal_plan_blob=" + PLAN_BLOB)
print("closed_tree_acceptance_blob=" + ACCEPTANCE_BLOB)
print("bootstrap_blob=" + BOOTSTRAP_BLOB)
print("bootstrap_proof_blob=" + BOOTSTRAP_PROOF_BLOB)
print("predecessor_launcher_v1_blob=" + PREDECESSOR_BLOB)
print("static_deterministic_build=true")
print("closed_tree_receipt_contract_bound=true")
print("replica_request_surface_narrow=true")
print("v5_only_arguments_rejected=true")
print("production_payload_manifest_accepted=false")
print("launcher_install_authorized=false")
print("root_execution_authorized=false")
print("protected_replica_apply_authorized=false")
