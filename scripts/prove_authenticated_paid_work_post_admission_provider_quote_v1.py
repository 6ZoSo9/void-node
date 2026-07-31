#!/usr/bin/env python3
"""Focused proof for the bounded post-admission provider-quote closeout."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise RuntimeError(message)


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    source = (
        repo
        / "ops"
        / "close_authenticated_paid_work_post_admission_provider_quote_v1.py"
    )
    if not source.is_file():
        fail(f"closeout source missing: {source}")

    spec = importlib.util.spec_from_file_location(
        "void_authenticated_paid_work_post_admission_closeout_v1",
        source,
    )
    if spec is None or spec.loader is None:
        fail("failed to load closeout source")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    if module.CONFIRMATION != (
        "closeVoidAuthenticatedPaidWorkPostAdmissionProviderQuoteV1"
    ):
        fail("exact closeout confirmation changed")
    if module.QUOTE_TOTAL != "0.01":
        fail("fixed quote total changed")
    if module.QUOTE_ASSET != "USD":
        fail("fixed quote asset changed")
    if module.PAYMENT_RAIL_ID != "void.external.prepaid.v1":
        fail("payment rail identifier changed")
    if module.MIN_REMAINING_SECONDS < 600:
        fail("minimum remaining work-order window weakened")
    if tuple(module.APPROVAL_REASON_CODES) != ("operator_approved",):
        fail("operator approval reason codes changed")
    if module.LOGICAL_PROVIDER_ID != "void.provider.datanet.verify.precision":
        fail("logical provider ID changed")

    source_text = source.read_text(encoding="utf-8")
    forbidden_fragments = (
        "/__void/agents/paid-work/submissions/v1",
        "systemctl",
        "git push",
        "git commit",
        "eth_sendTransaction",
        "personal_sign",
        "sendRawTransaction",
    )
    for fragment in forbidden_fragments:
        if fragment in source_text:
            fail(f"forbidden execution fragment present: {fragment}")

    required_sources = {
        "scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts",
        "scripts/authenticated_paid_work_submission_operator_review_decision_v1.ts",
        "scripts/authenticated_paid_work_submission_provider_selection_v1.ts",
        "scripts/agent_paid_work_order_envelope_v1.ts",
        "scripts/agent_paid_work_quote_envelope_v1.ts",
        "tools/void-node-onion-binding-v1.mjs",
    }
    if set(module.SOURCE_SHA256) != required_sources:
        fail("reviewed source allowlist changed")
    for relative, expected_sha in module.SOURCE_SHA256.items():
        path = repo / relative
        if not path.is_file() or path.is_symlink():
            fail(f"reviewed source missing or unsafe: {relative}")
        observed_sha = module.sha256_file(path)
        if observed_sha != expected_sha:
            fail(
                f"reviewed source SHA mismatch: {relative} "
                f"observed={observed_sha} expected={expected_sha}"
            )

    required_source_fragments = (
        "invoke_and_persist_response(",
        "verify_canonical_work_order(",
        "canonical_json(list(APPROVAL_REASON_CODES))",
        "run_contract_integration_self_test(",
    )
    for fragment in required_source_fragments:
        if fragment not in source_text:
            fail(f"required orchestration fragment missing: {fragment}")

    authority = module.closeout_authority()
    if not authority or any(value is not False for value in authority.values()):
        fail("initial closeout authority is not fully false")
    quote_authority = module.quote_response_authority()
    if not quote_authority or any(
        value is not False for value in quote_authority.values()
    ):
        fail("quote response authority is not fully false")

    module.run_self_test()
    configured_tsx = os.environ.get("VOID_TSX_CLI", "").strip()
    tsx = (
        Path(configured_tsx).expanduser().resolve()
        if configured_tsx
        else repo / "node_modules/tsx/dist/cli.mjs"
    )
    if not tsx.is_file() or tsx.is_symlink():
        fail(f"canonical TSX CLI missing or unsafe: {tsx}")
    module.run_contract_integration_self_test(repo, tsx)

    print("reviewed_source_sha256_exact=true")
    print("private_state_root_confinement=true")
    print("approval_reason_codes_exact=true")
    print("logical_provider_id_fixed=true")
    print("canonical_duplicate_response_revalidation=true")
    print("canonical_work_order_verifier_invoked=true")
    print("canonical_contract_integration=true")
    print("no_live_submission_route=true")
    print("review_queue_contract_pinned=true")
    print("operator_review_contract_pinned=true")
    print("provider_selection_contract_pinned=true")
    print("work_order_contract_pinned=true")
    print("quote_contract_pinned=true")
    print("signed_node_binding_verifier_pinned=true")
    print("fixed_quote_total=0.01")
    print("fixed_quote_asset=USD")
    print("minimum_quote_window_seconds=600")
    print("payment_execution=false")
    print("work_dispatch=false")
    print("wc_ledger_write=false")
    print("void_settlement=false")
    print("wallet_or_signer_access=false")
    print("service_restart=false")
    print("deployment=false")
    print(
        "VOID_AUTHENTICATED_PAID_WORK_POST_ADMISSION_"
        "PROVIDER_QUOTE_CLOSEOUT_V1_EXACT_GREEN"
    )


if __name__ == "__main__":
    main()
