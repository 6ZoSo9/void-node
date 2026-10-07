#!/usr/bin/env python3
from __future__ import annotations

import base64
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
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
PUBLIC_AUTH_VERIFIER = (
    REPO
    / "tools"
    / "void-agent-paid-work-credential-request-public-auth-v1.mjs"
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

    packet_checksum_files = [
        "README.md",
        "applicant_auth_v1.py",
        "credential-request-draft-v1.example.json",
        "credential_request_client_v1.py",
        "manifest-v1.json",
        "verify_packet_v1.py",
    ]

    def rewrite_packet_checksums(root: Path) -> None:
        lines: list[str] = []

        for relative in packet_checksum_files:
            digest = hashlib.sha256(
                (root / relative).read_bytes()
            ).hexdigest()
            lines.append(
                f"{digest}  {relative}"
            )

        (root / "SHA256SUMS.txt").write_text(
            "\n".join(lines) + "\n",
            encoding="ascii",
        )

    manifest_adversaries = [
        (
            "auth-marker",
            "applicant_auth_marker",
            "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V0",
        ),
        (
            "auth-ttl",
            "applicant_auth_ttl_seconds",
            31,
        ),
        (
            "auth-max-ttl",
            "applicant_auth_ttl_seconds_maximum",
            61,
        ),
        (
            "private-key-required",
            "applicant_identity_private_key_required_by_client",
            False,
        ),
        (
            "forwarded-auth",
            "applicant_auth_forwarded_to_review_gateway",
            True,
        ),
    ]

    for label, field, replacement in manifest_adversaries:
        adversary = (
            temporary
            / f"manifest-adversary-{label}"
        )
        shutil.copytree(
            PACKET,
            adversary,
        )
        manifest_path = (
            adversary
            / "manifest-v1.json"
        )
        manifest_value = json.loads(
            manifest_path.read_text(
                encoding="utf-8"
            )
        )
        manifest_value[field] = replacement
        manifest_path.write_text(
            json.dumps(
                manifest_value,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        rewrite_packet_checksums(
            adversary
        )
        rejected = subprocess.run(
            [
                sys.executable,
                str(
                    adversary
                    / "verify_packet_v1.py"
                ),
            ],
            cwd=str(adversary),
            check=False,
            capture_output=True,
            text=True,
        )
        diagnostic = (
            rejected.stdout
            + rejected.stderr
        )
        if (
            rejected.returncode == 0
            or (
                "HOLD: packet manifest identity mismatch"
                not in diagnostic
            )
        ):
            raise RuntimeError(
                "applicant-auth manifest adversary was not rejected: "
                + label
            )

    module = load_client()
    identity_key = (
        temporary
        / "credential-request-ed25519.pem"
    )
    identity = module.generate_identity_key(
        identity_key
    )
    if (
        not identity["agent_id"].startswith(
            "void-agent:ed25519:"
        )
        or identity_key.stat().st_mode
        & 0o077
    ):
        raise RuntimeError(
            "public applicant identity generation mismatch"
        )

    auth_module = sys.modules.get(
        "applicant_auth_v1"
    )

    if auth_module is None:
        raise RuntimeError(
            "applicant auth module not loaded"
        )

    def exercise_identity_key_rebind(
        label: str,
        operation: Any,
    ) -> None:
        displaced = (
            temporary
            / f"{label}-original.pem"
        )
        original_run_openssl = (
            auth_module.run_openssl
        )
        observed: dict[str, Any] = {
            "mutated": False,
        }

        def raced_run_openssl(
            arguments: list[str],
            **kwargs: Any,
        ) -> bytes:
            descriptor_paths = [
                argument
                for argument in arguments
                if (
                    isinstance(
                        argument,
                        str,
                    )
                    and argument.startswith(
                        "/proc/self/fd/"
                    )
                )
            ]

            if not observed["mutated"]:
                if len(descriptor_paths) != 1:
                    raise RuntimeError(
                        "OpenSSL key descriptor path missing"
                    )

                pass_fds = kwargs.get(
                    "pass_fds"
                )

                if (
                    not isinstance(
                        pass_fds,
                        tuple,
                    )
                    or len(pass_fds) != 1
                    or descriptor_paths[0]
                    != (
                        "/proc/self/fd/"
                        + str(
                            pass_fds[0]
                        )
                    )
                ):
                    raise RuntimeError(
                        "OpenSSL key descriptor inheritance mismatch"
                    )

                identity_key.rename(
                    displaced
                )
                os.mkfifo(
                    identity_key,
                    0o600,
                )
                observed[
                    "mutated"
                ] = True

            return original_run_openssl(
                arguments,
                **kwargs,
            )

        auth_module.run_openssl = (
            raced_run_openssl
        )
        started = time.monotonic()

        try:
            try:
                operation()
            except ValueError as error:
                if (
                    "identity key changed after open"
                    not in str(error)
                ):
                    raise
            else:
                raise RuntimeError(
                    "post-validation key replacement was accepted"
                )
        finally:
            auth_module.run_openssl = (
                original_run_openssl
            )

            try:
                if identity_key.exists():
                    identity_key.unlink()
            finally:
                if displaced.exists():
                    displaced.rename(
                        identity_key
                    )

        if (
            not observed["mutated"]
            or time.monotonic()
            - started
            > 5.0
        ):
            raise RuntimeError(
                "post-validation key replacement did not fail boundedly"
            )

    exercise_identity_key_rebind(
        "public-key-rebind",
        lambda: auth_module.public_jwk_from_key(
            identity_key
        ),
    )
    exercise_identity_key_rebind(
        "signing-key-rebind",
        lambda: auth_module.sign_ed25519(
            identity_key,
            b"void-descriptor-bound-key-proof",
        ),
    )

    request = module.materialize_request(
        agent_id=identity[
            "agent_id"
        ],
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
                identity_key=identity_key,
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
        or not headers.get(
            "x-void-applicant-auth-v1"
        )
        or "Authorization"
        in headers
    ):
        raise RuntimeError(
            "submission framing proof mismatch"
        )

    encoded_auth = headers[
        "x-void-applicant-auth-v1"
    ]
    padded = encoded_auth + (
        "="
        * (
            -len(encoded_auth)
            % 4
        )
    )
    auth = json.loads(
        base64.urlsafe_b64decode(
            padded.encode("ascii")
        ).decode("utf-8")
    )
    if (
        auth.get("marker")
        != (
            "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1"
        )
        or auth.get("agent_id")
        != request["agent_id"]
        or auth.get("request_id")
        != request["request_id"]
        or auth.get("body_sha256")
        != hashlib.sha256(
            body
        ).hexdigest()
        or auth.get("method")
        != "POST"
        or auth.get("path")
        != (
            "/__void/agents/paid-work/"
            "credential-requests/v1"
        )
        or auth.get("network_chain_id")
        != 2050
        or not isinstance(
            auth.get("signature"),
            str,
        )
    ):
        raise RuntimeError(
            "applicant auth envelope binding mismatch"
        )

    auth_input = temporary / "public-auth-input.json"
    auth_input.write_text(
        json.dumps(
            {
                "encoded_header": encoded_auth,
                "method": "POST",
                "path": (
                    "/__void/agents/paid-work/"
                    "credential-requests/v1"
                ),
                "body_sha256": hashlib.sha256(
                    body
                ).hexdigest(),
                "request_id": request[
                    "request_id"
                ],
                "inner_agent_id": request[
                    "agent_id"
                ],
                "now_ms": int(
                    datetime.fromisoformat(
                        auth["issued_at"].replace(
                            "Z",
                            "+00:00",
                        )
                    ).timestamp()
                    * 1000
                )
                + 1000,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    auth_verify = temporary / "verify-public-auth.mjs"
    auth_verify.write_text(
        "import fs from 'node:fs';\n"
        + "import { verifyAgentPaidWorkCredentialRequestPublicAuthV1 } "
        + "from "
        + json.dumps(
            PUBLIC_AUTH_VERIFIER.as_uri()
        )
        + ";\n"
        + "const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));\n"
        + "const result=verifyAgentPaidWorkCredentialRequestPublicAuthV1(input);\n"
        + "process.stdout.write(JSON.stringify(result)+'\\n');\n",
        encoding="utf-8",
    )
    verified_auth = subprocess.run(
        [
            "node",
            str(auth_verify),
            str(auth_input),
        ],
        cwd=str(REPO),
        check=True,
        capture_output=True,
        text=True,
    )
    verified_auth_value = json.loads(
        verified_auth.stdout
    )
    if (
        verified_auth_value.get(
            "applicant_id"
        )
        != request["agent_id"]
        or verified_auth_value.get(
            "request_id"
        )
        != request["request_id"]
    ):
        raise RuntimeError(
            "Python/Node applicant auth parity mismatch"
        )

    try:
        module.materialize_request(
            agent_id=identity[
                "agent_id"
            ],
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
        "python_stdlib_plus_openssl_client=1"
    )
    print(
        "stable_ed25519_applicant_identity=1"
    )
    print(
        "python_node_applicant_auth_parity=1"
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
        "applicant_auth_header_required=1"
    )
    print(
        "applicant_identity_private_key_is_wallet_key=0"
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
