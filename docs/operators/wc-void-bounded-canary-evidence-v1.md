# WC/VOID bounded canary evidence v1

Marker: `VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1`

Status: source-only verifier for a future WC/VOID bounded-canary **evidence
candidate** packet. No canonical canary policy or live canary evidence is
checked in by this lane, and the production candidate's
`bounded_canary_green` field remains unchanged.

## Why this exists

A bare `bounded_canary_green=true` boolean is insufficient production
evidence. A production canary must be bound to the exact launch/deployment,
bounded by a separately reviewed policy, fresh at evaluation time, and backed by
the live custody/replay/participant-control evidence that the canary is intended
to exercise.

## Reviewed policy requirement

The verifier does **not** choose canary economic sizes.

The caller must supply an exact expected policy ID:

`voidwcbcp1_<sha256>`

The corresponding content-addressed policy binds:

- coupled launch ID;
- Chain 2050 / execution epoch 2 / `WC_VOID`;
- deployed market-vault address and runtime-code SHA-256;
- exact corrected current market-vault compiled identity;
- exact WC settlement adapter;
- maximum canary participant count;
- maximum settled WC;
- maximum delivered VOID atoms;
- minimum finality confirmations;
- maximum evidence age, capped by source at 24 hours; and
- mandatory live inventory-lock, ledger-persistence, quote-custody,
  claim-binding, replay-persistence, participant-control, and runtime evidence.

The maximum delivered VOID canary amount must be strictly below the full
5,000,000-VOID participant opening tranche.

A later launch-policy lane must review and pin the exact policy ID before its
evidence can be production authority.

## Evidence contract

A future evidence-candidate packet must be content-addressed as:

`voidwcbce1_<sha256>`

and bind all of:

- exact reviewed canary policy ID;
- exact coupled launch;
- exact deployed vault/runtime and corrected current compiled identity;
- content-addressed vault/runtime-verification evidence;
- content-addressed inventory-lock evidence;
- exact settlement adapter;
- positive participant/WC/VOID observations within policy bounds;
- live WC-ledger persistence and quote-reserve custody bound to a
  content-addressed ledger/custody evidence reference;
- persisted opening claim binding plus its content-addressed persistence
  evidence reference;
- durable replay terminal capsule;
- participant post-purchase VoidToken-control finality evidence;
- finality depth meeting the reviewed policy;
- `runtime_or_launch_evidence=true`;
- an observed/valid-until freshness window within the reviewed maximum age; and
- no market, presale, or funds-movement authority.

The evaluator supplies an explicit evaluation timestamp. Stale or not-yet-valid
canary evidence fails closed.

The live booleans are not accepted as standalone production proof. The
evidence-candidate packet must also carry content-addressed references for
vault/runtime verification, inventory lock, WC-ledger/quote custody,
claim-binding persistence, the durable replay capsule, and participant-control
finality.

This verifier validates packet identity, reviewed-policy binding, deployment
identity, bounds, freshness, authority posture, declarations, and reference
syntax. It does **not** independently fetch or semantically validate the
referenced upstream artifacts. Therefore a valid packet returns
`EVIDENCE_CANDIDATE_VALID_UPSTREAM_PROOFS_UNVERIFIED`, not
`BOUNDED_CANARY_GREEN`.

## Deliberate source boundary

The hosted proof uses only a synthetic fixture to prove the verifier.

Therefore it demonstrates the **evidence-candidate contract**, not a live
canary. Synthetic or self-declared references cannot make the canary green.
The verifier deliberately returns:

```text
upstream_evidence_semantically_verified=false
live_canary_evidence_verified=false
bounded_canary_green=false
production_candidate_binding_allowed=false
```

A later composition must independently validate every referenced upstream
artifact before any production canary gate may become true.

No RPC, deployment, ledger mutation, wallet/signer access, transaction,
inventory funding, market activation, presale activation, or funds movement is
performed.

Verification:

```bash
node scripts/prove_void_wc_void_bounded_canary_evidence_v1.mjs
```
