#!/usr/bin/env python3
"""Source-only proof for Apollyon protected-store first-host evidence plan V1."""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "ops/security/apollyon-protected-store-first-host-evidence-plan-v1.json"
MARKER = "VOID_APOLLYON_PROTECTED_STORE_FIRST_HOST_EVIDENCE_PLAN_V1_PROOF"
PLAN_ID = "voidapollyonfirsthostplan1_be2b83c33630bce1e9bc635cbdd90981f55df38ab0e929706acd4cd7798015ca"
PARENT_HEAD = "3706aecf2e258c9c7021137da05428187bbe6654"

PINS = {
    "tools/apollyon-training-start-protected-store-revalidator-contract-v2.mjs":
        "4c78459826c25cab43870b0b322b566575d18667",
    "scripts/prove_apollyon_training_start_protected_store_revalidator_contract_v2.mjs":
        "2e919af52e44c6dcfec41dc47567a73f658874c3",
    "docs/security/apollyon-training-start-protected-store-revalidator-contract-v2.md":
        "9f5a94967abd85d81d6f693bf6ff51d086623de9",
    ".github/workflows/apollyon-training-start-protected-store-revalidator-contract-v2.yml":
        "2774c5f9c3d037cfbd32c15d4af05cb640199ae1",
}
REQUIREMENTS = [
    "separate_operator_authorization_required",
    "root_privilege_only_if_required_for_metadata_visibility",
    "read_only_metadata_safe_only",
    "exact_target_host_required",
    "authenticated_machine_identity_evidence_required_before_host_pass",
    "exact_parent_candidate_identity_required",
    "installed_source_generation_identity_observation_required",
    "installed_package_runtime_identity_observation_required",
    "installed_service_process_identity_observation_required",
    "fixed_root_only_no_caller_selected_path",
    "retained_descriptor_no_follow_nonblocking_cloexec_required",
    "trusted_ancestor_metadata_required",
    "root_owner_group_mode_link_type_required",
    "consumption_directory_owner_group_mode_link_type_required",
    "root_access_and_default_acl_absence_required",
    "consumption_access_and_default_acl_absence_required",
    "mount_namespace_and_bind_alias_metadata_required",
    "retained_visible_inode_generation_comparison_required",
    "metadata_before_after_stability_required",
    "service_state_observation_only_required",
    "process_status_uid_gid_groups_caps_nnp_observation_only_required",
    "process_executable_identity_observation_only_required",
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
    "absence_is_evidence_only_not_authority",
    "hold_on_unreadable_ambiguous_or_changed_metadata",
    "receipt_must_preserve_negative_authority",
]
AUTHORITY = [
    "host_pass_performed",
    "machine_identity_bound",
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


def parse_plan_json(raw: bytes) -> object:
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
        attrs = ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
                 "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns")
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
    plan = closed(
        value,
        (
            "schema", "marker", "version", "repository", "issue", "parent",
            "hosted_candidate", "fixed_host_contract", "first_pass_requirements",
            "authority", "next_gate", "plan_id",
        ),
        "plan",
    )
    need(
        plan["schema"] == "void_apollyon_protected_store_first_host_evidence_plan_v1"
        and plan["marker"] == "VOID_APOLLYON_PROTECTED_STORE_FIRST_HOST_EVIDENCE_PLAN_V1"
        and plan["version"] == 1
        and plan["repository"] == "6ZoSo9/void-node"
        and plan["issue"] == 3557,
        "identity_invalid",
    )

    parent = closed(
        plan["parent"],
        (
            "pr", "head",
            "contract_path", "contract_git_blob_sha1",
            "proof_path", "proof_git_blob_sha1",
            "document_path", "document_git_blob_sha1",
            "workflow_path", "workflow_git_blob_sha1",
        ),
        "parent",
    )
    need(parent["pr"] == 3743 and parent["head"] == PARENT_HEAD, "parent_identity_invalid")
    expected_parent = [
        ("contract", "tools/apollyon-training-start-protected-store-revalidator-contract-v2.mjs"),
        ("proof", "scripts/prove_apollyon_training_start_protected_store_revalidator_contract_v2.mjs"),
        ("document", "docs/security/apollyon-training-start-protected-store-revalidator-contract-v2.md"),
        ("workflow", ".github/workflows/apollyon-training-start-protected-store-revalidator-contract-v2.yml"),
    ]
    for role, path in expected_parent:
        need(parent[role + "_path"] == path, "parent_path_invalid:" + role)
        need(parent[role + "_git_blob_sha1"] == PINS[path], "parent_blob_invalid:" + role)

    hosted = closed(
        plan["hosted_candidate"],
        (
            "workflow_run", "node22_artifact_id", "node24_artifact_id",
            "node26_artifact_id", "cross_node_compare_job_id", "candidate_id",
            "candidate_frame_bytes", "candidate_frame_sha256",
            "cross_node_byte_identity_verified",
        ),
        "hosted_candidate",
    )
    need(
        hosted["workflow_run"] == 39963410577
        and hosted["node22_artifact_id"] == 12506463546
        and hosted["node24_artifact_id"] == 12506363765
        and hosted["node26_artifact_id"] == 12507375197
        and hosted["cross_node_compare_job_id"] == 120455735301
        and hosted["candidate_id"]
        == "apollyon_training_start_protected_store_revalidator_v2:20fb5bedf6db2b606fb9adb025f95786417d58458d6bc06444b8f03c756f3444"
        and hosted["candidate_frame_bytes"] == 9570
        and hosted["candidate_frame_sha256"]
        == "e178d7150e90d0538fed1d6721d731b9bffe66546b960877ac6aa4e5c7b98626"
        and hosted["cross_node_byte_identity_verified"] is True,
        "hosted_candidate_invalid",
    )

    fixed = closed(
        plan["fixed_host_contract"],
        (
            "target_host",
            "machine_identity_kind",
            "expected_machine_id_sha256",
            "machine_identity_binding_status",
            "claim_state_root",
            "consumption_directory",
        ),
        "fixed_host_contract",
    )
    need(
        fixed["target_host"] == "Xiphos"
        and fixed["machine_identity_kind"] == "etc_machine_id_sha256"
        and fixed["expected_machine_id_sha256"] is None
        and fixed["machine_identity_binding_status"]
        == "UNBOUND_REQUIRES_SEPARATE_AUTHENTICATED_XIPHOS_MACHINE_ID_EVIDENCE"
        and fixed["claim_state_root"] == "/var/lib/void-apollyon-attempt-claim-v2"
        and fixed["consumption_directory"]
        == "/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1",
        "fixed_host_contract_invalid",
    )

    req = closed(plan["first_pass_requirements"], REQUIREMENTS, "first_pass_requirements")
    for key in REQUIREMENTS:
        need(req[key] is True, "missing_requirement:" + key)

    authority = closed(plan["authority"], AUTHORITY, "authority")
    for key in AUTHORITY:
        need(authority[key] is False, "forbidden_authority:" + key)

    need(
        plan["next_gate"]
        == "BIND_AUTHENTICATED_XIPHOS_MACHINE_ID_THEN_SEPARATE_AUTHORIZATION_THEN_READ_ONLY_METADATA_SAFE_XIPHOS_FIRST_PASS",
        "next_gate_invalid",
    )
    no_id = copy.deepcopy(plan)
    del no_id["plan_id"]
    expected = "voidapollyonfirsthostplan1_" + hashlib.sha256(canonical(no_id)).hexdigest()
    need(plan["plan_id"] == expected == PLAN_ID, "content_identity_invalid")
    return plan


def adversaries(plan: dict) -> int:
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

    for key in REQUIREMENTS:
        bad = copy.deepcopy(plan)
        bad["first_pass_requirements"][key] = False
        expect(bad, "missing_requirement:" + key, "requirement:" + key)

    for key in AUTHORITY:
        bad = copy.deepcopy(plan)
        bad["authority"][key] = True
        expect(bad, "forbidden_authority:" + key, "authority:" + key)

    bad = copy.deepcopy(plan)
    bad["fixed_host_contract"]["target_host"] = "Precision"
    expect(bad, "fixed_host_contract_invalid", "target_host")

    bad = copy.deepcopy(plan)
    bad["fixed_host_contract"]["machine_identity_kind"] = "hostname"
    expect(bad, "fixed_host_contract_invalid", "machine_identity_kind")

    bad = copy.deepcopy(plan)
    bad["fixed_host_contract"]["expected_machine_id_sha256"] = "0" * 64
    expect(bad, "fixed_host_contract_invalid", "machine_identity_unexpected_binding")

    bad = copy.deepcopy(plan)
    bad["fixed_host_contract"]["machine_identity_binding_status"] = "BOUND"
    expect(bad, "fixed_host_contract_invalid", "machine_identity_status")

    bad = copy.deepcopy(plan)
    bad["fixed_host_contract"]["claim_state_root"] = "/tmp/claim"
    expect(bad, "fixed_host_contract_invalid", "fixed_root")

    bad = copy.deepcopy(plan)
    bad["hosted_candidate"]["candidate_frame_sha256"] = "0" * 64
    expect(bad, "hosted_candidate_invalid", "candidate_sha")

    bad = copy.deepcopy(plan)
    bad["hosted_candidate"]["candidate_id"] = "apollyon_training_start_protected_store_revalidator_v2:" + "0" * 64
    expect(bad, "hosted_candidate_invalid", "candidate_id")

    bad = copy.deepcopy(plan)
    bad["parent"]["contract_git_blob_sha1"] = "0" * 40
    expect(bad, "parent_blob_invalid:contract", "parent_contract_blob")

    bad = copy.deepcopy(plan)
    bad["plan_id"] = "voidapollyonfirsthostplan1_" + "0" * 64
    expect(bad, "content_identity_invalid", "plan_id")
    return rejected


def main() -> None:
    need(sys.argv[1:] in (["--self-test"], ["--run"]), "mode_invalid")
    raw_plan = read_regular(PLAN, 256 * 1024)
    plan = validate(parse_plan_json(raw_plan))
    rejected = adversaries(plan)

    duplicate = raw_plan.replace(
        b'"parent": {',
        b'"authority": {"host_pass_performed": true},\n  "parent": {',
        1,
    )
    need(duplicate != raw_plan, "duplicate_fixture_injection_failed")
    try:
        parse_plan_json(duplicate)
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
    print("plan_id=" + PLAN_ID)
    print("source_only=true")
    print("parent_pr=3743")
    print("parent_head=" + PARENT_HEAD)
    print("parent_blob_count=" + str(len(PINS)))
    print("first_pass_requirement_count=" + str(len(REQUIREMENTS)))
    print("negative_authority_count=" + str(len(AUTHORITY)))
    print("rejected_adversaries=" + str(rejected))
    print("hosted_candidate_identity_bound=true")
    print("machine_identity_binding_required=true")
    print("machine_identity_bound=false")
    print("duplicate_json_keys_rejected=true")
    print("cross_node_candidate_evidence_bound=true")
    print("read_only_metadata_safe_first_pass_required=true")
    print("protected_record_contents_read_forbidden=true")
    print("process_environment_read_forbidden=true")
    print("raw_process_args_read_forbidden=true")
    print("host_read_performed=false")
    print("filesystem_mutation=false")
    print("service_mutation=false")
    print("writer_capability_created=false")
    print("claim_publication=false")
    print("training_execution=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_gate=BIND_AUTHENTICATED_XIPHOS_MACHINE_ID_THEN_SEPARATE_AUTHORIZATION_THEN_READ_ONLY_METADATA_SAFE_XIPHOS_FIRST_PASS")


if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError, RecursionError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:240])
        print("host_read_performed=false")
        print("filesystem_mutation=false")
        print("service_mutation=false")
        print("training_execution=false")
        print("funds_movement=false")
        raise SystemExit(2)
