#!/usr/bin/env python3
"""Precision-only, owner-authorized bootstrap manifest tunnel route cutover.

--plan is read-only. --apply makes one narrow cloudflared config update and
one connector restart; failure attempts an atomic config restore and restart.
Does not modify a VOID node, other public services, wallets, or validators.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import time

MARKER = "VOID_PRECISION_BOOTSTRAP_V2_TUNNEL_CUTOVER_V1"
UNIT = "void-public-seed-named-tunnel-v1.service"
EXPECTED_OLD_SHA = "2f32e965e000d756e2706fbf05bc1488e9f4b6e820c43a18877cd8d58c402c52"
EXPECTED_CANDIDATE_SHA = "38d5a4055c4e5b5ccb0fbc1bf199e3d732d0025754063dacb11a4718fd579ea5"
EXPECTED_MANIFEST_SHA = "b72071b42e0fbce7fa4079ce8000b6521377e4e55cdfba05ca610015c9e3ddd4"
EXPECTED_DROPIN_SHA = "4a03777846ab539b1de0885f99ebf9fcd32813516fbd767f174e54e4c239425d"
EXPECTED_DROPIN_NAME = "90-void-nullfeed-clean-environment.conf"
OLD_ID = "voidpbm1_a17d192b4542e2e59abfeef227a8beabb3a98169c14764ddca5dde908a4f6f5c"
NEW_ID = "voidpbm1_99ea562ea42bd3e833df7996066fffbd4e061ad7916a7d8f86431df11891e5f8"
ROOT = Path.home() / "dev/void-web-recovery-049b703d216b"
STATE = Path.home() / ".local/state/void/precision-bootstrap-v2-tunnel-cutover-20261008-v1"
NODE = "void-node-live.service"
SEED = "void-public-seed-gateway-v1.service"
WEB_UNITS = (
    "void-web-recovery-adapter-049b703d216b.service",
    "void-web-recovery-composition-049b703d216b.service",
    "void-web-recovery-frontdoor-049b703d216b.service",
)
NEW_PATH = f"/void/bootstrap/v2/manifests/{NEW_ID}.json"
OLD_PATH = f"/void/bootstrap/v2/manifests/{OLD_ID}.json"
BASE = "https://seed.nullfeed.org"
ROUTES = (
    (NEW_PATH, "http://127.0.0.1:8080"),
    (OLD_PATH, "http://127.0.0.1:8080"),
    ("/void/bootstrap/v2/records/voidpbr2_" + "0" * 64 + ".json", "http://127.0.0.1:4111"),
    ("/__void/ready.json", "http://127.0.0.1:4111"),
    ("/__void/public-earn-gateway-v1/status.json", "http://127.0.0.1:4122"),
    ("/public-node/economic/epoch2/read-status-v1.json", "http://127.0.0.1:8082"),
)
ANCHOR = (
    b"  - hostname: seed.nullfeed.org\n"
    b"    service: http://127.0.0.1:4111\n"
)
ADDITION = (
    b"  - hostname: seed.nullfeed.org\n"
    b"    path: '^/void/bootstrap/v2/manifests/"
    b"voidpbm1_[0-9a-f]{64}\\.json$'\n"
    b"    service: http://127.0.0.1:8080\n"
)

class Hold(Exception):
    pass

def ensure(test, reason):
    if not test:
        raise Hold(reason)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def build_candidate_config(original):
    # Add the V2 manifest route WITHOUT removing the existing seed fallback.
    # The reviewed 38d5a405... digest binds these exact destination bytes.
    ensure(original.count(ANCHOR) == 1 and
           b"void/bootstrap/v2/" not in original, "source_config_routes_changed")
    candidate = original.replace(ANCHOR, ADDITION + ANCHOR, 1)
    ensure(candidate.count(ANCHOR) == 1 and
           candidate.replace(ADDITION, b"", 1) == original,
           "candidate_fallback_not_preserved")
    return candidate

def cmd(args, label, timeout=20):
    try:
        result = subprocess.run(
            args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=timeout, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold(label + "_unavailable_or_timeout") from exc
    if result.returncode != 0:
        raise Hold(label + "_exit_" + str(result.returncode))
    return result.stdout

def system_value(unit, key):
    return cmd(
        ["systemctl", "--user", "show", unit, "-p", key, "--value"],
        "systemctl_" + key,
    ).decode().strip()

def active(unit):
    ensure(system_value(unit, "ActiveState") == "active", "inactive_" + unit)

def verify_dropin():
    """Accept only the previously observed environment-cleanup override.

    Never print its raw values. Any unexpected file, directive or changed
    byte blocks the service action, rather than weakening the unit.
    """
    expected = Path.home() / ".config/systemd/user" / (UNIT + ".d") / EXPECTED_DROPIN_NAME
    try:
        observed = shlex.split(system_value(UNIT, "DropInPaths"))
    except ValueError as exc:
        raise Hold("dropin_paths_parse") from exc
    ensure(observed == [str(expected)], "unexpected_service_dropins")
    ensure(expected.parent.is_dir() and not expected.parent.is_symlink(), "dropin_parent_symlink")
    ensure(expected.resolve() == expected, "dropin_path_noncanonical")
    ensure(expected.is_file() and not expected.is_symlink(), "dropin_nonregular")
    metadata = expected.stat()
    ensure(metadata.st_uid == os.geteuid() and metadata.st_nlink == 1, "dropin_owner_or_links")
    ensure(metadata.st_size > 0 and metadata.st_size <= 4096, "dropin_size")
    ensure(stat.S_IMODE(metadata.st_mode) & 0o022 == 0, "dropin_group_or_world_writable")
    raw = expected.read_bytes()
    ensure(digest(raw) == EXPECTED_DROPIN_SHA, "dropin_digest_changed")
    try:
        decoded = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise Hold("dropin_utf8_invalid") from exc
    sections = []
    directives = []
    for line in decoded.splitlines():
        entry = line.strip()
        if not entry or entry.startswith(("#", ";")):
            continue
        if entry.startswith("[") and entry.endswith("]"):
            sections.append(entry)
            continue
        ensure("=" in entry, "dropin_syntax_unexpected")
        name, value = entry.split("=", 1)
        ensure(name.strip() == "UnsetEnvironment" and bool(value.strip()), "dropin_directive_unexpected")
        directives.append(name.strip())
    ensure(sections == ["[Service]"] and directives == ["UnsetEnvironment"], "dropin_structure_unexpected")


def fetch(url, label):
    data = cmd([
        "curl", "-4", "--noproxy", "*", "-fsS",
        "--connect-timeout", "3", "--max-time", "8", url,
    ], label, timeout=12)
    ensure(len(data) <= 2 * 1024 * 1024, "body_too_large_" + label)
    return data

def checked_json(url, label):
    try:
        obj = json.loads(fetch(url, label))
    except (ValueError, UnicodeError) as exc:
        raise Hold(label + "_invalid_json") from exc
    ensure(isinstance(obj, dict), label + "_not_object")
    return obj

def check_shared_routes():
    ready = checked_json(BASE + "/__void/ready.json", "public_seed_ready")
    ensure(
        ready.get("ready") is True
        and type(ready.get("gap")) is int and ready["gap"] == 0
        and type(ready.get("txroot_live")) is int and ready["txroot_live"] == 1,
        "public_seed_not_ready",
    )
    earn = checked_json(
        BASE + "/__void/public-earn-gateway-v1/status.json", "public_earn",
    )
    ensure(
        earn.get("ok") is True
        and earn.get("marker") == "VOID_PUBLIC_EARN_GATEWAY_V1"
        and earn.get("enabled") is True,
        "public_earn_not_ready",
    )
    epoch = checked_json(
        BASE + "/public-node/economic/epoch2/read-status-v1.json", "economic_read",
    )
    ensure(
        epoch.get("ok") is True
        and epoch.get("marker") == "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1",
        "economic_read_not_ready",
    )

def check_mirrors():
    for label, identity, expected in (
        ("renewed", NEW_ID, EXPECTED_MANIFEST_SHA),
        ("historical", OLD_ID, None),
    ):
        local = ROOT / "public/void/bootstrap/v2/manifests" / (identity + ".json")
        ensure(local.is_file() and not local.is_symlink(), label + "_local_file_missing")
        local_body = local.read_bytes()
        ensure(0 < len(local_body) <= 1024 * 1024, label + "_local_size")
        if expected is not None:
            ensure(digest(local_body) == expected, label + "_local_sha")
        external_body = fetch(
            BASE + f"/void/bootstrap/v2/manifests/{identity}.json",
            "external_" + label,
        )
        ensure(external_body == local_body, label + "_public_bytes_differ")

def check_bystanders(pids):
    for unit, before_pid in pids.items():
        active(unit)
        ensure(system_value(unit, "MainPID") == before_pid, "bystander_pid_changed_" + unit)

def verify_routes(cf, cfg):
    cmd([str(cf), "--config", str(cfg), "tunnel", "ingress", "validate"], "ingress_validate")
    for path, origin in ROUTES:
        output = cmd([
            str(cf), "--config", str(cfg), "tunnel", "ingress", "rule",
            BASE + path,
        ], "ingress_rule")
        ensure(("service: " + origin).encode() in output, "ingress_route_mismatch_" + path)

def atomic_replace(path, body, mode):
    fd, temp = tempfile.mkstemp(prefix=".void-bootstrap-route-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(body)
            handle.flush()
            os.fsync(handle.fileno())
            os.fchmod(handle.fileno(), mode)
        os.replace(temp, path)
        dirfd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(dirfd)
        finally:
            os.close(dirfd)
    finally:
        if os.path.lexists(temp):
            os.unlink(temp)

def private_write(path, body):
    ensure(not path.exists() and not path.is_symlink(), "backup_item_exists")
    with path.open("xb") as handle:
        os.fchmod(handle.fileno(), 0o600)
        handle.write(body)
        handle.flush()
        os.fsync(handle.fileno())

def preflight():
    ensure(socket.gethostname() == "zoso-Precision-Tower-7810" and os.geteuid() != 0, "host_or_user")
    ensure(not STATE.exists() and not STATE.is_symlink(), "earlier_attempt_exists")
    ensure(ROOT.is_dir() and not ROOT.is_symlink(), "recovery_root")
    ensure(
        cmd(["git", "-C", str(Path.home() / "dev/void-node"), "rev-parse", "HEAD"], "git_head").decode().strip()
        == "e1521fc72730ecb036b71e476a7530656ebfecae",
        "canonical_checkout_changed",
    )

    unitfile = Path.home() / ".config/systemd/user" / UNIT
    ensure(unitfile.is_file() and not unitfile.is_symlink(), "tunnel_unit_file")
    active(UNIT)
    ensure(system_value(UNIT, "FragmentPath") == str(unitfile), "unit_fragment_changed")
    verify_dropin()
    lines = unitfile.read_text().splitlines()
    rows = [line for line in lines if line.startswith("ExecStart=")]
    ensure(len(rows) == 1, "service_exec_count")
    try:
        args = shlex.split(rows[0].split("=", 1)[1])
        i = args.index("--config")
        cf, cfg = Path(args[0]), Path(args[i + 1])
    except (ValueError, IndexError) as exc:
        raise Hold("service_exec_parse") from exc
    ensure(cf.is_absolute() and cf.is_file() and os.access(cf, os.X_OK), "cloudflared_executable")
    ensure(cfg.is_absolute() and cfg.is_file() and not cfg.is_symlink(), "config_path")
    ensure(cfg.resolve() == cfg and cfg.parent.resolve() == cfg.parent, "config_symlink_ancestor")
    ensure(cfg.stat().st_uid == os.geteuid() and os.access(cfg.parent, os.W_OK), "config_mutation_permissions")
    ensure(cfg.stat().st_nlink == 1, "config_hardlink")
    effective = system_value(UNIT, "ExecStart")
    ensure(str(cf) in effective and str(cfg) in effective, "effective_service_exec_changed")
    mainpid = system_value(UNIT, "MainPID")
    ensure(mainpid.isdecimal() and int(mainpid) > 1, "tunnel_pid_unavailable")
    try:
        argv = (Path("/proc") / mainpid / "cmdline").read_bytes().split(b"\0")
    except OSError as exc:
        raise Hold("tunnel_process_inspection") from exc
    ensure(str(cfg).encode() in argv, "tunnel_process_config_differs")

    original = cfg.read_bytes()
    ensure(digest(original) == EXPECTED_OLD_SHA, "source_config_hash_changed")
    candidate = build_candidate_config(original)
    ensure(digest(candidate) == EXPECTED_CANDIDATE_SHA, "candidate_config_hash_changed")

    pids = {}
    for service in (NODE, SEED, *WEB_UNITS):
        active(service)
        pid = system_value(service, "MainPID")
        ensure(pid.isdecimal() and int(pid) > 1, "bystander_pid_unavailable_" + service)
        pids[service] = pid

    # Independent immutable data and external public-health checks before any write.
    local = ROOT / "public/void/bootstrap/v2/manifests" / (NEW_ID + ".json")
    ensure(local.is_file() and not local.is_symlink(), "renewed_file_absent")
    ensure(digest(local.read_bytes()) == EXPECTED_MANIFEST_SHA, "renewed_file_hash")
    old = ROOT / "public/void/bootstrap/v2/manifests" / (OLD_ID + ".json")
    ensure(old.is_file() and not old.is_symlink(), "historical_file_absent")
    ensure(fetch("http://127.0.0.1:8080" + NEW_PATH, "local_adapter_mirror") == local.read_bytes(), "local_adapter_mirror_bytes")
    ensure(fetch("http://127.0.0.1:8080" + OLD_PATH, "local_adapter_historical") == old.read_bytes(), "local_historical_bytes")
    check_shared_routes()

    with tempfile.TemporaryDirectory(prefix="void-bootstrap-route-plan-") as td:
        temp = Path(td) / "candidate.yml"
        temp.write_bytes(candidate)
        verify_routes(cf, temp)

    return cf, cfg, original, candidate, stat.S_IMODE(cfg.stat().st_mode), pids

def verify_publication(cf, cfg, pids):
    verify_dropin()
    active(UNIT)
    ensure(digest(cfg.read_bytes()) == EXPECTED_CANDIDATE_SHA, "active_config_not_candidate")
    verify_routes(cf, cfg)
    check_shared_routes()
    check_mirrors()
    check_bystanders(pids)

def rollback(cfg, original, mode, pids):
    print("rollback_attempted=true", flush=True)
    try:
        current = digest(cfg.read_bytes())
        ensure(current in (EXPECTED_CANDIDATE_SHA, EXPECTED_OLD_SHA), "live_config_unknown_drift")
        if current != EXPECTED_OLD_SHA:
            atomic_replace(cfg, original, mode)
        ensure(digest(cfg.read_bytes()) == EXPECTED_OLD_SHA, "rollback_config_hash")
        cmd(["systemctl", "--user", "restart", UNIT], "rollback_connector_restart", timeout=40)
        # Verify critical public entrypoints return after the old connector resumes.
        for attempt in range(12):
            try:
                active(UNIT)
                check_shared_routes()
                check_bystanders(pids)
                print("rollback_restored=true", flush=True)
                return
            except Hold:
                if attempt == 11:
                    raise
                time.sleep(3)
    except BaseException:
        print("rollback_restored=UNVERIFIED", flush=True)
        print("HOLD_manual_recovery_required", flush=True)

def main():
    ensure(len(sys.argv) == 2 and sys.argv[1] in ("--plan", "--apply"), "usage_plan_or_apply")
    mode = sys.argv[1]
    print(MARKER, flush=True)
    print("mode=" + mode, flush=True)
    print("node_validator_wallet_mutation=false", flush=True)
    cf, cfg, original, candidate, permissions, pids = preflight()
    print("source_config_identity=GREEN")
    print("candidate_config_sha256=" + digest(candidate))
    print("local_mirror_and_public_baselines=GREEN")
    print("candidate_ingress_rules=GREEN")
    if mode == "--plan":
        print("service_mutation=false")
        print(MARKER + "_PLAN_GREEN")
        return

    STATE.parent.mkdir(parents=True, exist_ok=True)
    ensure(not STATE.is_symlink() and not STATE.exists(), "earlier_attempt_exists")
    STATE.mkdir(mode=0o700)
    os.chmod(STATE, 0o700)
    private_write(STATE / "original-cloudflared-config.yml", original)
    private_write(STATE / "candidate-cloudflared-config.yml", candidate)
    private_write(
        STATE / "receipt.json",
        (json.dumps({
            "schema": "void_precision_bootstrap_v2_tunnel_cutover_v1",
            "original_sha256": digest(original),
            "candidate_sha256": digest(candidate),
            "manifest_sha256": EXPECTED_MANIFEST_SHA,
            "tunnel_unit": UNIT,
            "original_mode": permissions,
            "rollback_required_on_failure": True,
        }, sort_keys=True) + "\n").encode(),
    )
    print("private_rollback_saved=true", flush=True)
    print("rollback_directory=" + str(STATE), flush=True)

    def raise_signal(sig, _frame):
        raise Hold("operator_signal_" + str(sig))
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, raise_signal)

    modified = False
    try:
        # Mark modification before atomic replacement to guarantee rollback on
        # exceptions occurring immediately after the rename.
        modified = True
        atomic_replace(cfg, candidate, permissions)
        ensure(digest(cfg.read_bytes()) == EXPECTED_CANDIDATE_SHA, "applied_config_hash")
        print("active_config_replaced=true")
        cmd(["systemctl", "--user", "restart", UNIT], "connector_restart", timeout=40)
        print("connector_restart_count=1", flush=True)
        deadline = time.monotonic() + 95
        n = 0
        last = "not_checked"
        while time.monotonic() < deadline:
            n += 1
            try:
                verify_publication(cf, cfg, pids)
                time.sleep(3)
                verify_publication(cf, cfg, pids)
                print("public_mirror_sha256=" + EXPECTED_MANIFEST_SHA, flush=True)
                print("public_historical_mirror=GREEN")
                print("seed_earn_economic_routes=GREEN")
                print("bystander_pids_unchanged=true")
                print("rollback_required=false")
                print(MARKER + "_APPLY_GREEN", flush=True)
                return
            except Hold as err:
                last = str(err)
                print(f"postcheck_attempt={n} status=WAIT", flush=True)
                time.sleep(4)
        raise Hold("public_postcheck_timeout_" + last)
    except BaseException as err:
        print("HOLD_apply_failed=" + str(err), flush=True)
        if modified:
            rollback(cfg, original, permissions, pids)
        raise SystemExit(2) from None

if __name__ == "__main__":
    try:
        main()
    except Hold as exc:
        print("HOLD_" + str(exc), flush=True)
        raise SystemExit(2) from None
