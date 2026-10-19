#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import stat
import sys
from typing import Any

MARKER = "VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_IMPLEMENTATION_V1"
TARGET_HOST = "Xiphos"

PARENT_HEAD = "e496f4391b2b4e9be006695fcd8845669059a48f"
PARENT_CONTRACT_BLOB_SHA1 = "cc168ce3c5db261bb7f929810a39536728ad60da"
PARENT_SLOT_BLOB_SHA1 = "93582c324ca85aeff56eb61f82b32f1e4c18dfe9"
CANONICALIZER_V1_BLOB_SHA1 = "f97fafb0148527ae3a954e2752faef8c7fc9e88e"

CLAIM_STATE_ROOT = Path("/var/lib/void-apollyon-attempt-claim-v2")
SLOT_DIRECTORY_LEAF = "authorization-slots-v1"
MAX_SLOT_RECORD_BYTES = 65536

STORE_POLICY_ID = (
    "apollyon_claim_store_policy_v2:"
    "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137"
)

SLOT_RECORD_KEYS = frozenset(
    {
        "attempt_limit",
        "authorization_id",
        "authorization_slot_id",
        "authorization_slot_record_id",
        "automatic_retry_authorized",
        "claim_record_id",
        "claim_record_sha256",
        "marker",
        "publish_request_sha256",
        "status",
        "store_contract_id",
        "store_generation_id",
        "store_policy_id",
        "terminal_receipt_id",
        "version",
    }
)

HASH64 = re.compile(r"^[0-9a-f]{64}$")
AUTH_ID = re.compile(r"^apollyon_authz_v1:[0-9a-f]{64}$")
SLOT_ID = re.compile(r"^apollyon_attempt_claim_auth_slot_v1:([0-9a-f]{64})$")
SLOT_RECORD_ID = re.compile(
    r"^apollyon_attempt_claim_auth_slot_record_v1:[0-9a-f]{64}$"
)
CLAIM_ID = re.compile(r"^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$")
STORE_CONTRACT_ID = re.compile(r"^apollyon_claim_store_contract_v2:[0-9a-f]{64}$")
STORE_GENERATION_ID = re.compile(
    r"^apollyon_claim_store_generation_v2:[0-9a-f]{64}$"
)
TERMINAL_ID = re.compile(r"^apollyon_terminal_receipt_v2:[0-9a-f]{64}$")

DIR_FLAGS = (
    os.O_RDONLY
    | getattr(os, "O_DIRECTORY", 0)
    | getattr(os, "O_CLOEXEC", 0)
    | getattr(os, "O_NOFOLLOW", 0)
)
READ_FLAGS = (
    os.O_RDONLY
    | getattr(os, "O_CLOEXEC", 0)
    | getattr(os, "O_NOFOLLOW", 0)
    | getattr(os, "O_NONBLOCK", 0)
)


class Hold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise Hold(reason)


def normalize_host_io(reason: str):
    def decorate(fn):
        def wrapped(*args: Any, **kwargs: Any):
            try:
                return fn(*args, **kwargs)
            except OSError as exc:
                raise Hold(reason) from exc
        return wrapped
    return decorate


def canonical(value: Any) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def identity(row: os.stat_result) -> tuple[int, ...]:
    return (
        row.st_dev,
        row.st_ino,
        row.st_mode,
        row.st_uid,
        row.st_gid,
        row.st_nlink,
        row.st_size,
        getattr(row, "st_mtime_ns", 0),
        getattr(row, "st_ctime_ns", 0),
    )


def identity_receipt(row: os.stat_result) -> dict[str, Any]:
    return {
        "dev": str(row.st_dev),
        "ino": str(row.st_ino),
        "uid": row.st_uid,
        "gid": row.st_gid,
        "mode": f"{stat.S_IMODE(row.st_mode):04o}",
        "nlink": row.st_nlink,
        "size": row.st_size,
        "mtime_ns": str(getattr(row, "st_mtime_ns", 0)),
        "ctime_ns": str(getattr(row, "st_ctime_ns", 0)),
    }


def require_no_posix_acl(fd: int, label: str) -> None:
    if not hasattr(os, "listxattr"):
        hold(label + "_acl_visibility_unavailable")
    try:
        names = set(os.listxattr(fd))
    except OSError as exc:
        raise Hold(label + "_acl_visibility_unavailable") from exc
    if {
        "system.posix_acl_access",
        "system.posix_acl_default",
    } & names:
        hold(label + "_extended_acl_present")


def require_directory(
    row: os.stat_result,
    *,
    uid: int,
    gid: int,
    mode: int,
    label: str,
) -> None:
    if (
        not stat.S_ISDIR(row.st_mode)
        or row.st_uid != uid
        or row.st_gid != gid
        or stat.S_IMODE(row.st_mode) != mode
        or row.st_nlink < 2
    ):
        hold(label + "_metadata_invalid")


def require_file(
    row: os.stat_result,
    *,
    uid: int,
    gid: int,
    label: str,
) -> None:
    if (
        not stat.S_ISREG(row.st_mode)
        or row.st_uid != uid
        or row.st_gid != gid
        or stat.S_IMODE(row.st_mode) != 0o600
        or row.st_nlink != 1
        or row.st_size < 2
        or row.st_size > MAX_SLOT_RECORD_BYTES
    ):
        hold(label + "_metadata_invalid")


@normalize_host_io("claim_root_host_io_failed")
def open_root(
    root_path: Path,
    *,
    claim_uid: int,
    claim_gid: int,
    require_trusted_ancestors: bool,
) -> tuple[int, os.stat_result]:
    absolute = Path(os.path.abspath(os.fspath(root_path)))
    if absolute != root_path:
        hold("claim_root_not_absolute")

    parts = absolute.parts
    if not parts or parts[0] != "/":
        hold("claim_root_invalid")

    current = os.open("/", DIR_FLAGS)
    try:
        for index, component in enumerate(parts[1:]):
            if not component or component in (".", "..") or "/" in component:
                hold("claim_root_component_invalid")
            before = os.stat(component, dir_fd=current, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("claim_root_component_not_direct_directory")
            child = os.open(component, DIR_FLAGS, dir_fd=current)
            opened = os.fstat(child)
            visible = os.stat(component, dir_fd=current, follow_symlinks=False)
            if identity(before) != identity(opened) or identity(opened) != identity(visible):
                os.close(child)
                hold("claim_root_component_identity_drift")

            final = index == len(parts[1:]) - 1
            if final:
                require_directory(
                    opened,
                    uid=claim_uid,
                    gid=claim_gid,
                    mode=0o700,
                    label="claim_root",
                )
                require_no_posix_acl(child, "claim_root")
            elif require_trusted_ancestors:
                if (
                    opened.st_uid != 0
                    or opened.st_gid != 0
                    or stat.S_IMODE(opened.st_mode) & 0o022
                ):
                    os.close(child)
                    hold("claim_root_ancestor_custody_invalid")
                require_no_posix_acl(child, "claim_root_ancestor")

            os.close(current)
            current = child

        return current, os.fstat(current)
    except BaseException:
        try:
            os.close(current)
        except OSError:
            pass
        raise


def slot_leaf(authorization_slot_id: str) -> str:
    match = SLOT_ID.fullmatch(authorization_slot_id)
    if not match:
        hold("authorization_slot_id_invalid")
    return "slot-" + match.group(1) + ".json"


def duplicate_rejecting_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            hold("slot_record_duplicate_key")
        out[key] = value
    return out


def derive_slot_id(authorization_id: str) -> str:
    if not AUTH_ID.fullmatch(authorization_id):
        hold("slot_record_authorization_id_invalid")
    material = {
        "marker": "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_ID_V1",
        "version": 1,
        "authorization_id": authorization_id,
        "attempt_limit": 1,
        "automatic_retry_authorized": False,
    }
    return "apollyon_attempt_claim_auth_slot_v1:" + sha256(
        canonical(material).encode("utf-8")
    )


def validate_slot_record(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != SLOT_RECORD_KEYS:
        hold("slot_record_schema_invalid")

    string_keys = SLOT_RECORD_KEYS - {
        "attempt_limit",
        "automatic_retry_authorized",
        "version",
    }
    for key in string_keys:
        if not isinstance(value[key], str) or not value[key] or len(value[key]) > 256:
            hold("slot_record_field_invalid:" + key)

    if (
        value["marker"]
        != "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1"
        or value["version"] != 1
        or value["status"]
        != "authorization_slot_bound_to_exact_durable_claim_candidate"
        or value["store_policy_id"] != STORE_POLICY_ID
        or value["attempt_limit"] != 1
        or value["automatic_retry_authorized"] is not False
        or not AUTH_ID.fullmatch(value["authorization_id"])
        or not SLOT_ID.fullmatch(value["authorization_slot_id"])
        or not SLOT_RECORD_ID.fullmatch(value["authorization_slot_record_id"])
        or not STORE_CONTRACT_ID.fullmatch(value["store_contract_id"])
        or not STORE_GENERATION_ID.fullmatch(value["store_generation_id"])
        or not TERMINAL_ID.fullmatch(value["terminal_receipt_id"])
        or not CLAIM_ID.fullmatch(value["claim_record_id"])
        or not HASH64.fullmatch(value["claim_record_sha256"])
        or not HASH64.fullmatch(value["publish_request_sha256"])
    ):
        hold("slot_record_semantics_invalid")

    derived_slot = derive_slot_id(value["authorization_id"])
    if value["authorization_slot_id"] != derived_slot:
        hold("slot_record_slot_id_mismatch")

    material = {
        "marker": "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1",
        "version": 1,
        "status": "authorization_slot_bound_to_exact_durable_claim_candidate",
        "store_policy_id": value["store_policy_id"],
        "authorization_id": value["authorization_id"],
        "authorization_slot_id": derived_slot,
        "store_contract_id": value["store_contract_id"],
        "store_generation_id": value["store_generation_id"],
        "terminal_receipt_id": value["terminal_receipt_id"],
        "claim_record_id": value["claim_record_id"],
        "claim_record_sha256": value["claim_record_sha256"],
        "publish_request_sha256": value["publish_request_sha256"],
        "attempt_limit": 1,
        "automatic_retry_authorized": False,
    }
    expected_record_id = (
        "apollyon_attempt_claim_auth_slot_record_v1:"
        + sha256(canonical(material).encode("utf-8"))
    )
    expected = {**material, "authorization_slot_record_id": expected_record_id}
    if canonical(value) != canonical(expected):
        hold("slot_record_content_address_mismatch")
    return expected


def parse_slot_record(raw: bytes) -> dict[str, Any]:
    if (
        len(raw) < 2
        or len(raw) > MAX_SLOT_RECORD_BYTES
        or not raw.endswith(b"\n")
        or b"\n" in raw[:-1]
    ):
        hold("slot_record_framing_invalid")
    try:
        text = raw[:-1].decode("utf-8", "strict")
        value = json.loads(text, object_pairs_hook=duplicate_rejecting_object)
    except Hold:
        raise
    except (
        UnicodeError,
        ValueError,
        RecursionError,
        MemoryError,
        OverflowError,
    ) as exc:
        raise Hold("slot_record_json_invalid") from exc

    validated = validate_slot_record(value)
    expected = (canonical(validated) + "\n").encode("utf-8")
    if raw != expected:
        hold("slot_record_noncanonical_bytes")
    return validated


@normalize_host_io("protected_slot_host_io_failed")
def read_exact_slot(
    root_fd: int,
    root_stamp: os.stat_result,
    *,
    claim_uid: int,
    claim_gid: int,
    authorization_slot_id: str,
) -> dict[str, Any]:
    directory_before = os.stat(
        SLOT_DIRECTORY_LEAF,
        dir_fd=root_fd,
        follow_symlinks=False,
    )
    if not stat.S_ISDIR(directory_before.st_mode) or stat.S_ISLNK(directory_before.st_mode):
        hold("slot_directory_not_direct")

    directory_fd = os.open(SLOT_DIRECTORY_LEAF, DIR_FLAGS, dir_fd=root_fd)
    try:
        directory_opened = os.fstat(directory_fd)
        directory_visible = os.stat(
            SLOT_DIRECTORY_LEAF,
            dir_fd=root_fd,
            follow_symlinks=False,
        )
        if (
            identity(directory_before) != identity(directory_opened)
            or identity(directory_opened) != identity(directory_visible)
        ):
            hold("slot_directory_identity_drift")
        require_directory(
            directory_opened,
            uid=claim_uid,
            gid=claim_gid,
            mode=0o700,
            label="slot_directory",
        )
        require_no_posix_acl(directory_fd, "slot_directory")

        leaf = slot_leaf(authorization_slot_id)
        before = os.stat(leaf, dir_fd=directory_fd, follow_symlinks=False)
        if stat.S_ISLNK(before.st_mode):
            hold("slot_file_symlink_forbidden")
        fd = os.open(leaf, READ_FLAGS, dir_fd=directory_fd)
        try:
            opened = os.fstat(fd)
            visible = os.stat(leaf, dir_fd=directory_fd, follow_symlinks=False)
            if identity(before) != identity(opened) or identity(opened) != identity(visible):
                hold("slot_file_identity_drift")
            require_file(
                opened,
                uid=claim_uid,
                gid=claim_gid,
                label="slot_file",
            )
            require_no_posix_acl(fd, "slot_file")

            first = os.pread(fd, MAX_SLOT_RECORD_BYTES + 1, 0)
            if len(first) != opened.st_size:
                hold("slot_file_read_size_drift")
            record = parse_slot_record(first)
            if record["authorization_slot_id"] != authorization_slot_id:
                hold("slot_file_slot_id_mismatch")

            opened_after = os.fstat(fd)
            visible_after = os.stat(
                leaf,
                dir_fd=directory_fd,
                follow_symlinks=False,
            )
            directory_after = os.fstat(directory_fd)
            directory_visible_after = os.stat(
                SLOT_DIRECTORY_LEAF,
                dir_fd=root_fd,
                follow_symlinks=False,
            )
            root_after = os.fstat(root_fd)
            if (
                identity(opened) != identity(opened_after)
                or identity(opened_after) != identity(visible_after)
                or identity(directory_opened) != identity(directory_after)
                or identity(directory_after) != identity(directory_visible_after)
                or identity(root_stamp) != identity(root_after)
            ):
                hold("protected_slot_generation_changed")

            second = os.pread(fd, MAX_SLOT_RECORD_BYTES + 1, 0)
            if second != first:
                hold("slot_file_reread_mismatch")

            final_fd = os.fstat(fd)
            final_visible = os.stat(
                leaf,
                dir_fd=directory_fd,
                follow_symlinks=False,
            )
            final_directory = os.fstat(directory_fd)
            final_directory_visible = os.stat(
                SLOT_DIRECTORY_LEAF,
                dir_fd=root_fd,
                follow_symlinks=False,
            )
            final_root = os.fstat(root_fd)
            if (
                identity(opened) != identity(final_fd)
                or identity(final_fd) != identity(final_visible)
                or identity(directory_opened) != identity(final_directory)
                or identity(final_directory) != identity(final_directory_visible)
                or identity(root_stamp) != identity(final_root)
            ):
                hold("protected_slot_generation_changed_after_reread")

            return {
                "record": record,
                "record_sha256": sha256(first),
                "slot_directory_identity": identity_receipt(directory_opened),
                "slot_file_identity": identity_receipt(opened),
                "slot_file_leaf": leaf,
                "canonical_bytes": first,
            }
        finally:
            os.close(fd)
    finally:
        os.close(directory_fd)


@normalize_host_io("protected_slot_observation_host_io_failed")
def observe_protected_slot(
    *,
    root_path: Path,
    claim_uid: int,
    claim_gid: int,
    authorization_slot_id: str,
    require_trusted_ancestors: bool,
) -> dict[str, Any]:
    if claim_uid <= 0 or claim_gid <= 0:
        hold("claim_identity_must_be_nonroot")
    root_fd, root_stamp = open_root(
        root_path,
        claim_uid=claim_uid,
        claim_gid=claim_gid,
        require_trusted_ancestors=require_trusted_ancestors,
    )
    try:
        observed = read_exact_slot(
            root_fd,
            root_stamp,
            claim_uid=claim_uid,
            claim_gid=claim_gid,
            authorization_slot_id=authorization_slot_id,
        )
        visible_root = os.stat(root_path, follow_symlinks=False)
        if identity(root_stamp) != identity(visible_root):
            hold("claim_root_visible_identity_drift")

        record = observed["record"]
        material = {
            "marker": MARKER,
            "version": 1,
            "status": "protected_authorization_slot_reread_implemented",
            "target_host": TARGET_HOST,
            "parent_head": PARENT_HEAD,
            "parent_contract_blob_sha1": PARENT_CONTRACT_BLOB_SHA1,
            "parent_authorization_slot_blob_sha1": PARENT_SLOT_BLOB_SHA1,
            "canonicalizer_v1_blob_sha1": CANONICALIZER_V1_BLOB_SHA1,
            "claim_state_root": os.fspath(root_path),
            "authorization_slot_directory": SLOT_DIRECTORY_LEAF,
            "authorization_slot_id": record["authorization_slot_id"],
            "authorization_slot_record_id": record["authorization_slot_record_id"],
            "authorization_slot_record_sha256": observed["record_sha256"],
            "authorization_id": record["authorization_id"],
            "store_policy_id": record["store_policy_id"],
            "store_contract_id": record["store_contract_id"],
            "store_generation_id": record["store_generation_id"],
            "terminal_receipt_id": record["terminal_receipt_id"],
            "claim_record_id": record["claim_record_id"],
            "claim_record_sha256": record["claim_record_sha256"],
            "publish_request_sha256": record["publish_request_sha256"],
            "claim_uid": claim_uid,
            "claim_gid": claim_gid,
            "claim_root_identity": identity_receipt(root_stamp),
            "slot_directory_identity": observed["slot_directory_identity"],
            "slot_file_identity": observed["slot_file_identity"],
            "slot_file_leaf": observed["slot_file_leaf"],
            "protected_authorization_slot_store_proven": True,
            "same_protected_claim_root_proven": True,
            "descriptor_stable_slot_reread_performed": True,
            "slot_file_identity_revalidation_performed": True,
            "exact_slot_record_canonical_bytes_proven": True,
            "exact_slot_record_sha256_proven": True,
            "authorization_slot_revalidation_performed": True,
            "claim_service_write_boundary_metadata_proven": True,
            "claim_service_identity_external_lease_required": True,
            "claim_service_only_writer_proven": False,
            "current_store_generation_revalidation_performed": False,
            "exact_claim_record_revalidation_performed": False,
            "exact_terminal_receipt_revalidation_performed": False,
            "exact_publish_request_revalidation_performed": False,
            "protected_authorization_slot_origin_proven": False,
            "activation_capability_issuance_authorized": False,
            "activation_capability_issuance_performed": False,
            "training_start_consumption_authorized": False,
            "training_start_consumption_performed": False,
            "training_start_admission": False,
            "training_release_authorized": False,
            "training_execution_authorized": False,
            "training_execution": False,
            "filesystem_read": True,
            "filesystem_write": False,
            "network_access": False,
            "service_action": False,
            "socket_action": False,
            "credential_access": False,
            "private_key_access": False,
            "signing": False,
            "wallet_access": False,
            "transaction": False,
            "funds_movement": False,
            "next_gate": (
                "apollyon_authorization_slot_protected_origin_"
                "claim_service_revalidation_v1"
            ),
        }
        return {
            **material,
            "protected_origin_reader_receipt_id":
                "apollyon_authorization_slot_protected_origin_reader_v1:"
                + sha256(canonical(material).encode("utf-8")),
        }
    finally:
        os.close(root_fd)


def _emit_live_authority() -> None:
    for line in (
        MARKER,
        "mode=live_read_only",
        "filesystem_read=true",
        "filesystem_write=false",
        "network_access=false",
        "service_action=false",
        "socket_action=false",
        "credential_access=false",
        "private_key_access=false",
        "signing=false",
        "wallet_access=false",
        "transaction=false",
        "funds_movement=false",
        "activation_capability_issuance_authorized=false",
        "training_start_consumption_authorized=false",
        "training_execution_authorized=false",
    ):
        print(line, file=sys.stderr, flush=True)


def self_test() -> None:
    authorization_id = "apollyon_authz_v1:" + "1" * 64
    slot_id = derive_slot_id(authorization_id)
    material = {
        "marker": "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1",
        "version": 1,
        "status": "authorization_slot_bound_to_exact_durable_claim_candidate",
        "store_policy_id": STORE_POLICY_ID,
        "authorization_id": authorization_id,
        "authorization_slot_id": slot_id,
        "store_contract_id": "apollyon_claim_store_contract_v2:" + "2" * 64,
        "store_generation_id": "apollyon_claim_store_generation_v2:" + "3" * 64,
        "terminal_receipt_id": "apollyon_terminal_receipt_v2:" + "4" * 64,
        "claim_record_id": "apollyon_attempt_claim_record_v2:" + "5" * 64,
        "claim_record_sha256": "6" * 64,
        "publish_request_sha256": "7" * 64,
        "attempt_limit": 1,
        "automatic_retry_authorized": False,
    }
    record = {
        **material,
        "authorization_slot_record_id":
            "apollyon_attempt_claim_auth_slot_record_v1:"
            + sha256(canonical(material).encode("utf-8")),
    }
    raw = (canonical(record) + "\n").encode("utf-8")
    assert parse_slot_record(raw) == record
    assert slot_leaf(slot_id) == "slot-" + slot_id.rsplit(":", 1)[1] + ".json"
    print(MARKER + "_SELF_TEST=GREEN")
    print("fixed_claim_state_root=true")
    print("fixed_authorization_slot_directory=true")
    print("descriptor_relative_slot_read_implemented=true")
    print("slot_leaf_nonblocking_nofollow_open=true")
    print("final_visible_generation_revalidation_required=true")
    print("visible_slot_directory_revalidation_required=true")
    print("host_io_errors_normalized_to_hold=true")
    print("trusted_ancestor_posix_acl_rejected=true")
    print("exact_parent_slot_record_revalidation=true")
    print("protected_origin_completion_required=true")
    print("protected_authorization_slot_origin_proven=false")
    print("activation_capability_issuance_authorized=false")
    print("training_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--live-read", action="store_true")
    parser.add_argument("--authorization-slot-id")
    parser.add_argument("--expected-claim-uid", type=int)
    parser.add_argument("--expected-claim-gid", type=int)
    args = parser.parse_args()

    if int(args.self_test) + int(args.live_read) != 1:
        parser.error("choose exactly one mode")

    if args.self_test:
        self_test()
        return 0

    if socket.gethostname().casefold() != TARGET_HOST.casefold():
        print("HOLD=wrong_host", file=sys.stderr)
        return 2
    if os.geteuid() != 0:
        print("HOLD=root_required", file=sys.stderr)
        return 2
    if (
        args.authorization_slot_id is None
        or args.expected_claim_uid is None
        or args.expected_claim_gid is None
    ):
        print("HOLD=live_read_arguments_required", file=sys.stderr)
        return 2

    _emit_live_authority()
    try:
        receipt = observe_protected_slot(
            root_path=CLAIM_STATE_ROOT,
            claim_uid=args.expected_claim_uid,
            claim_gid=args.expected_claim_gid,
            authorization_slot_id=args.authorization_slot_id,
            require_trusted_ancestors=True,
        )
    except Hold as exc:
        print("HOLD=" + str(exc), file=sys.stderr)
        print("activation_capability_issuance_authorized=false", file=sys.stderr)
        print("training_execution_authorized=false", file=sys.stderr)
        print("funds_movement=false", file=sys.stderr)
        return 2

    print(canonical(receipt))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
