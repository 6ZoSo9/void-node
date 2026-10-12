#!/usr/bin/env python3
"""Read-only survey for VOID Tor agent-discovery parity activation.

The survey proves the canonical source first, then inspects the systemd-owned
Tor backend deployment. It never mutates Git, deployments, services, Tor
configuration, hidden-service keys, ledgers, wallets, or funds.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any

MARKER = "VOID_TOR_AGENT_DISCOVERY_ACTIVATION_SURVEY_V1"
REQUIRED_SOURCE_COMMIT = "1ea23f003c2bb5aead05854521d205194d0dfa3f"
DEFAULT_UNIT = "void-public-node-tor-backend-v1.service"
RECOGNIZED_OVERLAY_HEAD = "daff6100ddfcad7e06046fd9379200be902754f2"
RECOGNIZED_OVERLAY_BASE = "3d725ef8b3c53f381b5988305a01a15fa1bfee92"
ACTIVATION_PATHS = (
    "public/.well-known/void-public-node.json",
    "public/public-node/agent-paid-work-public-discovery-v1.json",
)
REQUIRED_PATHS = (
    *ACTIVATION_PATHS,
    "config/void-tor-agent-discovery-parity-v1.json",
    "tools/build_void_tor_agent_discovery_parity_v1.mjs",
    "scripts/prove_void_tor_agent_discovery_parity_v1.mjs",
    "tools/void-tor-onion-public-node-v1.mjs",
)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


class Hold(RuntimeError):
    """Fail-closed survey result."""


def run(args: list[str], *, cwd: Path, timeout: int = 600) -> str:
    result = subprocess.run(
        args,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
        timeout=timeout,
        env={**os.environ, "LC_ALL": "C"},
    )
    if result.returncode != 0:
        raise Hold(
            f"command failed rc={result.returncode}: {' '.join(args)}\n"
            f"{result.stdout}"
        )
    return result.stdout.strip()


def git(repo: Path, *args: str) -> str:
    return run(["git", "-C", str(repo), *args], cwd=repo)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_regular(root: Path, relative: str) -> Path:
    root = root.resolve()
    path = root / relative
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        raise Hold(f"required path missing: {relative}: {error}") from error
    try:
        resolved.relative_to(root)
    except ValueError as error:
        raise Hold(f"required path escapes repository: {relative}") from error
    metadata = path.lstat()
    if path.is_symlink() or not stat.S_ISREG(metadata.st_mode):
        raise Hold(f"required path is not a regular non-symlink file: {relative}")
    return resolved


def verify_repo(repo: Path, expected_head: str, *, require_remote_main: bool) -> str:
    repo = repo.expanduser().resolve()
    if not SHA_RE.fullmatch(expected_head):
        raise Hold("expected head must be a full lowercase 40-character Git SHA")
    if git(repo, "status", "--porcelain=v1", "--untracked-files=all"):
        raise Hold(f"repository is not clean: {repo}")
    head = git(repo, "rev-parse", "HEAD")
    if head != expected_head:
        raise Hold(f"repository head mismatch: expected={expected_head} actual={head}")
    if require_remote_main:
        remote_main = git(repo, "rev-parse", "refs/remotes/origin/main")
        if remote_main != expected_head:
            raise Hold(
                "origin/main mismatch; fetch before surveying: "
                f"expected={expected_head} actual={remote_main}"
            )
    ancestor = subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", REQUIRED_SOURCE_COMMIT, head],
        cwd=str(repo),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if ancestor.returncode != 0:
        raise Hold(f"required merged source commit is not an ancestor: {REQUIRED_SOURCE_COMMIT}")
    for relative in REQUIRED_PATHS:
        require_regular(repo, relative)
    return head


def verify_source(repo: Path) -> dict[str, str]:
    run(
        ["node", "tools/build_void_tor_agent_discovery_parity_v1.mjs", "--check"],
        cwd=repo,
    )
    run(
        ["node", "scripts/prove_void_tor_agent_discovery_parity_v1.mjs"],
        cwd=repo,
    )
    return {relative: sha256(require_regular(repo, relative)) for relative in REQUIRED_PATHS}


def parse_systemd_show(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition("=")
        if separator and key:
            values[key] = value
    required = (
        "ActiveState",
        "SubState",
        "WorkingDirectory",
        "ExecStart",
        "FragmentPath",
        "MainPID",
    )
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise Hold(f"systemd metadata missing: {','.join(missing)}")
    return values


def parse_backend_cmdline(value: bytes) -> tuple[str, str, Path]:
    try:
        argv = [
            item.decode("utf-8", "strict")
            for item in value.split(b"\0")
            if item
        ]
    except UnicodeDecodeError as error:
        raise Hold("Tor backend MainPID command line is not valid UTF-8") from error
    if len(argv) < 2:
        raise Hold("Tor backend MainPID command line is incomplete")
    executable = Path(argv[0])
    if not executable.is_absolute() or executable.resolve() != Path("/usr/bin/node").resolve():
        raise Hold(f"Tor backend MainPID executable is not /usr/bin/node: {argv[0]}")
    script = Path(argv[1])
    if not script.is_absolute():
        raise Hold("Tor backend MainPID server script is not absolute")
    expected_suffix = Path("tools/void-tor-onion-public-node-v1.mjs")
    if len(script.parts) < 3 or Path(*script.parts[-2:]) != expected_suffix:
        raise Hold(f"Tor backend MainPID does not use the canonical server tool: {script}")
    deployment = script.resolve().parent.parent
    if deployment == Path("/") or deployment == Path.home().resolve():
        raise Hold(f"Tor backend deployment root is too broad: {deployment}")
    return str(executable), str(script), deployment


def inspect_service(unit: str) -> dict[str, str]:
    text = run(
        [
            "systemctl", "--user", "show", unit,
            "--property=ActiveState", "--property=SubState",
            "--property=WorkingDirectory", "--property=ExecStart",
            "--property=FragmentPath", "--property=MainPID", "--no-pager",
        ],
        cwd=Path.cwd(),
        timeout=30,
    )
    values = parse_systemd_show(text)
    if values["ActiveState"] != "active" or values["SubState"] != "running":
        raise Hold(
            f"Tor backend service is not active/running: "
            f"{values['ActiveState']}/{values['SubState']}"
        )
    try:
        main_pid = int(values["MainPID"])
    except ValueError as error:
        raise Hold(f"Tor backend MainPID is invalid: {values['MainPID']}") from error
    if main_pid <= 0:
        raise Hold(f"Tor backend MainPID is not live: {main_pid}")
    process_root = Path("/proc") / str(main_pid)
    try:
        cmdline = (process_root / "cmdline").read_bytes()
        cgroup = (process_root / "cgroup").read_text(encoding="utf-8")
        process_executable = (process_root / "exe").resolve(strict=True)
    except OSError as error:
        raise Hold(f"failed to inspect Tor backend MainPID {main_pid}: {error}") from error
    executable, script, deployment = parse_backend_cmdline(cmdline)
    if process_executable != Path(executable).resolve():
        raise Hold(
            "Tor backend MainPID executable link mismatch: "
            f"cmdline={executable} proc={process_executable}"
        )
    if unit not in cgroup:
        raise Hold(f"Tor backend MainPID is not owned by {unit}")
    values["ProcessExecutable"] = str(process_executable)
    values["ServerScript"] = script
    values["DeploymentRoot"] = str(deployment)
    return values


def classify_deployment(canonical: Path, deployment: Path, expected_head: str) -> dict[str, Any]:
    deployment = deployment.expanduser().resolve()
    deployed_head = git(deployment, "rev-parse", "HEAD")
    if git(deployment, "status", "--porcelain=v1", "--untracked-files=all"):
        raise Hold(f"deployed Tor worktree is dirty: {deployment}")
    ancestry = subprocess.run(
        ["git", "-C", str(canonical), "merge-base", "--is-ancestor", deployed_head, expected_head],
        cwd=str(canonical),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    is_ancestor = ancestry.returncode == 0
    recognized_overlay = False
    if not is_ancestor and deployed_head == RECOGNIZED_OVERLAY_HEAD:
        merge_base = git(canonical, "merge-base", deployed_head, expected_head)
        changed_paths = tuple(
            sorted(
                line
                for line in git(
                    deployment,
                    "diff",
                    "--name-only",
                    "--no-renames",
                    RECOGNIZED_OVERLAY_BASE,
                    deployed_head,
                ).splitlines()
                if line
            )
        )
        recognized_overlay = (
            merge_base == RECOGNIZED_OVERLAY_BASE
            and changed_paths == tuple(sorted(ACTIVATION_PATHS))
        )
    if not is_ancestor and not recognized_overlay:
        raise Hold(
            "deployed Tor head is neither an ancestor nor the exact recognized "
            "discovery overlay: "
            f"deployed={deployed_head} expected={expected_head}"
        )

    comparisons: dict[str, dict[str, Any]] = {}
    all_exact = True
    for relative in REQUIRED_PATHS:
        canonical_file = require_regular(canonical, relative)
        deployed_file = deployment / relative
        if deployed_file.exists() and not deployed_file.is_symlink() and deployed_file.is_file():
            deployed_sha = sha256(deployed_file)
        else:
            deployed_sha = None
        canonical_sha = sha256(canonical_file)
        exact = deployed_sha == canonical_sha
        all_exact = all_exact and exact
        comparisons[relative] = {
            "canonical_sha256": canonical_sha,
            "deployed_sha256": deployed_sha,
            "exact": exact,
        }

    activation_exact = all(
        comparisons[relative]["exact"]
        for relative in ACTIVATION_PATHS
    )
    if recognized_overlay and not activation_exact:
        raise Hold("recognized discovery overlay bytes differ from canonical main")
    if deployed_head == expected_head and not all_exact:
        raise Hold("deployment claims expected head but required source bytes differ")
    if deployed_head == expected_head and all_exact:
        status = "already_active_current_main"
    elif recognized_overlay and activation_exact:
        status = "already_active_on_recognized_overlay"
    else:
        status = "ready_for_guarded_activation"
    return {
        "status": status,
        "deployed_head": deployed_head,
        "expected_head": expected_head,
        "current_main_deployed": deployed_head == expected_head and all_exact,
        "recognized_discovery_overlay": recognized_overlay,
        "activation_files_exact": activation_exact,
        "required_files_exact": all_exact,
        "files": comparisons,
    }


def self_test() -> None:
    parsed = parse_systemd_show(
        "ActiveState=active\nSubState=running\nWorkingDirectory=/tmp/release\n"
        "ExecStart={ path=/usr/bin/node ; argv[]=/usr/bin/node tools/void-tor-onion-public-node-v1.mjs ; }\n"
        "FragmentPath=/tmp/service\nMainPID=123\n"
    )
    assert parsed["WorkingDirectory"] == "/tmp/release"
    executable, script, deployment = parse_backend_cmdline(
        b"/usr/bin/node\0/tmp/release/tools/void-tor-onion-public-node-v1.mjs\0"
        b"--host\0" b"127.0.0.1\0"
    )
    assert executable == "/usr/bin/node"
    assert script.endswith("/tools/void-tor-onion-public-node-v1.mjs")
    assert deployment == Path("/tmp/release")
    for rejected in (
        b"/usr/bin/python3\0/tmp/release/tools/void-tor-onion-public-node-v1.mjs\0",
        b"/usr/bin/node\0/tmp/release/tools/other.mjs\0",
    ):
        try:
            parse_backend_cmdline(rejected)
        except Hold:
            pass
        else:
            raise AssertionError("non-canonical Tor backend command line accepted")
    try:
        parse_systemd_show("ActiveState=active\n")
    except Hold:
        pass
    else:
        raise AssertionError("incomplete systemd metadata accepted")
    print(f"{MARKER}_SELF_TEST=PASS")
    print("mutation=false")
    print("service_restart=false")
    print("deployment=false")
    print("key_access=false")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser()
    sub = root.add_subparsers(dest="mode", required=True)
    sub.add_parser("self-test")
    for mode in ("source", "survey"):
        item = sub.add_parser(mode)
        item.add_argument("--repo-root", default=str(Path.home() / "dev/void-node"))
        item.add_argument("--expected-head", required=True)
        if mode == "survey":
            item.add_argument("--service-unit", default=DEFAULT_UNIT)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        if args.mode == "self-test":
            self_test()
            return 0
        repo = Path(args.repo_root).expanduser().resolve()
        head = verify_repo(repo, args.expected_head, require_remote_main=args.mode == "survey")
        source_hashes = verify_source(repo)
        result: dict[str, Any] = {
            "marker": MARKER,
            "version": 1,
            "mode": args.mode,
            "canonical_head": head,
            "required_source_commit": REQUIRED_SOURCE_COMMIT,
            "source_proof": "exact_green",
            "source_sha256": source_hashes,
            "authority": {
                "git_mutation": False,
                "deployment": False,
                "service_restart": False,
                "tor_configuration_mutation": False,
                "hidden_service_key_access": False,
                "wallet_or_signer_access": False,
                "work_credit_write": False,
                "payment_execution": False,
                "fund_movement": False,
            },
        }
        if args.mode == "survey":
            service = inspect_service(args.service_unit)
            deployment = Path(service["DeploymentRoot"])
            result["service"] = {
                "unit": args.service_unit,
                "active_state": service["ActiveState"],
                "sub_state": service["SubState"],
                "main_pid": int(service["MainPID"]),
                "process_executable": service["ProcessExecutable"],
                "server_script": service["ServerScript"],
                "deployment_directory": str(deployment),
                "unit_working_directory": service["WorkingDirectory"],
                "fragment_path": service["FragmentPath"],
            }
            result["deployment"] = classify_deployment(repo, deployment, head)
        print(json.dumps(result, indent=2, sort_keys=True))
        print(f"{MARKER}=PASS")
        return 0
    except (Hold, OSError, subprocess.TimeoutExpired) as error:
        print(f"HOLD: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
