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
status=production_configuration_verified_held_on_runtime_activation
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
paid_unreservable_terminal_obligation_ready=true
durable_history_local_consistency_ready=true
durable_history_creation_commit_point_ready=true
durable_history_creation_crash_recovery_ready=true
durable_history_partial_creation_retry_ready=true
durable_history_manual_state_surgery_required_after_creation_crash=false
durable_history_stale_lock_recovery_ready=true
durability_authority_directory_namespace_ready=true
durability_authoritative_file_owner_mode_ready=true
bounded_durable_state_reads_ready=true
bounded_durable_state_reads_full_presale_domain_ready=false
durable_history_full_presale_domain_ready=false
durable_metadata_exact_runtime_json_types_ready=true
durable_record_fingerprint_type_sensitive_ready=true
pool_lock_process_instance_identity_ready=true
pool_lock_publication_recovery_ready=true
pool_lock_release_recovery_ready=true
pool_lock_cross_process_release_recovery_ready=true
pool_lock_reclaim_fence_generation_recovery_ready=true
pool_lock_reclaim_owner_crash_recovery_ready=true
stale_lock_compare_delete_race_closed=true
durable_publication_retry_resync_ready=true
committed_range_diff_hygiene_ready=true
durable_history_separate_anchor_authority_ready=true
durable_history_external_anti_rollback_anchor_ready=true
durable_history_valid_suffix_rollback_detection_ready=true
durable_history_full_rollback_protection_ready=false
durable_history_full_anchor_authority_rollback_out_of_scope=true
activation_readiness_blockers=durable_history_full_presale_domain_not_ready,canonical_delivery_runtime_activation_not_ready
current_parent_blocker=durable_history_full_presale_domain_not_ready
next_gate=durable_history_full_presale_domain
```

Credential key-to-wallet evidence is recorded for the canonical Precision/Mainnet-0 fulfillment wallet without inferring clone-local binding. Dormant dependency injection requires delivery enable exact `0`, the exact evidence ID, and a configured delivery wallet matching that evidence; any mismatch remains held before dependencies are populated.

The canonical presale economics source is fail-closed to one pool (`buy-void-presale-v1`), exactly 10000000 VOID (10000000000000 six-decimal fulfillment units), and exactly `2 VOID / 1 USDC`. The inventory reservation ceiling equals the entire presale pool, so there is **no per-buyer 2-VOID throttle** below remaining inventory. A 10,000 VOID validator-scale purchase is explicitly proven to reserve successfully.

The current 64 MiB bounded JSONL history/index representation cannot cover the full minimum-purchase presale domain without reaching its authoritative read ceiling first. The activation contract therefore fails closed with `durable_history_full_presale_domain_not_ready`; the fixed cap, rate, reservation ceiling, and absence of a smaller per-buyer maximum remain unchanged. The next source gate is a bounded authenticated working-state/checkpoint design that preserves append-only audit evidence without rereading one permanent line per valid purchase.

`VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS` remains a separate delivery-execution safety control. A lower 2-VOID canary is allowed only while delivery is disabled; public delivery activation fails configuration unless the delivery maximum equals the canonical presale capacity so every admitted purchase can be fulfilled without an execution-layer throttle.

The obsolete broad-configuration verification blocker is closed. The durable-history source now has a recoverable pending-creation transaction, dead-owner lock recovery, and a separate committed-tail anchor authority that detects coherent rollback of the reservation-journal subtree. A coordinated rollback that also rewinds the separate anchor authority remains outside this local-filesystem contract and is not represented as full rollback protection. The remaining parent blocker is canonical delivery runtime activation. Applying the reviewed configuration, enabling dependency/runtime execution, funding inventory, reading the production credential, signing, broadcasting, and moving funds remain separate operational authorization boundaries.


## Durable presale history integrity and anti-rollback boundary

The reservation/liability journal retains strict closed-schema,
filename/content-identity, expected-set, and local hash-chain validation. It now
also binds every committed local history entry into a separate sibling authority
tree at `buy-void-inventory-history-anchor-v1/`.

Creation first fsyncs one exact pending transaction. The local index, expectation
and record are projections of that pending transaction. The separate anchor
append is the commit point. If execution stops before that commit, the next apply
rolls forward only the exact persisted pending transaction. Torn local-index or
anchor tails are repairable only when the observed bytes are a prefix of the
exact pending entry. Preview/read remains fail-closed while pending recovery is
required.

Every durability-authoritative directory and file is required to be a
non-symlink, current-UID-owned, private-mode object. JSON files are bounded to 1
MiB; the index and anchor are read incrementally with a 64 MiB aggregate and 256
KiB per-line ceiling while inode/size/time identity remains stable. Numeric and
identity metadata retains exact JSON runtime types, and record fingerprints are
type-sensitive.

The pool lock is an atomically-created private regular owner file with PID,
Linux process-start ticks, boot ID, and nonce. A matching external process
instance remains busy; a dead or PID-reused owner is reclaimed through a
hard-link inode fence, which prevents compare/delete races from unlinking a
replacement lock. Publication-fsync uncertainty is resolved by exact readback
and resync. Logical release first publishes a durable nonce-bound terminal
witness; if physical deletion fails, another process can validate that exact
witness and reclaim through the same inode fence while the original process
remains alive. A live owner with no release witness remains non-stealable.
Linux `/proc` supplies the process-instance evidence; unavailable or ambiguous
evidence holds mutation instead of weakening ownership checks.

After the anchor commit, missing, renamed, malformed or substituted local
projections remain corruption and HOLD rather than being reconstructed. The
anchor and local index must match sequence-for-sequence on kind, pool, record ID,
fingerprint, and local entry hash.

Fault-injection now covers reservation and paid-obligation interruption after
pending creation, index append, expectation creation, record creation, and anchor
append; torn index/anchor tails; uncertain publication and release recovery;
cross-process failed-release handoff with the original owner still alive;
the never-released live-owner control; dead-owner and PID-reuse lock recovery;
stale-reclaim replacement races;
owner/mode/symlink rejection; bounded reads; exact runtime JSON types; and coherent last-entry
rollback where the local index suffix and matching expectation/record are removed
together while the separate anchor remains. Those rollback cases HOLD before
capacity can reopen or liability can disappear.

The focused workflow runs the repository committed-range diff-hygiene helper for
pull requests and pushes (plus its self-proof), so whitespace defects in committed
changes cannot hide behind a clean checkout worktree.

`durable_history_full_rollback_protection_ready=false` remains explicit because a
coordinated rollback that also rewinds the separate anchor authority itself is
outside this local-filesystem contract.

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
