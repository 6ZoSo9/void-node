#!/usr/bin/env python3
from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
from typing import Any

AUTH_MARKER = (
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1"
)
AUTH_HEADER = "x-void-applicant-auth-v1"
AUTH_PURPOSE = "agent_paid_work_credential_request"
AUTH_PATH = "/__void/agents/paid-work/credential-requests/v1"
AGENT_ID_PREFIX = "void-agent:ed25519:"
AGENT_ID_PATTERN = re.compile(
    r"^void-agent:ed25519:[A-Za-z0-9_-]{43}$"
)
REQUEST_ID_PATTERN = re.compile(
    r"^voidapwcrq1_[0-9a-f]{64}$"
)
ED25519_SPKI_PREFIX = bytes.fromhex(
    "302a300506032b6570032100"
)


def fail(message: str) -> "NoReturn":
    raise ValueError(message)


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(
        value
    ).rstrip(b"=").decode("ascii")


def openssl_binary() -> str:
    value = shutil.which("openssl")

    if not value:
        fail("OpenSSL is required for Ed25519 applicant authentication")

    return value


OPENSSL_TIMEOUT_SECONDS = 10
IDENTITY_KEY_MAX_BYTES = 4096
IDENTITY_KEY_DESCRIPTOR_ROOT = Path(
    "/proc/self/fd"
)


def run_openssl(
    arguments: list[str],
    *,
    input_bytes: bytes | None = None,
    pass_fds: tuple[int, ...] = (),
) -> bytes:
    try:
        completed = subprocess.run(
            [
                openssl_binary(),
                *arguments,
            ],
            input=input_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=OPENSSL_TIMEOUT_SECONDS,
            pass_fds=pass_fds,
        )
    except subprocess.TimeoutExpired:
        fail("OpenSSL Ed25519 operation timed out")

    if completed.returncode != 0:
        diagnostic = completed.stderr.decode(
            "utf-8",
            errors="replace",
        )

        for argument in arguments:
            if (
                isinstance(argument, str)
                and argument.startswith("/")
            ):
                diagnostic = diagnostic.replace(
                    argument,
                    "<private-path>",
                )

        diagnostic = " ".join(
            diagnostic.split()
        )[:512]

        fail(
            "OpenSSL Ed25519 operation failed"
            + (
                f": {diagnostic}"
                if diagnostic
                else ""
            )
        )

    return bytes(completed.stdout)


def resolve_identity_key(
    value: str | Path,
    *,
    must_exist: bool = True,
) -> Path:
    raw = Path(value).expanduser()

    if not raw.is_absolute():
        fail("identity key path must be absolute")

    if must_exist:
        try:
            metadata = raw.lstat()
        except FileNotFoundError:
            fail("identity key does not exist")

        if (
            raw.is_symlink()
            or not stat.S_ISREG(
                metadata.st_mode
            )
            or metadata.st_uid
            != os.geteuid()
            or stat.S_IMODE(
                metadata.st_mode
            )
            & 0o077
        ):
            fail(
                "identity key must be an owner-only regular file"
            )

        resolved = raw.resolve()

        if resolved != raw:
            fail(
                "identity key path must not traverse symlinks"
            )

        return resolved

    parent = raw.parent.resolve()

    if not parent.is_dir():
        parent.mkdir(
            parents=True,
            mode=0o700,
            exist_ok=True,
        )
        parent = raw.parent.resolve()

    target = parent / raw.name

    if target.exists() or target.is_symlink():
        fail("identity key output already exists")

    return target


def _identity_key_stat_identity(
    metadata: os.stat_result,
) -> tuple[int, ...]:
    return (
        metadata.st_dev,
        metadata.st_ino,
        metadata.st_size,
        metadata.st_mode,
        metadata.st_uid,
        metadata.st_gid,
        metadata.st_nlink,
        metadata.st_mtime_ns,
        metadata.st_ctime_ns,
    )


def open_validated_identity_key(
    value: str | Path,
) -> tuple[Path, int, os.stat_result]:
    raw = Path(value).expanduser()

    if not raw.is_absolute():
        fail("identity key path must be absolute")

    try:
        canonical_parent = raw.parent.resolve(
            strict=True
        )
        listed = raw.lstat()
    except FileNotFoundError:
        fail("identity key does not exist")

    if canonical_parent != raw.parent:
        fail("identity key parent must not traverse symlinks")

    if (
        raw.is_symlink()
        or not stat.S_ISREG(
            listed.st_mode
        )
        or listed.st_uid
        != os.geteuid()
        or listed.st_nlink != 1
        or listed.st_size < 1
        or listed.st_size
        > IDENTITY_KEY_MAX_BYTES
        or stat.S_IMODE(
            listed.st_mode
        )
        & 0o077
    ):
        fail(
            "identity key must be an owner-only regular file"
        )

    descriptor = os.open(
        raw,
        os.O_RDONLY
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_NONBLOCK", 0),
    )

    try:
        opened = os.fstat(
            descriptor
        )
        visible = raw.lstat()

        if (
            not stat.S_ISREG(
                opened.st_mode
            )
            or opened.st_uid
            != os.geteuid()
            or opened.st_nlink != 1
            or opened.st_size < 1
            or opened.st_size
            > IDENTITY_KEY_MAX_BYTES
            or stat.S_IMODE(
                opened.st_mode
            )
            & 0o077
            or _identity_key_stat_identity(
                listed
            )
            != _identity_key_stat_identity(
                opened
            )
            or _identity_key_stat_identity(
                opened
            )
            != _identity_key_stat_identity(
                visible
            )
        ):
            fail(
                "identity key changed before descriptor binding"
            )

        return (
            raw,
            descriptor,
            opened,
        )
    except Exception:
        os.close(
            descriptor
        )
        raise


def require_identity_key_descriptor_binding_support(
) -> None:
    if not IDENTITY_KEY_DESCRIPTOR_ROOT.is_dir():
        fail(
            "descriptor-bound identity key access unavailable"
        )


def identity_key_descriptor_path(
    descriptor: int,
) -> str:
    require_identity_key_descriptor_binding_support()

    return str(
        IDENTITY_KEY_DESCRIPTOR_ROOT
        / str(
            descriptor
        )
    )


def preflight_identity_key_descriptor_binding_support(
) -> None:
    require_identity_key_descriptor_binding_support()

    probe = (
        b"VOID_AGENT_PAID_WORK_IDENTITY_DESCRIPTOR_PROBE_V1\n"
    )

    try:
        with tempfile.TemporaryFile(
            mode="w+b"
        ) as handle:
            handle.write(
                probe
            )
            handle.flush()
            handle.seek(
                0
            )

            descriptor = handle.fileno()
            observed = run_openssl(
                [
                    "dgst",
                    "-sha256",
                    "-binary",
                    identity_key_descriptor_path(
                        descriptor
                    ),
                ],
                pass_fds=(
                    descriptor,
                ),
            )
    except Exception as error:
        raise ValueError(
            "descriptor-bound identity key access unavailable"
        ) from error

    if (
        observed
        != hashlib.sha256(
            probe
        ).digest()
    ):
        fail(
            "descriptor-bound identity key access unavailable"
        )


def revalidate_open_identity_key(
    path: Path,
    descriptor: int,
    opened: os.stat_result,
) -> None:
    after = os.fstat(
        descriptor
    )

    try:
        visible = path.lstat()
    except FileNotFoundError:
        fail(
            "identity key changed after open"
        )

    if (
        not stat.S_ISREG(
            after.st_mode
        )
        or _identity_key_stat_identity(
            after
        )
        != _identity_key_stat_identity(
            opened
        )
        or _identity_key_stat_identity(
            visible
        )
        != _identity_key_stat_identity(
            opened
        )
    ):
        fail(
            "identity key changed after open"
        )


def write_private_bytes(
    path: Path,
    value: bytes,
) -> None:
    descriptor = os.open(
        path,
        os.O_WRONLY
        | os.O_CREAT
        | os.O_EXCL,
        0o600,
    )

    try:
        offset = 0

        while offset < len(value):
            written = os.write(
                descriptor,
                value[offset:],
            )

            if written <= 0:
                fail(
                    "identity key write made no progress"
                )

            offset += written

        os.fsync(descriptor)
    finally:
        os.close(descriptor)

    path.chmod(0o600)

    parent_fd = os.open(
        path.parent,
        os.O_RDONLY
        | getattr(
            os,
            "O_DIRECTORY",
            0,
        ),
    )

    try:
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)


def generate_identity_key(
    value: str | Path,
) -> dict[str, Any]:
    preflight_identity_key_descriptor_binding_support()

    path = resolve_identity_key(
        value,
        must_exist=False,
    )
    private_pem = run_openssl(
        [
            "genpkey",
            "-algorithm",
            "ED25519",
        ]
    )

    if (
        not private_pem.startswith(
            b"-----BEGIN PRIVATE KEY-----\n"
        )
        or not private_pem.endswith(
            b"-----END PRIVATE KEY-----\n"
        )
        or len(private_pem) > 4096
    ):
        fail("OpenSSL returned an unexpected Ed25519 private key")

    write_private_bytes(
        path,
        private_pem,
    )

    return identity_from_key(
        path
    )


def public_jwk_from_key(
    value: str | Path,
) -> dict[str, str]:
    path, descriptor, opened = (
        open_validated_identity_key(
            value
        )
    )

    try:
        os.lseek(
            descriptor,
            0,
            os.SEEK_SET,
        )
        der = run_openssl(
            [
                "pkey",
                "-in",
                identity_key_descriptor_path(
                    descriptor
                ),
                "-pubout",
                "-outform",
                "DER",
            ],
            pass_fds=(
                descriptor,
            ),
        )
        revalidate_open_identity_key(
            path,
            descriptor,
            opened,
        )
    finally:
        os.close(
            descriptor
        )

    if (
        len(der) != 44
        or not der.startswith(
            ED25519_SPKI_PREFIX
        )
    ):
        fail("identity key is not an Ed25519 private key")

    raw_public = der[
        len(
            ED25519_SPKI_PREFIX
        ):
    ]

    if len(raw_public) != 32:
        fail("Ed25519 public key length invalid")

    return {
        "crv": "Ed25519",
        "kty": "OKP",
        "x": base64url(
            raw_public
        ),
    }


def derive_agent_id(
    public_jwk: dict[str, str],
) -> str:
    if (
        set(public_jwk)
        != {
            "crv",
            "kty",
            "x",
        }
        or public_jwk.get("crv")
        != "Ed25519"
        or public_jwk.get("kty")
        != "OKP"
        or not isinstance(
            public_jwk.get("x"),
            str,
        )
    ):
        fail("public Ed25519 JWK invalid")

    digest = hashlib.sha256(
        canonical_json(
            public_jwk
        ).encode("utf-8")
    ).digest()
    agent_id = (
        AGENT_ID_PREFIX
        + base64url(
            digest
        )
    )

    if not AGENT_ID_PATTERN.fullmatch(
        agent_id
    ):
        fail("derived agent ID invalid")

    return agent_id


def identity_from_key(
    value: str | Path,
) -> dict[str, Any]:
    path = resolve_identity_key(
        value
    )
    public_jwk = public_jwk_from_key(
        path
    )

    return {
        "identity_key": str(path),
        "agent_id": derive_agent_id(
            public_jwk
        ),
        "public_key_jwk": public_jwk,
    }


def utc_milliseconds(
    value: datetime,
) -> str:
    return (
        value.astimezone(
            timezone.utc
        )
        .isoformat(
            timespec="milliseconds"
        )
        .replace(
            "+00:00",
            "Z",
        )
    )


def sign_ed25519(
    value: str | Path,
    message: bytes,
) -> bytes:
    if (
        not isinstance(message, bytes)
        or len(message) < 1
        or len(message) > 64 * 1024
    ):
        fail("Ed25519 signing message size invalid")

    path, key_descriptor, key_opened = (
        open_validated_identity_key(
            value
        )
    )
    temporary = Path(
        tempfile.mkdtemp(
            prefix=(
                "void-credential-request-ed25519-sign-"
            )
        )
    )
    temporary.chmod(0o700)
    message_path = (
        temporary
        / "message.bin"
    )

    try:
        descriptor = os.open(
            message_path,
            os.O_WRONLY
            | os.O_CREAT
            | os.O_EXCL
            | getattr(
                os,
                "O_NOFOLLOW",
                0,
            ),
            0o600,
        )

        try:
            offset = 0

            while offset < len(message):
                written = os.write(
                    descriptor,
                    message[offset:],
                )

                if written <= 0:
                    fail(
                        "Ed25519 signing message write made no progress"
                    )

                offset += written

            os.fsync(descriptor)
        finally:
            os.close(descriptor)

        message_path.chmod(
            0o600
        )
        os.lseek(
            key_descriptor,
            0,
            os.SEEK_SET,
        )
        signature = run_openssl(
            [
                "pkeyutl",
                "-sign",
                "-rawin",
                "-inkey",
                identity_key_descriptor_path(
                    key_descriptor
                ),
                "-in",
                str(message_path),
            ],
            pass_fds=(
                key_descriptor,
            ),
        )
        revalidate_open_identity_key(
            path,
            key_descriptor,
            key_opened,
        )
    finally:
        os.close(
            key_descriptor
        )
        try:
            message_path.unlink(
                missing_ok=True
            )
        finally:
            shutil.rmtree(
                temporary,
                ignore_errors=True,
            )

    if len(signature) != 64:
        fail("Ed25519 signature length invalid")

    return signature


def build_public_auth_header(
    *,
    identity_key: str | Path,
    request: dict[str, Any],
    body: bytes,
    now: datetime | None = None,
) -> tuple[
    str,
    dict[str, Any],
]:
    identity = identity_from_key(
        identity_key
    )
    request_id = request.get(
        "request_id"
    )
    agent_id = request.get(
        "agent_id"
    )

    if (
        not isinstance(
            request_id,
            str,
        )
        or not REQUEST_ID_PATTERN.fullmatch(
            request_id
        )
    ):
        fail("request ID invalid for applicant authentication")

    if (
        not isinstance(
            agent_id,
            str,
        )
        or agent_id
        != identity[
            "agent_id"
        ]
    ):
        fail(
            "request agent_id does not match the Ed25519 identity key"
        )

    issued = (
        now
        or datetime.now(
            timezone.utc
        )
    ).astimezone(
        timezone.utc
    )
    expires = (
        issued
        + timedelta(
            seconds=30
        )
    )
    unsigned = {
        "agent_id": agent_id,
        "body_sha256": hashlib.sha256(
            body
        ).hexdigest(),
        "expires_at": utc_milliseconds(
            expires
        ),
        "issued_at": utc_milliseconds(
            issued
        ),
        "marker": AUTH_MARKER,
        "method": "POST",
        "network_chain_id": 2050,
        "nonce": base64url(
            os.urandom(16)
        ),
        "path": AUTH_PATH,
        "public_key_jwk": identity[
            "public_key_jwk"
        ],
        "purpose": AUTH_PURPOSE,
        "request_id": request_id,
        "version": 1,
    }
    signature = sign_ed25519(
        identity_key,
        canonical_json(
            unsigned
        ).encode(
            "utf-8"
        ),
    )
    envelope = {
        **unsigned,
        "signature": base64url(
            signature
        ),
    }
    encoded = base64url(
        canonical_json(
            envelope
        ).encode(
            "utf-8"
        )
    )

    if len(encoded) > 4096:
        fail("applicant authentication header too large")

    return (
        encoded,
        envelope,
    )
