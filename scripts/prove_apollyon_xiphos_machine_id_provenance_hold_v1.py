#!/usr/bin/env python3
"""Source-only proof for Apollyon Xiphos machine-ID provenance HOLD V1."""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "ops/security/apollyon-xiphos-machine-id-provenance-hold-v1.json"
MARKER = "VOID_APOLLYON_XIPHOS_MACHINE_ID_PROVENANCE_HOLD_V1_PROOF"
PARENT_HEAD = "f8cf1eba57d8930452642699c21fa188c31cbd13"
OBSERVED_DIGEST = "543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057"
PLAN_ID = "voidapollyonxiphosprovenancehold1_98c9443ab88a6f7deb306af5369e00802ca84f132bff89f383eeadce47bc0716"

PINS = {
    ".github/workflows/apollyon-protected-store-machine-identity-binding-v1.yml":
        "c8737fe68f15894bd15af0e775fc79cb2b50d9bb",
    "docs/security/apollyon-protected-store-machine-identity-binding-v1.md":
        "24cc4b6ce92931d9be9d39a46afb5a1c76e267fb",
    "ops/security/apollyon-protected-store-machine-identity-binding-v1.json":
        "0fb44bcfd90423d5bfbe6f7a9e6143de54bc9b26",
    "scripts/prove_apollyon_protected_store_machine_identity_binding_v1.py":
        "45ab6a6cbfea05d61617de294d18ed7dec07fae9",
    ".github/workflows/apollyon-protected-store-first-host-collector-v1.yml":
        "bea96da92311ca4a60a4d9893a1aadc5e5874239",
    "docs/security/apollyon-protected-store-first-host-collector-v1.md":
        "a20dc26eb9ac16421b91290bcf149cbdef8a58d0",
    "ops/xiphos/apollyon_protected_store_first_host_collector_v1.py":
        "493945e73b7f718c728e17a4f14e04dc4a32edf4",
    "scripts/prove_apollyon_protected_store_first_host_collector_v1.py":
        "44e454a6e49629d0a2b8e6562c3e97e73c6afb86",
}

PROVENANCE = {
    "normalized_machine_id_digest_observed": True,
    "raw_machine_id_absent_from_repository": True,
    "digest_internal_consistency_proven": True,
    "authenticated_transport_attestation_present": False,
    "signed_machine_identity_attestation_present": False,
    "authenticated_xiphos_machine_identity_proven": False,
    "merged_binding_machine_identity_bound_claim_accepted_for_host_authority": False,
    "collector_machine_identity_prerequisite_satisfied_for_host_execution": False,
}
AUTHORITY = (
    "host_pass_authorized",
    "protected_store_origin_proven",
    "writer_invocation_authorized",
    "claim_publication_authorized",
    "consumption_publication_authorized",
    "trainer_release_authorized",
    "training_execution_authorized",
    "credential_access_authorized",
    "private_key_or_wallet_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "funds_movement_authorized",
)

class Hold(Exception):
    pass

def need(ok: bool, reason: str) -> None:
    if not ok:
        raise Hold(reason)

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"),
        ensure_ascii=True, allow_nan=False,
    ).encode("ascii")

def reject_constant(value: str):
    raise Hold("nonfinite_json_constant:" + value)

def reject_duplicate_pairs(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise Hold("duplicate_json_key:" + str(key))
        out[key] = value
    return out

def parse_json(raw: bytes) -> object:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise Hold("plan_utf8_invalid") from exc
    try:
        return json.loads(
            text,
            object_pairs_hook=reject_duplicate_pairs,
            parse_constant=reject_constant,
        )
    except Hold:
        raise
    except (ValueError, TypeError, RecursionError) as exc:
        raise Hold("plan_json_invalid") from exc

def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()

def read_regular(path: Path, maximum: int = 2 * 1024 * 1024) -> bytes:
    before = path.lstat()
    need(
        stat.S_ISREG(before.st_mode)
        and not stat.S_ISLNK(before.st_mode)
        and before.st_nlink == 1
        and 0 < before.st_size <= maximum,
        "file_metadata_invalid:" + str(path),
    )
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
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
            all(getattr(before, k) == getattr(opened, k) for k in attrs),
            "file_generation_changed_on_open:" + str(path),
        )
        out = bytearray()
        while len(out) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(out)))
            need(bool(chunk), "file_short_read:" + str(path))
            out.extend(chunk)
        need(os.read(fd, 1) == b"", "file_grew_during_read:" + str(path))
        after = os.fstat(fd)
    finally:
        os.close(fd)
    visible = path.lstat()
    need(
        all(
            getattr(opened, k) == getattr(after, k) == getattr(visible, k)
            for k in attrs
        ),
        "file_terminal_generation_changed:" + str(path),
    )
    return bytes(out)

def closed(value: object, keys, label: str) -> dict:
    need(type(value) is dict and set(value) == set(keys), label + "_shape_invalid")
    return value

def validate(value: object) -> dict:
    plan = closed(
        value,
        (
            "schema", "marker", "version", "repository", "parent_lineage",
            "provenance_assessment", "authority", "next_gate", "plan_id",
        ),
        "plan",
    )
    need(
        plan["schema"] == "void_apollyon_xiphos_machine_id_provenance_hold_v1"
        and plan["marker"] == "VOID_APOLLYON_XIPHOS_MACHINE_ID_PROVENANCE_HOLD_V1"
        and plan["version"] == 1
        and plan["repository"] == "6ZoSo9/void-node",
        "schema_invalid",
    )
    lineage = closed(
        plan["parent_lineage"],
        (
            "machine_identity_binding_pr",
            "machine_identity_binding_head",
            "machine_identity_binding_merge_commit",
            "collector_pr",
            "collector_head",
            "collector_merge_commit",
            "observed_normalized_machine_id_sha256",
            "machine_binding_blobs",
            "collector_blobs",
        ),
        "parent_lineage",
    )
    need(
        lineage["machine_identity_binding_pr"] == 3760
        and lineage["machine_identity_binding_head"] == "fe751eb56e18ec134b96cb7a4d03738e86379c0d"
        and lineage["machine_identity_binding_merge_commit"] == "a3a42e50c92bec4b2f8dadb7a1c6cfeca928d730"
        and lineage["collector_pr"] == 3761
        and lineage["collector_head"] == PARENT_HEAD
        and lineage["collector_merge_commit"] == "54ac07792178f403aa9bcaa293fc908b738851a3"
        and lineage["observed_normalized_machine_id_sha256"] == OBSERVED_DIGEST,
        "parent_lineage_invalid",
    )
    expected_binding = {k: v for k, v in PINS.items() if "machine-identity-binding" in k}
    expected_collector = {k: v for k, v in PINS.items() if "first-host-collector" in k}
    need(lineage["machine_binding_blobs"] == expected_binding, "machine_binding_blobs_invalid")
    need(lineage["collector_blobs"] == expected_collector, "collector_blobs_invalid")

    provenance = closed(plan["provenance_assessment"], tuple(PROVENANCE), "provenance")
    for key, expected in PROVENANCE.items():
        need(provenance[key] is expected, "provenance_claim_invalid:" + key)

    authority = closed(plan["authority"], AUTHORITY, "authority")
    for key in AUTHORITY:
        need(authority[key] is False, "forbidden_authority:" + key)

    need(
        plan["next_gate"]
        == "PRODUCE_SEPARATE_AUTHENTICATED_XIPHOS_MACHINE_ID_ATTESTATION_THEN_REBIND_COLLECTOR_HOST_AUTHORITY",
        "next_gate_invalid",
    )
    without_id = copy.deepcopy(plan)
    del without_id["plan_id"]
    expected_id = "voidapollyonxiphosprovenancehold1_" + hashlib.sha256(
        canonical(without_id)
    ).hexdigest()
    need(plan["plan_id"] == PLAN_ID == expected_id, "content_identity_invalid")
    return plan

def verify_parent_blobs() -> None:
    for rel, expected in PINS.items():
        actual = git_blob(read_regular(ROOT / rel))
        need(actual == expected, "parent_blob_mismatch:" + rel)

def adversaries(plan: dict) -> int:
    rejected = 0

    def expect(bad: dict, reason: str, label: str) -> None:
        nonlocal rejected
        try:
            validate(bad)
        except Hold as exc:
            need(str(exc) == reason, "wrong_rejection_reason:" + label + ":" + str(exc))
        else:
            raise Hold("mutation_accepted:" + label)
        rejected += 1

    for key, expected in PROVENANCE.items():
        bad = copy.deepcopy(plan)
        bad["provenance_assessment"][key] = not expected
        expect(bad, "provenance_claim_invalid:" + key, "provenance:" + key)

    for key in AUTHORITY:
        bad = copy.deepcopy(plan)
        bad["authority"][key] = True
        expect(bad, "forbidden_authority:" + key, "authority:" + key)

    bad = copy.deepcopy(plan)
    bad["parent_lineage"]["observed_normalized_machine_id_sha256"] = "0" * 64
    expect(bad, "parent_lineage_invalid", "observed_digest")

    bad = copy.deepcopy(plan)
    bad["plan_id"] = "voidapollyonxiphosprovenancehold1_" + "0" * 64
    expect(bad, "content_identity_invalid", "plan_id")

    duplicate = (
        '{"schema":"void_apollyon_xiphos_machine_id_provenance_hold_v1",'
        '"authority":{"host_pass_authorized":true},'
        '"authority":{"host_pass_authorized":false}}'
    ).encode("utf-8")
    try:
        parse_json(duplicate)
    except Hold as exc:
        need(str(exc).startswith("duplicate_json_key:"), "duplicate_json_wrong_hold")
    else:
        raise Hold("duplicate_json_accepted")
    rejected += 1

    try:
        parse_json(b'{"x":NaN}')
    except Hold as exc:
        need(str(exc).startswith("nonfinite_json_constant:"), "nonfinite_json_wrong_hold")
    else:
        raise Hold("nonfinite_json_accepted")
    rejected += 1
    return rejected

def main() -> None:
    need(sys.argv[1:] in ([], ["--self-test"], ["--run"]), "mode_invalid")
    plan = validate(parse_json(read_regular(PLAN, 256 * 1024)))
    rejected = adversaries(plan)
    verify_parent_blobs()
    print(MARKER + "_GREEN")
    print("plan_id=" + PLAN_ID)
    print("source_only=true")
    print("observed_normalized_machine_id_sha256=" + OBSERVED_DIGEST)
    print("raw_machine_id_absent_from_repository=true")
    print("digest_internal_consistency_proven=true")
    print("authenticated_xiphos_machine_identity_proven=false")
    print("merged_binding_claim_accepted_for_host_authority=false")
    print("collector_machine_identity_prerequisite_satisfied_for_host_execution=false")
    print("host_pass_authorized=false")
    print("parent_blob_validation=true")
    print("semantic_adversaries=" + str(rejected))
    print("training_execution_authorized=false")
    print("funds_movement_authorized=false")
    print("next_gate=PRODUCE_SEPARATE_AUTHENTICATED_XIPHOS_MACHINE_ID_ATTESTATION_THEN_REBIND_COLLECTOR_HOST_AUTHORITY")

if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError, RecursionError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:220])
        print("host_pass_authorized=false")
        print("training_execution_authorized=false")
        print("funds_movement_authorized=false")
        raise SystemExit(2)
