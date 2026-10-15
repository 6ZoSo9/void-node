# Buy VOID Epoch-2 authenticated credential + signer-control binding v1

Marker:
`VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V1`.

Status: **source-only live composition runner; live execution remains separately
authorized**.

## Purpose

The repository already contains accepted public evidence proving off-chain
control of the immutable Epoch-2 fulfiller:

`0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`.

That proof is represented by exact dormant candidate v2 and its accepted
signer-control public evidence. It must not be re-proved or silently
reinterpreted.

Separately, #3176 supplies a future fresh authenticated credential-binding
receipt proving that the live systemd credential maps to the same immutable
fulfiller and current authenticated runtime generation.

This runner composes those two accepted evidence domains.

## Exact dependencies

Fresh credential-binding child:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v1.mjs`;
- Git blob:
  `e31b6728247188a2ffe7b9587dd0017413fcb716`.

Accepted signer-control candidate:

- `ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json`;
- Git blob:
  `6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1`.

Accepted signer-control public evidence:

- `ops/mainnet0/evidence/buy-void-epoch2-signer-control-public-evidence-v1.json`;
- Git blob:
  `361aea8767f8b049fafd28663b71b177f38f180d`;
- evidence ID SHA-256:
  `a0228229b4432e54c02f970a5047fc1a16c703e2072057f245624e0d2c3b3d57`.

The accepted candidate proof, evidence verifier, and evidence proof are pinned
as immutable Git objects. Live mode does not import or execute mutable
repository modules or `node_modules` to re-prove historical signer control.

## Live composition

A future separately authorized run:

1. requires this exact reviewed runner Git object on stdin;
2. requires a clean exact `main` checkout;
3. invokes the exact #3176 Git-object child itself;
4. accepts no receipt file, receipt command-line argument, receipt stdin object,
   or receipt environment value;
5. requires the child receipt to be current-head, V1-predecessor-bound,
   checkout-revalidated, authenticated credential evidence;
6. revalidates the exact clean checkout after the child;
7. loads the exact accepted signer-control candidate/evidence/proof/tool Git
   objects;
8. requires dormant candidate v2's predecessor blob to equal the child receipt's
   V1 candidate blob;
9. revalidates the exact clean checkout again;
10. emits one content-addressed combined public receipt.

## What may become true

Only after that composition may the combined receipt state:

- `signer_offchain_control_proven=true`;
- `launch_operator_signer_control_evidence_bound=true`;
- `systemd_credential_identity_proven=true`;
- `active_signing_capability_proven=true`;
- `runtime_source_generation_bound=true`;
- `authenticated_private_manager_generation_bound=true`;
- `current_system_credential_matches_immutable_fulfiller=true`.

The full fresh credential-binding receipt and full accepted public signer-control
evidence remain embedded in the output for later review.

## What remains false

This evidence does **not** prove transaction signing or make customer payment
safe.

It keeps:

- `transaction_signing_proven=false`;
- `transaction_broadcast_proven=false`;
- `customer_safe_to_pay=false`;
- runtime/service/systemd mutation false;
- payment acceptance false;
- public presale activation false;
- WC/VOID market activation false;
- funds movement false;
- production host authority false.

The remaining gates are:

1. qualify the live fee/gas envelope and exact chain receipt;
2. complete the current Chain-2050 one-payment/one-fulfillment canary;
3. obtain coupled presale + WC/VOID Sovereign activation.

## Sensitive live boundary

This runner's child chain eventually reads the installed credential and
performs one domain-separated non-transaction signature. Therefore live
execution remains separately authorized.

Hosted CI performs only syntax, self-test, plan and static proof.

A future live GREEN receipt advances only to:

`QUALIFY_LIVE_FEE_ENVELOPE_AND_EXACT_CHAIN_RECEIPT`.

PROTECT THE CORE.
