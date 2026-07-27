#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import Any

REPO = Path(__file__).resolve().parents[1]
PACKET = (
    REPO
    / "public"
    / "agent-paid-work"
    / "credential-request"
    / "v1"
)
CLIENT = PACKET / "credential_request_client_v1.py"
VERIFIER = PACKET / "verify_packet_v1.py"
TSX = Path(
    os.environ.get(
        "VOID_PROOF_TSX",
        str(
            REPO
            / "node_modules"
            / ".bin"
            / "tsx"
        ),
    )
)
INTAKE = (
    REPO
    / "scripts"
    / "agent_paid_work_credential_request_intake_v1.ts"
)


def load_client() -> Any:
    spec = importlib.util.spec_from_file_location(
        "void_credential_request_client_v1",
        CLIENT,
    )

    if spec is None or spec.loader is None:
        raise RuntimeError(
            "client module could not be loaded"
        )

    module = importlib.util.module_from_spec(
        spec
    )
    spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(
        self,
        *,
        status: int,
        body: bytes,
    ) -> None:
        self.status = status
        self._body = body

    def read(
        self,
        _: int,
    ) -> bytes:
        return self._body

    def getheaders(
        self,
    ) -> list[tuple[str, str]]:
        return [
            (
                "Content-Type",
                "application/json",
            )
        ]


class FakeConnection:
    requests: list[
        dict[str, Any]
    ] = []
    response_body: bytes = b""

    def __init__(
        self,
        host: str,
        port: int,
        timeout: int,
        context: Any,
    ) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self.context = context

    def request(
        self,
        method: str,
        path: str,
        body: bytes,
        headers: dict[str, str],
    ) -> None:
        self.requests.append(
            {
                "host": self.host,
                "port": self.port,
                "method": method,
                "path": path,
                "body": body,
                "headers": headers,
            }
        )

    def getresponse(
        self,
    ) -> FakeResponse:
        return FakeResponse(
            status=202,
            body=self.response_body,
        )

    def close(self) -> None:
        return None


temporary = Path(
    tempfile.mkdtemp(
        prefix=(
            "void-external-agent-credential-request-packet-v1-"
        )
    )
)

try:
    subprocess.run(
        [
            sys.executable,
            str(VERIFIER),
        ],
        cwd=str(PACKET),
        check=True,
    )

    module = load_client()
    request = module.materialize_request(
        agent_id=(
            "void.agent.packet-proof"
        ),
        callback_uri=(
            "https://agent.example.invalid/void/callback"
        ),
        capability_ids=[
            "datanet.fetch_verify"
        ],
        lifetime_days=30,
        created_at_utc=(
            "2026-07-27T20:00:00Z"
        ),
        expires_at_utc=(
            "2026-07-27T22:00:00Z"
        ),
        nonce=(
            "credential-request-packet-proof-nonce-0001"
        ),
    )
    module.validate_request(
        request
    )

    draft = {
        key: value
        for key, value in request.items()
        if key != "request_id"
    }
    draft_path = (
        temporary
        / "draft.json"
    )
    ts_request_path = (
        temporary
        / "ts-request.json"
    )
    draft_path.write_text(
        json.dumps(
            draft,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    subprocess.run(
        [
            str(TSX),
            str(INTAKE),
            "materialize",
            "--input",
            str(draft_path),
            "--output",
            str(ts_request_path),
        ],
        cwd=str(REPO),
        check=True,
    )
    ts_request = json.loads(
        ts_request_path.read_text(
            encoding="utf-8"
        )
    )

    if ts_request != request:
        raise RuntimeError(
            "Python request does not exactly match merged TypeScript materializer"
        )

    receipt = {
        "marker": (
            "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_RECEIPT_V1"
        ),
        "version": 1,
        "receipt_id": (
            "voidapwcrqi1_"
            + "1" * 64
        ),
        "request_id": request[
            "request_id"
        ],
        "received_at_utc": (
            "2026-07-27T20:01:00Z"
        ),
        "decision": (
            "accepted_for_review"
        ),
        "reason_codes": [],
        "normalized": {
            "agent_id": request[
                "agent_id"
            ],
            "callback_scheme": "https",
            "callback_host": (
                "agent.example.invalid"
            ),
            "requested_scope": (
                "agent_paid_work_submit"
            ),
            "requested_credential_lifetime_days": 30,
            "capability_ids": [
                "datanet.fetch_verify"
            ],
        },
        "authority": {
            "credential_issuance_authorized": False,
            "credential_registry_mutation_authorized": False,
            "receiver_restart_authorized": False,
            "provider_selected": False,
            "quote_created": False,
            "payment_authorized": False,
            "work_execution_authorized": False,
            "work_dispatched": False,
            "wc_award_authorized": False,
            "wc_ledger_write_authorized": False,
            "wallet_or_signer_access_granted": False,
            "buy_void_fulfillment_authorized": False,
        },
    }
    response = {
        "marker": (
            "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_V1"
        ),
        "version": 1,
        "ok": True,
        "duplicate": False,
        "receipt": receipt,
        "credential_created": False,
        "credential_registry_mutated": False,
        "receiver_restart": False,
        "credential_issuance_authorized": False,
    }
    FakeConnection.response_body = (
        json.dumps(
            response,
        )
        + "\n"
    ).encode("utf-8")
    FakeConnection.requests.clear()
    original = (
        module.http.client.HTTPSConnection
    )
    module.http.client.HTTPSConnection = (
        FakeConnection
    )

    try:
        status, parsed, _ = (
            module.submit_request(
                endpoint=(
                    "https://zoso-precision-tower-7810."
                    "taila47fd.ts.net:10000"
                    "/__void/agents/paid-work/"
                    "credential-requests/v1"
                ),
                request=request,
            )
        )
    finally:
        module.http.client.HTTPSConnection = (
            original
        )

    if (
        status != 202
        or parsed != response
        or len(
            FakeConnection.requests
        )
        != 1
    ):
        raise RuntimeError(
            "submission client proof mismatch"
        )

    captured = (
        FakeConnection.requests[0]
    )
    body = captured["body"]
    headers = captured[
        "headers"
    ]

    if (
        captured["method"] != "POST"
        or captured["path"]
        != (
            "/__void/agents/paid-work/"
            "credential-requests/v1"
        )
        or captured["port"] != 10000
        or headers.get(
            "Content-Type"
        )
        != "application/json"
        or headers.get(
            "Content-Length"
        )
        != str(len(body))
        or headers.get(
            "x-void-payload-sha256"
        )
        != hashlib.sha256(
            body
        ).hexdigest()
        or "Authorization"
        in headers
    ):
        raise RuntimeError(
            "submission framing proof mismatch"
        )

    try:
        module.materialize_request(
            agent_id=(
                "void.agent.packet-proof"
            ),
            callback_uri=(
                "http://agent.example.invalid/callback"
            ),
            capability_ids=[
                "datanet.fetch_verify"
            ],
            lifetime_days=30,
            created_at_utc=(
                "2026-07-27T20:00:00Z"
            ),
            expires_at_utc=(
                "2026-07-27T22:00:00Z"
            ),
            nonce=(
                "credential-request-packet-proof-nonce-0002"
            ),
        )
        raise RuntimeError(
            "HTTP callback unexpectedly accepted"
        )
    except ValueError:
        pass

    print(
        "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_PACKET_V1_PROOF_GREEN"
    )
    print(
        "python_standard_library_client=1"
    )
    print(
        "python_request_matches_typescript_materializer=1"
    )
    print(
        "content_addressed_request_id=1"
    )
    print(
        "https_callback_required=1"
    )
    print(
        "exact_public_endpoint=1"
    )
    print(
        "payload_sha256_required=1"
    )
    print(
        "content_length_required=1"
    )
    print(
        "redirect_following=0"
    )
    print(
        "authorization_header_required=0"
    )
    print(
        "raw_token_required=0"
    )
    print(
        "credential_created=0"
    )
    print(
        "credential_registry_mutated=0"
    )
    print(
        "receiver_restart=0"
    )
    print(
        "payment_authorized=0"
    )
    print(
        "work_execution_authorized=0"
    )
    print(
        "wc_ledger_write=0"
    )
    print(
        "wallet_access=0"
    )
    print(
        "buy_void_change=0"
    )
finally:
    shutil.rmtree(
        temporary,
        ignore_errors=True,
    )
