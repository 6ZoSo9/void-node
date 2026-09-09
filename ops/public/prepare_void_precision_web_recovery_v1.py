#!/usr/bin/env python3
"""Stage an isolated Precision website checkout and three disabled unit files.

Preparation only: no service installation/activation, daemon reload, Funnel or
DNS change, node build, dependency installation, wallet access or funds action.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys

REPO = "https://github.com/6ZoSo9/void-node.git"
HOST = "zoso-precision-tower-7810"


def require(value, reason):
    if not value:
        raise RuntimeError(reason)


def command(args, timeout=180, cwd=None):
    env = {"PATH": "/usr/bin:/bin", "LANG": "C", "GIT_TERMINAL_PROMPT": "0",
           "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
           "GIT_CONFIG_SYSTEM": os.devnull, "GIT_NO_REPLACE_OBJECTS": "1"}
    result = subprocess.run(args, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=timeout, check=False)
    require(result.returncode == 0, Path(args[0]).name + " command failed (exit " + str(result.returncode) + ")")
    return result.stdout.decode().strip()


def safe_path(path):
    require(path.is_absolute() and re.fullmatch(r"/[A-Za-z0-9_./+-]+", str(path)),
            "path cannot be represented safely in unit file")
    for part in [path, *path.parents]:
        require(not part.is_symlink(), "symlink in preparation path")
    return str(path)


def unit(executable, checkout, entrypoint, description, settings):
    lines = ["[Unit]", "Description=" + description, "After=network-online.target", "",
             "[Service]", "Type=simple", "WorkingDirectory=" + safe_path(checkout),
             "ExecStart=" + safe_path(executable) + " " + safe_path(checkout / entrypoint)]
    for key, value in settings.items():
        require(re.fullmatch(r"[A-Z0-9_]+", key) and not any(x in value for x in ['\n', '\r', '"', '%', '\\']),
                "unsafe unit setting")
        lines.append('Environment="' + key + "=" + value + '"')
    lines.extend(["UnsetEnvironment=NODE_OPTIONS NODE_PATH", "Restart=on-failure", "RestartSec=3", "KillMode=control-group", "TimeoutStopSec=10",
                  "NoNewPrivileges=true", "PrivateTmp=true", "ProtectSystem=strict", "ProtectHome=read-only",
                  "RestrictSUIDSGID=true", "LockPersonality=true", "RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6",
                  "", "[Install]", "WantedBy=default.target", ""])
    return "\n".join(lines).encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", required=True)
    parser.add_argument("--source-head", required=True)
    args = parser.parse_args()
    require(re.fullmatch(r"[a-f0-9]{40}", args.source_head), "full source commit required")
    require(socket.gethostname().lower() == HOST, "run this preparation on Precision")
    git = shutil.which("git")
    node = shutil.which("node")
    require(git and node, "installed git and Node are required; this script installs no packages")
    git = str(Path(git).resolve())
    node = Path(node).resolve()
    version = command([str(node), "--version"], timeout=5)
    match = re.fullmatch(r"v(\d+)\.\d+\.\d+", version)
    require(match and int(match[1]) in (22, 24, 26), "installed Node major must be 22, 24 or 26")
    home = Path.home()
    live = home / "dev" / "void-node"
    live_before = command([git, "-C", safe_path(live), "rev-parse", "--verify", "HEAD"], timeout=10)
    base = home / "dev" / "void-web-recovery" / ("pr1373-" + args.source_head[:12])
    safe_path(base)
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    owner = base / "preparation-owner.json"
    record = {"marker": "VOID_PRECISION_WEB_PREPARATION_V1", "source_head": args.source_head}
    if owner.exists():
        require(not owner.is_symlink() and json.loads(owner.read_text()) == record, "preparation directory belongs to another candidate")
    else:
        require(not any(base.iterdir()), "preparation directory is not empty")
        with owner.open("x") as out:
            json.dump(record, out)
    checkout = base / "source"
    if not checkout.exists():
        print("Preparing isolated source checkout...", flush=True)
        command([git, "-c", "core.hooksPath=/dev/null", "clone", "--shared", "--no-checkout", str(live), str(checkout)])
    safe_path(checkout)
    # Fetch/check out only inside this new, dedicated repository. Live refs and
    # the node's worktree remain untouched. Repeated preparation refuses edits.
    status = command([git, "-C", str(checkout), "-c", "core.fsmonitor=false", "status", "--porcelain", "--untracked-files=all"])
    head = command([git, "-C", str(checkout), "rev-parse", "HEAD"])
    if all(x.name == ".git" for x in checkout.iterdir()):
        # A clone made with --no-checkout has tracked deletions until its first
        # checkout. Admit only that empty working directory, never user changes.
        require(all(x.name == ".git" for x in checkout.iterdir()), "isolated checkout has another generation or edits")
        command([git, "-C", str(checkout), "-c", "core.hooksPath=/dev/null", "fetch", "--no-tags", REPO, args.source_head])
        command([git, "-C", str(checkout), "-c", "core.hooksPath=/dev/null", "checkout", "--detach", args.source_head])
    else:
        require(head == args.source_head and status == "", "isolated checkout has another generation or edits")
    require(command([git, "-C", str(checkout), "rev-parse", "HEAD"]) == args.source_head, "wrong source head")
    require(command([git, "-C", str(checkout), "-c", "core.fsmonitor=false", "status", "--porcelain", "--untracked-files=all"]) == "", "source checkout is not clean")
    entries = ["ops/public/public-seed-adapter-v1.mjs",
               "ops/public/void-public-app-composition-gateway-v1.mjs",
               "ops/public/void-public-frontdoor-v1.mjs"]
    for entry in entries:
        command([str(node), "--check", str(checkout / entry)], timeout=10)
    units_dir = base / "prepared-units"
    safe_path(units_dir)
    units_dir.mkdir(exist_ok=True, mode=0o700)
    settings = [
        {"VOID_ADAPTER_HOST": "127.0.0.1", "VOID_ADAPTER_PORT": "8080",
         "VOID_SEED_UPSTREAM": "http://127.0.0.1:4100", "VOID_EARN_COORDINATOR_UPSTREAM": ""},
        {"VOID_COMPOSITION_HOST": "127.0.0.1", "VOID_COMPOSITION_PORT": "8082",
         "VOID_NODE_UPSTREAM": "http://127.0.0.1:4100", "VOID_PUBLIC_GATEWAY_UPSTREAM": "http://127.0.0.1:8080",
         "VOID_AI_AGENT_GATEWAY_UPSTREAM": "", "VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM": "",
         "VOID_PUBLIC_NODE_LABEL": "Precision public website", "VOID_TXROOT_QUARANTINED": "1"},
        {"VOID_PUBLIC_FRONTDOOR_BIND": "127.0.0.1", "VOID_PUBLIC_FRONTDOOR_PORT": "8083",
         "VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT": "8082", "VOID_PUBLIC_FRONTDOOR_READ_ONLY": "1",
         "VOID_PUBLIC_FRONTDOOR_HOME": str(checkout / "public/void-public-frontdoor-v1/index.html")},
    ]
    hashes = {}
    for name, entry, environment in zip(["adapter", "composition", "frontdoor"], entries, settings):
        filename = "void-web-recovery-" + name + "-" + args.source_head[:12] + ".service"
        data = unit(node, checkout, entry, "VOID Precision website recovery " + name, environment)
        target = units_dir / filename
        safe_path(target)
        if target.exists():
            require(target.read_bytes() == data, "prepared unit differs from this candidate")
        else:
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd, "wb") as out:
                out.write(data)
        hashes[filename] = hashlib.sha256(data).hexdigest()
    live_after = command([git, "-C", str(live), "rev-parse", "--verify", "HEAD"], timeout=10)
    require(live_after == live_before, "live checkout head moved during preparation; review separately")
    receipt = {**record, "node_executable": str(node), "node_version": version,
               "checkout": str(checkout), "prepared_unit_sha256": hashes,
               "live_node_checkout_head": live_after, "installed": False, "deployed": False,
               "service_changed": False, "funnel_changed": False, "dns_changed": False,
               "packages_installed": False, "runtime_proof_executed": False}
    data = json.dumps(receipt, sort_keys=True, indent=2).encode() + b"\n"
    receipt_path = base / "preparation-receipt.json"
    safe_path(receipt_path)
    if receipt_path.exists():
        require(receipt_path.read_bytes() == data, "existing receipt differs; inspect prepared generation")
    else:
        with receipt_path.open("xb") as out:
            out.write(data)
    print("VOID_PRECISION_WEB_PREPARATION_V1_STAGED")
    print("source_head=" + args.source_head)
    print("node_version=" + version)
    print("prepared_units=" + str(units_dir))
    print("receipt=" + str(receipt_path))
    print("receipt_sha256=" + hashlib.sha256(data).hexdigest())
    print("live_node_checkout_head=" + live_after)
    print("installed=false; service_changed=false; funnel_changed=false; dns_changed=false; packages_installed=false")
    print("Return this output and preparation-receipt.json for the service-installation review.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        print("HOLD VOID_PRECISION_WEB_PREPARATION_V1: " + str(error))
        raise SystemExit(2)
