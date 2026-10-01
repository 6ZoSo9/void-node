# WC/VOID bounded-canary semantic promotion v1

Marker: `VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1`

Status: source-only semantic composition. This lane can prove that one bounded
canary evidence packet is backed by the exact reviewed upstream bytes it
references. It does not run a canary, mutate canonical candidates, activate a
market/presale, sign or broadcast a transaction, or move funds.

## Policy review remains external

This verifier does **not** choose canary economics.

The caller must provide a separate:

```text
reviewed_policy_id=voidwcbcp1_<sha256>
```

The semantic verifier requires that ID to equal both:

- the first-stage canary input's `expected_policy_id`; and
- the content-addressed policy's own `policy_id`.

The policy still determines maximum participants, maximum settled WC, maximum
delivered VOID, minimum finality, and maximum evidence age.

A test fixture proves this source contract, but a test fixture is not a live
reviewed canary policy. Human/operator review of the actual policy ID remains a
separate launch decision.

## Exact semantic inputs

The promotion consumes exact bytes plus SHA-256 for:

1. the first-stage bounded-canary policy/evidence input;
2. the #2227 market-vault at-use artifact;
3. the WC ledger-persistence import input;
4. the durable opening request;
5. the persisted opening claim-binding bytes;
6. the read-only claim-binding persistence inspection receipt;
7. the persisted replay-terminal capsule bytes;
8. the read-only replay-terminal persistence inspection receipt; and
9. the #2232 participant-control at-use artifact.

No summary boolean is sufficient by itself.

## First-stage canary

The complete first-stage packet is rerun through
`verifyWcVoidBoundedCanaryEvidenceV1`.

It must still be a syntactically/content-addressed evidence candidate with:

```text
bounded_canary_evidence_candidate_valid=true
bounded_canary_green=false
production_candidate_binding_allowed=false
```

The semantic layer is the only source contract in this path allowed to turn
those final two values true after all referenced evidence is independently
checked.

The current reviewed coupled launch is:

```text
sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

## Market-vault evidence

The exact #2227 artifact is rerun through
`verifyWcVoidMarketVaultAtUseRevalidationV1` at the same explicit evaluation
time as the canary.

The semantic promotion requires equality for:

- coupled launch;
- market-vault address;
- deployed runtime SHA-256;
- `market_vault_runtime_verification_evidence_id`; and
- `inventory_lock_evidence_id`.

The #2227 artifact independently binds the accepted compiled identity,
reconstructed deployed runtime, inventory, preactivation lock state, stable
timestamped Chain-2050 head, and freshness window.

## Ledger and quote-reserve custody

The exact ledger-persistence import input is rerun through
`importWcVoidLedgerPersistenceV1`.

The canary's `wc_ledger_custody_evidence_id` is the SHA-256 of those exact
serialized import-input bytes:

```text
sha256:<exact file bytes>
```

The semantic result must prove both:

```text
wc_ledger_persistence_verified=true
quote_reserve_custody_verified=true
```

and remain no-authority.

The opening request's complete settlement set is independently rederived with
`verifyWcVoidOpeningLedgerSettlementsV1` and must match the import's settlement
count, settlement-set root, and total settled WC.

## Opening claim and replay

The opening request may describe a larger opening cohort than the one bounded
canary participant.

The verifier rederives the complete claim binding with
`deriveWcVoidOpeningClaimBindingV1`. The exact persisted claim-binding bytes
must equal:

```text
canonical_json(derived_binding) + newline
```

The canary packet must bind:

- the exact derived `opening_claim_binding_id`; and
- `opening_claim_binding_persistence_evidence_id=sha256:<exact persisted bytes>`.

Matching bytes are not sufficient durability proof. The semantic promotion also
requires an exact read-only receipt produced by
`inspectWcVoidOpeningClaimBindingPersistenceV1`. That receipt must bind the
same launch, mode, opening-state ID and binding ID, and its
`persisted_file_sha256` and byte count must match the exact claim-binding file
supplied to the promotion. It must independently report:

```text
canonical_binding_direct_file=true
canonical_binding_realpath_exact=true
stable_file_identity_during_read=true
stable_parent_directory_identity_during_read=true
exact_binding_rederivation_verified=true
binding_persistence_verified=true
opening_claim_transfer_or_refund_binding_persistence_verified=true
```

with all ledger/token/refund/activation/funds authority false.

The verifier then starts from
`initialWcVoidOpeningReplayStateV1(coupled_launch_id)`, rederives the terminal
transition, rebuilds the deterministic
`VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1`, and requires the supplied
capsule bytes to match exactly.

The canary packet must bind the rederived capsule ID and exact terminal capsule
SHA-256.

Matching replay bytes are likewise not sufficient durability proof. The
promotion requires an exact read-only
`inspectWcVoidOpeningReplayTerminalV1` receipt whose launch, mode, binding ID,
transition ID, before/after state IDs, capsule ID, terminal path and persisted
capsule SHA-256 all match the independently rederived replay state. It must
report:

```text
terminal_replay_state_persisted=true
durable_replay_state_persistence_verified=true
duplicate_replay_protection_verified_for_launch=true
production_duplicate_replay_gate_updated=false
```

and all activation/funds authority false.

The claim-persistence and replay-persistence receipts must carry the same
opening binding ID. Their own exact serialized bytes and SHA-256s are included
in the final semantic promotion identity.

## Selecting the one canary participant

V1 requires:

```text
participant_count=1
```

The opening cohort itself may contain more than one participant.

The semantic verifier finds exactly one opening transfer disposition whose
`void_recipient` equals the fresh #2232 participant address. That disposition
must map to exactly one opening settlement.

For that selected participant only:

- settlement `amount_wc` must equal the canary's `settled_wc_units`; and
- disposition `void_atoms` must equal the canary's
  `delivered_void_atoms`.

This prevents mixing a valid ledger/opening cohort with participant-control
evidence from a different canary participant.

## Participant-control evidence

The exact #2232 artifact is rerun through
`verifyVoidParticipantPostpurchaseAtUseRevalidationV1` at the same explicit
evaluation time.

It must:

- use the current coupled launch;
- bind one participant;
- match the canary's `participant_control_evidence_id`; and
- report the same delivered VOID amount as the selected opening disposition.

The #2232 artifact independently binds exact persisted runtime/finality bytes,
reimports finality, recomputes runtime-binding identity, revalidates delivery
and control block hashes against one stable timestamped Chain-2050 head, and
recomputes current confirmation depth.

## Composed finality

The first-stage canary may not choose an inflated confirmation count.

The semantic verifier computes:

```text
minimum(
  vault observed confirmations,
  participant delivery confirmations,
  participant control confirmations
)
```

and requires the canary's `observed_finality_confirmations` to equal that
exact minimum.

The separately reviewed policy still enforces its minimum required finality.

## Composed freshness

Both freshness-sensitive upstream artifacts are verified at one explicit
`evaluation_time_utc`.

The canary freshness window is required to equal the exact intersection:

```text
observed_at =
  max(vault collection completion, participant collection completion)

valid_until =
  min(vault valid-until, participant valid-until)
```

The intersection must be non-empty and the evaluation time must fall within it.
A wrapper cannot widen either upstream artifact's validity.

Ledger persistence and durable opening replay/claim evidence are treated as
durable content-addressed facts. Claim/replay content is independently
rederived, while durability itself is required through the exact read-only
persistence inspection receipts described above. They are not assigned a new
wall-clock freshness time.

## Promotion result

Only after every cross-link succeeds does the source-only artifact report:

```text
upstream_evidence_semantically_verified=true
live_canary_evidence_verified=true
bounded_canary_green=true
production_candidate_binding_allowed=true
```

It still reports:

```text
production_candidate_updated=false
coupled_candidate_updated=false
candidate_promotion_required=true
coupled_activation_ready=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

A green semantic canary is therefore evidence for a later reviewed candidate
promotion. It is not final coupled activation and is not runtime launch
authority.

## Authority

```text
explicit_reviewed_policy_id_required=true
exact_evidence_bytes_required=true
first_stage_canary_reverification=true
market_vault_at_use_reverification=true
ledger_persistence_semantic_import=true
opening_claim_binding_rederivation=true
opening_claim_persistence_receipt_validation=true
opening_replay_capsule_rederivation=true
opening_replay_persistence_receipt_validation=true
participant_at_use_reverification=true
source_only_promotion=true

filesystem_read=false
filesystem_write=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
rpc_call=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
wc_ledger_write=false
wc_balance_mutation=false
token_movement=false
inventory_funding=false
liquidity_movement=false
production_candidate_update=false
coupled_candidate_update=false
coupled_activation=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

Verification:

```bash
node scripts/prove_void_wc_void_bounded_canary_semantic_promotion_v1.mjs
```
