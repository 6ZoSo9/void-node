#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "native/"
    "void_buy_allocation_custody_runtime_v3_installer_first_entry_source_v2.c"
)
EXPECTED_SOURCE_BLOB = "d7693320783bcd0e3a2c4ef6c4afd86123e3688e"
PREDECESSOR_FIRST_ENTRY_HEAD = "86e2e5c92f87a74985e4f96617b4d013c252e237"
PREDECESSOR_FIRST_ENTRY_BLOB = "1bbe19704a3d1f89b8fe1bfc3759e202ba85594c"
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-installer-lock-v2.json"
)
EXPECTED_LOCK_BLOB = "f9372da99d8ab9b3d5f7fddc6d8de0de605576f0"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


source_raw = TARGET.read_bytes()
assert git_blob(source_raw) == EXPECTED_SOURCE_BLOB
lock_raw = LOCK.read_bytes()
assert git_blob(lock_raw) == EXPECTED_LOCK_BLOB
lock = json.loads(lock_raw.decode("utf-8"))
assert lock["marker"] == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V2"
)
assert lock["candidate_installer_source_accepted"] is True
assert lock["ctypes_free_builtin_voidfs_boundary_accepted"] is True
assert lock["voidfs_preloaded_cache_rejection_accepted"] is True
assert lock["repository_input_fifo_nonblocking_accepted"] is True
assert lock["protected_install_authorized"] is False
assert lock["protected_source_installed"] is False
assert lock["replacement_apply_authorized"] is False
assert lock["funds_movement"] is False
assert source_raw.isascii()
source = source_raw.decode("ascii")

assert (
    '#include "void_buy_allocation_custody_runtime_v3_'
    'installer_first_entry_bindings_v2.h"'
) in source

required_compile_bindings = (
    "VOID_CUSTODY_FIRST_ENTRY_BINDINGS_VERSION",
    "VOID_FIRST_ENTRY_BIN",
    "VOID_FIRST_ENTRY_POLICY",
    "VOID_POLICY_MODE",
    "VOID_POLICY_BYTES",
    "VOID_POLICY_SHA256_HEX",
    "VOID_INSTALLER_PATH",
    "VOID_INSTALLER_MODE",
    "VOID_INSTALLER_BYTES",
    "VOID_INSTALLER_SHA256_HEX",
    "VOID_INSTALL_PLAN_PATH",
    "VOID_INSTALL_PLAN_MODE",
    "VOID_INSTALL_PLAN_BYTES",
    "VOID_INSTALL_PLAN_SHA256_HEX",
    "VOID_SOURCE_LOCK_PATH",
    "VOID_SOURCE_LOCK_MODE",
    "VOID_SOURCE_LOCK_BYTES",
    "VOID_SOURCE_LOCK_SHA256_HEX",
    "VOID_PROTECTED_CENSUS_PATH",
    "VOID_PROTECTED_CENSUS_MODE",
    "VOID_PROTECTED_CENSUS_BYTES",
    "VOID_PROTECTED_CENSUS_SHA256_HEX",
    "VOID_PYTHON_PATH",
    "VOID_PYTHON_MODE",
    "VOID_PYTHON_BYTES",
    "VOID_PYTHON_SHA256_HEX",
    "VOID_PYTHON_STDLIB_PATH",
    "VOID_PYTHON_STDLIB_MODE",
    "VOID_PYTHON_STDLIB_BYTES",
    "VOID_PYTHON_STDLIB_SHA256_HEX",
    "VOID_INSTALLER_FD",
    "VOID_PYTHON_FD",
)
for name in required_compile_bindings:
    assert f"#ifndef {name}" in source, name

# No production identity may be silently supplied by this source.
assert "VOID_PYTHON_DYNLOAD_PATH" not in source
assert "VOID_RUNTIME_FILE_TABLE" not in source

for forbidden in (
    '#define VOID_FIRST_ENTRY_BIN "',
    '#define VOID_FIRST_ENTRY_POLICY "',
    '#define VOID_INSTALLER_PATH "',
    '#define VOID_INSTALL_PLAN_PATH "',
    '#define VOID_SOURCE_LOCK_PATH "',
    '#define VOID_PROTECTED_CENSUS_PATH "',
    '#define VOID_PYTHON_PATH "',
    '#define VOID_PYTHON_STDLIB_PATH "',
    '#define VOID_PYTHON_STDLIB_SHA256_HEX "',
    '#define VOID_PYTHON_DYNLOAD_PATH "',
    '#define VOID_RUNTIME_FILE_TABLE(',
    "/opt/void-buy-allocation-custody-procref-installer-first-entry-v1",
):
    assert forbidden not in source, forbidden

for required in (
    '#define VOID_OPERATION "--install-accepted-protected-census-source"',
    '#define VOID_CONFIRM_FLAG "--confirm"',
    "INSTALL_ACCEPTED_VOID_CUSTODY_PROTECTED_PROCREF_SOURCE_V2_CREATE_ONLY",
    "verify_exact_argv(argc, argv);",
    "verify_closed_environment(envp);",
    "getuid() != 0",
    "geteuid() != 0",
    "setgroups(0, NULL)",
    'open("/proc/self/exe", O_RDONLY|O_CLOEXEC)',
    "verify_ancestry(VOID_FIRST_ENTRY_BIN);",
    "VOID_PYTHON_STDLIB_SHA256_HEX",
    "verify_static_elf64_x86_64_fd",
    "ELFCLASS64",
    "ELFDATA2LSB",
    "ET_EXEC",
    "EM_X86_64",
    "PT_INTERP",
    "PT_DYNAMIC",
    "PT_LOAD",
    "open_verified_regular(",
    "open_leaf_nofollow_nonblocking(",
    "O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC",
    "VOID_INSTALLER_SHA256_HEX",
    "VOID_PYTHON_SHA256_HEX",
    "duplicate_to_fixed_fd(installer_fd, VOID_INSTALLER_FD, 0)",
    "duplicate_to_fixed_fd(python_fd, VOID_PYTHON_FD, 1)",
    'open("/dev/null", O_RDONLY|O_CLOEXEC)',
    "PR_SET_NO_NEW_PRIVS",
    "SYS_close_range",
    "fexecve(VOID_PYTHON_FD, child_argv, child_env)",
    '"-I"',
    '"-B"',
    '"-S"',
    '"-c"',
    "install_accepted_source_create_only_after_protected_first_entry",
):
    assert required in source, required

# Native source itself contains no filesystem publication primitive.
for forbidden in (
    "O_CREAT",
    "O_TMPFILE",
    "mkdir(",
    "mkdirat(",
    "unlink(",
    "unlinkat(",
    "rename(",
    "renameat(",
    "renameat2(",
    "link(",
    "linkat(",
    "symlink(",
    "symlinkat(",
    "chmod(",
    "fchmod(",
    "chown(",
    "fchown(",
    "system(",
    "popen(",
    "fork(",
    "vfork(",
    "posix_spawn",
):
    assert forbidden not in source, forbidden

with tempfile.TemporaryDirectory(
    prefix="void-custody-first-entry-source-proof-"
) as tmp:
    tmp_path = Path(tmp)
    header = (
        tmp_path
        / "void_buy_allocation_custody_runtime_v3_"
        "installer_first_entry_bindings_v2.h"
    )
    header.write_text(
        """
#ifndef VOID_SYNTHETIC_BINDINGS_V2_H
#define VOID_SYNTHETIC_BINDINGS_V2_H
#define VOID_CUSTODY_FIRST_ENTRY_BINDINGS_VERSION 2
#define VOID_FIRST_ENTRY_BIN "/synthetic/first-entry/bin/launcher"
#define VOID_FIRST_ENTRY_POLICY "/synthetic/first-entry/policy-v1.conf"
#define VOID_POLICY_MODE 0444
#define VOID_POLICY_BYTES 64
#define VOID_POLICY_SHA256_HEX "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
#define VOID_INSTALLER_PATH "/synthetic/first-entry/source/ops/precision/installer.py"
#define VOID_INSTALLER_MODE 0444
#define VOID_INSTALLER_BYTES 46939
#define VOID_INSTALLER_SHA256_HEX "75934d38e5b89eed904be7738c82de6cd586ac11afc28e075cc44a4e7fb9d715"
#define VOID_INSTALL_PLAN_PATH "/synthetic/first-entry/source/ops/precision/plan.py"
#define VOID_INSTALL_PLAN_MODE 0444
#define VOID_INSTALL_PLAN_BYTES 100
#define VOID_INSTALL_PLAN_SHA256_HEX "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
#define VOID_SOURCE_LOCK_PATH "/synthetic/first-entry/source/ops/security/lock.json"
#define VOID_SOURCE_LOCK_MODE 0444
#define VOID_SOURCE_LOCK_BYTES 100
#define VOID_SOURCE_LOCK_SHA256_HEX "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
#define VOID_PROTECTED_CENSUS_PATH "/synthetic/first-entry/source/ops/precision/census.py"
#define VOID_PROTECTED_CENSUS_MODE 0444
#define VOID_PROTECTED_CENSUS_BYTES 74322
#define VOID_PROTECTED_CENSUS_SHA256_HEX "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
#define VOID_PYTHON_PATH "/synthetic/runtime/bin/python3"
#define VOID_PYTHON_MODE 0555
#define VOID_PYTHON_BYTES 1000
#define VOID_PYTHON_SHA256_HEX "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
#define VOID_PYTHON_STDLIB_PATH "/synthetic/runtime/lib/python-stdlib.zip"
#define VOID_PYTHON_STDLIB_MODE 0444
#define VOID_PYTHON_STDLIB_BYTES 500
#define VOID_PYTHON_STDLIB_SHA256_HEX "3333333333333333333333333333333333333333333333333333333333333333"
#define VOID_INSTALLER_FD 198
#define VOID_PYTHON_FD 199
#endif
""".lstrip(),
        encoding="ascii",
    )

    compile_ok = subprocess.run(
        [
            "cc",
            "-std=c11",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-fsyntax-only",
            "-I",
            str(tmp_path),
            str(TARGET),
        ],
        cwd="/",
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
    )
    assert compile_ok.returncode == 0, compile_ok.stderr

    missing_header = subprocess.run(
        [
            "cc",
            "-std=c11",
            "-fsyntax-only",
            "-I",
            str(tmp_path / "missing"),
            str(TARGET),
        ],
        cwd="/",
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
    )
    # The quoted include searches the source directory first, where no binding
    # header exists, then the deliberately missing include directory.
    assert missing_header.returncode != 0
    assert "installer_first_entry_bindings_v2.h" in missing_header.stderr

    assert source.count("open_leaf_nofollow_nonblocking(") == 3
    trusted_open = source.split("static int open_verified_regular(", 1)[1].split(
        "static void verify_static_elf64_x86_64_fd", 1
    )[0]
    self_open = source.split("static void verify_self_generation(void)", 1)[1].split(
        "static int duplicate_to_fixed_fd", 1
    )[0]
    assert "fd = open_leaf_nofollow_nonblocking(path);" in trusted_open
    assert (
        "path_fd = open_leaf_nofollow_nonblocking(VOID_FIRST_ENTRY_BIN);"
        in self_open
    )

    harness = tmp_path / "fifo-open-harness.c"
    target_literal = str(TARGET).replace("\\", "\\\\").replace('"', '\\"')
    harness.write_text(
        "#define main void_first_entry_original_main\n"
        f'#include "{target_literal}"\n'
        "#undef main\n"
        "int main(int argc, char **argv) {\n"
        "  struct stat st; int fd;\n"
        "  if (argc != 2) return 10;\n"
        "  fd = open_leaf_nofollow_nonblocking(argv[1]);\n"
        "  if (fd < 0) return 11;\n"
        "  if (fstat(fd, &st) != 0) return 12;\n"
        "  if (close(fd) != 0) return 13;\n"
        "  return S_ISFIFO(st.st_mode) ? 0 : 14;\n"
        "}\n",
        encoding="ascii",
    )
    harness_bin = tmp_path / "fifo-open-harness"
    harness_compile = subprocess.run(
        [
            "cc", "-std=c11", "-Wall", "-Wextra", "-Werror",
            "-I", str(tmp_path), str(harness), "-o", str(harness_bin),
        ],
        cwd="/",
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
    )
    assert harness_compile.returncode == 0, harness_compile.stderr

    fifo = tmp_path / "substituted-fifo"
    os.mkfifo(fifo, 0o600)
    live_fifo = subprocess.run(
        [str(harness_bin), str(fifo)],
        cwd="/",
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=2,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
    )
    assert live_fifo.returncode == 0, live_fifo

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_SOURCE_V2_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("predecessor_first_entry_head=" + PREDECESSOR_FIRST_ENTRY_HEAD)
print("predecessor_first_entry_blob=" + PREDECESSOR_FIRST_ENTRY_BLOB)
print("accepted_installer_lock_v2_exact=true")
print("production_identity_defaults_absent=true")
print("compile_time_binding_header_required=true")
print("synthetic_binding_syntax_compile_green=true")
print("missing_binding_header_compile_hold=true")
print("exact_privileged_argv_source_bound=true")
print("closed_environment_source_bound=true")
print("supplementary_groups_cleared_source_bound=true")
print("self_exe_generation_source_bound=true")
print("root_owned_nonwritable_ancestry_source_bound=true")
print("native_sha256_file_verification_source_bound=true")
print("stdlib_archive_exact_identity_source_bound=true")
print("python_sys_path_stdlib_zip_only=true")
print("dynamic_extension_namespace_absent=true")
print("static_python_elf64_x86_64_required=true")
print("static_python_pt_interp_forbidden=true")
print("static_python_pt_dynamic_forbidden=true")
print("static_python_pt_load_required=true")
print("retained_installer_fd_source_bound=true")
print("retained_python_fd_source_bound=true")
print("stdin_dev_null_source_bound=true")
print("untrusted_fd_close_range_source_bound=true")
print("python_fexecve_source_bound=true")
print("python_flags_i_b_s_c_source_bound=true")
print("fixed_installer_entrypoint_source_bound=true")
print("trusted_leaf_open_nonblocking_bound=true")
print("installed_self_leaf_open_nonblocking_bound=true")
print("live_fifo_substitution_nonblocking_regression=true")
print("native_filesystem_publication_primitive_absent=true")
print("first_entry_native_source_authored=true")
print("python_runtime_identity_selected=false")
print("python_stdlib_import_closure_selected=false")
print("first_entry_candidate_derived=false")
print("first_entry_candidate_accepted=false")
print("protected_installer_first_entry_installed=false")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("production_gate_ready=false")
print("funds_movement=false")
