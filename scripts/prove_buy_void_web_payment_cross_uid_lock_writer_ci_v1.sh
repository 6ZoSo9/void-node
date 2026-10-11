#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  --prove)
    node_major=${2:?node major required}
    for file in \
      src/economic/buy_void_web_payment_cross_uid_lock_writer_v1.mjs \
      src/economic/buy_void_web_payment_cross_uid_lock_writer_impl_v1.mjs \
      src/economic/buy_void_web_payment_cross_uid_lock_validation_v1.mjs \
      scripts/prove_buy_void_web_payment_cross_uid_lock_writer_v1.mjs \
      scripts/lib/buy_void_web_payment_cross_uid_lock_writer_proof_*.mjs
    do node --check "$file"; done
    receipt="web-crossuid-writer-${node_major}.txt"
    node scripts/prove_buy_void_web_payment_cross_uid_lock_writer_v1.mjs > "$receipt"
    for expected in \
      VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1_SYNTHETIC_GREEN \
      actual_candidate_modules_evaluated_with_inert_imports=true \
      canonical_allocation_dispatch_planned_before_cross_uid_lock=true \
      canonical_verified_payment_allocation_dispatch_called_inside_cross_uid_lock=true \
      legacy_payment_only_writer_invoked=false \
      server_controlled_allocation_roots_bound=true \
      payment_verified_allocation_handoff_source_bound=true \
      lock_release_after_writer_callback=true \
      uncertain_callback_exception_retains_lock=true \
      immutable_event_and_request_snapshot_before_lock=true \
      deferred_lock_caller_mutation_cannot_redirect_writer=true \
      invalid_identity_status_proxy_accessor_and_cycle_rejected_prelock=true \
      fake_custody_lock_receipt_rejected=true \
      production_dispatch_invoked=false \
      payment_capacity_lock_verified=false \
      allocation_handoff_atomicity_proven=false \
      payment_acceptance=false \
      presale_activation=false \
      funds_movement=false
    do grep -Fx "$expected" "$receipt"; done
    ;;
  --scope)
    base=${2:?base required}
    head=${3:?head required}
    git diff --check "$base" "$head"
    git diff --name-only "$base" "$head" | sort > "${RUNNER_TEMP:-/tmp}/actual"
    printf '%s\n' \
      .github/workflows/buy-void-web-payment-cross-uid-lock-writer-v1.yml \
      docs/architecture/buy-void-web-payment-cross-uid-lock-writer-v1.md \
      scripts/lib/buy_void_web_payment_cross_uid_lock_writer_proof_cases_v1.mjs \
      scripts/lib/buy_void_web_payment_cross_uid_lock_writer_proof_harness_v1.mjs \
      scripts/lib/buy_void_web_payment_cross_uid_lock_writer_proof_input_v1.mjs \
      scripts/lib/buy_void_web_payment_cross_uid_lock_writer_proof_snapshot_v1.mjs \
      scripts/prove_buy_void_web_payment_cross_uid_lock_writer_ci_v1.sh \
      scripts/prove_buy_void_web_payment_cross_uid_lock_writer_v1.mjs \
      src/economic/buy_void_web_payment_cross_uid_lock_validation_v1.mjs \
      src/economic/buy_void_web_payment_cross_uid_lock_writer_impl_v1.mjs \
      src/economic/buy_void_web_payment_cross_uid_lock_writer_v1.mjs \
      | sort > "${RUNNER_TEMP:-/tmp}/expected"
    diff -u "${RUNNER_TEMP:-/tmp}/expected" "${RUNNER_TEMP:-/tmp}/actual"
    ;;
  *)
    echo "usage: $0 --prove NODE_MAJOR | --scope BASE HEAD" >&2
    exit 64
    ;;
esac
