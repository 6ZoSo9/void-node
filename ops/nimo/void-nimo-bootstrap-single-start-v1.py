#!/usr/bin/env python3
"""Nimo-only, one-shot bootstrap recovery. --plan is read-only; --apply starts one service."""
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import sys

MARKER = "VOID_NIMO_BOOTSTRAP_SINGLE_START_V1"
PIN = "baaa52207ee331807a6e79b8bc148dd72aa4ac99"
OLD_HEAD = "8a5c7ab1543b9270164adac11a40de46df5388e2"
ARCHIVE_SHA256 = "ebbfb3323c0a2c90ab7ff23505f9806afb8f492ece79cf1263e02d7699a92607"
OLD_UNIT = "void-nimo-tor-bootstrap-node-v5.service"
NEW_UNIT = "void-nimo-tor-bootstrap-node-v6.service"
VALIDATOR = "void-economic-epoch2-qbft-validator-v1.service"
HOME = Path.home()
OLD = HOME / "dev/void-node"
STAGE = HOME / ".local/share/void/nimo-bootstrap-candidate-20261008"
BACKUP = HOME / ".local/state/void/nimo-bootstrap-rollback-20261008-v1/chain-data.tar"


def hold(reason):
    raise SystemExit("HOLD_" + reason)


def require(condition, reason):
    if not condition:
        hold(reason)


def command(*args, cwd=None):
    try:
        result = subprocess.run(args, cwd=cwd, text=True, capture_output=True, timeout=20, check=False)
    except (OSError, subprocess.TimeoutExpired):
        hold("command_unavailable_or_timeout")
    if result.returncode:
        hold("command_failed_" + str(args[0]).replace("/", "_"))
    return result.stdout.strip()


def original_path(value, kind):
    require(isinstance(value, str) and value != "" and not os.path.isabs(value), "relative_" + kind)
    location = Path(os.path.abspath(os.path.join(OLD, value)))
    require(location.is_relative_to(OLD) and location != OLD, "path_escape_" + kind)
    require(location.resolve() == location and not location.is_symlink(), "path_symlink_" + kind)
    require(location.is_dir() if kind == "data" else location.is_file(), "path_type_" + kind)
    return location


def admission():
    require(socket.gethostname().lower() == "nimo" and os.geteuid() != 0, "host_or_user")
    require(not OLD.is_symlink() and not STAGE.is_symlink(), "checkout_symlink")
    require(command("systemctl", "--user", "is-active", VALIDATOR) == "active", "validator_inactive")
    require(command("systemctl", "--user", "show", OLD_UNIT, "-p", "ActiveState", "--value") == "failed", "old_unit_not_failed")
    require(command("systemctl", "--user", "show", OLD_UNIT, "-p", "MainPID", "--value") == "0", "old_unit_pid")
    require(command("systemctl", "--user", "show", NEW_UNIT, "-p", "LoadState", "--value") == "not-found", "new_unit_exists")
    require(command("git", "-C", str(OLD), "rev-parse", "HEAD") == OLD_HEAD, "original_head_drift")
    require(command("git", "-C", str(STAGE), "rev-parse", "HEAD") == PIN, "candidate_head_drift")
    require(command("git", "-C", str(STAGE), "status", "--porcelain=v1", "--untracked-files=all") == "", "candidate_dirty")
    require((STAGE / ".runtime/clone-run-v1/prepared-source-v1").read_text().strip() == PIN + "-clean", "candidate_build_stamp")
    dist = STAGE / "dist/index.js"
    require(dist.is_file() and not dist.is_symlink(), "candidate_dist")
    require("process.nextTick(callback, null, address, family)" in (STAGE / "scripts/lib/void_public_seed_client_transport_v1.mjs").read_text(), "tls_repair_absent")

    for name in (".env", ".nodekey"):
        link, original = STAGE / name, OLD / name
        require(link.is_symlink() and os.readlink(link) == str(original), "candidate_reference_" + name)
        require(original.is_file() and not original.is_symlink(), "original_file_" + name)
        require(stat.S_IMODE(original.stat().st_mode) == 0o600, "original_mode_" + name)

    require(BACKUP.is_file() and not BACKUP.is_symlink(), "rollback_missing")
    backup_sha = hashlib.sha256()
    with BACKUP.open("rb") as source:
        for chunk in iter(lambda: source.read(4 * 1024 * 1024), b""):
            backup_sha.update(chunk)
    require(backup_sha.hexdigest() == ARCHIVE_SHA256, "rollback_hash_mismatch")

    raw = command("systemctl", "--user", "show", OLD_UNIT, "-p", "ExecStart", "--value")
    match = re.search(r"argv\[\]=(.*?); ignore_errors=", raw)
    require(match is not None, "original_argv_unresolved")
    argv = match.group(1)
    names = set(re.findall(r"(?:^|\s)([A-Z][A-Z0-9_]*)=", argv))
    require(names == {"VOID_PUBLIC_BOOTSTRAP_REQUIRE"}, "original_override_keys_changed")
    require(re.search(r"(?:^|\s)VOID_PUBLIC_BOOTSTRAP_REQUIRE=1(?:\s|$)", argv) is not None, "original_bootstrap_requirement_changed")
    require(str(OLD / "run-void-node.sh") in argv, "original_launcher_changed")
    require(command("systemctl", "--user", "show", OLD_UNIT, "-p", "WorkingDirectory", "--value") == str(OLD), "original_cwd_changed")
    for key in ("Environment", "EnvironmentFiles", "PassEnvironment"):
        require(not command("systemctl", "--user", "show", OLD_UNIT, "-p", key, "--value"), "original_service_environment_" + key)

    parse_env = (
        'const fs=require("fs"),env=require("dotenv").parse(fs.readFileSync(".env"));'
        'const keys=["DATA_DIR","NODE_PRIVKEY_PATH","HTTP_PORT","P2P_PORT"];'
        'process.stdout.write(JSON.stringify(Object.fromEntries(keys.map(k=>[k,env[k]||""]))));'
    )
    settings = json.loads(command("node", "-e", parse_env, cwd=OLD))
    data = original_path(settings["DATA_DIR"], "data")
    identity = original_path(settings["NODE_PRIVKEY_PATH"], "identity")
    require(stat.S_IMODE(identity.stat().st_mode) & 0o077 == 0, "identity_permissions")
    ports = []
    for key in ("HTTP_PORT", "P2P_PORT"):
        value = settings[key]
        require(isinstance(value, str) and re.fullmatch(r"[0-9]{1,5}", value) is not None, "port_format_" + key)
        port = int(value)
        require(1 <= port <= 65535, "port_range_" + key)
        ports.append(port)
    require(ports[0] != ports[1], "port_collision")
    for line in command("ss", "-H", "-lntu").splitlines():
        columns = line.split()
        if len(columns) >= 5 and any(columns[4].endswith(":" + str(port)) for port in ports):
            hold("node_port_already_listening")

    ready = json.loads(command("curl", "-4", "--noproxy", "*", "-fsS", "--connect-timeout", "4", "--max-time", "10", "https://seed.nullfeed.org/__void/ready.json"))
    require(ready.get("ready") is True and type(ready.get("gap")) is int and ready["gap"] == 0 and type(ready.get("txroot_live")) is int and ready["txroot_live"] == 1 and type(ready.get("head")) is int and ready["head"] > 0, "public_seed_readiness")

    # Plan binding excludes volatile seed head but rechecks live readiness at apply.
    identity_stat, data_stat = identity.stat(), data.stat()
    dist_sha = hashlib.sha256(dist.read_bytes()).hexdigest()
    plan = {"unit": NEW_UNIT, "source": PIN, "dist_sha256": dist_sha,
            "backup_sha256": ARCHIVE_SHA256,
            "data_dev_inode": [data_stat.st_dev, data_stat.st_ino],
            "identity_dev_inode": [identity_stat.st_dev, identity_stat.st_ino],
            "ports": ports, "required_bootstrap": True}
    plan_id = hashlib.sha256(json.dumps(plan, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return plan_id, data, identity, ports


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--plan":
        mode = "plan"
    elif len(sys.argv) == 3 and sys.argv[1] == "--apply" and re.fullmatch("[0-9a-f]{64}", sys.argv[2]):
        mode = "apply"
    else:
        raise SystemExit("usage: python3 script.py --plan | --apply <exact_plan_id>")
    print(MARKER, flush=True)
    print("mode=" + mode, flush=True)
    plan_id, data, identity, ports = admission()
    print("admission=GREEN")
    print("plan_id=" + plan_id)
    print("original_data_and_identity_paths_preserved=true")
    print("original_runtime_and_validator_untouched=true")
    print("http_port=" + str(ports[0]))
    print("p2p_port=" + str(ports[1]))
    if mode == "plan":
        print("service_action=false")
        print(MARKER + "_READY_TO_APPLY")
        return
    require(plan_id == sys.argv[2], "plan_id_drift")
    print("service_start_attempted=true", flush=True)
    # One new transient service; never reset/restart old v5, and never set Restart=always.
    result = subprocess.run([
        "systemd-run", "--user", "--unit=" + NEW_UNIT,
        "--description=VOID Nimo repaired bootstrap v6",
        "--property=Restart=no", "--property=KillMode=control-group",
        "--working-directory=" + str(STAGE),
        "/usr/bin/env", "VOID_PUBLIC_BOOTSTRAP_REQUIRE=1",
        "DATA_DIR=" + str(data), "NODE_PRIVKEY_PATH=" + str(identity),
        "/usr/bin/bash", str(STAGE / "run-void-node.sh"), "run",
    ], capture_output=True, text=True, timeout=20)
    print("service_start_submitted=" + str(result.returncode == 0).lower())
    print("service=" + NEW_UNIT)
    if result.returncode:
        hold("systemd_run_failed_status_requires_inspection")
    print("initial_service_state=" + command("systemctl", "--user", "show", NEW_UNIT, "-p", "ActiveState", "--value"))
    print("validator_still_active=" + str(command("systemctl", "--user", "is-active", VALIDATOR) == "active").lower())
    print(MARKER + "_START_SUBMITTED_NOT_YET_HEALTH_QUALIFIED")


if __name__ == "__main__":
    main()
