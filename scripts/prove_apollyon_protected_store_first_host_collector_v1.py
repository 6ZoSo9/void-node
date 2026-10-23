#!/usr/bin/env python3
"""Source-only proof for metadata-safe Apollyon first-host collector V1."""
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
SOURCE_REL = "ops/xiphos/apollyon_protected_store_first_host_collector_v1.py"
SOURCE = ROOT / SOURCE_REL
PARENT_HEAD = "fe751eb56e18ec134b96cb7a4d03738e86379c0d"
EXPECTED_MACHINE_ID_SHA256 = (
    "543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057"
)
PARENT_BINDING_ID = (
    "voidapollyonhostidbind1_84b546de51ba3f22cd1f5775eb0230d5683e53254d3d3426b9a97fc2d3037f1d"
)

PINS = {
    "ops/security/apollyon-protected-store-machine-identity-binding-v1.json":
        "0fb44bcfd90423d5bfbe6f7a9e6143de54bc9b26",
    "scripts/prove_apollyon_protected_store_machine_identity_binding_v1.py":
        "45ab6a6cbfea05d61617de294d18ed7dec07fae9",
    "docs/security/apollyon-protected-store-machine-identity-binding-v1.md":
        "24cc4b6ce92931d9be9d39a46afb5a1c76e267fb",
    ".github/workflows/apollyon-protected-store-machine-identity-binding-v1.yml":
        "c8737fe68f15894bd15af0e775fc79cb2b50d9bb",
    SOURCE_REL:
        "012f1b007c82b0b529e55ce1911dc2375d7a6894",
}
SELF = "scripts/prove_apollyon_protected_store_first_host_collector_v1.py"
DOC = "docs/security/apollyon-protected-store-first-host-collector-v1.md"
WORKFLOW = ".github/workflows/apollyon-protected-store-first-host-collector-v1.yml"
EXPECTED_DELTA = sorted([SOURCE_REL, SELF, DOC, WORKFLOW])

class ProofHold(RuntimeError):
    pass

def need(value: bool, reason: str) -> None:
    if not value:
        raise ProofHold(reason)

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["/usr/bin/git", "--no-replace-objects", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env={
            "PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
            "LANG": "C", "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        },
    )
    need(result.returncode == 0, "git_failed:" + (result.stderr or "")[:120])
    return result.stdout.strip()

def expect_hold(fn, reason_prefix: str) -> None:
    try:
        fn()
    except mod.Hold as exc:
        need(str(exc).startswith(reason_prefix), "wrong_hold:" + str(exc))
    else:
        raise ProofHold("expected_hold_missing:" + reason_prefix)

for rel, expected in PINS.items():
    need(git_blob((ROOT / rel).read_bytes()) == expected, "pin_mismatch:" + rel)
run_git(["merge-base", "--is-ancestor", PARENT_HEAD, "HEAD"])
changed = sorted(
    item for item in run_git(["diff", "--name-only", PARENT_HEAD, "HEAD", "--"]).splitlines()
    if item
)
need(changed == EXPECTED_DELTA, "collector_scope_drift")
run_git(["diff", "--check", PARENT_HEAD, "HEAD", "--"])

source_text = SOURCE.read_text("utf-8")
for forbidden in (
    ' / "cmdline"', ' / "environ"', "os.environ", "os.getenv(",
    "os.listdir(", "os.scandir(", ".iterdir(", ".glob(", ".rglob(",
    "socket.create_connection", "urllib.", "requests.",
):
    need(forbidden not in source_text, "forbidden_source_surface:" + forbidden)
for required in (
    'SYSTEMCTL, "show", CLAIM_SERVICE_UNIT_NAME',
    '"protected_record_contents_read": False',
    '"protected_record_names_listed": False',
    '"process_environment_read": False',
    '"raw_process_args_read": False',
    '"filesystem_mutation": False',
    '"service_mutation": False',
    '"network_rpc_contact": False',
    '"training_execution": False',
    '"funds_movement": False',
    'hold("process_generation_changed")',
    'hold("process_status_changed")',
    'hold("process_executable_generation_changed")',
    'hold("machine_identity_changed_during_pass")',
    'hold("trusted_ancestor_metadata_changed_during_pass")',
    'hold("fixed_path_metadata_changed_during_pass")',
    'hold("mount_metadata_changed_during_pass")',
    'hold("service_state_changed_during_pass")',
    'hold("service_process_subject_changed_during_pass")',
):
    need(required in source_text, "required_source_boundary_missing:" + required)

spec = importlib.util.spec_from_file_location(
    "apollyon_first_host_collector_v1", SOURCE
)
need(spec is not None and spec.loader is not None, "import_spec_invalid")
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)

need(mod.TARGET_HOST == "Xiphos", "target_host_invalid")
need(
    mod.EXPECTED_MACHINE_ID_SHA256 == EXPECTED_MACHINE_ID_SHA256,
    "machine_digest_invalid",
)
need(mod.PARENT_BINDING_ID == PARENT_BINDING_ID, "binding_id_invalid")

good = b"0123456789abcdef0123456789abcdef\n"
need(
    mod.normalize_machine_id(good)
    == hashlib.sha256(good.strip()).hexdigest(),
    "normalization_invalid",
)
for bad in (
    b"", b"0123456789ABCDEF0123456789ABCDEF",
    b"0123456789abcdef0123456789abcdeg",
    b"0123456789abcdef",
):
    expect_hold(lambda bad=bad: mod.normalize_machine_id(bad), "machine_id_")

valid_status = (
    b"Name:\ttest\n"
    b"Uid:\t1001\t1001\t1001\t1001\n"
    b"Gid:\t1002\t1002\t1002\t1002\n"
    b"Groups:\t1002 1003\n"
    b"NoNewPrivs:\t1\n"
    b"CapEff:\t0000000000000000\n"
    b"CapBnd:\t000001ffffffffff\n"
    b"CapAmb:\t0000000000000000\n"
)
need(mod.parse_status(valid_status)["Uid"].startswith("1001"), "status_positive_invalid")
proc_stat = b"321 (worker name) S " + (b"1 " * 18) + b"555 0 0\n"
need(
    mod.parse_proc_stat_start_ticks(proc_stat, 321) == "555",
    "proc_stat_start_ticks_invalid",
)
expect_hold(
    lambda: mod.parse_proc_stat_start_ticks(proc_stat, 322),
    "process_stat_pid_mismatch",
)
expect_hold(
    lambda: mod.parse_status(valid_status + b"Uid:\t1\t1\t1\t1\n"),
    "process_status_duplicate:Uid",
)
expect_hold(
    lambda: mod.parse_status(valid_status.replace(b"CapAmb:\t0000000000000000\n", b"")),
    "process_status_required_fields_missing",
)

systemctl_text = "\n".join([
    "LoadState=loaded",
    "ActiveState=inactive",
    "SubState=dead",
    "UnitFileState=disabled",
    "MainPID=0",
    "Result=success",
    "FragmentPath=/etc/systemd/system/void-apollyon-attempt-claim-v2.service",
    "ControlGroup=",
]) + "\n"
need(mod.parse_systemctl_show(systemctl_text)["MainPID"] == "0", "systemctl_positive_invalid")
expect_hold(
    lambda: mod.parse_systemctl_show(systemctl_text + "MainPID=1\n"),
    "systemctl_show_field_invalid",
)

mount_sample = (
    "36 25 0:32 / / rw - ext4 /dev/root rw\n"
    "37 36 0:32 / /var/lib/void-apollyon-attempt-claim-v2 rw - ext4 /dev/root rw\n"
).encode()
mounts = mod.parse_mountinfo(
    mount_sample,
    (
        Path("/var/lib/void-apollyon-attempt-claim-v2"),
        Path("/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1"),
    ),
)
need(
    mounts["/var/lib/void-apollyon-attempt-claim-v2"]["exact_mount_point"] is True,
    "mount_exact_positive_invalid",
)
ambiguous_mount_sample = (
    "36 25 0:32 / / rw - ext4 /dev/root rw\n"
    "37 36 0:32 / /var/lib/void-apollyon-attempt-claim-v2 rw - ext4 /dev/root rw\n"
    "38 36 0:33 / /var/lib/void-apollyon-attempt-claim-v2 rw - tmpfs tmpfs rw\n"
).encode()
expect_hold(
    lambda: mod.parse_mountinfo(
        ambiguous_mount_sample,
        (Path("/var/lib/void-apollyon-attempt-claim-v2"),),
    ),
    "mountinfo_target_ambiguous:",
)

with tempfile.TemporaryDirectory(prefix="apollyon-first-host-collector-proof-") as td:
    root = Path(td) / "root"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    no_listdir = os.listdir
    no_scandir = os.scandir
    mod.os.listdir = lambda *a, **k: (_ for _ in ()).throw(
        AssertionError("listdir_forbidden")
    )
    mod.os.scandir = lambda *a, **k: (_ for _ in ()).throw(
        AssertionError("scandir_forbidden")
    )
    try:
        observed = mod._open_metadata(root, "directory", check_acl=False)
        need(observed["present"] is True, "fixture_metadata_missing")
    finally:
        mod.os.listdir = no_listdir
        mod.os.scandir = no_scandir

    alias = Path(td) / "alias"
    alias.symlink_to(root, target_is_directory=True)
    expect_hold(
        lambda: mod._open_metadata(alias, "directory", check_acl=False),
        "fixed_path_symlink:",
    )

with tempfile.TemporaryDirectory(prefix="apollyon-first-host-acl-proof-") as td:
    root = Path(td) / "root"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    real_getxattr = mod.os.getxattr
    target_ino = root.stat().st_ino
    def injected_acl(fd: int, name: str, *args, **kwargs):
        if os.fstat(fd).st_ino == target_ino and name == "system.posix_acl_access":
            return b"synthetic-acl"
        return real_getxattr(fd, name, *args, **kwargs)
    mod.os.getxattr = injected_acl
    try:
        expect_hold(
            lambda: mod._open_metadata(root, "directory", check_acl=True),
            "fixed_path:" + str(root) + "_extended_acl_present",
        )
    finally:
        mod.os.getxattr = real_getxattr

with tempfile.TemporaryDirectory(prefix="apollyon-first-host-drift-proof-") as td:
    root = Path(td) / "root"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    real_fstat = mod.os.fstat
    target_ino = root.stat().st_ino
    seen = [0]
    def drift_terminal(fd: int):
        row = real_fstat(fd)
        if row.st_ino != target_ino:
            return row
        seen[0] += 1
        if seen[0] < 2:
            return row
        data = {
            name: getattr(row, name)
            for name in (
                "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
                "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
            )
        }
        data["st_mode"] = (row.st_mode & ~0o7777) | 0o750
        return types.SimpleNamespace(**data)
    mod.os.fstat = drift_terminal
    try:
        expect_hold(
            lambda: mod._open_metadata(root, "directory", check_acl=False),
            "fixed_path_terminal_generation_changed:",
        )
    finally:
        mod.os.fstat = real_fstat
    need(seen[0] >= 2, "terminal_drift_not_exercised")

plan = mod.plan_receipt()
need(plan["authority"]["host_pass_performed"] is False, "plan_host_pass_promoted")
for key in (
    "protected_store_origin_proven",
    "writer_invocation_authorized",
    "training_execution_authorized",
    "credential_access",
    "signing",
    "transaction",
    "funds_movement",
):
    need(plan["authority"][key] is False, "plan_authority_promoted:" + key)

print("VOID_APOLLYON_PROTECTED_STORE_FIRST_HOST_COLLECTOR_V1_PROOF_GREEN")
print("source_blob=" + PINS[SOURCE_REL])
print("exact_parent_binding_pinned=true")
print("machine_identity_digest_pinned=true")
print("protected_record_contents_read=false")
print("protected_record_names_listed=false")
print("process_environment_read=false")
print("raw_process_args_read=false")
print("directory_enumeration_not_required=true")
print("acl_adversary_rejected=true")
print("terminal_metadata_drift_rejected=true")
print("ambiguous_stacked_mount_rejected=true")
print("systemctl_show_only_contract=true")
print("host_pass_performed=false")
print("filesystem_mutation=false")
print("service_mutation=false")
print("training_execution=false")
print("funds_movement=false")
