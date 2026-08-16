# Buy VOID ERC-20 delivery runtime activation configuration contract v1

Marker: `VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1`

## Source boundary

The canonical ERC-20 execution-composition source is a prerequisite of any later activation. The retained delivery runtime does not accept a caller-supplied nonce/gas/fee transaction plan. It delegates to the server-controlled execution-composition layer, which derives the exact `VoidToken.transfer(...)` transaction through the coherent `pending` planner, durably reserves the wallet nonce, persists signed-hash custody before broadcast, uses the existing saga write-ahead broadcast-intent boundary, reconciles exact ERC-20 receipts into canonical `record_confirmed`, and leaves terminal inventory/public closeout to the existing saga closeout implementation.

The canonical parent mounts this already-reviewed runtime while leaving execution disabled. Dormant signer/broadcaster dependency injection is separately fail-closed to delivery enable exact `0`. Neither source composition nor dormant injection enables production execution, inspects a credential, funds presale inventory, or authorizes a transaction.

## Reviewed production configuration binding

PR #1313 merged the reviewed Mainnet-0 production candidate into canonical source at merge commit `5a66040d63225dee59fc449937fda063800d425a`. The parent now consumes that reviewed evidence rather than retaining the obsolete configuration-verification blocker.

The reviewed parent binding is:

```text
binding_marker=VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1
configuration_fingerprint_sha256=9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992
repository_candidate_binding_ready=true
production_configuration_applied=false
runtime_activation_authorized=false
dependency_injection_activation_authorized=false
inventory_funding_authorized=false
```

The candidate remains fixed to Chain 2050, the frozen Mainnet-0 VoidToken, the canonical fulfillment wallet and credential evidence, loopback RPC `http://127.0.0.1:8545/`, the full 10,000,000 VOID delivery ceiling, reviewed gas/fee policy, and three receipt confirmations. Runtime integration and dependency injection remain disabled in the reviewed candidate.

`production_configuration_values_verified=true`, `production_credential_binding_ready=true`, and `production_broad_delivery_configuration_verified=true` mean the reviewed repository candidate and its credential-to-wallet evidence binding are complete. They do **not** mean the configuration has been applied to a process, a credential has been read, or runtime execution has been enabled.

## Required production configuration contract

The production configuration is content-bound by the merged verifier and candidate-binding record. It requires the server-controlled loopback ERC-20 RPC URL, gas-limit multiplier, fee multiplier, receipt confirmation depth, exact full-presale delivery maximum, canonical token and wallet identities, and the fixed credential evidence ID.

The generic verifier remains reusable after lifecycle promotion. It still validates explicit candidates only and still requires the activation contract itself to remain fail-closed: the runtime activation contract must exist, runtime activation must remain false, and production configuration must remain unapplied.

## Execution ordering

The disabled parent mount must continue proving:

- caller transaction plans are forbidden;
- planning uses coherent `pending` state;
- overlapping use of the same pending wallet nonce fails closed;
- the exact signed transaction hash and server-derived plan are recoverable before broadcast;
- a crash after possible provider acceptance never causes automatic rebroadcast;
- receipt presence can repair a missing broadcast projection without asserting a broadcast before evidence exists;
- the full ERC-20 receipt reconciler validates the canonical `Transfer` and confirmation stability;
- canonical `record_confirmed` is written before the saga advances to `receipt_confirmed`; and
- the existing terminal closeout remains the sole inventory/public closeout implementation.

## Current truth

```text
status=production_configuration_verified_held_on_durable_history_creation_recovery
erc20_execution_composition_ready=true
canonical_delivery_runtime_activation_ready=false
production_configuration_values_verified=true
production_credential_binding_ready=true
canonical_production_credential_binding_evidence_ready=true
production_configuration_applied=false
dormant_dependency_injection_source_ready=true
dormant_dependency_injection_requires_delivery_runtime_disabled=true
dormant_dependency_injection_required_delivery_enable_value=0
dormant_dependency_injection_wallet_evidence_binding_required=true
dependency_injection_runtime_ready=false
canonical_delivery_runtime_parent_mounted=true
canonical_delivery_execution_ready=false
presale_inventory_funding_ready=false
canonical_presale_pool_id=buy-void-presale-v1
canonical_presale_max_void=10000000
canonical_presale_max_fulfillment_units_6_decimal=10000000000000
canonical_presale_max_reservation_fulfillment_units_6_decimal=10000000000000
finite_presale_cap_local_history_enforced=true
finite_presale_cap_end_to_end_enforced=false
canonical_presale_rate=2/1
fixed_presale_rate_enforced=true
reservation_ceiling_equals_total_pool=true
per_buyer_purchase_throttle_below_remaining_inventory=false
validator_scale_purchase_10000_void_admission_ready=true
delivery_execution_amount_cap_separate_from_purchase_admission=true
public_delivery_activation_requires_presale_capacity_max=true
production_broad_delivery_configuration_verified=true
paid_unreservable_terminal_obligation_local_integrity_ready=true
paid_unreservable_terminal_obligation_ready=false
durable_history_local_consistency_ready=true
durable_history_creation_commit_point_ready=false
durable_history_creation_crash_recovery_ready=false
durable_history_partial_creation_retry_ready=false
durable_history_manual_state_surgery_required_after_creation_crash=true
durable_history_external_anti_rollback_anchor_ready=false
durable_history_valid_suffix_rollback_detection_ready=false
activation_readiness_blockers=durable_history_creation_crash_recovery_not_ready,durable_history_anti_rollback_anchor_not_ready,canonical_delivery_runtime_activation_not_ready
current_parent_blocker=durable_history_creation_crash_recovery_not_ready
next_gate=durable_history_creation_crash_recovery
```

Credential key-to-wallet evidence is recorded for the canonical Precision/Mainnet-0 fulfillment wallet without inferring clone-local binding. Dormant dependency injection requires delivery enable exact `0`, the exact evidence ID, and a configured delivery wallet matching that evidence; any mismatch remains held before dependencies are populated.

The canonical presale economics source is fail-closed to one pool (`buy-void-presale-v1`), exactly 10000000 VOID (10000000000000 six-decimal fulfillment units), and exactly `2 VOID / 1 USDC`. The inventory reservation ceiling equals the entire presale pool, so there is **no per-buyer 2-VOID throttle** below remaining inventory. A 10,000 VOID validator-scale purchase is explicitly proven to reserve successfully.

`VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS` remains a separate delivery-execution safety control. A lower 2-VOID canary is allowed only while delivery is disabled; public delivery activation fails configuration unless the delivery maximum equals the canonical presale capacity so every admitted purchase can be fulfilled without an execution-layer throttle.

The obsolete broad-configuration verification blocker is closed. Three source/runtime gates remain before production activation: deterministic creation-crash recovery for the durable history journal, an independent durable-history anti-rollback anchor, and then actual canonical delivery runtime activation. Applying the reviewed configuration, enabling dependency/runtime execution, funding inventory, reading the production credential, signing, broadcasting, and moving funds remain separate operational authorization boundaries.


## Durable presale history integrity and anti-rollback boundary

The presale reservation and paid-unreservable-liability journals are fail-closed
against malformed/local corruption, substitution, and history shrinkage while
the independent local index commitment survives. They do not yet provide an
external anti-rollback witness for a coordinated valid-suffix rollback of all
local artifacts.

Every new reservation and every new paid-unreservable obligation first appends
and fsyncs a closed entry to the pool-level `history-index-v1.jsonl` under the
same pool lock. The index is a sequence-checked hash chain binding record kind,
content-derived ID, exact immutable-record fingerprint, and previous-entry hash.
Only after that durable membership commitment exists does the writer publish the
matching expectation record and durable reservation/liability record.

On every read, the authoritative expected IDs are derived from the index. The
index-derived set must match both expectation and durable-record directories
exactly, each filename must match the embedded derived identity, and both
expectation and record objects must satisfy their closed schemas.

Accordingly:

- a present record that becomes `null`, an array/primitive, malformed, unreadable,
  schema-invalid, or content-substituted is an explicit HOLD;
- deletion or rename before enumeration is detected because the expected ID
  remains committed in the independent history index, including paired deletion
  or paired rename of both the durable record and its expectation;
- a malformed or truncated history-index tail fails closed, and removing a valid
  index tail while leaving its committed record state produces an indexed-set HOLD;
- coordinated removal of a valid history-index suffix together with every matching
  expectation and record can leave the remaining local chain internally valid;
  this case is explicitly **not** claimed as solved by the local journal and is
  the reason `durable_history_anti_rollback_anchor_not_ready` remains an
  activation blocker;
- a duplicate valid record under another canonical-looking filename is rejected
  as an unexpected record rather than double-counted;
- paid-unreservable liability corruption blocks new reservation mutation instead
  of hiding an operator-reconciliation obligation; and
- a crash after expectation publication but before durable record publication
  leaves an expected-record mismatch and therefore fails closed.

Preexisting nonempty durable history without the paired expectation index is not
silently adopted as a fresh baseline. It remains held for an explicit reviewed
migration/repair rather than allowing historical commitments to disappear.

The focused inventory proof includes adversarial non-object, closed-schema,
content-substitution, unexpected-record, missing-reservation, corrupted-liability,
liability-substitution, paired record/expectation deletion and rename, missing
index, and malformed/truncated index fixtures. Those tests establish local
corruption/substitution detection and fail-closed capacity/liability behavior.
They do **not** yet establish deterministic recovery from a process interruption
after index publication but before expectation/record publication, and they
intentionally do not claim detection of a coordinated valid-suffix rollback
across the index and all matching local record artifacts. The activation workflow
runs the proof directly while keeping both creation-crash recovery and external
anti-rollback readiness false.

## Authority boundary

Source, proof, documentation, and CI only. This lifecycle promotion performs no deployment, live service restart, production configuration mutation, production credential read, wallet/private-key access, live RPC, signing, transaction broadcast, inventory funding, treasury/liquidity action, or funds movement.

## Current-main reconciliation after #1287

The activation contract preserves #1287's operator-facing configuration truth: a fully populated environment is not considered configured merely because values are non-empty. The execution composition reuses the canonical ERC-20 planner policy validator before runtime status can expose RPC/signing readiness.

### Amount unit domain

`VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS` is explicitly denominated in the canonical **6-decimal fulfillment-unit** domain. The ERC-20 transfer remains an exact integer conversion into 18-decimal VoidToken atoms:

```text
fulfillment_unit_decimals=6
token_atom_decimals=18
token_atom_multiplier=1000000000000
rounding=false
```

The configured delivery maximum must not exceed either the saga inventory pool capacity or the saga maximum reservation, which are in the same fulfillment unit domain. An 18-decimal atom value such as `10^21` therefore cannot be silently interpreted as a fulfillment-unit cap when the reviewed reservation cap is in six-decimal fulfillment units.

### Receipt confirmation domain

The receipt reconciler retains decimal-string/BigInt confirmation truth. The existing generic saga accepts `receipt_confirmed.confirmations` only through 1,000,000. The composition therefore fails closed **before canonical `record_confirmed`** whenever the observed count is above 1,000,000. Exact 1,000,000 is accepted; 1,000,001 and values above the JavaScript safe-integer range are held without confirmed-state mutation.

This source closure mounts only the disabled child route in the canonical parent. It still does not inject value-bearing dependencies, read production credentials, enable execution, fund presale inventory, sign or broadcast a live transaction, or move funds.

## Payment admission / inventory atomicity

Canonical broad-sale admission uses `verify_reserve_and_claim`: a verified payment is first evaluated against the aggregate presale reservation journal under its pool lock. A **new durable paid claim is not created until its VOID inventory reservation exists**.

If a confirmed payment cannot reserve because the pool is sold out or has insufficient remaining VOID, the reservation journal records a deterministic `VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1` terminal obligation. That record acknowledges the confirmed customer payment and binds its payment/request identity, payment transaction evidence, requested VOID, observed remaining inventory, and canonical pool policy while authorizing **no automatic retry, refund execution, alternate fulfillment execution, wallet access, signing, broadcast, or money movement**.

Crash recovery is fail-closed in the opposite direction as well: if inventory reservation becomes durable before claim persistence, the reservation is deterministic/duplicate-safe and a retry can finish the same claim without consuming inventory twice.

Acceptance requires adversarial near-sellout and sold-out proofs showing no confirmed payer is left without either reserved VOID or a canonical terminal reconciliation obligation.
