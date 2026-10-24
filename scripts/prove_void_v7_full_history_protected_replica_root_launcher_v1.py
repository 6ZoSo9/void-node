#!/usr/bin/env python3
import hashlib
import pathlib
import struct
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_v7_full_history_protected_replica_root_launcher_v1.c"
INSTALLER = ROOT / "ops/precision/void_v7_full_history_protected_replica_install_v1.py"

MARKER = "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V1_PROOF"
SOURCE_BLOB = "5dbfbb6af8451d55967e367f09f8896d72d30807"
INSTALLER_BLOB = "a4d5762fe0e1c41b0919b8abb827123e556552ca"
INSTALLER_BYTES = 126743
INSTALLER_SHA256 = "794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37"
SOURCE_BASE = "767a094260cae4cefe15bac2a7b3fc0cbe936787"


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
    e_type, e_machine = fields[0], fields[1]
    e_phoff, e_phentsize, e_phnum = fields[4], fields[8], fields[9]
    assert e_type == 2
    assert e_machine == 62
    assert e_phentsize >= 56 and e_phnum > 0
    assert e_phoff + e_phentsize * e_phnum <= len(raw)
    seen_load = False
    for index in range(e_phnum):
        off = e_phoff + index * e_phentsize
        p_type = struct.unpack_from("<I", raw, off)[0]
        assert p_type != 2, "pt_dynamic_forbidden"
        assert p_type != 3, "pt_interp_forbidden"
        if p_type == 1:
            seen_load = True
    assert seen_load


assert git_text("rev-parse", "HEAD:" + SOURCE.relative_to(ROOT).as_posix()) == SOURCE_BLOB
assert git_text("rev-parse", "HEAD:" + INSTALLER.relative_to(ROOT).as_posix()) == INSTALLER_BLOB
assert git_text("merge-base", "--is-ancestor", SOURCE_BASE, "HEAD") == ""

installer_raw = INSTALLER.read_bytes()
assert len(installer_raw) == INSTALLER_BYTES
assert hashlib.sha256(installer_raw).hexdigest() == INSTALLER_SHA256

source_text = SOURCE.read_text("utf-8")
for required in (
    '#define MARKER "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V1"',
    '#define POLICY_SCHEMA "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_POLICY_V1"',
    '#define FIXED_ROOT "/opt/void-v7-full-history-protected-replica-root-launcher-v1"',
    '#define FIXED_SELF FIXED_ROOT "/bin/void_v7_full_history_protected_replica_root_launcher_v1"',
    '#define FIXED_POLICY FIXED_ROOT "/policy-v1.conf"',
    '#define FIXED_PYTHON_ROOT "/opt/void-buy-void-v7-python-runtime-v1"',
    '#define FIXED_SOURCE_ROOT "/opt/void-v7-full-history-protected-replica-installer-source-v1"',
    '#define INSTALLER_REL "ops/precision/void_v7_full_history_protected_replica_install_v1.py"',
    '#define INSTALLER_BYTES 126743U',
    '#define INSTALLER_SHA256 "' + INSTALLER_SHA256 + '"',
    '#define PLAN_PREFIX "voidv7fullhistoryreplicainstall1_"',
    '#define APPLY_CONFIRM "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"',
    'FS_IOC_MEASURE_VERITY',
    'FS_VERITY_HASH_ALG_SHA256',
    'require_fsverity_sha256(self_fd,"launcher_self_fsverity_required")',
    'require_fsverity_sha256(policy_fd,"launcher_policy_fsverity_required")',
    'require_fsverity_sha256(installer_fd,"installer_fsverity_required")',
    'require_fsverity_sha256(python_fd,"python_fsverity_required")',
    'require_fsverity_sha256(stdlib_fd,"stdlib_zip_fsverity_required")',
    'require_static_python_elf(python_fd,policy.python_bytes)',
    'setgroups(0,NULL)',
    'setgid((gid_t)RUNTIME_GID)',
    'setuid((uid_t)RUNTIME_UID)',
    'runtime_identity_can_write_trusted_path_or_ancestor',
    'readlink("/proc/self/exe"',
    'running_self_generation_mismatch',
    'args[n++]="-I"',
    'args[n++]="-B"',
    'args[n++]="-S"',
    'args[n++]="--expected-head"',
    'args[n++]="--expected-tree"',
    'fexecve(python_fd,args,envp)',
    'replica_expected_head_tree_required=true',
    'duplicate_request_arguments_rejected=true',
    'replica_source_snapshot_install_authorized=false',
    'protected_replica_install_performed=false',
    'public_presale_activation=false',
    'funds_movement=false',
):
    assert required in source_text, required

for forbidden in (
    "getenv(",
    "execvp(",
    "execlp(",
    "system(",
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
    "--native",
    "--selector",
    "--expected-full-history-content-sha256",
    "void_buy_void_v7_protected_substrate_install_v5.py",
    "voidv7substrateinstallplan5_",
    "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY",
    "policy_v2",
    "request_v2",
):
    assert forbidden not in source_text, forbidden

with tempfile.TemporaryDirectory(prefix="void-v7-replica-root-launcher-proof-") as td:
    td_path = pathlib.Path(td)
    outputs = [td_path / "launcher-a", td_path / "launcher-b"]
    prefix = [
        "/usr/bin/gcc",
        "-std=c11",
        "-O2",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-static",
        "-Wl,--build-id=none",
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

    test = subprocess.run(
        [str(outputs[0]), "--self-test"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=20,
        check=False,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
    )
    assert test.returncode == 0, (test.stdout, test.stderr)
    assert test.stderr == ""
    lines = test.stdout.splitlines()
    for required in (
        "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V1_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "fixed_root_custodied_source_snapshot_required=true",
        "installer_sha256_compile_bound=true",
        "host_policy_root_custodied_required=true",
        "static_python_runtime_required=true",
        "dynamic_python_runtime_forbidden=true",
        "python_retained_descriptor_exec_required=true",
        "python_isolated_no_site_no_bytecode_required=true",
        "runtime_uid_nonwritability_required=true",
        "fsverity_sha256_kernel_seal_required=true",
        "replica_expected_head_tree_required=true",
        "duplicate_request_arguments_rejected=true",
        "replica_source_snapshot_install_authorized=false",
        "protected_replica_install_performed=false",
        "service_mutation=false",
        "credential_access=false",
        "signing=false",
        "payment_acceptance=false",
        "public_presale_activation=false",
        "funds_movement=false",
    ):
        assert required in lines, required

    print(MARKER + "_GREEN")
    print("source_blob=" + SOURCE_BLOB)
    print("installer_blob=" + INSTALLER_BLOB)
    print("installer_bytes=" + str(INSTALLER_BYTES))
    print("installer_sha256=" + INSTALLER_SHA256)
    print("static_elf_sha256=" + hashlib.sha256(raw_a).hexdigest())
    print("two_builds_byte_identical=true")
    print("elf64_x86_64_et_exec=true")
    print("pt_interp_absent=true")
    print("pt_dynamic_absent=true")
    print("replica_expected_head_tree_bound=true")
    print("duplicate_request_arguments_rejected=true")
    print("fsverity_sha256_kernel_seal_required=true")
    print("protected_replica_install_performed=false")
    print("live_release_mutation=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
