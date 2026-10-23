#!/usr/bin/env python3
"""Metadata-safe, read-only first-host evidence collector for Xiphos.

Source candidate only. The --run host pass requires separate operator authority.
Never reads protected record names/contents, process cmdline/environ, credentials,
or performs filesystem/service/training/network/transaction/funds mutation.
"""
from __future__ import annotations

import sys

def _require_isolated_python() -> None:
    flags = sys.flags
    if not (
        flags.isolated == 1
        and flags.ignore_environment == 1
        and flags.no_user_site == 1
        and flags.dont_write_bytecode == 1
        and getattr(flags, "safe_path", 0) == 1
    ):
        sys.stderr.write("HOLD=isolated_python_required\n")
        raise SystemExit(2)

_require_isolated_python()

import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
from typing import Any

MARKER = "VOID_APOLLYON_PROTECTED_STORE_FIRST_HOST_COLLECTOR_V1"
TARGET_HOST = "Xiphos"
EXPECTED_MACHINE_ID_SHA256 = (
    "543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057"
)
PARENT_BINDING_ID = (
    "voidapollyonhostidbind1_84b546de51ba3f22cd1f5775eb0230d5683e53254d3d3426b9a97fc2d3037f1d"
)
PARENT_PLAN_ID = (
    "voidapollyonfirsthostplan1_c75bf9aaa019f82e2d73c80cb0c8bb3a1072bc462870a6d36b67a40fc59746be"
)

MACHINE_ID = Path("/etc/machine-id")
CLAIM_STATE_ROOT = Path("/var/lib/void-apollyon-attempt-claim-v2")
CONSUMPTION_DIR = CLAIM_STATE_ROOT / "training-start-consumption-v1"
CLAIM_SOCKET_PARENT = Path("/run/void-apollyon-attempt-claim-v2")
CLAIM_SERVICE_UNIT_PATH = Path(
    "/etc/systemd/system/void-apollyon-attempt-claim-v2.service"
)
CLAIM_SERVICE_SOURCE_ROOT = Path(
    "/opt/void-apollyon-attempt-claim-v2-reviewed-v1"
)
CLAIM_PUBLISHER_SOURCE_ROOT = Path(
    "/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1"
)
CLAIM_SERVICE_UNIT_NAME = "void-apollyon-attempt-claim-v2.service"
SYSTEMCTL = "/usr/bin/systemctl"
PROC_ROOT = Path("/proc")
MOUNTINFO = Path("/proc/self/mountinfo")
MNT_NS = Path("/proc/self/ns/mnt")

MACHINE_ID_RE = re.compile(r"^[0-9a-f]{32}$")
PID_RE = re.compile(r"^[1-9][0-9]*$")
DIR_FLAGS = (
    os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    | getattr(os, "O_NONBLOCK", 0)
)
FILE_FLAGS = (
    os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC
    | getattr(os, "O_NONBLOCK", 0)
)
MAX_MACHINE_ID_BYTES = 4096
MAX_STATUS_BYTES = 256 * 1024
MAX_MOUNTINFO_BYTES = 1024 * 1024

STATUS_KEYS = (
    "Uid", "Gid", "Groups", "NoNewPrivs", "CapEff", "CapBnd", "CapAmb"
)
SYSTEMCTL_KEYS = (
    "LoadState", "ActiveState", "SubState", "UnitFileState",
    "MainPID", "Result", "FragmentPath", "ControlGroup",
)

class Hold(RuntimeError):
    pass

def hold(reason: str) -> None:
    raise Hold(reason)

def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def _same_generation(a: os.stat_result, b: os.stat_result) -> bool:
    keys = (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
        "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
    )
    return all(getattr(a, key) == getattr(b, key) for key in keys)

def _meta(row: os.stat_result) -> dict[str, Any]:
    if stat.S_ISDIR(row.st_mode):
        kind = "directory"
    elif stat.S_ISREG(row.st_mode):
        kind = "regular"
    else:
        kind = "other"
    return {
        "device": int(row.st_dev),
        "inode": int(row.st_ino),
        "uid": int(row.st_uid),
        "gid": int(row.st_gid),
        "mode": stat.S_IMODE(row.st_mode),
        "nlink": int(row.st_nlink),
        "size": int(row.st_size),
        "mtime_ns": int(row.st_mtime_ns),
        "ctime_ns": int(row.st_ctime_ns),
        "kind": kind,
    }

def _read_exact_regular(path: Path, maximum: int, label: str) -> bytes:
    before = os.lstat(path)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size <= 0
        or before.st_size > maximum
    ):
        hold(label + "_metadata_invalid")
    fd = os.open(path, FILE_FLAGS)
    try:
        opened = os.fstat(fd)
        if not _same_generation(before, opened):
            hold(label + "_generation_changed_on_open")
        out = bytearray()
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                hold(label + "_short_read")
            out.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1) != b"":
            hold(label + "_grew")
        after = os.fstat(fd)
        visible = os.lstat(path)
        if not (
            _same_generation(opened, after)
            and _same_generation(after, visible)
        ):
            hold(label + "_terminal_generation_changed")
        return bytes(out)
    finally:
        os.close(fd)

def normalize_machine_id(raw: bytes) -> str:
    try:
        text = raw.decode("ascii", "strict").strip()
    except UnicodeError as exc:
        raise Hold("machine_id_unreadable") from exc
    if not MACHINE_ID_RE.fullmatch(text):
        hold("machine_id_invalid")
    return _sha256(text.encode("ascii"))

def _require_no_acl(fd: int, label: str) -> None:
    for name in ("system.posix_acl_access", "system.posix_acl_default"):
        try:
            os.getxattr(fd, name)
        except OSError as exc:
            if exc.errno == errno.ENODATA:
                continue
            raise Hold(label + "_acl_check_unavailable") from exc
        hold(label + "_extended_acl_present")

def _open_metadata(path: Path, expected: str, check_acl: bool = False) -> dict[str, Any]:
    try:
        before = os.lstat(path)
    except FileNotFoundError:
        return {"present": False}
    if stat.S_ISLNK(before.st_mode):
        hold("fixed_path_symlink:" + str(path))
    if expected == "directory":
        if not stat.S_ISDIR(before.st_mode):
            hold("fixed_path_type_invalid:" + str(path))
        flags = DIR_FLAGS
    elif expected == "regular":
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
            hold("fixed_path_type_invalid:" + str(path))
        flags = FILE_FLAGS
    else:
        hold("internal_expected_type_invalid")
    try:
        fd = os.open(path, flags)
    except PermissionError as exc:
        raise Hold("root_privilege_required_for_metadata_visibility:" + str(path)) from exc
    try:
        opened = os.fstat(fd)
        visible = os.lstat(path)
        if not (
            _same_generation(before, opened)
            and _same_generation(opened, visible)
        ):
            hold("fixed_path_generation_changed:" + str(path))
        if check_acl:
            _require_no_acl(fd, "fixed_path:" + str(path))
        terminal = os.fstat(fd)
        terminal_visible = os.lstat(path)
        if not (
            _same_generation(opened, terminal)
            and _same_generation(terminal, terminal_visible)
        ):
            hold("fixed_path_terminal_generation_changed:" + str(path))
        return {"present": True, "metadata": _meta(terminal)}
    finally:
        os.close(fd)

def _trusted_ancestor(path: Path) -> dict[str, Any]:
    row = os.lstat(path)
    if (
        not stat.S_ISDIR(row.st_mode)
        or stat.S_ISLNK(row.st_mode)
        or row.st_uid != 0
        or stat.S_IMODE(row.st_mode) & 0o022
    ):
        hold("trusted_ancestor_invalid:" + str(path))
    return _meta(row)

def _read_bounded(path: Path, maximum: int, label: str) -> bytes:
    st = os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_size < 0
        or st.st_size > maximum
    ):
        hold(label + "_metadata_invalid")
    fd = os.open(path, FILE_FLAGS)
    try:
        opened = os.fstat(fd)
        if not _same_generation(st, opened):
            hold(label + "_generation_changed_on_open")
        out = bytearray()
        while len(out) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(out)))
            if not chunk:
                break
            out.extend(chunk)
        if len(out) > maximum:
            hold(label + "_oversized")
        after = os.fstat(fd)
        visible = os.lstat(path)
        if not (
            _same_generation(opened, after)
            and _same_generation(after, visible)
        ):
            hold(label + "_terminal_generation_changed")
        return bytes(out)
    finally:
        os.close(fd)

def parse_status(raw: bytes) -> dict[str, str]:
    try:
        text = raw.decode("ascii", "strict")
    except UnicodeError as exc:
        raise Hold("process_status_non_ascii") from exc
    found: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        if key in STATUS_KEYS:
            if key in found:
                hold("process_status_duplicate:" + key)
            found[key] = value.strip()
    if set(found) != set(STATUS_KEYS):
        hold("process_status_required_fields_missing")
    for key in ("Uid", "Gid"):
        values = found[key].split()
        if len(values) != 4 or any(not item.isdigit() for item in values):
            hold("process_status_identity_invalid:" + key)
    groups = found["Groups"].split()
    if any(not item.isdigit() for item in groups):
        hold("process_status_groups_invalid")
    if found["NoNewPrivs"] not in ("0", "1"):
        hold("process_status_nnp_invalid")
    for key in ("CapEff", "CapBnd", "CapAmb"):
        if not re.fullmatch(r"[0-9A-Fa-f]{16}", found[key]):
            hold("process_status_capability_invalid:" + key)
    return found

def parse_systemctl_show(text: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for line in text.splitlines():
        if "=" not in line:
            hold("systemctl_show_line_invalid")
        key, value = line.split("=", 1)
        if key not in SYSTEMCTL_KEYS or key in found:
            hold("systemctl_show_field_invalid")
        found[key] = value
    if set(found) != set(SYSTEMCTL_KEYS):
        hold("systemctl_show_fields_missing")
    if found["MainPID"] and not found["MainPID"].isdigit():
        hold("systemctl_mainpid_invalid")
    return found

def _systemctl_show() -> dict[str, str]:
    env = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
        "LANG": "C", "LC_ALL": "C",
    }
    try:
        result = subprocess.run(
            [
                SYSTEMCTL, "show", CLAIM_SERVICE_UNIT_NAME, "--no-pager",
                *["--property=" + key for key in SYSTEMCTL_KEYS],
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=10,
            env=env,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise Hold("systemctl_show_failed") from exc
    if result.returncode != 0:
        hold("systemctl_show_failed")
    return parse_systemctl_show(result.stdout)

def _process_observation(pid_text: str) -> dict[str, Any] | None:
    if pid_text in ("", "0"):
        return None
    if not PID_RE.fullmatch(pid_text):
        hold("service_mainpid_invalid")
    pid = int(pid_text)
    status_path = PROC_ROOT / str(pid) / "status"
    exe_path = PROC_ROOT / str(pid) / "exe"
    raw = _read_bounded(status_path, MAX_STATUS_BYTES, "process_status")
    status = parse_status(raw)
    try:
        exe_target = os.readlink(exe_path)
        exe_stat = os.stat(exe_path)
        exe_link = os.lstat(exe_path)
    except OSError as exc:
        raise Hold("process_executable_identity_unavailable") from exc
    if not stat.S_ISLNK(exe_link.st_mode) or not stat.S_ISREG(exe_stat.st_mode):
        hold("process_executable_identity_invalid")
    return {
        "pid": pid,
        "status": status,
        "executable_path": exe_target,
        "executable_metadata": _meta(exe_stat),
    }

def _decode_mount_path(text: str) -> str:
    for encoded, decoded in (
        ("\\040", " "), ("\\011", "\t"), ("\\012", "\n"), ("\\134", "\\"),
    ):
        text = text.replace(encoded, decoded)
    return text

def parse_mountinfo(raw: bytes, targets: tuple[Path, ...]) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise Hold("mountinfo_utf8_invalid") from exc
    rows: list[dict[str, str]] = []
    for line in text.splitlines():
        left, sep, right = line.partition(" - ")
        if not sep:
            hold("mountinfo_line_invalid")
        fields = left.split()
        tail = right.split()
        if len(fields) < 6 or len(tail) < 3:
            hold("mountinfo_line_invalid")
        rows.append({
            "mount_id": fields[0],
            "parent_id": fields[1],
            "major_minor": fields[2],
            "root": _decode_mount_path(fields[3]),
            "mount_point": _decode_mount_path(fields[4]),
            "fs_type": tail[0],
        })
    if not rows:
        hold("mountinfo_empty")
    out: dict[str, Any] = {}
    for target in targets:
        name = str(target)
        candidates = []
        for row in rows:
            mp = row["mount_point"]
            if name == mp or name.startswith(mp.rstrip("/") + "/"):
                candidates.append(row)
        if not candidates:
            hold("mountinfo_target_uncovered:" + name)
        cover = max(candidates, key=lambda row: len(row["mount_point"]))
        alias_count = sum(
            1 for row in rows
            if row["major_minor"] == cover["major_minor"]
            and row["root"] == cover["root"]
        )
        material = json.dumps(cover, sort_keys=True, separators=(",", ":")).encode()
        out[name] = {
            "cover_mount_point": cover["mount_point"],
            "fs_type": cover["fs_type"],
            "cover_row_sha256": _sha256(material),
            "same_root_device_mount_count": alias_count,
            "exact_mount_point": cover["mount_point"] == name,
        }
    return out

def _mount_observation() -> dict[str, Any]:
    raw = _read_bounded(MOUNTINFO, MAX_MOUNTINFO_BYTES, "mountinfo")
    try:
        ns = os.readlink(MNT_NS)
    except OSError as exc:
        raise Hold("mount_namespace_unavailable") from exc
    return {
        "mount_namespace": ns,
        "targets": parse_mountinfo(raw, (CLAIM_STATE_ROOT, CONSUMPTION_DIR)),
    }

def _authority(host_pass: bool) -> dict[str, bool]:
    return {
        "host_pass_performed": host_pass,
        "machine_identity_bound": True,
        "protected_store_origin_proven": False,
        "current_store_generation_revalidation_performed": False,
        "authorization_winner_reread_performed": False,
        "durable_claim_record_reread_performed": False,
        "consumption_slot_classification_performed": False,
        "writer_directory_capability_origin_proven": False,
        "writer_invocation_authorized": False,
        "consumption_publication_authorized": False,
        "trainer_release_authorized": False,
        "training_execution_authorized": False,
        "credential_access": False,
        "signing": False,
        "transaction": False,
        "funds_movement": False,
    }

def plan_receipt() -> dict[str, Any]:
    return {
        "marker": MARKER,
        "version": 1,
        "mode": "plan",
        "target_host": TARGET_HOST,
        "expected_machine_id_sha256": EXPECTED_MACHINE_ID_SHA256,
        "parent_binding_id": PARENT_BINDING_ID,
        "parent_plan_id": PARENT_PLAN_ID,
        "fixed_paths_only": True,
        "protected_record_contents_read": False,
        "protected_record_names_listed": False,
        "process_environment_read": False,
        "raw_process_args_read": False,
        "filesystem_mutation": False,
        "service_mutation": False,
        "network_rpc_contact": False,
        "training_execution": False,
        "funds_movement": False,
        "authority": _authority(False),
        "next_action": "SEPARATE_OPERATOR_AUTHORIZATION_THEN_RUN_METADATA_SAFE_FIRST_HOST_PASS",
    }

def run_host_pass() -> dict[str, Any]:
    if socket.gethostname().casefold() != TARGET_HOST.casefold():
        hold("wrong_host")
    digest = normalize_machine_id(
        _read_exact_regular(MACHINE_ID, MAX_MACHINE_ID_BYTES, "machine_id")
    )
    if digest != EXPECTED_MACHINE_ID_SHA256:
        hold("machine_identity_mismatch")

    ancestors = {
        str(path): _trusted_ancestor(path)
        for path in (
            Path("/"), Path("/var"), Path("/var/lib"), Path("/run"),
            Path("/opt"), Path("/etc"), Path("/etc/systemd"),
            Path("/etc/systemd/system"),
        )
    }
    paths = {
        "claim_state_root": _open_metadata(
            CLAIM_STATE_ROOT, "directory", check_acl=True
        ),
        "consumption_directory": _open_metadata(
            CONSUMPTION_DIR, "directory", check_acl=True
        ),
        "claim_socket_parent": _open_metadata(
            CLAIM_SOCKET_PARENT, "directory", check_acl=False
        ),
        "service_unit": _open_metadata(
            CLAIM_SERVICE_UNIT_PATH, "regular", check_acl=False
        ),
        "service_source_root": _open_metadata(
            CLAIM_SERVICE_SOURCE_ROOT, "directory", check_acl=False
        ),
        "publisher_source_root": _open_metadata(
            CLAIM_PUBLISHER_SOURCE_ROOT, "directory", check_acl=False
        ),
    }
    service = _systemctl_show()
    process = _process_observation(service["MainPID"])
    mounts = _mount_observation()

    receipt = {
        "marker": MARKER,
        "version": 1,
        "mode": "run",
        "status": "metadata_safe_first_host_observation_complete",
        "target_host": TARGET_HOST,
        "machine_id_sha256": digest,
        "machine_identity_match": True,
        "parent_binding_id": PARENT_BINDING_ID,
        "parent_plan_id": PARENT_PLAN_ID,
        "trusted_ancestors": ancestors,
        "fixed_path_metadata": paths,
        "mount_metadata": mounts,
        "service_state": service,
        "service_process_identity": process,
        "installed_source_generation_metadata_observed": True,
        "installed_package_runtime_metadata_observed": True,
        "installed_service_process_identity_observed": process is not None,
        "protected_record_contents_read": False,
        "protected_record_names_listed": False,
        "process_environment_read": False,
        "raw_process_args_read": False,
        "credentials_keys_wallets_signer_access": False,
        "filesystem_mutation": False,
        "service_start_stop_restart_reload": False,
        "writer_capability_created_or_transferred": False,
        "claim_publication": False,
        "consumption_publication": False,
        "trainer_release": False,
        "training_execution": False,
        "network_rpc_contact": False,
        "transaction": False,
        "funds_movement": False,
        "absence_is_evidence_only_not_authority": True,
        "authority": _authority(True),
        "next_gate": "INDEPENDENT_REVIEW_OF_METADATA_SAFE_HOST_RECEIPT",
    }
    canonical = json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode()
    return {
        **receipt,
        "receipt_id": "voidapollyonfirsthostobs1_" + _sha256(canonical),
    }

def self_test() -> None:
    good = b"0123456789abcdef0123456789abcdef\n"
    expected = _sha256(good.strip())
    if normalize_machine_id(good) != expected:
        hold("selftest_machine_id_normalization_failed")
    for bad in (
        b"", b"ABCDEF0123456789abcdef0123456789",
        b"0123456789abcdef0123456789abcdeg",
        b"0123456789abcdef",
    ):
        try:
            normalize_machine_id(bad)
        except Hold:
            pass
        else:
            hold("selftest_invalid_machine_id_accepted")
    status = (
        b"Name:\ttest\n"
        b"Uid:\t1000\t1000\t1000\t1000\n"
        b"Gid:\t1000\t1000\t1000\t1000\n"
        b"Groups:\t1000 1001\n"
        b"NoNewPrivs:\t1\n"
        b"CapEff:\t0000000000000000\n"
        b"CapBnd:\t000001ffffffffff\n"
        b"CapAmb:\t0000000000000000\n"
    )
    parsed = parse_status(status)
    if parsed["NoNewPrivs"] != "1":
        hold("selftest_status_failed")
    systemd = "\n".join(
        f"{key}=" + ("0" if key == "MainPID" else "inactive")
        for key in SYSTEMCTL_KEYS
    ) + "\n"
    if parse_systemctl_show(systemd)["MainPID"] != "0":
        hold("selftest_systemctl_failed")
    print(MARKER + "_SELF_TEST_GREEN")
    print("host_read_performed=false")
    print("machine_identity_bound=true")
    print("protected_record_contents_read=false")
    print("protected_record_names_listed=false")
    print("process_environment_read=false")
    print("raw_process_args_read=false")
    print("filesystem_mutation=false")
    print("service_mutation=false")
    print("training_execution=false")
    print("funds_movement=false")

def main() -> None:
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test", action="store_true")
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--run", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.plan:
        print(json.dumps(plan_receipt(), sort_keys=True, separators=(",", ":")))
        return
    print(json.dumps(run_host_pass(), sort_keys=True, separators=(",", ":")))

if __name__ == "__main__":
    try:
        main()
    except Hold as exc:
        print(MARKER, file=sys.stderr)
        print("status=HOLD", file=sys.stderr)
        print("reason=" + str(exc)[:240], file=sys.stderr)
        print("filesystem_mutation=false", file=sys.stderr)
        print("service_mutation=false", file=sys.stderr)
        print("training_execution=false", file=sys.stderr)
        print("funds_movement=false", file=sys.stderr)
        raise SystemExit(2)
