#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import secrets
import ssl
import sys
from typing import Any
from urllib.parse import urlsplit, urlunsplit

MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1"
RESPONSE_MARKER = (
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_V1"
)
SCOPE = "agent_paid_work_submit"
REQUEST_ID_PREFIX = "voidapwcrq1_"

AGENT_ID_PATTERN = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$"
)
CAPABILITY_PATTERN = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$"
)
REQUEST_ID_PATTERN = re.compile(
    r"^voidapwcrq1_[0-9a-f]{64}$"
)
UTC_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$"
)
NONCE_PATTERN = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$"
)

AUTHORITY_KEYS = {
    "credential_issuance_authorized",
    "credential_registry_mutation_authorized",
    "receiver_restart_authorized",
    "provider_selected",
    "quote_created",
    "payment_authorized",
    "work_execution_authorized",
    "work_dispatched",
    "wc_award_authorized",
    "wc_ledger_write_authorized",
    "wallet_or_signer_access_granted",
    "buy_void_fulfillment_authority_granted",
}


def fail(message: str) -> "NoReturn":
    raise ValueError(message)


def utc_seconds(value: datetime) -> str:
    return (
        value.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def parse_utc_seconds(value: str, label: str) -> datetime:
    if not UTC_PATTERN.fullmatch(value):
        fail(f"{label} must use YYYY-MM-DDTHH:mm:ssZ")

    parsed = datetime.strptime(
        value,
        "%Y-%m-%dT%H:%M:%SZ",
    ).replace(tzinfo=timezone.utc)

    if utc_seconds(parsed) != value:
        fail(f"{label} must be real UTC seconds")

    return parsed


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def normalize_callback_uri(value: str) -> str:
    if not value.startswith("https://"):
        fail("callback URI must begin with lowercase https://")

    parsed = urlsplit(value)

    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        fail(
            "callback URI must be HTTPS with a host and no credentials or fragment"
        )

    if parsed.query:
        fail(
            "public packet V1 requires a callback URI without a query string"
        )

    hostname = parsed.hostname

    try:
        hostname.encode("ascii")
    except UnicodeEncodeError as error:
        raise ValueError(
            "public packet V1 requires an ASCII callback hostname"
        ) from error

    if hostname != hostname.lower():
        fail("callback hostname must already be lowercase")

    if parsed.port == 443:
        fail("omit the default HTTPS port 443")

    netloc = hostname

    if parsed.port is not None:
        netloc = f"{hostname}:{parsed.port}"

    pathname = parsed.path or "/"

    if not pathname.startswith("/"):
        fail("callback path must begin with /")

    normalized = urlunsplit(
        (
            "https",
            netloc,
            pathname,
            "",
            "",
        )
    )

    if normalized != value:
        fail(
            "callback URI must already be canonical; expected "
            + normalized
        )

    return normalized


def validate_capabilities(values: list[str]) -> list[str]:
    if not (1 <= len(values) <= 16):
        fail("provide between 1 and 16 capabilities")

    for value in values:
        if not CAPABILITY_PATTERN.fullmatch(value):
            fail(f"invalid capability ID: {value}")

    normalized = sorted(set(values))

    if normalized != values:
        fail(
            "capabilities must be sorted and unique"
        )

    return normalized


def materialize_request(
    *,
    agent_id: str,
    callback_uri: str,
    capability_ids: list[str],
    lifetime_days: int,
    created_at_utc: str,
    expires_at_utc: str,
    nonce: str,
) -> dict[str, Any]:
    if not AGENT_ID_PATTERN.fullmatch(agent_id):
        fail("agent ID format invalid")

    callback = normalize_callback_uri(
        callback_uri
    )
    capabilities = validate_capabilities(
        capability_ids
    )

    if not (1 <= lifetime_days <= 90):
        fail(
            "credential lifetime must be from 1 to 90 days"
        )

    created = parse_utc_seconds(
        created_at_utc,
        "created_at_utc",
    )
    expires = parse_utc_seconds(
        expires_at_utc,
        "expires_at_utc",
    )
    ttl = expires - created

    if ttl <= timedelta(0):
        fail("request expiry must follow creation")

    if ttl > timedelta(hours=24):
        fail("request TTL must not exceed 24 hours")

    if not NONCE_PATTERN.fullmatch(nonce):
        fail("nonce format invalid")

    draft: dict[str, Any] = {
        "marker": MARKER,
        "version": 1,
        "created_at_utc": created_at_utc,
        "expires_at_utc": expires_at_utc,
        "agent_id": agent_id,
        "callback_uri": callback,
        "requested_scope": SCOPE,
        "requested_credential_lifetime_days": (
            lifetime_days
        ),
        "capability_ids": capabilities,
        "nonce": nonce,
    }
    request_id = (
        REQUEST_ID_PREFIX
        + hashlib.sha256(
            canonical_json(draft).encode(
                "utf-8"
            )
        ).hexdigest()
    )

    return {
        **draft,
        "request_id": request_id,
    }


def validate_request(
    value: Any,
) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail("credential request must be an object")

    expected_keys = {
        "marker",
        "version",
        "request_id",
        "created_at_utc",
        "expires_at_utc",
        "agent_id",
        "callback_uri",
        "requested_scope",
        "requested_credential_lifetime_days",
        "capability_ids",
        "nonce",
    }

    if set(value) != expected_keys:
        fail("credential request keys mismatch")

    request_id = value.get("request_id")

    if (
        not isinstance(request_id, str)
        or not REQUEST_ID_PATTERN.fullmatch(
            request_id
        )
    ):
        fail("request_id format invalid")

    materialized = materialize_request(
        agent_id=str(value.get("agent_id")),
        callback_uri=str(
            value.get("callback_uri")
        ),
        capability_ids=list(
            value.get("capability_ids")
            if isinstance(
                value.get("capability_ids"),
                list,
            )
            else []
        ),
        lifetime_days=int(
            value.get(
                "requested_credential_lifetime_days"
            )
        ),
        created_at_utc=str(
            value.get("created_at_utc")
        ),
        expires_at_utc=str(
            value.get("expires_at_utc")
        ),
        nonce=str(value.get("nonce")),
    )

    if materialized != value:
        fail(
            "request_id or normalized request fields do not match"
        )

    return materialized


def read_json(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8")
    )


def write_private_json(
    path: Path,
    value: Any,
) -> None:
    if path.exists():
        fail(f"output already exists: {path}")

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    descriptor = os.open(
        path,
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL,
        0o600,
    )
    data = (
        json.dumps(
            value,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")

    try:
        offset = 0

        while offset < len(data):
            written = os.write(
                descriptor,
                data[offset:],
            )

            if written <= 0:
                fail("output write made no progress")

            offset += written

        os.fsync(descriptor)
    finally:
        os.close(descriptor)

    path.chmod(0o600)


def true_authority_paths(
    value: Any,
    prefix: str = "",
) -> list[str]:
    output: list[str] = []

    if isinstance(value, dict):
        for key, child in value.items():
            child_path = (
                f"{prefix}.{key}"
                if prefix
                else key
            )

            if (
                key in AUTHORITY_KEYS
                and child is True
            ):
                output.append(child_path)

            output.extend(
                true_authority_paths(
                    child,
                    child_path,
                )
            )

    elif isinstance(value, list):
        for index, child in enumerate(value):
            output.extend(
                true_authority_paths(
                    child,
                    f"{prefix}[{index}]",
                )
            )

    return output


def validate_gateway_response(
    *,
    status: int,
    response: Any,
    request_id: str,
) -> dict[str, Any]:
    if status not in {200, 202}:
        fail(
            f"credential request gateway returned HTTP {status}"
        )

    if not isinstance(response, dict):
        fail("gateway response must be an object")

    duplicate = response.get("duplicate")

    if (
        response.get("marker") != RESPONSE_MARKER
        or response.get("version") != 1
        or response.get("ok") is not True
        or not isinstance(duplicate, bool)
        or response.get("credential_created")
        is not False
        or response.get(
            "credential_registry_mutated"
        )
        is not False
        or response.get("receiver_restart")
        is not False
    ):
        fail("gateway response identity mismatch")

    if (
        status == 202
        and duplicate is not False
    ):
        fail("HTTP 202 must describe a new request")

    if (
        status == 200
        and duplicate is not True
    ):
        fail(
            "HTTP 200 must describe an idempotent duplicate"
        )

    receipt = response.get("receipt")

    if (
        not isinstance(receipt, dict)
        or receipt.get("request_id")
        != request_id
        or receipt.get("decision")
        != "accepted_for_review"
        or receipt.get("reason_codes") != []
        or not isinstance(
            receipt.get("receipt_id"),
            str,
        )
        or not str(
            receipt.get("receipt_id")
        ).startswith("voidapwcrqi1_")
    ):
        fail("review receipt binding mismatch")

    if true_authority_paths(response):
        fail("gateway response grants forbidden authority")

    return response


def submit_request(
    *,
    endpoint: str,
    request: dict[str, Any],
) -> tuple[
    int,
    dict[str, Any],
    bytes,
]:
    parsed = urlsplit(endpoint)

    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
        or parsed.query
    ):
        fail("submission endpoint must be exact HTTPS")

    body = (
        json.dumps(
            request,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")
    connection = http.client.HTTPSConnection(
        parsed.hostname,
        parsed.port or 443,
        timeout=20,
        context=ssl.create_default_context(),
    )

    try:
        connection.request(
            "POST",
            parsed.path,
            body=body,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Content-Length": str(
                    len(body)
                ),
                "x-void-payload-sha256": (
                    hashlib.sha256(
                        body
                    ).hexdigest()
                ),
                "User-Agent": (
                    "void-external-agent-credential-request-packet-v1"
                ),
            },
        )
        response = connection.getresponse()
        response_body = response.read(
            1024 * 1024
        )
        response_headers = {
            key.lower(): value
            for key, value in response.getheaders()
        }
        status = int(response.status)
    finally:
        connection.close()

    if response_headers.get("location"):
        fail("gateway returned a redirect")

    try:
        parsed_response = json.loads(
            response_body.decode("utf-8")
        )
    except Exception as error:
        raise ValueError(
            "gateway response is not JSON"
        ) from error

    validated = validate_gateway_response(
        status=status,
        response=parsed_response,
        request_id=request["request_id"],
    )

    return (
        status,
        validated,
        response_body,
    )


def packet_root() -> Path:
    return Path(__file__).resolve().parent


def load_manifest() -> dict[str, Any]:
    value = read_json(
        packet_root()
        / "manifest-v1.json"
    )

    if (
        not isinstance(value, dict)
        or value.get("marker")
        != (
            "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_PACKET_V1"
        )
        or value.get("version") != 1
    ):
        fail("packet manifest identity mismatch")

    return value


def command_generate(
    args: argparse.Namespace,
) -> int:
    created = (
        parse_utc_seconds(
            args.created_at_utc,
            "created_at_utc",
        )
        if args.created_at_utc
        else datetime.now(
            timezone.utc
        ).replace(microsecond=0)
    )
    expires = (
        parse_utc_seconds(
            args.expires_at_utc,
            "expires_at_utc",
        )
        if args.expires_at_utc
        else created
        + timedelta(
            seconds=args.ttl_seconds
        )
    )
    nonce = (
        args.nonce
        or (
            "credential-request-"
            + secrets.token_hex(18)
        )
    )
    capabilities = sorted(
        set(args.capability)
    )
    request = materialize_request(
        agent_id=args.agent_id,
        callback_uri=args.callback_uri,
        capability_ids=capabilities,
        lifetime_days=args.lifetime_days,
        created_at_utc=utc_seconds(
            created
        ),
        expires_at_utc=utc_seconds(
            expires
        ),
        nonce=nonce,
    )
    output = Path(
        args.output
    ).expanduser().resolve()
    write_private_json(
        output,
        request,
    )

    print(
        json.dumps(
            {
                "generated": True,
                "request_id": request[
                    "request_id"
                ],
                "agent_id": request[
                    "agent_id"
                ],
                "requested_scope": SCOPE,
                "expires_at_utc": request[
                    "expires_at_utc"
                ],
                "output": str(output),
                "credential_created": False,
                "raw_token_read": False,
            },
            indent=2,
        )
    )
    print(
        "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_V1_GENERATED"
    )
    return 0


def command_verify(
    args: argparse.Namespace,
) -> int:
    request_path = Path(
        args.request
    ).expanduser().resolve()
    request = validate_request(
        read_json(request_path)
    )

    print(
        json.dumps(
            {
                "verified": True,
                "request_id": request[
                    "request_id"
                ],
                "agent_id": request[
                    "agent_id"
                ],
                "callback_uri": request[
                    "callback_uri"
                ],
                "credential_created": False,
                "raw_token_read": False,
            },
            indent=2,
        )
    )
    print(
        "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_V1_VERIFIED"
    )
    return 0


def command_submit(
    args: argparse.Namespace,
) -> int:
    manifest = load_manifest()
    endpoint = str(
        manifest.get(
            "submission_endpoint"
        )
    )
    request_path = Path(
        args.request
    ).expanduser().resolve()
    output_path = Path(
        args.output
    ).expanduser().resolve()
    request = validate_request(
        read_json(request_path)
    )
    status, response, response_body = (
        submit_request(
            endpoint=endpoint,
            request=request,
        )
    )
    output = {
        "marker": (
            "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_SUBMISSION_RESULT_V1"
        ),
        "version": 1,
        "submitted_at_utc": utc_seconds(
            datetime.now(
                timezone.utc
            )
        ),
        "endpoint": endpoint,
        "http_status": status,
        "request_id": request[
            "request_id"
        ],
        "response": response,
        "response_body_sha256": (
            hashlib.sha256(
                response_body
            ).hexdigest()
        ),
        "credential_created": False,
        "raw_token_read": False,
    }
    write_private_json(
        output_path,
        output,
    )

    print(
        json.dumps(
            {
                "submitted": True,
                "http_status": status,
                "duplicate": response[
                    "duplicate"
                ],
                "request_id": request[
                    "request_id"
                ],
                "receipt_id": response[
                    "receipt"
                ][
                    "receipt_id"
                ],
                "decision": (
                    "accepted_for_review"
                ),
                "output": str(
                    output_path
                ),
                "credential_created": False,
                "raw_token_read": False,
            },
            indent=2,
        )
    )
    print(
        "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_V1_SUBMITTED"
    )
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(
        description=(
            "Generate, verify, or submit a VOID "
            "external-agent credential review request."
        )
    )
    subcommands = root.add_subparsers(
        dest="command",
        required=True,
    )

    generate = subcommands.add_parser(
        "generate"
    )
    generate.add_argument(
        "--agent-id",
        required=True,
    )
    generate.add_argument(
        "--callback-uri",
        required=True,
    )
    generate.add_argument(
        "--capability",
        action="append",
        default=[
            "datanet.fetch_verify"
        ],
    )
    generate.add_argument(
        "--lifetime-days",
        type=int,
        default=30,
    )
    generate.add_argument(
        "--ttl-seconds",
        type=int,
        default=7200,
        choices=range(
            60,
            86401,
        ),
        metavar="60-86400",
    )
    generate.add_argument(
        "--created-at-utc",
    )
    generate.add_argument(
        "--expires-at-utc",
    )
    generate.add_argument(
        "--nonce",
    )
    generate.add_argument(
        "--output",
        required=True,
    )
    generate.set_defaults(
        handler=command_generate
    )

    verify = subcommands.add_parser(
        "verify"
    )
    verify.add_argument(
        "--request",
        required=True,
    )
    verify.set_defaults(
        handler=command_verify
    )

    submit = subcommands.add_parser(
        "submit"
    )
    submit.add_argument(
        "--request",
        required=True,
    )
    submit.add_argument(
        "--output",
        required=True,
    )
    submit.set_defaults(
        handler=command_submit
    )

    return root


def main() -> int:
    args = parser().parse_args()
    return int(args.handler(args))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(
            f"HOLD: credential request client failed: {error}",
            file=sys.stderr,
        )
        raise SystemExit(2)
