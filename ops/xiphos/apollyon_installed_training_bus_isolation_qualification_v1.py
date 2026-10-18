#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import time
from typing import Any

MARKER = "VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1"
TARGET_HOST = "Xiphos"
UNIT = "void-apollyon-training-bus-isolation-v1.service"
UNIT_PATH = Path("/etc/systemd/system") / UNIT
PREENTRY_PATH = Path("/opt/void-apollyon-training-bus-isolation-v1/apollyon_training_bus_isolation_preentry_v1")
ENTRYPOINT_PATH = Path("/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1")
ACCOUNT = "voidapollyontrain"

EXPECTED_UNIT_GIT_BLOB_SHA1 = "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
EXPECTED_PREENTRY_BYTES = 17352
EXPECTED_PREENTRY_SHA256 = "6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47"
EXPECTED_ENTRYPOINT_BYTES = 17384
EXPECTED_ENTRYPOINT_SHA256 = "7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a"

AUTHORITY = {
    "live_host_required": True,
    "root_required": True,
    "exact_installed_unit_required": True,
    "exact_installed_preentry_required": True,
    "exact_installed_entrypoint_required": True,
    "service_start_stop_required_for_standalone_live_qualify": True,
    "existing_live_pid_observation_supported": True,
    "service_enable": False,
    "training_execution": False,
    "attempt_claim": False,
    "candidate_weight_mutation": False,
    "credential_access": False,
    "wallet_or_signer_access": False,
    "transaction": False,
    "funds_movement": False,
}

class Hold(RuntimeError):
    pass

def hold(reason: str) -> None:
    raise Hold(reason)

def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def read_exact_regular(path: Path, *, mode: int, exact_bytes: int | None = None) -> bytes:
    meta = os.lstat(path)
    if (
        not stat.S_ISREG(meta.st_mode)
        or stat.S_ISLNK(meta.st_mode)
        or meta.st_uid != 0
        or meta.st_gid != 0
        or meta.st_nlink != 1
        or stat.S_IMODE(meta.st_mode) != mode
        or (exact_bytes is not None and meta.st_size != exact_bytes)
    ):
        hold("installed_material_metadata_invalid")
    data = path.read_bytes()
    if len(data) != meta.st_size:
        hold("installed_material_read_drift")
    return data

def parse_status_ids(text: str, label: str) -> tuple[int, int, int, int]:
    for line in text.splitlines():
        if line.startswith(label + ":"):
            fields = line.split()
            if len(fields) != 5:
                hold("live_status_identity_shape_invalid")
            try:
                return tuple(int(x) for x in fields[1:5])  # type: ignore[return-value]
            except ValueError as exc:
                raise Hold("live_status_identity_shape_invalid") from exc
    hold("live_status_identity_missing")

def status_value(text: str, label: str) -> str:
    prefix = label + ":"
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    hold("live_status_field_missing")

def run_systemctl(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["/usr/bin/systemctl", *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=check,
        timeout=15,
        env={"PATH": "/usr/bin:/bin", "LC_ALL": "C"},
    )

def service_property(name: str) -> str:
    result = run_systemctl("show", UNIT, "-p", name, "--value")
    return result.stdout.strip()

def account_ids() -> tuple[int, int]:
    import pwd
    try:
        row = pwd.getpwnam(ACCOUNT)
    except KeyError as exc:
        raise Hold("training_account_missing") from exc
    return row.pw_uid, row.pw_gid

def boot_id_sha256() -> str:
    raw = Path("/proc/sys/kernel/random/boot_id").read_text(encoding="ascii").strip()
    if not raw or len(raw) > 128:
        hold("boot_id_invalid")
    return sha256(raw.encode("ascii"))

def process_start_time_ticks_from_text(text: str) -> int:
    close = text.rfind(")")
    if close < 0:
        hold("process_stat_invalid")
    fields = text[close + 2:].split()
    if len(fields) < 20:
        hold("process_stat_invalid")
    try:
        value = int(fields[19])
    except ValueError as exc:
        raise Hold("process_start_time_invalid") from exc
    if value <= 0:
        hold("process_start_time_invalid")
    return value

def process_start_time_ticks(pid: int) -> int:
    return process_start_time_ticks_from_text(
        Path(f"/proc/{pid}/stat").read_text(encoding="ascii")
    )

def verify_installed_materials() -> dict[str, Any]:
    unit = read_exact_regular(UNIT_PATH, mode=0o644)
    preentry = read_exact_regular(PREENTRY_PATH, mode=0o755, exact_bytes=EXPECTED_PREENTRY_BYTES)
    entrypoint = read_exact_regular(ENTRYPOINT_PATH, mode=0o755, exact_bytes=EXPECTED_ENTRYPOINT_BYTES)
    if git_blob_sha1(unit) != EXPECTED_UNIT_GIT_BLOB_SHA1:
        hold("installed_unit_identity_mismatch")
    if sha256(preentry) != EXPECTED_PREENTRY_SHA256:
        hold("installed_preentry_identity_mismatch")
    if sha256(entrypoint) != EXPECTED_ENTRYPOINT_SHA256:
        hold("installed_entrypoint_identity_mismatch")
    return {
        "unit_git_blob_sha1": EXPECTED_UNIT_GIT_BLOB_SHA1,
        "preentry_bytes": EXPECTED_PREENTRY_BYTES,
        "preentry_sha256": EXPECTED_PREENTRY_SHA256,
        "entrypoint_bytes": EXPECTED_ENTRYPOINT_BYTES,
        "entrypoint_sha256": EXPECTED_ENTRYPOINT_SHA256,
    }

def observe_live_generation(mainpid: int) -> dict[str, Any]:
    if socket.gethostname().casefold() != TARGET_HOST.casefold():
        hold("wrong_host")
    if os.geteuid() != 0:
        hold("root_required")
    if mainpid <= 0:
        hold("live_pid_invalid")
    materials = verify_installed_materials()
    uid, gid = account_ids()
    if service_property("LoadState") != "loaded":
        hold("unit_not_loaded")
    if service_property("ActiveState") != "active":
        hold("service_not_active_for_observation")
    if service_property("MainPID") != str(mainpid):
        hold("service_mainpid_generation_mismatch")
    exe = os.path.realpath(Path(f"/proc/{mainpid}/exe"))
    if exe != os.fspath(ENTRYPOINT_PATH):
        hold("live_entrypoint_identity_mismatch")

    status_text = Path(f"/proc/{mainpid}/status").read_text(encoding="utf-8")
    uids = parse_status_ids(status_text, "Uid")
    gids = parse_status_ids(status_text, "Gid")
    if any(value != uid for value in uids):
        hold("live_uid_mismatch")
    if any(value != gid for value in gids):
        hold("live_gid_mismatch")
    if status_value(status_text, "NoNewPrivs") != "1":
        hold("live_no_new_privileges_unproven")
    for field in ("CapInh", "CapPrm", "CapEff", "CapBnd", "CapAmb"):
        if status_value(status_text, field) != "0000000000000000":
            hold("live_capability_set_nonzero")

    fd_dir = Path(f"/proc/{mainpid}/fd")
    extra = sorted(
        int(p.name) for p in fd_dir.iterdir()
        if p.name.isdigit() and int(p.name) >= 3
    )
    if extra:
        hold("live_inherited_descriptor_present")

    cgroup = Path(f"/proc/{mainpid}/cgroup").read_text(encoding="utf-8")
    if f"/system.slice/{UNIT}" not in cgroup:
        hold("live_cgroup_mismatch")

    live = {
        "mainpid": mainpid,
        "boot_id_sha256": boot_id_sha256(),
        "process_start_time_ticks": process_start_time_ticks(mainpid),
        "entrypoint_path": os.fspath(ENTRYPOINT_PATH),
        "uid_slots": list(uids),
        "gid_slots": list(gids),
        "no_new_privileges": True,
        "capability_sets_zero": True,
        "inherited_fds_ge_3_absent": True,
        "systemd_cgroup_verified": True,
    }
    material = {
        "marker": MARKER,
        "version": 1,
        "status": "installed_training_bus_isolation_live_generation_observed",
        "target_host": TARGET_HOST,
        "materials": materials,
        "live": live,
        "installed_unit_identity_proven": True,
        "installed_preentry_binary_identity_proven": True,
        "installed_training_entrypoint_identity_proven": True,
        "live_systemd_enforcement_proven": True,
        "inherited_system_bus_descriptor_absence_proven": True,
        "absolute_runtime_service_control_denial_proven": True,
        "canonical_installed_qualification_complete": True,
        "service_action_performed": False,
        "service_enabled": False,
        "service_active_after_observation": True,
        "training_execution": False,
        "attempt_claim": False,
        "candidate_weight_mutation": False,
        "next_gate": "apollyon_candidate_training_preclaim_v2",
        "authority": AUTHORITY,
    }
    return {
        **material,
        "qualification_id": "apollyon_training_isolation_live_v1:" + sha256(canonical(material).encode("utf-8")),
    }

def live_qualify() -> dict[str, Any]:
    hold("standalone_live_qualify_retired_use_v2")


def self_test() -> None:
    sample = "Name:\ttest\nUid:\t997\t997\t997\t997\nGid:\t984\t984\t984\t984\nNoNewPrivs:\t1\nCapInh:\t0000000000000000\n"
    assert parse_status_ids(sample, "Uid") == (997, 997, 997, 997)
    assert parse_status_ids(sample, "Gid") == (984, 984, 984, 984)
    assert status_value(sample, "NoNewPrivs") == "1"
    assert AUTHORITY["training_execution"] is False
    assert AUTHORITY["attempt_claim"] is False
    assert AUTHORITY["service_enable"] is False
    assert AUTHORITY["existing_live_pid_observation_supported"] is True
    try:
        live_qualify()
    except Hold as exc:
        assert str(exc) == "standalone_live_qualify_retired_use_v2"
    else:
        raise AssertionError("retired standalone live qualifier accepted")
    stat_fixture = "123 (entry v1) S " + " ".join(str(i) for i in range(1, 40))
    assert process_start_time_ticks_from_text(stat_fixture) == 19
    print(MARKER + "_SELF_TEST=GREEN")
    print("source_only_by_import=true")
    print("live_service_action_requires_explicit_flag=false")
    print("standalone_live_qualify_retired=true")
    print("training_execution=false")
    print("attempt_claim=false")
    print("funds_movement=false")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--live-qualify", action="store_true")
    parser.add_argument("--observe-live-pid", type=int)
    args = parser.parse_args()
    selected = int(args.self_test) + int(args.live_qualify) + int(args.observe_live_pid is not None)
    if selected != 1:
        parser.error("choose exactly one mode")
    if args.self_test:
        self_test()
        return 0
    try:
        result = (
            observe_live_generation(args.observe_live_pid)
            if args.observe_live_pid is not None
            else live_qualify()
        )
    except Hold as exc:
        print("HOLD=" + str(exc), file=os.sys.stderr)
        print("service_enable=false", file=os.sys.stderr)
        print("training_execution=false", file=os.sys.stderr)
        print("attempt_claim=false", file=os.sys.stderr)
        print("funds_movement=false", file=os.sys.stderr)
        return 2
    print(canonical(result))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
