#!/usr/bin/env python3
import json
import sys
from pathlib import Path

MARKER = "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1"

def classify(job):
    if job.get("transport_error") == "timeout":
        return "timeout_retry_backoff"

    http_status = job.get("http_status")

    if http_status == 403:
        return "endpoint_blocked_403_no_retry"

    if http_status == 429:
        return "rate_limited_429_backoff"

    if http_status == 200 and job.get("rpc_error_present") is True:
        return "rpc_error_hold"

    if http_status == 200 and job.get("rpc_result_receipt_present") is True:
        return "observed_receipt_success"

    if http_status == 200 and job.get("rpc_result_receipt_present") is False:
        return "observed_receipt_not_found"

    return "operator_review_required"

def main():
    fixture = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures/public/usdc-external-receipt-observation-queue-v1.json")
    data = json.loads(fixture.read_text())

    assert data["marker"] == MARKER
    assert data["queue_definition_only"] is True

    for key in [
        "public_mutation_enabled",
        "live_fetch_now",
        "finality_verified_now",
        "external_state_root_trust_enabled",
        "real_payment_verified_now",
        "automatic_fulfillment_enabled",
        "private_allocation_ledger_write_enabled",
        "inventory_reserved_now",
        "void_transfer_now",
    ]:
        assert data[key] is False, f"authority_must_remain_false={key}"

    counts = {}
    for job in data["jobs"]:
        got = classify(job)
        exp = job["expected_queue_state"]
        assert got == exp, f"classification_mismatch job_id={job.get('job_id')} got={got} expected={exp}"
        counts[got] = counts.get(got, 0) + 1

    required_states = [
        "observed_receipt_success",
        "observed_receipt_not_found",
        "endpoint_blocked_403_no_retry",
        "rate_limited_429_backoff",
        "timeout_retry_backoff",
        "rpc_error_hold",
        "operator_review_required",
    ]
    for state in required_states:
        assert counts.get(state, 0) >= 1, f"missing_state={state}"

    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1_BEGIN")
    print(f"fixture_path={fixture}")
    for state in required_states:
        print(f"{state}_green=true")
    print("queue_definition_only_green=true")
    print("receipt_observation_queue_authority_false_green=true")
    print("VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1_GREEN")

if __name__ == "__main__":
    raise SystemExit(main())
