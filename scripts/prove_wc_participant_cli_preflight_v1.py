#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import threading
import time


MARKER = "WC_PARTICIPANT_CLI_PREFLIGHT_V1"
PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1"
RELEASE_MARKER = "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1"
ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "scripts/wc_participant_cli_preflight_v1.py"
EXECUTOR_NODE_ID = "11111111111111111111111111111111"
COORDINATOR_NODE_ID = "22222222222222222222222222222222"
ACCOUNT = "participant-proof-v1"
TOKEN = "proof-capability-secret-never-print"
TRUSTED_CLI_SHA256 = "382bdf28f7ad39e7cc86b3e3e0852fa00c6c8071e93719128d6a4ee47833cd63"
TRUSTED_LICENSE_SHA256 = "0d777083a94876e2c28e81b4b66cf99e9bc93887726d53e45ee71725fdc8ffe0"


def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class FixtureServer(ThreadingHTTPServer):
    def __init__(self, role: str):
        self.role = role
        self.requests: list[tuple[str, str]] = []
        super().__init__(("127.0.0.1", 0), FixtureHandler)


class FixtureHandler(BaseHTTPRequestHandler):
    server: FixtureServer

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_json(self, value: object, status: int = 200) -> None:
        payload = canonical(value)
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        self.server.requests.append(("GET", self.path))
        path = self.path.split("?", 1)[0]
        if self.server.role == "executor":
            if path == "/health":
                self.send_json({"ok": True, "nodeId": EXECUTOR_NODE_ID})
                return
            if path == "/wc/public-earning-pilot-v1/status":
                self.send_json(
                    {
                        "ok": True,
                        "marker": PILOT_MARKER,
                        "coordinator_enabled": False,
                        "executor_enabled": True,
                        "fixed_award_wc": 3,
                    }
                )
                return
        if self.server.role == "coordinator":
            if path == "/health":
                self.send_json({"ok": True, "nodeId": COORDINATOR_NODE_ID})
                return
            if path == "/wc/public-earning-pilot-v1/status":
                self.send_json(
                    {
                        "ok": True,
                        "marker": PILOT_MARKER,
                        "coordinator_enabled": True,
                        "executor_enabled": False,
                        "fixed_award_wc": 3,
                        "caps": {"account_total": 1},
                    }
                )
                return
            if path == "/wc/redeemable":
                self.send_json({"ok": True, "account": ACCOUNT, "redeemable": 7})
                return
        self.send_json({"ok": False}, status=404)

    def do_POST(self) -> None:
        self.server.requests.append(("POST", self.path))
        self.send_json({"ok": False}, status=405)


def run_tool(
    release_dir: Path,
    ticket_file: Path,
    executor_port: int,
    coordinator_port: int,
    *,
    coordinator_node_id: str = COORDINATOR_NODE_ID,
) -> subprocess.CompletedProcess[str]:
    environment = dict(os.environ)
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(
        [
            sys.executable,
            str(TOOL),
            "--release-dir",
            str(release_dir),
            "--ticket-file",
            str(ticket_file),
            "--trusted-coordinator-base",
            f"http://127.0.0.1:{coordinator_port}",
            "--trusted-coordinator-node-id",
            coordinator_node_id,
            "--participant-http-port",
            str(executor_port),
            "--timeout-seconds",
            "2",
        ],
        check=False,
        capture_output=True,
        text=True,
        timeout=15,
        env=environment,
    )


def parse_output(result: subprocess.CompletedProcess[str]) -> dict[str, object]:
    assert result.stderr == "", result.stderr
    lines = result.stdout.splitlines()
    assert len(lines) == 1, lines
    parsed = json.loads(lines[0])
    assert isinstance(parsed, dict)
    return parsed


def expect_hold(result: subprocess.CompletedProcess[str], code: str) -> None:
    assert result.returncode == 1, (result.returncode, result.stdout, result.stderr)
    parsed = parse_output(result)
    assert parsed["marker"] == MARKER
    assert parsed["status"] == "HOLD"
    assert parsed["code"] == code, parsed
    assert TOKEN not in result.stdout
    assert TOKEN not in result.stderr
    assert all(value is False for value in parsed["authority"].values())


def trusted_sources() -> tuple[bytes, bytes]:
    repository_cli = ROOT / "ops/mainnet0/wc-public-earning-participant-v1.sh"
    repository_license = ROOT / "LICENSE"
    if repository_cli.is_file() and repository_license.is_file():
        cli = repository_cli.read_bytes()
        license_bytes = repository_license.read_bytes()
    else:
        cli = (ROOT / "fixtures/wc-public-earning-participant-v1.sh").read_bytes()
        license_bytes = (ROOT / "fixtures/LICENSE").read_bytes()
    assert sha256(cli) == TRUSTED_CLI_SHA256
    assert sha256(license_bytes) == TRUSTED_LICENSE_SHA256
    return cli, license_bytes


def write_fixture(root: Path, coordinator_base: str) -> tuple[Path, Path]:
    release_dir = root / "release"
    release_dir.mkdir(mode=0o700)
    cli, license_bytes = trusted_sources()
    cli_path = release_dir / "wc-public-earning-participant-v1.sh"
    cli_path.write_bytes(cli)
    cli_path.chmod(0o755)
    (release_dir / "LICENSE").write_bytes(license_bytes)
    (release_dir / "README.txt").write_text("proof release\n", encoding="utf-8")
    source = {
        "marker": RELEASE_MARKER,
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "source_commit": "3" * 40,
        "network": {"chain_id": 2050, "identity": "mainnet0"},
        "source_files": [
            {
                "path": "ops/mainnet0/wc-public-earning-participant-v1.sh",
                "bytes": len(cli),
                "sha256": sha256(cli),
            },
            {"path": "LICENSE", "bytes": len(license_bytes), "sha256": sha256(license_bytes)},
        ],
        "runtime_requirements": {
            "local_void_executor_required": True,
            "fresh_ticket_required": True,
            "trusted_coordinator_identity_required": True,
            "fixed_award_wc": 3,
        },
        "authority": {
            "ticket_issuance": False,
            "coordinator_enablement": False,
            "executor_enablement": False,
            "work_execution": False,
            "wc_ledger_write": False,
            "void_settlement": False,
            "payment_execution": False,
            "wallet_or_signer_access": False,
            "runtime_mutation": False,
            "fund_movement": False,
        },
    }
    (release_dir / "SOURCE.json").write_bytes(canonical(source))

    ticket_id = "4" * 32
    expected_hash = "5" * 64
    token_hash = sha256(TOKEN.encode())
    ticket = {
        "capability_token": TOKEN,
        "coordinator_base": coordinator_base,
        "coordinator_node_id": COORDINATOR_NODE_ID,
        "ticket": {
            "marker": PILOT_MARKER,
            "version": 1,
            "task_class": "datanet_fetch_verify",
            "fixed_award_wc": 3,
            "status": "issued",
            "transport_mode": "outbound_bundle",
            "ticket_id": ticket_id,
            "account": ACCOUNT,
            "executor_node_id": EXECUTOR_NODE_ID,
            "dataset_id": "proof-dataset-v1",
            "expected_input_hash": expected_hash,
            "token_sha256": token_hash,
            "expires_at_ms": time.time_ns() // 1_000_000 + 600_000,
        },
    }
    ticket_file = root / "ticket.json"
    ticket_file.write_bytes(canonical(ticket))
    ticket_file.chmod(0o600)
    return release_dir, ticket_file


def main() -> int:
    executor = FixtureServer("executor")
    coordinator = FixtureServer("coordinator")
    threads = [
        threading.Thread(target=executor.serve_forever, daemon=True),
        threading.Thread(target=coordinator.serve_forever, daemon=True),
    ]
    for thread in threads:
        thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="wc-participant-preflight-proof-") as raw:
            root = Path(raw)
            coordinator_base = f"http://127.0.0.1:{coordinator.server_port}"
            release_dir, ticket_file = write_fixture(root, coordinator_base)
            ticket_before = ticket_file.read_bytes()
            ticket_mode_before = stat.S_IMODE(ticket_file.stat().st_mode)

            green = run_tool(
                release_dir,
                ticket_file,
                executor.server_port,
                coordinator.server_port,
            )
            assert green.returncode == 0, (green.returncode, green.stdout, green.stderr)
            result = parse_output(green)
            assert result["marker"] == MARKER
            assert result["status"] == "GREEN"
            assert result["account"] == ACCOUNT
            assert result["executor_node_id"] == EXECUTOR_NODE_ID
            assert result["coordinator_node_id"] == COORDINATOR_NODE_ID
            assert result["redeemable_before"] == 7
            assert result["fixed_award_wc"] == 3
            assert all(value is True for value in result["checks"].values())
            assert all(value is False for value in result["authority"].values())
            assert TOKEN not in green.stdout
            assert ticket_file.read_bytes() == ticket_before
            assert stat.S_IMODE(ticket_file.stat().st_mode) == ticket_mode_before == 0o600

            ticket_file.chmod(0o644)
            expect_hold(
                run_tool(release_dir, ticket_file, executor.server_port, coordinator.server_port),
                "ticket_mode_mismatch",
            )
            ticket_file.chmod(0o600)

            source_path = release_dir / "SOURCE.json"
            source_before = source_path.read_bytes()
            source = json.loads(source_before)
            source["source_files"][0]["sha256"] = "0" * 64
            source_path.write_bytes(canonical(source))
            expect_hold(
                run_tool(release_dir, ticket_file, executor.server_port, coordinator.server_port),
                "source_sha_mismatch",
            )
            source_path.write_bytes(source_before)

            cli_path = release_dir / "wc-public-earning-participant-v1.sh"
            cli_before = cli_path.read_bytes()
            altered_cli = cli_before + b"\n# altered but self-consistent fixture\n"
            cli_path.write_bytes(altered_cli)
            cli_path.chmod(0o755)
            source = json.loads(source_before)
            source["source_files"][0]["bytes"] = len(altered_cli)
            source["source_files"][0]["sha256"] = sha256(altered_cli)
            source_path.write_bytes(canonical(source))
            expect_hold(
                run_tool(release_dir, ticket_file, executor.server_port, coordinator.server_port),
                "untrusted_cli_sha",
            )
            cli_path.write_bytes(cli_before)
            cli_path.chmod(0o755)
            source_path.write_bytes(source_before)

            expect_hold(
                run_tool(
                    release_dir,
                    ticket_file,
                    executor.server_port,
                    coordinator.server_port,
                    coordinator_node_id="9" * 32,
                ),
                "ticket_coordinator_mismatch",
            )

            ticket_root = json.loads(ticket_before)
            ticket_root["ticket"]["expires_at_ms"] = 1
            ticket_file.write_bytes(canonical(ticket_root))
            ticket_file.chmod(0o600)
            expect_hold(
                run_tool(release_dir, ticket_file, executor.server_port, coordinator.server_port),
                "ticket_expired",
            )

            requests = executor.requests + coordinator.requests
            assert requests
            assert all(method == "GET" for method, _ in requests), requests
            assert all("execute-local" not in path for _, path in requests), requests
    finally:
        executor.shutdown()
        coordinator.shutdown()
        executor.server_close()
        coordinator.server_close()
        for thread in threads:
            thread.join(timeout=2)

    print("WC_PARTICIPANT_CLI_PREFLIGHT_V1_PROOF_GREEN")
    print("release_pack_integrity_verified=true")
    print("ticket_contract_read_only=true")
    print("ticket_mode_600_required=true")
    print("local_executor_identity_checked=true")
    print("trusted_coordinator_identity_checked=true")
    print("coordinator_balance_read_only=true")
    print("http_get_only=true")
    print("ticket_issuance=false")
    print("ticket_consumption=false")
    print("work_execution=false")
    print("wc_ledger_write=false")
    print("settlement_execution=false")
    print("wallet_or_signer_access=false")
    print("deployment=false")
    print("runtime_mutation=false")
    print("fund_movement=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
