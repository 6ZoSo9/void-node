#!/usr/bin/env python3
import hashlib
import pathlib
import struct
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v3.c"
INSTALLER = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"
PLAN = ROOT / "ops/security/buy-void-v7-create-only-persistent-seal-plan-v1.json"
ACCEPTANCE = ROOT / "ops/security/buy-void-v7-create-only-closed-tree-acceptance-v1.json"
BOOTSTRAP = ROOT / "ops/precision/void_buy_void_v7_create_only_closed_tree_bootstrap_v1.c"
BOOTSTRAP_PROOF = ROOT / "scripts/prove_buy_void_v7_create_only_closed_tree_bootstrap_v1.py"

MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V3_PROOF"
SOURCE_BLOB = "21d170554307c13aebba1d4827305ce3e01156a1"
INSTALLER_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"
PLAN_BLOB = "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
ACCEPTANCE_BLOB = "919db72903a5fcff59dec7635a4288f41d1753d9"
BOOTSTRAP_BLOB = "2a8397c85d698d168f2257ec801557281b73c04d"
BOOTSTRAP_PROOF_BLOB = "2bec40bb30b26f229e5a9a290ce262cd40e344c5"
V2_BLOB = "0aa8d3a990de662b8c3c9928d4c31452d8299ca7"
INSTALLER_BYTES = 89416
INSTALLER_SHA256 = "6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b"
SOURCE_BASE = "f373337c68e8d36ade57721878c408ff70c0ec0c"


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
    assert raw[4] == 2
    assert raw[5] == 1
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
assert git_text("rev-parse", "HEAD:ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v2.c") == V2_BLOB

installer_raw = INSTALLER.read_bytes()
assert len(installer_raw) == INSTALLER_BYTES
assert hashlib.sha256(installer_raw).hexdigest() == INSTALLER_SHA256

source_text = SOURCE.read_text("utf-8")
assert 'require_exact_dir_entries(FIXED_SOURCE_ROOT,"ops",NULL)' not in source_text
assert 'require_exact_dir_entries(FIXED_SOURCE_OPS,"precision",NULL)' not in source_text
assert 'require_exact_dir_entries(FIXED_SOURCE_PRECISION,"void_buy_void_v7_protected_substrate_install_v5.py",NULL)' not in source_text
for required in (
    '#define MARKER "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V3"',
    '#define RECEIPT_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1"',
    '#define SEAL_MODE "CREATE_ONLY_CLOSED_TREE_V1"',
    '#define PLAN_CONTRACT_ID "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"',
    '#define PLAN_CONTRACT_BLOB "' + PLAN_BLOB + '"',
    '#define ACCEPTANCE_ID "voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3"',
    '#define FIXED_ROOT "/opt/void-buy-void-v7-create-only-closed-tree-v1"',
    '#define MAX_RECEIPT_BYTES (128U * 1024U * 1024U)',
    '#define MAX_RECEIPT_ENTRIES 250000U',
    '#define REQUIRED_RECEIPT_COUNT 21U',
    '#define FIXED_SOURCE_GIT FIXED_SOURCE_ROOT "/.git"',
    '#define FIXED_SOURCE_GIT_HEAD FIXED_SOURCE_GIT "/HEAD"',
    '#define FIXED_SOURCE_GIT_CONFIG FIXED_SOURCE_GIT "/config"',
    '#define FIXED_SOURCE_GIT_MAIN FIXED_SOURCE_GIT_HEADS "/main"',
    '#define RECEIPT_REL "install-receipt-v1.conf"',
    '#define INSTALLER_REL "source/ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"',
    '#define INSTALLER_SHA256 "' + INSTALLER_SHA256 + '"',
    'receipt_v1 receipt=parse_receipt',
    'bind_receipt_root(&receipt)',
    'bind_receipt_directories(&receipt)',
    'bind_receipt_file(&receipt,SELF_REL,self_fd,self_id)',
    'bind_receipt_file(&receipt,POLICY_REL,policy_fd,policy_id)',
    'bind_receipt_file(&receipt,INSTALLER_REL,installer_fd,installer_id)',
    'bind_receipt_file(&receipt,PYTHON_REL,python_fd,python_id)',
    'bind_receipt_file(&receipt,STDLIB_REL,stdlib_fd,stdlib_id)',
    'closed_tree_receipt_before_python_exec_required=true',
    'canonical_receipt_decimal_required=true',
    'noncanonical_receipt_decimal_accepted',
    'receipt_bound_inode_hash_mode_nlink_required=true',
    'receipt_entries_alloc_failed',
    'receipt_entries_not_strictly_sorted',
    'receipt_total_bytes_limit',
    'receipt_required_entry_missing',
    'receipt_source_git_path_allowed',
    'receipt_source_git_extra_path',
    'source/.git/refs/heads/main',
    'free_receipt(&receipt)',
    'bind_receipt_file(&receipt,"source/.git/HEAD"',
    'bind_receipt_file(&receipt,"source/.git/config"',
    'bind_receipt_file(&receipt,"source/.git/refs/heads/main"',
    'arbitrary_malicious_root_resistance_claimed=false',
    'const char *expected_tree;',
    'const char *expected_full_history_content_sha256;',
    'args[n++]="--expected-tree"',
    'args[n++]="--expected-full-history-content-sha256"',
    'args[n++]="-I"',
    'args[n++]="-B"',
    'args[n++]="-S"',
    'fexecve(python_fd,args,envp)',
    'production_payload_manifest_accepted=false',
    'launcher_install_authorized=false',
    'protected_v5_apply_authorized=false',
):
    assert required in source_text, required

for forbidden in (
    "FS_IOC_MEASURE_VERITY",
    "FS_VERITY_HASH_ALG_SHA256",
    "linux/fsverity.h",
    "require_fsverity_sha256",
    "VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256",
    "VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES",
    "VOID_V7_CLOSED_TREE_ACCEPTED_SOURCE_GENERATION",
    "VOID_V7_CLOSED_TREE_ACCEPTED_BOOTSTRAP_SHA256",
    "production_manifest_lock_bound(",
    "require_production_manifest_lock(",
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

with tempfile.TemporaryDirectory(prefix="void-v7-launcher-v3-proof-") as td:
    td_path = pathlib.Path(td)
    outputs = [td_path / "launcher-a", td_path / "launcher-b"]
    flags = [
        "/usr/bin/gcc", "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
        "-static", "-Wl,--build-id=none",
    ]
    for output in outputs:
        cp = subprocess.run(
            [*flags, "-o", str(output), str(SOURCE)],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=90,
            check=False,
            env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
        )
        assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")

    raw_a = outputs[0].read_bytes()
    raw_b = outputs[1].read_bytes()
    assert raw_a == raw_b
    require_static_elf(raw_a)

    test = subprocess.run(
        [str(outputs[0]), "--self-test"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=20,
        check=False,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
    )
    assert test.returncode == 0 and test.stderr == "", (test.returncode, test.stdout, test.stderr)
    lines = test.stdout.splitlines()
    for required in (
        "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V3_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "closed_tree_receipt_before_python_exec_required=true",
        "closed_tree_receipt_schema_bound=true",
        "canonical_receipt_decimal_required=true",
        "closed_tree_plan_contract_bound=true",
        "closed_tree_acceptance_id_bound=true",
        "receipt_bound_inode_hash_mode_nlink_required=true",
        "closed_tree_fixed_runtime_and_complete_source_payload_required=true",
        "dynamic_bounded_receipt_entries_required=true",
        "minimal_git_authority_paths_required=true",
        "minimal_git_authority_exact_layout_required=true",
        "create_only_closed_tree_seal_mode_required=true",
        "existing_launcher_v2_unchanged=true",
        "arbitrary_malicious_root_resistance_claimed=false",
        "installer_sha256_compile_bound=true",
        "python_content_hash_policy_bound=true",
        "static_python_runtime_required=true",
        "stdlib_zip_content_hash_policy_bound=true",
        "dynamic_python_runtime_forbidden=true",
        "python_retained_descriptor_exec_required=true",
        "python_isolated_no_site_no_bytecode_required=true",
        "runtime_uid_nonwritability_required=true",
        "v5_expected_head_tree_full_history_digest_required=true",
        "production_payload_manifest_lock_embedded=false",
        "bootstrap_manifest_lock_external_to_launcher=true",
        "manifest_hash_compile_cycle_avoided=true",
        "production_payload_manifest_accepted=false",
        "launcher_install_authorized=false",
        "root_execution_authorized=false",
        "protected_v5_apply_authorized=false",
        "funds_movement=false",
    ):
        assert required in lines, required

    print(MARKER + "_GREEN")
    print("source_blob=" + SOURCE_BLOB)
    print("installer_blob=" + INSTALLER_BLOB)
    print("plan_blob=" + PLAN_BLOB)
    print("acceptance_blob=" + ACCEPTANCE_BLOB)
    print("bootstrap_blob=" + BOOTSTRAP_BLOB)
    print("static_elf_sha256=" + hashlib.sha256(raw_a).hexdigest())
    print("two_builds_byte_identical=true")
    print("closed_tree_receipt_first_instruction_bound=true")
    print("canonical_receipt_decimal_bound=true")
    print("receipt_inode_hash_mode_nlink_rebinding_bound=true")
    print("dynamic_complete_source_receipt_bound=true")
    print("minimal_git_authority_paths_bound=true")
    print("minimal_git_authority_exact_layout_bound=true")
    print("v5_argument_surface_preserved=true")
    print("fsverity_v2_unchanged_and_v3_absent=true")
    print("production_payload_manifest_lock_embedded=false")
    print("bootstrap_manifest_lock_external_to_launcher=true")
    print("manifest_hash_compile_cycle_avoided=true")
    print("production_payload_manifest_accepted=false")
    print("root_execution_authorized=false")
    print("launcher_install_authorized=false")
    print("protected_v5_apply_authorized=false")
    print("funds_movement=false")
