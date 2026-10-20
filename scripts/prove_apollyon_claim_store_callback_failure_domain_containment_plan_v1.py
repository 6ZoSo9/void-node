#!/usr/bin/env python3
"""Source-only proof for Apollyon callback failure-domain containment plan V1."""
from __future__ import annotations

import copy
import hashlib
import json
import os
import stat
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "ops/security/apollyon-claim-store-callback-failure-domain-containment-plan-v1.json"
MARKER = "VOID_APOLLYON_CLAIM_STORE_CALLBACK_FAILURE_DOMAIN_CONTAINMENT_PLAN_V1_PROOF"
PARENT = "187a4da4992b7d81330b9474e535b8af631de0d4"
PLAN_ID = "voidapollyonclaimcallbackcontain1_7f9cfdb254519f951589367877a9ad28e1fe376cb813504ee4ded40b84efdae8"

PINS = {
    "tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs":
        "2d72a28e9daaeabcab58975a6f362c438c720592",
    "tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs":
        "445480e625e01e44be8722709d56d5a6541099e2",
    "tools/apollyon-durable-attempt-claim-store-native-bridge-v2.mjs":
        "69694ab1c8ffd8021817a449255eca956f91a7e8",
    "scripts/prove_apollyon_durable_attempt_claim_store_service_source_implementation_v2.mjs":
        "bed4c6fe3896ff48dfbc873d078fac943528fa5f",
    "scripts/prove_apollyon_durable_attempt_claim_store_native_bridge_v2.mjs":
        "848a061a0b246e138ec8ed775ed8a87f159476f6",
}
SURFACES = [
    "transaction_acquisition_result",
    "core_revalidator_result",
    "transaction_release_result",
    "native_bridge_revalidator_result",
]
REQUIREMENTS = [
    "separate_os_process_failure_domain_required",
    "one_request_per_isolated_process_required",
    "node_unhandled_rejections_strict_required",
    "custom_unhandled_rejection_suppression_forbidden",
    "callback_source_custody_and_exact_identity_required",
    "inherited_descriptor_allowlist_required",
    "minimal_environment_required",
    "no_success_ack_before_child_clean_exit_required",
    "canonical_success_receipt_required_before_clean_exit",
    "post_callback_event_loop_checkpoint_required",
    "trusted_supervisor_completion_checkpoint_unforgeable_required",
    "callback_initiated_clean_exit_cannot_authorize_success_required",
    "nonzero_or_signal_exit_maps_to_hold_required",
    "bounded_worker_deadline_and_process_tree_reap_required",
    "all_descendant_processes_and_worker_threads_quiescent_before_ack_required",
    "post_mutation_child_failure_maps_to_indeterminate_required",
    "automatic_replay_after_indeterminate_forbidden",
    "parent_must_ignore_buffered_success_after_abnormal_exit",
    "supervisor_held_fencing_lease_through_child_exit_and_terminal_checks_required",
    "unknown_mutation_after_abnormal_exit_maps_to_indeterminate_required",
    "terminal_store_generation_revalidation_required",
    "terminal_peer_identity_revalidation_required",
    "terminal_callback_source_identity_revalidation_required",
    "terminal_checks_after_worker_tree_quiescence_before_ack_required",
    "supervisor_bounded_canonical_receipt_frame_and_eof_required",
    "supervisor_bounded_stdout_stderr_diagnostic_capture_required",
]
AUTHORITY = [
    "protected_host_execution_authorized",
    "filesystem_mutation_authorized",
    "service_or_systemd_mutation_authorized",
    "production_claim_publication_authorized",
    "training_start_authorized",
    "training_execution_authorized",
    "credential_access_authorized",
    "private_key_or_wallet_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "funds_movement_authorized",
]


class Hold(Exception):
    pass


def need(ok: bool, reason: str) -> None:
    if not ok:
        raise Hold(reason)


def closed(value: object, keys: tuple[str, ...] | list[str], label: str) -> dict:
    need(type(value) is dict and set(value) == set(keys), label + "_shape_invalid")
    return value  # type: ignore[return-value]


def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False
    ).encode("ascii")


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read_regular(path: Path, maximum: int = 2 * 1024 * 1024) -> bytes:
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
        attrs = ("st_dev", "st_ino", "st_mode", "st_size", "st_mtime_ns", "st_ctime_ns")
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
            "schema",
            "marker",
            "version",
            "repository",
            "stack_parent_pr",
            "stack_parent_head",
            "bound_sources",
            "observed_gap",
            "required_future_runtime_contract",
            "authority",
            "next_gate",
            "plan_id",
        ),
        "plan",
    )
    need(
        plan["schema"]
        == "void_apollyon_claim_store_callback_failure_domain_containment_plan_v1"
        and plan["marker"]
        == "VOID_APOLLYON_CLAIM_STORE_CALLBACK_FAILURE_DOMAIN_CONTAINMENT_PLAN_V1"
        and type(plan["version"]) is int
        and plan["version"] == 1,
        "schema_invalid",
    )
    need(
        plan["repository"] == "6ZoSo9/void-node"
        and plan["stack_parent_pr"] == 3549
        and plan["stack_parent_head"] == PARENT,
        "lineage_invalid",
    )
    bound = closed(
        plan["bound_sources"],
        ("core", "transaction_lease", "native_bridge", "core_proof", "native_proof"),
        "bound_sources",
    )
    for role, row in bound.items():
        item = closed(row, ("path", "git_blob_sha1"), "bound_source:" + role)
        need(item["path"] in PINS, "bound_source_path_invalid:" + role)
        need(
            item["git_blob_sha1"] == PINS[item["path"]],
            "bound_source_blob_invalid:" + role,
        )

    gap = closed(
        plan["observed_gap"],
        (
            "rejected_promise_surfaces",
            "getter_safe_promise_rejection_preserved",
            "caller_promise_constructor_or_species_must_not_be_observed",
            "already_rejected_promise_can_terminate_containing_node_process",
            "trusted_callback_origin_proven",
            "failure_domain_containment_proven",
        ),
        "observed_gap",
    )
    need(gap["rejected_promise_surfaces"] == SURFACES, "surface_set_invalid")
    for key in (
        "getter_safe_promise_rejection_preserved",
        "caller_promise_constructor_or_species_must_not_be_observed",
        "already_rejected_promise_can_terminate_containing_node_process",
    ):
        need(gap[key] is True, "gap_fact_invalid:" + key)
    for key in ("trusted_callback_origin_proven", "failure_domain_containment_proven"):
        need(gap[key] is False, "unproven_gate_promoted:" + key)

    required = closed(
        plan["required_future_runtime_contract"], REQUIREMENTS, "runtime_contract"
    )
    for key in REQUIREMENTS:
        need(required[key] is True, "missing_requirement:" + key)

    authority = closed(plan["authority"], AUTHORITY, "authority")
    for key in AUTHORITY:
        need(authority[key] is False, "forbidden_authority:" + key)

    need(
        plan["next_gate"]
        == "DISTINCT_REVIEW_FAILURE_DOMAIN_PLAN_THEN_BUILD_ISOLATED_RUNTIME_CANDIDATE_V1",
        "next_gate_invalid",
    )
    without_id = copy.deepcopy(plan)
    del without_id["plan_id"]
    expected = "voidapollyonclaimcallbackcontain1_" + hashlib.sha256(
        canonical(without_id)
    ).hexdigest()
    need(plan["plan_id"] == expected == PLAN_ID, "content_identity_invalid")
    return plan


def adversarial_self_test(plan: dict) -> int:
    rejected = 0
    for key in REQUIREMENTS:
        bad = copy.deepcopy(plan)
        bad["required_future_runtime_contract"][key] = False
        try:
            validate(bad)
        except Hold:
            rejected += 1
        else:
            raise Hold("requirement_mutation_accepted:" + key)

    for key in AUTHORITY:
        bad = copy.deepcopy(plan)
        bad["authority"][key] = True
        try:
            validate(bad)
        except Hold:
            rejected += 1
        else:
            raise Hold("authority_mutation_accepted:" + key)

    for key in ("trusted_callback_origin_proven", "failure_domain_containment_proven"):
        bad = copy.deepcopy(plan)
        bad["observed_gap"][key] = True
        try:
            validate(bad)
        except Hold:
            rejected += 1
        else:
            raise Hold("unproven_gate_mutation_accepted:" + key)

    for surface in SURFACES:
        bad = copy.deepcopy(plan)
        bad["observed_gap"]["rejected_promise_surfaces"] = [
            item for item in SURFACES if item != surface
        ]
        try:
            validate(bad)
        except Hold:
            rejected += 1
        else:
            raise Hold("surface_omission_accepted:" + surface)

    bad = copy.deepcopy(plan)
    bad["plan_id"] = "voidapollyonclaimcallbackcontain1_" + "0" * 64
    try:
        validate(bad)
    except Hold:
        rejected += 1
    else:
        raise Hold("identity_mutation_accepted")
    return rejected


def main() -> None:
    need(sys.argv[1:] in (["--self-test"], ["--run"]), "mode_invalid")
    plan = validate(json.loads(read_regular(PLAN)))
    rejected = adversarial_self_test(plan)

    if sys.argv[1] == "--run":
        for rel, expected in PINS.items():
            actual = git_blob(read_regular(ROOT / rel))
            need(actual == expected, "inherited_blob_mismatch:" + rel)

        core = read_regular(
            ROOT
            / "tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs"
        ).decode("utf-8", "strict")
        bridge = read_regular(
            ROOT / "tools/apollyon-durable-attempt-claim-store-native-bridge-v2.mjs"
        ).decode("utf-8", "strict")
        proof = read_regular(
            ROOT
            / "scripts/prove_apollyon_durable_attempt_claim_store_service_source_implementation_v2.mjs"
        ).decode("utf-8", "strict")
        for required in (
            "unhandled_rejected_promise_containment_required:true",
            "unhandled_rejected_promise_containment_proven:false",
            "types.isPromise(result)",
            "apollyon_claim_store_impl_v2_async_revalidator_forbidden",
            "apollyon_claim_store_impl_v2_transaction_release_result_invalid",
        ):
            need(required in core or required in proof, "core_gap_evidence_missing:" + required)
        need(
            "apollyon_claim_store_bridge_v2_async_revalidator_forbidden" in bridge
            and "types.isPromise(result)" in bridge,
            "bridge_gap_evidence_missing",
        )
        need(
            "unhandled rejected Promise unexpectedly contained" in proof,
            "disposable_failure_domain_evidence_missing",
        )

    print(MARKER + "_GREEN")
    print("plan_id=" + PLAN_ID)
    print("source_only=true")
    print("rejected_promise_surfaces=" + str(len(SURFACES)))
    print("runtime_contract_requirements=" + str(len(REQUIREMENTS)))
    print("rejected_adversaries=" + str(rejected))
    print(
        "inherited_blob_validation="
        + ("true" if sys.argv[1] == "--run" else "not_requested")
    )
    print("failure_domain_containment_proven=false")
    print("trusted_callback_origin_proven=false")
    print("protected_host_execution_authorized=false")
    print("training_execution_authorized=false")
    print("funds_movement_authorized=false")
    print("next_gate=DISTINCT_REVIEW_FAILURE_DOMAIN_PLAN_THEN_BUILD_ISOLATED_RUNTIME_CANDIDATE_V1")


if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError, RecursionError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:200])
        print("protected_host_execution_authorized=false")
        print("training_execution_authorized=false")
        print("funds_movement_authorized=false")
        raise SystemExit(2)
