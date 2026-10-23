#!/usr/bin/env python3
"""Source-only proof for Apollyon protected-store Xiphos machine identity binding V1."""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
BINDING = ROOT / "ops/security/apollyon-protected-store-machine-identity-binding-v1.json"
MARKER = "VOID_APOLLYON_PROTECTED_STORE_MACHINE_IDENTITY_BINDING_V1_PROOF"
BINDING_ID = "voidapollyonhostidbind1_84b546de51ba3f22cd1f5775eb0230d5683e53254d3d3426b9a97fc2d3037f1d"
PARENT_HEAD = "4bb11c7469b47b25810390b762709bd93a7184e3"
EXPECTED_MACHINE_ID_SHA256 = "543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057"

PINS = {
    "ops/security/apollyon-protected-store-first-host-evidence-plan-v1.json":
        "110c8a6bb4f8ec89514cfd9ef4cdc3218fa2a4ca",
    "scripts/prove_apollyon_protected_store_first_host_evidence_plan_v1.py":
        "533b8357caea9c77c5c73aba95233712824b65d9",
    "docs/security/apollyon-protected-store-first-host-evidence-plan-v1.md":
        "4b055837dd4e150fb2573947ff11f0b2f455622e",
    ".github/workflows/apollyon-protected-store-first-host-evidence-plan-v1.yml":
        "f533256a7b2b2a75b1f9aa8298ac43692b5af9d7",
}
CONTRACT = [
    "future_host_pass_must_match_exact_machine_id_sha256",
    "hostname_alone_insufficient",
    "machine_identity_mismatch_must_hold",
    "machine_identity_unreadable_or_changed_must_hold",
    "machine_identity_measurement_must_not_print_raw_id",
    "separate_operator_authorization_required_for_host_pass",
    "host_pass_remains_metadata_safe_read_only",
    "protected_record_contents_read_forbidden",
    "protected_record_names_listing_forbidden",
    "process_environment_read_forbidden",
    "raw_process_args_read_forbidden",
    "credentials_keys_wallets_signer_access_forbidden",
    "filesystem_mutation_forbidden",
    "service_start_stop_restart_reload_forbidden",
    "writer_capability_creation_or_transfer_forbidden",
    "claim_publication_forbidden",
    "consumption_publication_forbidden",
    "trainer_release_forbidden",
    "training_execution_forbidden",
    "network_rpc_transaction_forbidden",
    "funds_movement_forbidden",
]
AUTH_FALSE = [
    "host_pass_performed",
    "protected_store_origin_proven",
    "current_store_generation_revalidation_performed",
    "authorization_winner_reread_performed",
    "durable_claim_record_reread_performed",
    "consumption_slot_classification_performed",
    "writer_directory_capability_origin_proven",
    "writer_invocation_authorized",
    "consumption_publication_authorized",
    "trainer_release_authorized",
    "training_execution_authorized",
    "credential_access",
    "signing",
    "transaction",
    "funds_movement",
]
IDENTITY_EXPECTED = {
    "target_host": "Xiphos",
    "identity_kind": "etc_machine_id_sha256",
    "normalization": "strip_ascii_whitespace_then_require_exact_lowercase_32_hex_then_sha256_ascii",
    "expected_machine_id_sha256": EXPECTED_MACHINE_ID_SHA256,
    "raw_machine_id_recorded": False,
    "raw_machine_id_printed": False,
    "format_valid_observed": True,
    "generation_stable_observed": True,
    "read_only_observation": True,
    "filesystem_mutation_observed": False,
    "service_mutation_observed": False,
    "training_execution_observed": False,
    "credential_access_observed": False,
    "funds_movement_observed": False,
}


class Hold(Exception):
    pass


def need(ok: bool, reason: str) -> None:
    if not ok:
        raise Hold(reason)


def closed(value: object, keys: list[str] | tuple[str, ...], label: str) -> dict:
    need(type(value) is dict and set(value) == set(keys), label + "_shape_invalid")
    return value  # type: ignore[return-value]


def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False
    ).encode("ascii")


def reject_duplicate_pairs(pairs: list[tuple[str, object]]) -> dict:
    out = {}
    for key, value in pairs:
        need(type(key) is str, "json_key_invalid")
        need(key not in out, "duplicate_json_key:" + key)
        out[key] = value
    return out


def reject_nonfinite_json(value: str) -> object:
    raise Hold("json_nonfinite_invalid:" + value)


def parse_json(raw: bytes) -> object:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise Hold("json_encoding_invalid") from exc
    try:
        return json.loads(
            text,
            object_pairs_hook=reject_duplicate_pairs,
            parse_constant=reject_nonfinite_json,
        )
    except Hold:
        raise
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise Hold("json_parse_invalid") from exc


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read_regular(path: Path, maximum: int = 4 * 1024 * 1024) -> bytes:
    before = path.lstat()
    need(
        stat.S_ISREG(before.st_mode)
        and before.st_nlink == 1
        and 0 < before.st_size <= maximum,
        "source_invalid:" + str(path),
    )
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW
    if hasattr(os, "O_NONBLOCK"):
        flags |= os.O_NONBLOCK
    fd = os.open(path, flags)
    try:
        opened = os.fstat(fd)
        attrs = (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
            "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
        )
        need(
            all(getattr(before, key) == getattr(opened, key) for key in attrs),
            "source_generation_changed:" + str(path),
        )
        out = bytearray()
        while len(out) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(out)))
            need(bool(chunk), "short_read:" + str(path))
            out.extend(chunk)
        need(os.read(fd, 1) == b"", "source_grew:" + str(path))
        after = os.fstat(fd)
        visible = path.lstat()
        need(
            all(
                getattr(opened, key) == getattr(after, key) == getattr(visible, key)
                for key in attrs
            ),
            "source_terminal_generation_changed:" + str(path),
        )
        return bytes(out)
    finally:
        os.close(fd)


def validate(value: object) -> dict:
    binding = closed(
        value,
        (
            "schema", "marker", "version", "repository", "issue", "parent",
            "authenticated_host_identity", "binding_contract", "authority",
            "next_gate", "binding_id",
        ),
        "binding",
    )
    need(
        binding["schema"] == "void_apollyon_protected_store_machine_identity_binding_v1"
        and binding["marker"] == "VOID_APOLLYON_PROTECTED_STORE_MACHINE_IDENTITY_BINDING_V1"
        and binding["version"] == 1
        and binding["repository"] == "6ZoSo9/void-node"
        and binding["issue"] == 3557,
        "identity_invalid",
    )

    parent = closed(
        binding["parent"],
        (
            "pr", "head",
            "plan_path", "plan_git_blob_sha1",
            "proof_path", "proof_git_blob_sha1",
            "document_path", "document_git_blob_sha1",
            "workflow_path", "workflow_git_blob_sha1",
        ),
        "parent",
    )
    need(parent["pr"] == 3749 and parent["head"] == PARENT_HEAD, "parent_identity_invalid")
    expected_parent = (
        ("plan", "ops/security/apollyon-protected-store-first-host-evidence-plan-v1.json"),
        ("proof", "scripts/prove_apollyon_protected_store_first_host_evidence_plan_v1.py"),
        ("document", "docs/security/apollyon-protected-store-first-host-evidence-plan-v1.md"),
        ("workflow", ".github/workflows/apollyon-protected-store-first-host-evidence-plan-v1.yml"),
    )
    for role, path in expected_parent:
        need(parent[role + "_path"] == path, "parent_path_invalid:" + role)
        need(parent[role + "_git_blob_sha1"] == PINS[path], "parent_blob_invalid:" + role)

    identity = closed(
        binding["authenticated_host_identity"],
        tuple(IDENTITY_EXPECTED),
        "authenticated_host_identity",
    )
    need(identity == IDENTITY_EXPECTED, "authenticated_host_identity_invalid")

    contract = closed(binding["binding_contract"], CONTRACT, "binding_contract")
    for key in CONTRACT:
        need(contract[key] is True, "missing_binding_contract:" + key)

    authority = closed(
        binding["authority"],
        ("machine_identity_bound", *AUTH_FALSE),
        "authority",
    )
    need(authority["machine_identity_bound"] is True, "machine_identity_not_bound")
    for key in AUTH_FALSE:
        need(authority[key] is False, "forbidden_authority:" + key)

    need(
        binding["next_gate"]
        == "SEPARATE_AUTHORIZATION_THEN_READ_ONLY_METADATA_SAFE_XIPHOS_FIRST_PASS",
        "next_gate_invalid",
    )
    without_id = copy.deepcopy(binding)
    del without_id["binding_id"]
    expected = "voidapollyonhostidbind1_" + hashlib.sha256(canonical(without_id)).hexdigest()
    need(binding["binding_id"] == expected == BINDING_ID, "content_identity_invalid")
    return binding


def adversaries(binding: dict) -> int:
    rejected = 0

    def expect(bad: dict, reason: str, label: str) -> None:
        nonlocal rejected
        try:
            validate(bad)
        except Hold as exc:
            need(str(exc) == reason, "wrong_rejection:" + label + ":" + str(exc))
        else:
            raise Hold("mutation_accepted:" + label)
        rejected += 1

    for key in CONTRACT:
        bad = copy.deepcopy(binding)
        bad["binding_contract"][key] = False
        expect(bad, "missing_binding_contract:" + key, "contract:" + key)

    bad = copy.deepcopy(binding)
    bad["authority"]["machine_identity_bound"] = False
    expect(bad, "machine_identity_not_bound", "machine_identity_bound")

    for key in AUTH_FALSE:
        bad = copy.deepcopy(binding)
        bad["authority"][key] = True
        expect(bad, "forbidden_authority:" + key, "authority:" + key)

    mutations = {
        "target_host": "Precision",
        "identity_kind": "hostname",
        "normalization": "raw_file_sha256",
        "expected_machine_id_sha256": "0" * 64,
        "raw_machine_id_recorded": True,
        "raw_machine_id_printed": True,
        "format_valid_observed": False,
        "generation_stable_observed": False,
        "read_only_observation": False,
        "filesystem_mutation_observed": True,
        "service_mutation_observed": True,
        "training_execution_observed": True,
        "credential_access_observed": True,
        "funds_movement_observed": True,
    }
    for key, value in mutations.items():
        bad = copy.deepcopy(binding)
        bad["authenticated_host_identity"][key] = value
        expect(bad, "authenticated_host_identity_invalid", "identity:" + key)

    bad = copy.deepcopy(binding)
    bad["parent"]["head"] = "0" * 40
    expect(bad, "parent_identity_invalid", "parent_head")

    bad = copy.deepcopy(binding)
    bad["parent"]["plan_git_blob_sha1"] = "0" * 40
    expect(bad, "parent_blob_invalid:plan", "parent_plan_blob")

    bad = copy.deepcopy(binding)
    bad["next_gate"] = "HOST_PASS_AUTHORIZED"
    expect(bad, "next_gate_invalid", "next_gate")

    bad = copy.deepcopy(binding)
    bad["binding_id"] = "voidapollyonhostidbind1_" + "0" * 64
    expect(bad, "content_identity_invalid", "binding_id")
    return rejected


def main() -> None:
    need(sys.argv[1:] in (["--self-test"], ["--run"]), "mode_invalid")
    raw = read_regular(BINDING, 256 * 1024)
    binding = validate(parse_json(raw))
    rejected = adversaries(binding)

    duplicate = raw.replace(
        b'"parent": {',
        b'"authority": {"machine_identity_bound": false},\n  "parent": {',
        1,
    )
    need(duplicate != raw, "duplicate_fixture_injection_failed")
    try:
        parse_json(duplicate)
    except Hold as exc:
        need(str(exc) == "duplicate_json_key:authority", "duplicate_json_wrong_rejection")
    else:
        raise Hold("duplicate_json_key_accepted")
    rejected += 1

    if sys.argv[1] == "--run":
        for relative, expected in PINS.items():
            need(
                git_blob(read_regular(ROOT / relative)) == expected,
                "parent_blob_mismatch:" + relative,
            )

    print(MARKER + "_GREEN")
    print("binding_id=" + BINDING_ID)
    print("source_only=true")
    print("parent_pr=3749")
    print("parent_head=" + PARENT_HEAD)
    print("parent_blob_count=" + str(len(PINS)))
    print("binding_contract_count=" + str(len(CONTRACT)))
    print("negative_authority_count=" + str(len(AUTH_FALSE)))
    print("rejected_adversaries=" + str(rejected))
    print("target_host=Xiphos")
    print("machine_identity_kind=etc_machine_id_sha256")
    print("expected_machine_id_sha256=" + EXPECTED_MACHINE_ID_SHA256)
    print("raw_machine_id_recorded=false")
    print("raw_machine_id_printed=false")
    print("machine_identity_bound=true")
    print("host_pass_performed=false")
    print("protected_store_origin_proven=false")
    print("writer_invocation_authorized=false")
    print("training_execution_authorized=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_gate=SEPARATE_AUTHORIZATION_THEN_READ_ONLY_METADATA_SAFE_XIPHOS_FIRST_PASS")


if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError, RecursionError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:240])
        print("host_pass_performed=false")
        print("training_execution_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
