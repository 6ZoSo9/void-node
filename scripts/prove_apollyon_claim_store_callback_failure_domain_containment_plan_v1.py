#!/usr/bin/env python3
"""Source-only proof for Apollyon callback failure-domain containment plan V1."""
from __future__ import annotations

import copy
import fcntl
import hashlib
import json
import os
import select
import signal
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "ops/security/apollyon-claim-store-callback-failure-domain-containment-plan-v1.json"
MARKER = "VOID_APOLLYON_CLAIM_STORE_CALLBACK_FAILURE_DOMAIN_CONTAINMENT_PLAN_V1_PROOF"
PARENT = "187a4da4992b7d81330b9474e535b8af631de0d4"
PLAN_ID = "voidapollyonclaimcallbackcontain1_17848cb11147fb0284268258e784826daf75630687abec922c4dd5d972b7be68"

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

# Roles are provenance semantics, not interchangeable labels for any pinned blob.
ROLE_PATHS = {
    "core": "tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs",
    "transaction_lease": "tools/apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs",
    "native_bridge": "tools/apollyon-durable-attempt-claim-store-native-bridge-v2.mjs",
    "core_proof": "scripts/prove_apollyon_durable_attempt_claim_store_service_source_implementation_v2.mjs",
    "native_proof": "scripts/prove_apollyon_durable_attempt_claim_store_native_bridge_v2.mjs",
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
    "supervisor_death_prior_worker_quiescence_before_fence_reuse_required",
    "supervisor_restart_durable_fencing_epoch_and_unknown_recovery_required",
    "unknown_mutation_after_abnormal_exit_maps_to_indeterminate_required",
    "terminal_store_generation_revalidation_required",
    "terminal_peer_identity_revalidation_required",
    "terminal_callback_source_identity_revalidation_required",
    "terminal_checks_after_worker_tree_quiescence_before_ack_required",
    "supervisor_bounded_canonical_receipt_frame_and_eof_required",
    "supervisor_bounded_stdout_stderr_diagnostic_capture_required",
    "supervisor_preexec_kernel_memory_pid_cpu_fd_quotas_required",
    "supervisor_quota_breach_unknown_mutation_indeterminate_required",
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
        need(item["path"] == ROLE_PATHS[role], "bound_source_role_invalid:" + role)
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
    """Exercise semantic gates, never count a mere stale plan_id as coverage."""
    rejected = 0

    def expect_reason(bad: dict, expected: str, label: str) -> None:
        try:
            validate(bad)
        except Hold as exc:
            need(
                str(exc) == expected,
                "wrong_rejection_reason:" + label + ":" + str(exc),
            )
        else:
            raise Hold("mutation_accepted:" + label)

    for key in REQUIREMENTS:
        bad = copy.deepcopy(plan)
        bad["required_future_runtime_contract"][key] = False
        expect_reason(bad, "missing_requirement:" + key, "requirement:" + key)
        rejected += 1

    for key in AUTHORITY:
        bad = copy.deepcopy(plan)
        bad["authority"][key] = True
        expect_reason(bad, "forbidden_authority:" + key, "authority:" + key)
        rejected += 1

    for key in ("trusted_callback_origin_proven", "failure_domain_containment_proven"):
        bad = copy.deepcopy(plan)
        bad["observed_gap"][key] = True
        expect_reason(bad, "unproven_gate_promoted:" + key, "gate:" + key)
        rejected += 1

    for surface in SURFACES:
        bad = copy.deepcopy(plan)
        bad["observed_gap"]["rejected_promise_surfaces"] = [
            item for item in SURFACES if item != surface
        ]
        expect_reason(bad, "surface_set_invalid", "surface:" + surface)
        rejected += 1

    # A role with the correct hash of a *different* pinned source is not a
    # valid role binding. Test both a swap and a duplicate-path substitution.
    swapped = copy.deepcopy(plan)
    swapped["bound_sources"]["core"], swapped["bound_sources"]["transaction_lease"] = (
        swapped["bound_sources"]["transaction_lease"],
        swapped["bound_sources"]["core"],
    )
    expect_reason(swapped, "bound_source_role_invalid:core", "role_swap")
    rejected += 1

    duplicate = copy.deepcopy(plan)
    duplicate["bound_sources"]["core"] = copy.deepcopy(
        duplicate["bound_sources"]["native_bridge"]
    )
    expect_reason(duplicate, "bound_source_role_invalid:core", "role_duplicate")
    rejected += 1

    bad = copy.deepcopy(plan)
    bad["plan_id"] = "voidapollyonclaimcallbackcontain1_" + "0" * 64
    expect_reason(bad, "content_identity_invalid", "content_identity")
    rejected += 1
    return rejected


def source_metadata_identity_adversaries() -> None:
    """Synthetic descriptor metadata drift; never mutate protected inputs."""
    with tempfile.TemporaryDirectory(prefix="void-apollyon-source-identity-") as td:
        candidate = Path(td) / "source-proof.txt"
        payload = b"source-only-metadata-identity-fixture\n"
        candidate.write_bytes(payload)
        need(read_regular(candidate) == payload, "metadata_fixture_positive_failed")
        baseline = candidate.lstat()
        original_fstat = os.fstat

        class _DriftedStat:
            def __init__(self, observed: object, changed_field: str) -> None:
                self.observed = observed
                self.changed_field = changed_field

            def __getattr__(self, name: str) -> object:
                value = getattr(self.observed, name)
                if name == self.changed_field:
                    return value + 1
                return value

        for field in ("st_uid", "st_gid", "st_nlink"):
            def changed_fstat(fd: int, selected: str = field) -> object:
                observed = original_fstat(fd)
                if (
                    observed.st_dev == baseline.st_dev
                    and observed.st_ino == baseline.st_ino
                ):
                    return _DriftedStat(observed, selected)
                return observed

            try:
                os.fstat = changed_fstat
                try:
                    read_regular(candidate)
                except Hold as exc:
                    need(
                        str(exc).startswith("source_generation_changed:"),
                        "metadata_fixture_wrong_hold:" + field + ":" + str(exc),
                    )
                else:
                    raise Hold("source_metadata_identity_drift_accepted:" + field)
            finally:
                os.fstat = original_fstat
    print("source_uid_gid_nlink_metadata_drift_rejected=true")


def observe_unsafe_supervisor_death_fence_reuse() -> None:
    """Prove *hazard*, not protection, on disposable Linux file/processes.

    Worker remains alive while a separate parent-only flock owner is SIGKILLed.
    A new owner can then acquire the old lock. Future design MUST add crash
    cleanup and durable epoch fencing; this fixture does not implement them.
    """
    need(sys.platform.startswith("linux"), "supervisor_fixture_requires_linux")
    clean_env = {"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"}
    with tempfile.TemporaryDirectory(prefix="void-apollyon-supervisor-death-") as td:
        lock_path = os.path.join(td, "fencing.lock")
        worker = subprocess.Popen(
            [sys.executable, "-I", "-B", "-c", "import time; time.sleep(12)"],
            cwd="/", env=clean_env, stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            close_fds=True,
        )
        code = (
            "import fcntl,os,sys,time\n"
            "fd=os.open(sys.argv[1],os.O_CREAT|os.O_RDWR,0o600)\n"
            "fcntl.flock(fd,fcntl.LOCK_EX)\n"
            "print('fenced',flush=True)\n"
            "time.sleep(12)\n"
        )
        supervisor = subprocess.Popen(
            [sys.executable, "-I", "-B", "-c", code, lock_path],
            cwd="/", env=clean_env, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, close_fds=True,
        )
        try:
            assert supervisor.stdout is not None
            readable, _, _ = select.select([supervisor.stdout], [], [], 8)
            need(bool(readable), "supervisor_fixture_lock_not_observed")
            need(
                supervisor.stdout.readline().strip() == "fenced",
                "supervisor_fixture_wrong_lock_state",
            )
            supervisor.kill()
            supervisor.wait(timeout=3)
            need(supervisor.returncode == -signal.SIGKILL, "supervisor_fixture_not_killed")
            need(worker.poll() is None, "supervisor_fixture_prior_worker_not_live")
            reacquired_fd = os.open(lock_path, os.O_RDWR | os.O_CLOEXEC)
            try:
                try:
                    fcntl.flock(reacquired_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError as exc:
                    raise Hold("supervisor_fixture_unsafe_lease_not_reacquirable") from exc
            finally:
                os.close(reacquired_fd)
        finally:
            if supervisor.poll() is None:
                supervisor.kill()
            supervisor.wait(timeout=3)
            if worker.poll() is None:
                worker.kill()
            worker.wait(timeout=3)


def main() -> None:
    need(sys.argv[1:] in (["--self-test"], ["--run"]), "mode_invalid")
    plan = validate(json.loads(read_regular(PLAN)))
    rejected = adversarial_self_test(plan)
    source_metadata_identity_adversaries()
    observe_unsafe_supervisor_death_fence_reuse()

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
    print("unsafe_supervisor_death_fence_reuse_hazard_observed=true")
    print("negative_cases_failed_at_semantic_gate=true")
    print("bound_source_role_identities_enforced=true")
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
