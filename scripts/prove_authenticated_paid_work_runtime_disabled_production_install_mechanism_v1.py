#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile

REPO = Path(__file__).resolve().parents[1]
INSTALLER = REPO / "ops/mainnet0/install_authenticated_paid_work_runtime_disabled_production_v1.py"
PACKET = REPO / "examples/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.example.json"
EXAMPLE = REPO / "examples/authenticated-paid-work-runtime-disabled-production-install-plan-v1.example.json"
SCHEMA = REPO / "schemas/authenticated-paid-work-runtime-disabled-production-install-plan-v1.schema.json"
DOCS = REPO / "docs/operations/authenticated-paid-work-runtime-disabled-production-install-mechanism-v1.md"
WORKFLOW = REPO / ".github/workflows/authenticated-paid-work-runtime-disabled-production-install-mechanism-v1.yml"
CONFIRMATION = "installAuthenticatedPaidWorkRuntimeDisabledProductionV1"
EXPECTED_PACKET_ID = "voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784"
EXPECTED_PACKET_CHECKPOINT_TAG = "ckpt-authenticated-paid-work-runtime-disabled-production-deployment-packet-v1-postmerge-exact-green-20260731T162300Z"
EXPECTED_PACKET_COMMIT = "eaa41fdf76044c88eb9c078046bd370acb3ee457"
EXPECTED_PLAN_MARKER = (
    "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_"
    "DISABLED_PRODUCTION_INSTALL_PLAN_V1"
)


def require(condition: object, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def run(command: list[str], *, env: dict[str, str] | None = None,
        check: bool = True) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        command,
        cwd=REPO,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if check and completed.returncode != 0:
        if completed.stdout:
            print(completed.stdout, file=sys.stderr, end="")
        if completed.stderr:
            print(completed.stderr, file=sys.stderr, end="")
        completed.check_returncode()
    return completed


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


def validate_plan_schema(plan: dict, schema: dict) -> None:
    require(plan.get("marker") == schema["properties"]["marker"]["const"], "plan marker")
    require(plan.get("version") == 1, "plan version")
    require(plan.get("packet", {}).get("packet_id") == EXPECTED_PACKET_ID, "packet ID")
    require(plan.get("ready_for_disabled_install") is True, "disabled install readiness")
    require(plan.get("ready_for_activation") is False, "activation readiness")
    require(plan.get("install", {}).get("service_unit_required") is False, "service unit")
    require(plan.get("install", {}).get("service_restart_required") is False, "restart")
    require(plan.get("install", {}).get("enable_configuration_required") is False, "enable")
    require(plan.get("install", {}).get("production_runtime_root_required") is False, "root")
    for key, value in plan.get("authority", {}).items():
        if key not in {
            "packet_read",
            "source_read",
            "temporary_compile",
            "disabled_smoke_test",
        }:
            require(value is False, f"plan authority granted: {key}")


plan_result = run(
    [
        sys.executable,
        str(INSTALLER),
        "plan",
        "--repo-root",
        str(REPO),
        "--packet",
        str(PACKET),
        "--scope",
        "test",
        "--install-root",
        "/tmp/void-unused-plan-root",
    ]
)
plan = json.loads(plan_result.stdout)
example = json.loads(EXAMPLE.read_text(encoding="utf-8"))
schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
require(plan == example, "plan differs from example")
validate_plan_schema(plan, schema)
print("plan_example_and_schema_exact_green=true")

with tempfile.TemporaryDirectory(
    prefix="void-paid-work-disabled-install-proof-",
    dir="/tmp",
) as temporary:
    install_root = Path(temporary) / "install-root"
    env = {**os.environ, "VOID_TEST_ONLY": "1"}

    wrong = run(
        [
            sys.executable,
            str(INSTALLER),
            "apply",
            "--repo-root",
            str(REPO),
            "--packet",
            str(PACKET),
            "--scope",
            "test",
            "--install-root",
            str(install_root),
            "--confirmation",
            "wrong",
        ],
        env=env,
        check=False,
    )
    require(wrong.returncode != 0, "wrong confirmation accepted")
    require("confirmation must be" in wrong.stderr, "wrong confirmation error")
    require(not install_root.exists(), "wrong confirmation wrote install root")
    print("confirmation_precedes_install_write=true")

    symlink_target = Path(temporary) / "symlink-target"
    symlink_target.mkdir()
    symlink_component = Path(temporary) / "symlink-component"
    symlink_component.symlink_to(symlink_target, target_is_directory=True)
    unsafe_root = symlink_component / "escaped-install-root"
    unsafe = run(
        [
            sys.executable,
            str(INSTALLER),
            "apply",
            "--repo-root",
            str(REPO),
            "--packet",
            str(PACKET),
            "--scope",
            "test",
            "--install-root",
            str(unsafe_root),
            "--confirmation",
            CONFIRMATION,
        ],
        env=env,
        check=False,
    )
    require(unsafe.returncode != 0, "symlinked install path accepted")
    require("symlink component" in unsafe.stderr, "symlink rejection error")
    require(not (symlink_target / "escaped-install-root").exists(), "symlink path wrote")
    print("symlinked_install_path_refused_before_write=true")

    nested_target = Path(temporary) / "nested-symlink-target"
    nested_target.mkdir()
    nested_root = Path(temporary) / "nested-install-root"
    nested_root.mkdir()
    (nested_root / "releases").symlink_to(nested_target, target_is_directory=True)
    nested_unsafe = run(
        [
            sys.executable,
            str(INSTALLER),
            "apply",
            "--repo-root",
            str(REPO),
            "--packet",
            str(PACKET),
            "--scope",
            "test",
            "--install-root",
            str(nested_root),
            "--confirmation",
            CONFIRMATION,
        ],
        env=env,
        check=False,
    )
    require(nested_unsafe.returncode != 0, "symlinked releases path accepted")
    require("symlink component" in nested_unsafe.stderr, "nested symlink rejection error")
    require(not any(nested_target.iterdir()), "symlinked releases path wrote")
    print("symlinked_release_parent_refused_before_install_write=true")

    first = run(
        [
            sys.executable,
            str(INSTALLER),
            "apply",
            "--repo-root",
            str(REPO),
            "--packet",
            str(PACKET),
            "--scope",
            "test",
            "--install-root",
            str(install_root),
            "--confirmation",
            CONFIRMATION,
        ],
        env=env,
    )
    first_receipt = json.loads(first.stdout)
    require(first_receipt.get("status") == "installed", "first install status")
    require(first_receipt.get("installation_performed") is True, "first install")
    require(first_receipt.get("ready_for_activation") is False, "activation allowed")
    require(first_receipt.get("disabled_smoke_status") == "disabled", "smoke status")

    release = Path(first_receipt["release_directory"])
    current = Path(first_receipt["current_pointer"])
    require(release.is_dir() and not release.is_symlink(), "release directory")
    require(current.is_symlink(), "current symlink")
    require(mode(install_root) == 0o700, "install root mode")
    require(mode(release) == 0o500, "release root mode")
    require(mode(release / "disabled-config.json") == 0o400, "config mode")
    require(mode(release / "run-disabled.sh") == 0o500, "launcher mode")
    require(mode(release / "INSTALLATION.json") == 0o400, "manifest mode")
    require(mode(release / "SHA256SUMS.txt") == 0o400, "checksums mode")
    require(not (release / "intentionally-absent-command.json").exists(), "command path")
    require(
        not (release / "intentionally-absent-trusted-context.json").exists(),
        "trusted path",
    )

    smoke = run([str(current / "run-disabled.sh")])
    smoke_value = json.loads(smoke.stdout)
    require(smoke_value.get("status") == "disabled", "launcher disabled status")
    require(smoke_value.get("store_inspected") is False, "launcher inspected store")
    require(
        smoke_value.get("persistence_attempted") is False,
        "launcher persisted",
    )
    require(
        all(value is False for value in smoke_value.get("authority", {}).values()),
        "launcher granted authority",
    )
    print("temporary_disabled_install_and_smoke_exact_green=true")

    second = run(
        [
            sys.executable,
            str(INSTALLER),
            "apply",
            "--repo-root",
            str(REPO),
            "--packet",
            str(PACKET),
            "--scope",
            "test",
            "--install-root",
            str(install_root),
            "--confirmation",
            CONFIRMATION,
        ],
        env=env,
    )
    second_receipt = json.loads(second.stdout)
    require(second_receipt.get("status") == "already_installed", "idempotent status")
    require(
        second_receipt.get("installation_performed") is False,
        "idempotent install repeated",
    )
    print("idempotent_reinstall_exact_green=true")

    config_path = release / "disabled-config.json"
    os.chmod(config_path, 0o600)
    config_path.write_text(
        config_path.read_text(encoding="utf-8") + "\n",
        encoding="utf-8",
    )
    os.chmod(config_path, 0o400)

    manifest_path = release / "INSTALLATION.json"
    os.chmod(manifest_path, 0o600)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["files"]["disabled-config.json"] = sha256_file(config_path)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    os.chmod(manifest_path, 0o400)

    self_reblessed = run(
        [
            sys.executable,
            str(INSTALLER),
            "apply",
            "--repo-root",
            str(REPO),
            "--packet",
            str(PACKET),
            "--scope",
            "test",
            "--install-root",
            str(install_root),
            "--confirmation",
            CONFIRMATION,
        ],
        env=env,
        check=False,
    )
    require(self_reblessed.returncode != 0, "self-reblessed release tamper accepted")
    require(
        "existing release differs from the fresh sealed rebuild" in self_reblessed.stderr,
        "self-reblessed release rejection error",
    )
    print("self_reblessed_existing_release_tamper_refused=true")

tampered = Path(tempfile.mkdtemp(prefix="void-paid-work-packet-tamper-", dir="/tmp"))
try:
    tampered_packet = tampered / "packet.json"
    value = json.loads(PACKET.read_text(encoding="utf-8"))
    value["ready_for_activation"] = True
    tampered_packet.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    rejected = run(
        [
            sys.executable,
            str(INSTALLER),
            "plan",
            "--repo-root",
            str(REPO),
            "--packet",
            str(tampered_packet),
        ],
        check=False,
    )
    require(rejected.returncode != 0, "tampered packet accepted")
    print("tampered_packet_refused_exact_green=true")
finally:
    shutil.rmtree(tampered, ignore_errors=True)

source = INSTALLER.read_text(encoding="utf-8")
require("/usr/bin/node" not in source, "installer hardcodes /usr/bin/node")
require("command -v node" in source, "launcher does not resolve Node from PATH")
require('test "$NODE_MAJOR" = "22"' in source, "launcher does not require Node.js 22")
for prohibited in [
    "systemctl",
    "node:http",
    "node:https",
    "requests.",
    "urllib.request",
    "socket.",
]:
    require(prohibited not in source, f"prohibited installer authority: {prohibited}")

docs = " ".join(
    DOCS.read_text(encoding="utf-8").split()
)
for fragment in [
    "ready_for_activation=false",
    "No service unit is created",
    "production persistence root",
    "exact apply confirmation",
    "Node.js 22",
    "fresh rebuild from the sealed source",
    "symlinked production root",
]:
    require(fragment in docs, f"docs fragment missing: {fragment}")

workflow = WORKFLOW.read_text(encoding="utf-8")
require(
    "python3 scripts/prove_authenticated_paid_work_runtime_disabled_production_install_mechanism_v1.py"
    in workflow,
    "workflow proof command",
)
require(
    f'VOID_PACKET_CHECKPOINT_TAG: "{EXPECTED_PACKET_CHECKPOINT_TAG}"'
    in workflow,
    "workflow exact checkpoint tag",
)
require(
    f'VOID_PACKET_COMMIT: "{EXPECTED_PACKET_COMMIT}"'
    in workflow,
    "workflow exact packet commit",
)
require(
    '"refs/tags/${VOID_PACKET_CHECKPOINT_TAG}:'
    'refs/tags/${VOID_PACKET_CHECKPOINT_TAG}"'
    in workflow,
    "workflow exact tag refspec",
)
require(
    'git rev-list -n 1 "$VOID_PACKET_CHECKPOINT_TAG"'
    in workflow,
    "workflow tag target verification",
)
print("workflow_exact_checkpoint_tag_fetch_boundary=true")
print("source_docs_workflow_boundary_exact_green=true")

print("production_install_performed=false")
print("production_runtime_root_created=false")
print("configuration_enable_written=false")
print("service_unit_created=false")
print("service_restarted=false")
print("http_route_registered=false")
print("network_listener_created=false")
print("activation_performed=false")
print("quote_acceptance=false")
print("payment_authority=false")
print("payment_execution=false")
print("transaction_broadcast=false")
print("wallet_access=false")
print("work_credit_write=false")
print("void_settlement=false")
print("fund_movement=false")
print(
    "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_"
    "DISABLED_PRODUCTION_INSTALL_MECHANISM_V1_PROOF_GREEN=true"
)
