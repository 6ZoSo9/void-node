#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/precision/void_buy_void_v7_static_python_runtime_generation_proof_v1.py"
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "18299de23193f0ab98dca0a2fe50e55376f3b1b1"
V5_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"
V5_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"
MARKER = "VOID_BUY_VOID_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF_V1_PROOF"

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
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
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_NO_LAZY_FETCH": "1",
            "GIT_ALLOW_PROTOCOL": "",
        },
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError("git_failed:" + ":".join(args))
    return cp.stdout.strip()

assert git("rev-parse", "HEAD:" + TARGET_REL) == TARGET_BLOB
assert git("rev-parse", "HEAD:" + V5_REL) == V5_BLOB

raw = TARGET.read_bytes()
compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
text = raw.decode("utf-8")
assert 'raise RuntimeProofError("candidate_execution_snapshot_not_same_uid_immutable")' in text
assert 'mount_root=root,' in text
assert 'python_snapshot_fd=python_snapshot_fd,' in text
assert 'stdlib_snapshot_fd=stdlib_snapshot_fd,' in text
assert '["/bin/python3.12-static", "-I", "-B", "-S", "-c", PROBE, "/"]' in text
assert '"/synthetic-repo/" + V5_REL' in text
assert 'probe = _check_probe(probe_out)' in text
assert 'python_snapshot_fd = _sealed_snapshot_from_fd(' in text
assert 'stdlib_snapshot_fd = _sealed_snapshot_from_fd(' in text
assert 'label="python_candidate_snapshot"' in text
assert 'label="stdlib_candidate_snapshot"' in text
assert '_copy_fd_exact(python_fd, python_target' not in text
assert '_copy_fd_exact(stdlib_fd, zip_target' not in text
assert 'self_test_snapshot' in text
assert 'def _require_sealed_snapshot_fd(' in text
assert 'snapshot_fd_not_sealed' in text
assert 'sealed_snapshot_fd_admission_required=true' in text
assert '_check_probe(probe_out, root)' not in text
assert 'cwd=root' not in text
assert 'os.fspath(python_target), "-I", "-B", "-S", "-c", PROBE' not in text

required = (
    'MARKER = "VOID_BUY_VOID_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF_V1"',
    'V5_GIT_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"',
    'V5_BYTES = 89416',
    'V5_SHA256 = "6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b"',
    'F_SEAL_WRITE',
    'F_SEAL_GROW',
    'F_SEAL_SHRINK',
    'F_SEAL_SEAL',
    'fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)',
    'python_elf_pt_interp_forbidden',
    'python_elf_pt_dynamic_forbidden',
    'python_elf_pt_load_required',
    'candidate_host_sys_path_forbidden',
    'candidate_sys_path_outside_private_lib',
    'candidate_ctypes_not_from_exact_zip',
    'candidate_native_ctypes_not_builtin',
    'candidate_renameat2_unavailable',
    '["/bin/python3.12-static", "-I", "-B", "-S", "-c", PROBE, "/"]',
    'V5_BOOTSTRAP = r',
    'synthetic_v5 = root / "synthetic-repo" / V5_REL',
    '"-I", "-B", "-S", "-c", V5_BOOTSTRAP',
    'str(v5_fd)',
    'code = compile(raw, synthetic, "exec", dont_inherit=True, optimize=0)',
    'sys.argv = [synthetic, "--self-test"]',
    'root_execution_forbidden',
    'candidate_execution_snapshot_not_same_uid_immutable',
    'candidate_execution_sandbox_required=true',
    'landlock_v3_filesystem_confinement_required=true',
    'seccomp_network_process_escape_denial_required=true',
    'same_uid_immutable_runtime_snapshot_required=true',
    'candidate_execution_performed',
    '"fsverity_host_readiness_established": False',
    '"protected_host_install": False',
    '"protected_v5_apply": False',
    '"funds_movement": False',
    'BIND_EXACT_RUNTIME_RECEIPT_AND_RESOLVE_PERSISTENT_CONTENT_SEAL_HOLD',
)
for needle in required:
    assert needle in text, needle

for forbidden in (
    "FS_IOC_ENABLE_VERITY",
    "sudo ",
    "pkexec",
    "systemctl",
    "transaction_submission",
):
    assert forbidden not in text, forbidden

cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
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
        "PYTHONPATH": "/tmp/void-hostile-pythonpath",
    },
)
assert cp.returncode == 0, (cp.returncode, cp.stderr, cp.stdout)
assert cp.stderr == "", cp.stderr
lines = set(cp.stdout.splitlines())
for marker in (
    "VOID_BUY_VOID_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF_V1_SELF_TEST_GREEN",
    "candidate_execution=false",
    "root_execution=false",
    "sealed_memfd_snapshot_required=true",
    "static_elf_pt_interp_forbidden=true",
    "static_elf_pt_dynamic_forbidden=true",
    "runtime_import_closure_proof_required=true",
    "candidate_execution_sandbox_required=true",
    "landlock_v3_filesystem_confinement_required=true",
    "seccomp_network_process_escape_denial_required=true",
    "same_uid_immutable_runtime_snapshot_required=true",
    "fsverity_host_readiness_established=false",
    "protected_host_install=false",
    "protected_v5_apply=false",
    "funds_movement=false",
):
    assert marker in lines, marker

print(MARKER + "_GREEN")
print("source_blob=" + TARGET_BLOB)
print("v5_blob=" + V5_BLOB)
print("source_self_test_green=true")
print("candidate_execution=false")
print("root_execution=false")
print("sealed_memfd_snapshot_required=true")
print("runtime_import_closure_candidate_run_separate=true")
print("fsverity_host_readiness_established=false")
print("protected_host_install=false")
print("protected_v5_apply=false")
print("funds_movement=false")
