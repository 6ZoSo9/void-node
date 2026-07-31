#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any

PLAN_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_"
    "DISABLED_PRODUCTION_INSTALL_PLAN_V1"
)
RECEIPT_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_"
    "DISABLED_PRODUCTION_INSTALL_RECEIPT_V1"
)
VERSION = 1

PACKET_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_"
    "DISABLED_PRODUCTION_DEPLOYMENT_PACKET_V1"
)
PACKET_ID = "voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784"
PACKET_COMMIT = "eaa41fdf76044c88eb9c078046bd370acb3ee457"
PACKET_CHECKPOINT_TAG = "ckpt-authenticated-paid-work-runtime-disabled-production-deployment-packet-v1-postmerge-exact-green-20260731T162300Z"
PACKET_PATH = "examples/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.example.json"
PACKET_SHA256 = "3f8e5cf0c29206b172d9f427644b453fa9d1e1d7f7e4ea28bc35fc0060e40de3"
RUNTIME_SOURCE_COMMIT = "3b298bc1e31365aec7a20d03c3f425e22fd2f949"
RUNTIME_PATH = "scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts"
RUNTIME_SHA256 = "3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7"

CONFIRMATION = "installAuthenticatedPaidWorkRuntimeDisabledProductionV1"
DEFAULT_INSTALL_ROOT = (
    Path.home()
    / ".local"
    / "share"
    / "void-authenticated-paid-work-runtime-disabled-v1"
)
RELEASE_ID = (
    "paid-work-runtime-disabled-v1-"
    f"{RUNTIME_SOURCE_COMMIT[:12]}-"
    f"{PACKET_ID.rsplit('_', 1)[-1][:12]}"
)
RUNTIME_JS_RELATIVE = (
    "dist/scripts/"
    "authenticated_paid_work_quote_acceptance_payment_authority_"
    "activation_persistence_runtime_binding_v1.js"
)

ACTIVATION_BLOCKERS = [
    "explicit_enable_configuration_not_authorized",
    "production_private_root_not_created",
    "trusted_live_context_provider_not_bound",
    "production_command_source_not_authorized",
    "confirmed_apply_not_authorized",
    "separate_payment_execution_gate_absent",
    "separate_work_execution_gate_absent",
]


class Hold(RuntimeError):
    pass


def require(condition: object, message: str) -> None:
    if not condition:
        raise Hold(message)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def lexical_absolute(path: Path) -> Path:
    return Path(os.path.abspath(os.fspath(path.expanduser())))


def require_no_symlink_components(path: Path) -> None:
    require(path.is_absolute(), f"install path is not absolute: {path}")
    current = Path(path.anchor)
    for component in path.parts[1:]:
        current /= component
        require(
            not current.is_symlink(),
            f"install path contains a symlink component: {current}",
        )


def run(
    command: list[str],
    *,
    cwd: Path | None = None,
    capture: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=True,
        text=True,
        capture_output=capture,
    )


def git_output(repo: Path, *args: str) -> str:
    return run(["git", "-C", str(repo), *args]).stdout.strip()


def canonical_json(value: Any) -> str:
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(
            json.dumps(key, separators=(",", ":"))
            + ":"
            + canonical_json(value[key])
            for key in sorted(value)
        ) + "}"
    return json.dumps(value, separators=(",", ":"))


def authority() -> dict[str, bool]:
    return {
        "packet_read": True,
        "source_read": True,
        "temporary_compile": True,
        "disabled_smoke_test": True,
        "installation_write": False,
        "current_pointer_update": False,
        "configuration_enable_write": False,
        "production_runtime_root_create": False,
        "http_route_registration": False,
        "network_listener_create": False,
        "service_unit_create": False,
        "service_restart": False,
        "activation": False,
        "quote_acceptance": False,
        "payment_authority": False,
        "payment_execution": False,
        "payment_destination_resolution": False,
        "transaction_construction": False,
        "transaction_broadcast": False,
        "wallet_access": False,
        "production_signing": False,
        "work_execution_authorization": False,
        "work_dispatch": False,
        "work_credit_write": False,
        "void_settlement": False,
        "fund_movement": False,
    }


def plan_descriptor() -> dict[str, Any]:
    basis = {
        "marker": PLAN_MARKER,
        "version": VERSION,
        "packet": {
            "marker": PACKET_MARKER,
            "packet_id": PACKET_ID,
            "commit": PACKET_COMMIT,
            "checkpoint_tag": PACKET_CHECKPOINT_TAG,
            "path": PACKET_PATH,
            "sha256": PACKET_SHA256,
        },
        "runtime": {
            "source_commit": RUNTIME_SOURCE_COMMIT,
            "path": RUNTIME_PATH,
            "sha256": RUNTIME_SHA256,
            "compiled_entry_relative_path": RUNTIME_JS_RELATIVE,
        },
        "install": {
            "release_id": RELEASE_ID,
            "install_mode": "immutable_compiled_disabled_only",
            "release_directory_relative_path": f"releases/{RELEASE_ID}",
            "current_pointer_relative_path": "current",
            "launcher_relative_path": "run-disabled.sh",
            "disabled_config_relative_path": "disabled-config.json",
            "manifest_relative_path": "INSTALLATION.json",
            "checksums_relative_path": "SHA256SUMS.txt",
            "confirmation": CONFIRMATION,
            "service_unit_required": False,
            "service_restart_required": False,
            "http_route_required": False,
            "network_listener_required": False,
            "enable_configuration_required": False,
            "production_runtime_root_required": False,
        },
        "ready_for_disabled_install": True,
        "ready_for_activation": False,
        "activation_blockers": ACTIVATION_BLOCKERS,
        "authority": authority(),
    }
    return {
        **basis,
        "plan_id": "voidapwrip1_"
        + hashlib.sha256(canonical_json(basis).encode("utf-8")).hexdigest(),
    }


def validate_packet(packet_path: Path) -> dict[str, Any]:
    require(
        packet_path.is_file() and not packet_path.is_symlink(),
        f"packet file missing or unsafe: {packet_path}",
    )
    actual_sha = sha256_file(packet_path)
    require(
        actual_sha == PACKET_SHA256,
        f"packet SHA mismatch: expected={PACKET_SHA256} actual={actual_sha}",
    )
    value = json.loads(packet_path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), "packet must be an object")
    require(value.get("marker") == PACKET_MARKER, "packet marker mismatch")
    require(value.get("version") == 1, "packet version mismatch")
    require(value.get("packet_id") == PACKET_ID, "packet ID mismatch")
    require(
        value.get("source", {}).get("commit") == RUNTIME_SOURCE_COMMIT,
        "packet runtime source mismatch",
    )
    require(
        value.get("ready_for_disabled_production_deployment") is True,
        "packet disabled deployment readiness missing",
    )
    require(
        value.get("ready_for_activation") is False,
        "packet incorrectly permits activation",
    )
    target = value.get("deployment_target", {})
    require(
        target.get("surface") == "standalone_operator_cli",
        "packet surface mismatch",
    )
    for key in [
        "enable_configuration_required",
        "production_private_root_required",
        "http_route_required",
        "network_listener_required",
        "service_unit_required",
        "service_restart_required",
    ]:
        require(target.get(key) is False, f"packet target authority present: {key}")
    for key, granted in value.get("authority", {}).items():
        if key not in {"receipt_read", "packet_evaluation"}:
            require(granted is False, f"packet authority granted: {key}")
    return value


def validate_repo(repo: Path, packet_path: Path) -> None:
    require((repo / ".git").exists(), f"repository missing: {repo}")
    require(
        git_output(repo, "cat-file", "-t", PACKET_COMMIT) == "commit",
        "packet commit unavailable",
    )
    require(
        git_output(repo, "cat-file", "-t", RUNTIME_SOURCE_COMMIT) == "commit",
        "runtime source commit unavailable",
    )
    require(
        git_output(repo, "rev-list", "-n", "1", PACKET_CHECKPOINT_TAG)
        == PACKET_COMMIT,
        "packet checkpoint tag missing or misbound",
    )
    packet_blob = git_output(repo, "show", f"{PACKET_COMMIT}:{PACKET_PATH}")
    require(
        sha256_bytes((packet_blob + "\n").encode("utf-8")) == PACKET_SHA256
        or sha256_bytes(packet_blob.encode("utf-8")) == PACKET_SHA256,
        "packet commit bytes do not match packet SHA",
    )
    require(
        sha256_file(packet_path) == PACKET_SHA256,
        "selected packet bytes do not match sealed packet",
    )
    runtime_bytes = run(
        ["git", "-C", str(repo), "show", f"{RUNTIME_SOURCE_COMMIT}:{RUNTIME_PATH}"],
        capture=False,
    ) if False else None
    runtime_raw = subprocess.run(
        ["git", "-C", str(repo), "show", f"{RUNTIME_SOURCE_COMMIT}:{RUNTIME_PATH}"],
        check=True,
        capture_output=True,
    ).stdout
    require(
        sha256_bytes(runtime_raw) == RUNTIME_SHA256,
        "runtime source bytes do not match sealed SHA",
    )


def resolve_install_root(scope: str, supplied: str | None) -> Path:
    if scope == "production":
        canonical = lexical_absolute(DEFAULT_INSTALL_ROOT)
        requested = canonical if supplied is None else lexical_absolute(Path(supplied))
        require(
            requested == canonical,
            "production install root must be the canonical default",
        )
        require_no_symlink_components(canonical)
        return canonical

    require(scope == "test", "invalid install scope")
    require(os.environ.get("VOID_TEST_ONLY") == "1", "test scope requires VOID_TEST_ONLY=1")
    require(supplied is not None, "test scope requires --install-root")
    root = lexical_absolute(Path(supplied))
    require(
        root == Path("/tmp") or Path("/tmp") in root.parents,
        "test install root must be under /tmp",
    )
    require_no_symlink_components(root)
    return root


def write_text(path: Path, text: str, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    os.chmod(path, mode)


def file_manifest(root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if (
            not path.is_file()
            or path.name in {"SHA256SUMS.txt", "INSTALLATION.json"}
        ):
            continue
        result[str(path.relative_to(root))] = sha256_file(path)
    return result


def release_snapshot(root: Path) -> dict[str, dict[str, Any]]:
    require(root.is_dir() and not root.is_symlink(), f"release root is unsafe: {root}")
    result: dict[str, dict[str, Any]] = {
        ".": {
            "kind": "directory",
            "mode": stat.S_IMODE(root.stat().st_mode),
        }
    }
    for path in sorted(root.rglob("*")):
        relative = str(path.relative_to(root))
        require(not path.is_symlink(), f"release contains a symlink: {relative}")
        if path.is_dir():
            result[relative] = {
                "kind": "directory",
                "mode": stat.S_IMODE(path.stat().st_mode),
            }
        else:
            require(path.is_file(), f"release contains an unsupported entry: {relative}")
            result[relative] = {
                "kind": "file",
                "mode": stat.S_IMODE(path.stat().st_mode),
                "sha256": sha256_file(path),
            }
    return result


def seal_release(root: Path) -> None:
    require(root.is_dir() and not root.is_symlink(), "staged release root is unsafe")
    for path in sorted(root.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        relative = str(path.relative_to(root))
        require(not path.is_symlink(), f"staged release contains a symlink: {relative}")
        if path.is_file():
            os.chmod(path, 0o500 if path.name == "run-disabled.sh" else 0o400)
        else:
            require(path.is_dir(), f"staged release contains an unsupported entry: {relative}")
            os.chmod(path, 0o500)
    os.chmod(root, 0o500)


def verify_release(release: Path) -> dict[str, Any]:
    release_snapshot(release)
    manifest_path = release / "INSTALLATION.json"
    require(manifest_path.is_file(), "installation manifest missing")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(manifest.get("packet_id") == PACKET_ID, "installed packet ID mismatch")
    require(
        manifest.get("runtime_source_commit") == RUNTIME_SOURCE_COMMIT,
        "installed runtime source mismatch",
    )
    require(manifest.get("enabled") is False, "installed runtime is enabled")
    require(manifest.get("ready_for_activation") is False, "installed runtime permits activation")
    files = manifest.get("files")
    require(isinstance(files, dict) and files, "installed file manifest missing")
    for relative, expected_sha in files.items():
        path = release / relative
        require(path.is_file(), f"installed file missing: {relative}")
        require(
            sha256_file(path) == expected_sha,
            f"installed file SHA mismatch: {relative}",
        )
    return manifest


def disabled_smoke(release: Path) -> dict[str, Any]:
    command_path = release / "intentionally-absent-command.json"
    trusted_path = release / "intentionally-absent-trusted-context.json"
    require(not command_path.exists(), "disabled smoke command path exists")
    require(not trusted_path.exists(), "disabled smoke trusted-context path exists")
    completed = run([str(release / "run-disabled.sh")])
    value = json.loads(completed.stdout)
    require(value.get("status") == "disabled", "installed smoke status mismatch")
    require(value.get("enabled") is False, "installed smoke enabled mismatch")
    require(
        value.get("trusted_context_loaded") is False,
        "installed smoke loaded trusted context",
    )
    require(
        value.get("trusted_context_provider_calls") == 0,
        "installed smoke invoked trusted provider",
    )
    require(value.get("store_inspected") is False, "installed smoke inspected store")
    require(
        value.get("persistence_attempted") is False,
        "installed smoke attempted persistence",
    )
    require(
        all(granted is False for granted in value.get("authority", {}).values()),
        "installed smoke granted authority",
    )
    require(not command_path.exists(), "installed smoke touched command path")
    require(not trusted_path.exists(), "installed smoke touched trusted-context path")
    return value


def build_release(repo: Path, packet: dict[str, Any]) -> tuple[Path, tempfile.TemporaryDirectory[str]]:
    temporary = tempfile.TemporaryDirectory(prefix="void-paid-work-disabled-install-")
    temp_root = Path(temporary.name)
    source_worktree = temp_root / "source"
    staging = temp_root / RELEASE_ID

    try:
        run(
            [
                "git",
                "-C",
                str(repo),
                "worktree",
                "add",
                "--detach",
                str(source_worktree),
                RUNTIME_SOURCE_COMMIT,
            ]
        )
        tsc = repo / "node_modules" / ".bin" / "tsc"
        require(tsc.is_file() and os.access(tsc, os.X_OK), "TypeScript compiler unavailable")
        run(
            [
                str(tsc),
                "--noCheck",
                "--target",
                "ES2022",
                "--module",
                "NodeNext",
                "--moduleResolution",
                "NodeNext",
                "--lib",
                "ES2022",
                "--esModuleInterop",
                "--allowSyntheticDefaultImports",
                "--skipLibCheck",
                "--types",
                "node",
                "--typeRoots",
                str(repo / "node_modules" / "@types"),
                "--rootDir",
                str(source_worktree),
                "--outDir",
                str(staging / "dist"),
                str(source_worktree / RUNTIME_PATH),
            ],
            cwd=source_worktree,
        )
    finally:
        subprocess.run(
            ["git", "-C", str(repo), "worktree", "remove", "--force", str(source_worktree)],
            check=False,
            capture_output=True,
            text=True,
        )

    runtime_js = staging / RUNTIME_JS_RELATIVE
    require(runtime_js.is_file(), f"compiled runtime missing: {runtime_js}")

    write_text(
        staging / "package.json",
        json.dumps({"private": True, "type": "module"}, indent=2, sort_keys=True) + "\n",
        0o600,
    )
    write_text(
        staging / "disabled-config.json",
        json.dumps(
            {
                "marker": (
                    "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_"
                    "AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_V1"
                ),
                "version": 1,
                "enabled": False,
                "persistence_config": None,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        0o600,
    )

    launcher = f"""#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
HERE="$(cd -- "$(dirname -- "${{BASH_SOURCE[0]}}")" && pwd -P)"
test ! -e "$HERE/intentionally-absent-command.json"
test ! -e "$HERE/intentionally-absent-trusted-context.json"
NODE="$(command -v node || true)"
test -n "$NODE" && test -x "$NODE" || {{
  printf 'HOLD: Node.js 22 executable is unavailable\n' >&2
  exit 1
}}
NODE_MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]')"
test "$NODE_MAJOR" = "22" || {{
  printf 'HOLD: Node.js 22 is required; found major %s\n' "$NODE_MAJOR" >&2
  exit 1
}}
exec "$NODE" \
  "$HERE/{RUNTIME_JS_RELATIVE}" \
  execute \
  "$HERE/disabled-config.json" \
  "$HERE/intentionally-absent-command.json" \
  "$HERE/intentionally-absent-trusted-context.json"
"""
    write_text(staging / "run-disabled.sh", launcher, 0o700)

    pre_manifest = file_manifest(staging)
    installation = {
        "marker": RECEIPT_MARKER,
        "version": VERSION,
        "release_id": RELEASE_ID,
        "packet_id": PACKET_ID,
        "packet_commit": PACKET_COMMIT,
        "packet_sha256": PACKET_SHA256,
        "runtime_source_commit": RUNTIME_SOURCE_COMMIT,
        "runtime_source_sha256": RUNTIME_SHA256,
        "enabled": False,
        "ready_for_activation": False,
        "activation_blockers": ACTIVATION_BLOCKERS,
        "compiled_entry_relative_path": RUNTIME_JS_RELATIVE,
        "files": pre_manifest,
        "authority": {
            "disabled_launcher_execution": True,
            "configuration_enable_write": False,
            "production_runtime_root_create": False,
            "http_route_registration": False,
            "network_listener_create": False,
            "service_unit_create": False,
            "service_restart": False,
            "activation": False,
            "quote_acceptance": False,
            "payment_authority": False,
            "payment_execution": False,
            "transaction_broadcast": False,
            "wallet_access": False,
            "work_credit_write": False,
            "void_settlement": False,
            "fund_movement": False,
        },
    }
    write_text(
        staging / "INSTALLATION.json",
        json.dumps(installation, indent=2, sort_keys=True) + "\n",
        0o600,
    )

    final_manifest = json.loads(
        (staging / "INSTALLATION.json").read_text(encoding="utf-8")
    )
    final_manifest["files"] = file_manifest(staging)
    write_text(
        staging / "INSTALLATION.json",
        json.dumps(final_manifest, indent=2, sort_keys=True) + "\n",
        0o600,
    )

    checksum_entries = file_manifest(staging)
    checksum_entries["INSTALLATION.json"] = sha256_file(
        staging / "INSTALLATION.json"
    )
    write_text(
        staging / "SHA256SUMS.txt",
        "".join(
            f"{sha}  {relative}\n"
            for relative, sha in sorted(checksum_entries.items())
        ),
        0o600,
    )

    seal_release(staging)
    verify_release(staging)
    disabled_smoke(staging)
    return staging, temporary


def apply_install(
    repo: Path,
    packet: dict[str, Any],
    install_root: Path,
) -> dict[str, Any]:
    staging, temporary = build_release(repo, packet)
    try:
        releases = install_root / "releases"
        receipts = install_root / "receipts"
        release = releases / RELEASE_ID
        install_root_created = not install_root.exists()

        install_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        require(
            install_root.is_dir() and not install_root.is_symlink(),
            "install root is unsafe",
        )
        os.chmod(install_root, 0o700)
        require_no_symlink_components(releases)
        require_no_symlink_components(receipts)
        releases.mkdir(mode=0o700, exist_ok=True)
        receipts.mkdir(mode=0o700, exist_ok=True)
        require(releases.is_dir() and not releases.is_symlink(), "releases path is unsafe")
        require(receipts.is_dir() and not receipts.is_symlink(), "receipts path is unsafe")
        os.chmod(releases, 0o700)
        os.chmod(receipts, 0o700)

        installation_performed = False
        expected_snapshot = release_snapshot(staging)
        if release.exists() or release.is_symlink():
            require(release.is_dir() and not release.is_symlink(), "release path is unsafe")
            require(
                release_snapshot(release) == expected_snapshot,
                "existing release differs from the fresh sealed rebuild",
            )
            verify_release(release)
            disabled_smoke(release)
        else:
            os.replace(staging, release)
            installation_performed = True

        current = install_root / "current"
        desired = Path("releases") / RELEASE_ID
        current_updated = False
        if current.is_symlink() and os.readlink(current) == str(desired):
            pass
        else:
            require(not current.exists() or current.is_symlink(), "current path is unsafe")
            temporary_link = install_root / f".current-{os.getpid()}"
            if temporary_link.exists() or temporary_link.is_symlink():
                temporary_link.unlink()
            temporary_link.symlink_to(desired)
            os.replace(temporary_link, current)
            current_updated = True

        verify_release(release)
        smoke = disabled_smoke(release)

        generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        receipt = {
            "marker": RECEIPT_MARKER,
            "version": VERSION,
            "status": "installed" if installation_performed else "already_installed",
            "generated_at_utc": generated,
            "scope": "disabled_production_install",
            "packet_id": PACKET_ID,
            "packet_commit": PACKET_COMMIT,
            "runtime_source_commit": RUNTIME_SOURCE_COMMIT,
            "release_id": RELEASE_ID,
            "install_root": str(install_root),
            "release_directory": str(release),
            "current_pointer": str(current),
            "current_target": str(desired),
            "install_root_created": install_root_created,
            "installation_performed": installation_performed,
            "current_pointer_updated": current_updated,
            "disabled_smoke_status": smoke["status"],
            "ready_for_activation": False,
            "activation_blockers": ACTIVATION_BLOCKERS,
            "authority": {
                "installation_write": True,
                "current_pointer_update": current_updated,
                "disabled_launcher_execution": True,
                "configuration_enable_write": False,
                "production_runtime_root_create": False,
                "http_route_registration": False,
                "network_listener_create": False,
                "service_unit_create": False,
                "service_restart": False,
                "activation": False,
                "quote_acceptance": False,
                "payment_authority": False,
                "payment_execution": False,
                "transaction_broadcast": False,
                "wallet_access": False,
                "work_credit_write": False,
                "void_settlement": False,
                "fund_movement": False,
            },
        }
        receipt_name = (
            datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            + f"-{os.getpid()}-install-receipt.json"
        )
        receipt_path = receipts / receipt_name
        write_text(receipt_path, json.dumps(receipt, indent=2, sort_keys=True) + "\n", 0o600)
        receipt["receipt_path"] = str(receipt_path)
        receipt["receipt_sha256"] = sha256_file(receipt_path)
        return receipt
    finally:
        temporary.cleanup()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["plan", "apply"])
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--packet", required=True)
    parser.add_argument("--scope", choices=["production", "test"], default="production")
    parser.add_argument("--install-root")
    parser.add_argument("--confirmation", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = Path(args.repo_root).expanduser().resolve()
    packet_path = Path(args.packet).expanduser().resolve()
    validate_packet(packet_path)
    validate_repo(repo, packet_path)

    if args.mode == "plan":
        print(json.dumps(plan_descriptor(), indent=2, sort_keys=True))
        return 0

    require(args.confirmation == CONFIRMATION, f"confirmation must be {CONFIRMATION}")
    install_root = resolve_install_root(args.scope, args.install_root)
    receipt = apply_install(repo, validate_packet(packet_path), install_root)
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Hold as error:
        print(f"HOLD: {error}", file=sys.stderr)
        raise SystemExit(1)
    except subprocess.CalledProcessError as error:
        if error.stdout:
            print(error.stdout, file=sys.stderr, end="")
        if error.stderr:
            print(error.stderr, file=sys.stderr, end="")
        print(f"HOLD: command failed: {' '.join(error.cmd)}", file=sys.stderr)
        raise SystemExit(1)
