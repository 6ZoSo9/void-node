#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/precision/void_buy_void_v7_host_capability_census_v1.py"
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "074c1906092b9564c81690df982b011af61c9e2f"
LAUNCHER_REL = "ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v1.c"
LAUNCHER_BLOB = "3b6402a1df523842720a24b719c2b3e86c18ed42"
MARKER = "VOID_BUY_VOID_V7_HOST_CAPABILITY_CENSUS_V1_PROOF"

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
assert git("rev-parse", "HEAD:" + LAUNCHER_REL) == LAUNCHER_BLOB

raw = TARGET.read_bytes()
compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
text = raw.decode("utf-8")

for required in (
    'MARKER = "VOID_BUY_VOID_V7_HOST_CAPABILITY_CENSUS_V1"',
    'EXPECTED_LAUNCHER_HEAD = "08356a62bdea145b716c9f4fe1ddbda8fe6800e4"',
    'STATIC_LAUNCHER_SHA256 = "5e9a5d70b54632b3247184cd9d20df15e43f69ec3ebbd82d4444487d1cbb4a00"',
    'FS_IOC_MEASURE_VERITY = 0xC0046686',
    'FS_VERITY_HASH_ALG_SHA256 = 1',
    'errno.ENODATA',
    'errno.ENOTTY',
    'errno.EOPNOTSUPP',
    '"supported_not_enabled_on_probe"',
    '"filesystem_does_not_implement_fsverity"',
    '"kernel_or_superblock_fsverity_unavailable"',
    '"python_elf_pt_interp_forbidden"',
    '"python_elf_pt_dynamic_forbidden"',
    '"stdlib_zip_lib_dynload_forbidden"',
    '"candidate_execution": False',
    '"fsverity_enablement": False',
    '"filesystem_write": False',
    '"protected_filesystem_mutation": False',
    '"DERIVE_REVIEWED_V7_HOST_INSTALL_PLAN"',
    '"SATISFY_V7_HOST_CAPABILITY_HOLDS"',
):
    assert required in text, required

assert "import subprocess" not in text
assert "from subprocess" not in text
assert "subprocess.run(" not in text
assert "subprocess.Popen(" not in text

for forbidden in (
    "FS_IOC_ENABLE_VERITY",
    "O_WRONLY",
    "O_RDWR",
    "O_CREAT",
    "socket.",
    "connect(",
    "listen(",
    "execve(",
    "fexecve(",
):
    assert forbidden not in text, forbidden

cp = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--self-test"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert cp.returncode == 0 and cp.stderr == ""
lines = cp.stdout.splitlines()
for line in (
    "VOID_BUY_VOID_V7_HOST_CAPABILITY_CENSUS_V1_SELF_TEST_GREEN",
    "filesystem_write=false",
    "protected_filesystem_mutation=false",
    "fsverity_enablement=false",
    "candidate_execution=false",
    "service_mutation=false",
    "credential_access=false",
    "signing=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert line in lines, line

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("launcher_blob=" + LAUNCHER_BLOB)
print("fsverity_measure_only=true")
print("fsverity_enablement=false")
print("candidate_execution=false")
print("filesystem_write=false")
print("protected_filesystem_mutation=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
