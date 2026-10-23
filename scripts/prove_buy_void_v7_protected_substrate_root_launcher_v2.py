#!/usr/bin/env python3
import hashlib
import os
import pathlib
import struct
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v2.c"
INSTALLER = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"
WORKFLOW = ROOT / ".github/workflows/buy-void-v7-protected-substrate-root-launcher-v2.yml"

MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V2_PROOF"
SOURCE_BLOB = "0aa8d3a990de662b8c3c9928d4c31452d8299ca7"
INSTALLER_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"
INSTALLER_BYTES = 89416
INSTALLER_SHA256 = "6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b"
SOURCE_BASE = "47acc1485ab264a1a33d6a8c70072c2c18ce56e4"


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
    assert raw[4] == 2, "elf_not_64_bit"
    assert raw[5] == 1, "elf_not_little_endian"
    fields = struct.unpack_from("<HHIQQQIHHHHHH", raw, 16)
    e_type, e_machine = fields[0], fields[1]
    e_phoff, e_phentsize, e_phnum = fields[4], fields[8], fields[9]
    assert e_type == 2, "elf_not_et_exec"
    assert e_machine == 62, "elf_not_x86_64"
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
    assert seen_load, "pt_load_required"


assert git_text("rev-parse", "HEAD:" + SOURCE.relative_to(ROOT).as_posix()) == SOURCE_BLOB
assert git_text("rev-parse", "HEAD:" + INSTALLER.relative_to(ROOT).as_posix()) == INSTALLER_BLOB

installer_raw = INSTALLER.read_bytes()
assert len(installer_raw) == INSTALLER_BYTES
assert hashlib.sha256(installer_raw).hexdigest() == INSTALLER_SHA256

source_text = SOURCE.read_text("utf-8")
workflow_text = WORKFLOW.read_text("utf-8")
assert "SOURCE_BASE: " + SOURCE_BASE in workflow_text
assert "PR_BASE:" not in workflow_text
assert 'test "$PR_BASE"' not in workflow_text
assert 'git merge-base "$SOURCE_BASE" "$EXPECTED_HEAD"' in workflow_text
for required in (
    '#define MARKER "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V2"',
    '#define FIXED_SELF FIXED_ROOT "/bin/void_buy_void_v7_protected_substrate_root_launcher_v2"',
    '#define FIXED_POLICY FIXED_ROOT "/policy-v2.conf"',
    '#define FIXED_PYTHON_ROOT "/opt/void-buy-void-v7-python-runtime-v1"',
    '#define FIXED_PYTHON FIXED_PYTHON_BIN "/python3.12-static"',
    '#define FIXED_STDLIB_ZIP FIXED_PYTHON_LIB "/python312.zip"',
    '#define FIXED_SOURCE_ROOT "/opt/void-buy-void-v7-installer-source-v2"',
    '#define INSTALLER_REL "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"',
    '#define INSTALLER_BYTES 89416U',
    '#define INSTALLER_SHA256 "' + INSTALLER_SHA256 + '"',
    '#define PLAN_PREFIX "voidv7substrateinstallplan5_"',
    '#define APPLY_CONFIRM "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY"',
    '#define RUNTIME_UID 1000U',
    '#define RUNTIME_GID 1000U',
    'O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK',
    'setgroups(0,NULL)',
    'setgid((gid_t)RUNTIME_GID)',
    'setuid((uid_t)RUNTIME_UID)',
    'runtime_identity_can_write_trusted_path_or_ancestor',
    'FS_IOC_MEASURE_VERITY',
    'FS_VERITY_HASH_ALG_SHA256',
    'require_fsverity_sha256(self_fd,"launcher_self_fsverity_required")',
    'require_fsverity_sha256(policy_fd,"launcher_policy_fsverity_required")',
    'require_fsverity_sha256(installer_fd,"installer_fsverity_required")',
    'require_fsverity_sha256(python_fd,"python_fsverity_required")',
    'require_fsverity_sha256(stdlib_fd,"stdlib_zip_fsverity_required")',
    'fsverity_sha256_digest_required',
    'readlink("/proc/self/exe"',
    'running_self_generation_mismatch',
    'require_exact_dir_entries(FIXED_PYTHON_ROOT,"bin","lib")',
    'require_exact_dir_entries(FIXED_PYTHON_BIN,"python3.12-static",NULL)',
    'require_exact_dir_entries(FIXED_PYTHON_LIB,"python312.zip",NULL)',
    'require_static_python_elf(python_fd,policy.python_bytes)',
    'dynamic_python_runtime_forbidden',
    'stdlib_zip_content_mismatch',
    'args[n++]="-I"',
    'args[n++]="-B"',
    'args[n++]="-S"',
    'fexecve(python_fd,args,envp)',
    'char *const envp[]={"PATH=/usr/bin:/bin","HOME=/nonexistent","LANG=C","LC_ALL=C","TZ=UTC","OPENSSL_CONF=/dev/null",NULL}',
    'const char *expected_tree;',
    'const char *expected_full_history_content_sha256;',
    'set_arg_once(&r.expected_tree,value,reason)',
    'set_arg_once(&r.expected_full_history_content_sha256,value,reason)',
    'hexn(r.expected_tree,40)',
    'hexn(r.expected_full_history_content_sha256,64)',
    'args[n++]="--expected-tree"',
    'args[n++]="--expected-full-history-content-sha256"',
    'v5_expected_head_tree_full_history_digest_required=true',
    'duplicate_request_arguments_rejected=true',
    'source_snapshot_install_authorized=false',
    'protected_install_performed=false',
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
    '"/usr/bin/python3',
    "lib-dynload",
    "void_buy_void_v7_protected_substrate_install_v4.py",
    "voidv7substrateinstallplan4_",
    "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY",
):
    assert forbidden not in source_text, forbidden

with tempfile.TemporaryDirectory(prefix="void-v7-root-launcher-proof-") as td:
    td_path = pathlib.Path(td)
    outputs = [td_path / "launcher-a", td_path / "launcher-b"]
    command_prefix = [
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
            [*command_prefix, "-o", str(output), str(SOURCE)],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=90,
            check=False,
            env={
                "PATH": "/usr/bin:/bin",
                "HOME": "/nonexistent",
                "LANG": "C",
                "LC_ALL": "C",
                "TZ": "UTC",
            },
        )
        assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")

    raw_a = outputs[0].read_bytes()
    raw_b = outputs[1].read_bytes()
    assert raw_a == raw_b, "two_builds_not_byte_identical"
    require_static_elf(raw_a)

    test = subprocess.run(
        [str(outputs[0]), "--self-test"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=20,
        check=False,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
        },
    )
    if test.returncode != 0 or test.stderr != "":
        raise AssertionError(
            "native_self_test_failed:"
            + "returncode=" + str(test.returncode)
            + ":stdout=" + repr(test.stdout)
            + ":stderr=" + repr(test.stderr)
        )
    lines = test.stdout.splitlines()
    for required in (
        "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V2_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "fixed_root_custodied_source_snapshot_required=true",
        "installer_sha256_compile_bound=true",
        "host_policy_root_custodied_required=true",
        "python_content_hash_policy_bound=true",
        "static_python_runtime_required=true",
        "stdlib_zip_content_hash_policy_bound=true",
        "python_runtime_tree_exact_entries_required=true",
        "dynamic_python_runtime_forbidden=true",
        "python_retained_descriptor_exec_required=true",
        "python_isolated_no_site_no_bytecode_required=true",
        "minimal_environment_required=true",
        "runtime_uid_nonwritability_required=true",
        "fsverity_sha256_kernel_seal_required=true",
        "launcher_self_fsverity_required=true",
        "launcher_policy_fsverity_required=true",
        "installer_fsverity_required=true",
        "python_fsverity_required=true",
        "stdlib_zip_fsverity_required=true",
        "fresh_operation_bound_plan_confirmation_required=true",
        "v5_expected_head_tree_full_history_digest_required=true",
        "duplicate_request_arguments_rejected=true",
        "source_snapshot_install_authorized=false",
        "protected_install_performed=false",
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
    print("installer_sha256=" + INSTALLER_SHA256)
    print("static_elf_sha256=" + hashlib.sha256(raw_a).hexdigest())
    print("two_builds_byte_identical=true")
    print("elf64_x86_64_et_exec=true")
    print("pt_interp_absent=true")
    print("pt_dynamic_absent=true")
    print("static_native_first_instruction_proven=true")
    print("fixed_root_source_snapshot_required=true")
    print("runtime_uid_acl_effective_nonwritability_required=true")
    print("fsverity_sha256_kernel_seal_required=true")
    print("launcher_self_fsverity_required=true")
    print("launcher_policy_fsverity_required=true")
    print("installer_fsverity_required=true")
    print("python_fsverity_required=true")
    print("stdlib_zip_fsverity_required=true")
    print("static_python_runtime_required=true")
    print("stdlib_zip_content_hash_policy_bound=true")
    print("python_runtime_tree_exact_entries_required=true")
    print("dynamic_python_runtime_forbidden=true")
    print("python_retained_descriptor_exec_required=true")
    print("python_isolated_no_site_no_bytecode_required=true")
    print("minimal_environment_required=true")
    print("v5_expected_head_tree_full_history_digest_bound=true")
    print("duplicate_request_arguments_rejected=true")
    print("source_snapshot_install_authorized=false")
    print("workflow_stale_pr_base_authority_absent=true")
    print("protected_install_performed=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
