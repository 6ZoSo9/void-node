# Buy VOID allocation custody witness live-read replay external custody qualification v1

## Scope

\`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_CUSTODY_QUALIFICATION_V1\`
is the source-level admission gate for the reviewed live replay witness ceremony
performed on Precision and Nimo.

It closes the gap left intentionally by the pure replay external-witness
planner and the forced-command storage handler. Those parents can define and
serve the external witness, but they cannot by themselves prove that a live
authenticated transport ceremony actually occurred.

V1 admits exactly one reviewed operator receipt and rebinds it to:

- the canonical current Precision replay journal;
- the canonical current Precision replay high-water record;
- the complete canonical Nimo replay external-witness history;
- the exact generic witness read request/response identity carried by the
  consumed replay event; and
- fixed reviewed Precision/Nimo storage and machine identities.

It performs no filesystem access, SSH, network operation, key access, replay
mutation, witness append, wallet/signer access, transaction, Chain-2050 write,
activation, inventory movement, treasury/liquidity action, or funds movement.

## Reviewed live receipt

The accepted live-cycle receipt is pinned by both its self-hash and exact file
hash:

\`\`\`text
receipt_sha256 =
sha256:facaeecb75f66cf9b9fdf71eca977b7163be439fdc0913095d48bdb9eaa24a08

receipt_file_sha256 =
sha256:1f9bcb62174716aa732f530df025f468e8ce61d55d532c2f6197d6f9c9db05b9
\`\`\`

The receipt was emitted only after the reviewed bounded ceremony completed:

\`\`\`text
Precision genesis
  -> durable issue
  -> sequential Nimo replay witness append
  -> authenticated generic Nimo witness read
  -> durable consumed terminal
  -> sequential Nimo replay witness append
  -> authenticated exact Nimo replay witness read-back
\`\`\`

The source commit carried by that receipt is fixed to:

\`\`\`text
f4c0905b3888bd1db72af455e980a6df22380fac
\`\`\`

The receipt itself still reports the stronger rollback/protected-custody flags
as false. V1 does not rewrite that historical boundary. Instead it uses the
reviewed receipt as evidence that the live transport/storage actions actually
occurred and then independently rebinds their resulting state.

## Current replay binding

The supplied current journal/high-water pair must pass the canonical merged
high-water classifier.

For the reviewed ceremony V1 requires the exact final state:

\`\`\`text
generation=1
sequence=2
event_count=2
pending=false
last_terminal_state=consumed
ready_for_issue=true

journal_sha256 =
sha256:d95fd6a5cec55513a4b6271ee5ad87a97d723f77bbd67ffaacd194fc36780989

high_water_sha256 =
sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9
\`\`\`

The exact two journal events are rebound to the reviewed issue and consumed
terminal packet. The consumed request ID and response SHA-256 must equal the
authenticated live-read values in the reviewed receipt.

## External witness binding

The complete supplied Nimo witness is passed through the existing canonical
external-witness verifier using fixed reviewed identities for:

- Precision hostname;
- Precision journal/high-water roots;
- both Precision disk WWNs;
- Nimo hostname;
- Nimo machine ID;
- Nimo root disk serial; and
- Nimo root disk WWN.

The full three-event witness history must canonically rebind to the current
Precision replay history and end at:

\`\`\`text
witness_event_count=3
witnessed_replay_sequence=2

witness_sha256 =
sha256:b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e

tip_event_sha256 =
sha256:e72160233cf64b43d9d95ee0e208acf5a49cf8fe0da67ce01aa8cdd05b9680ea
\`\`\`

Therefore a caller cannot replace the reviewed Nimo history with a
self-consistent but unrelated witness chain.

## Authority promoted by V1

A GREEN result promotes only the authority directly justified by the reviewed
live ceremony plus exact canonical rebinding:

\`\`\`text
reviewed_live_evidence_origin_proven=true
external_transport_authenticated=true
external_witness_storage_proven=true
live_remote_read_performed=true
live_remote_append_performed=true
external_second_control_domain_qualified=true
\`\`\`

This is the missing provenance gate described by the external-witness
architecture.

## Authority intentionally not promoted

V1 remains source-only and is not itself the rollback-policy composition.
Accordingly these remain false:

\`\`\`text
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
trusted_verification_clock_proven=false
challenge_entropy_proven=false
challenge_unpredictability_proven=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
\`\`\`

The next gate should consume this qualification together with the merged replay
rollback-independence / rollback-policy evidence contracts. That later
composition, not this reviewed-evidence admission contract, decides whether
rollback-resistance and protected-custody authority may be promoted.

## Focused proof

\`\`\`bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_custody_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_state_v1.ts
git diff --check
\`\`\`

The focused proof deterministically reconstructs the exact reviewed live
receipt, Precision replay journal/high-water state, and Nimo external witness
history from the canonical planners and the reviewed ceremony inputs. It
requires their hashes to equal the captured live hashes before qualification.
It also rejects receipt drift, replay-journal tamper, witness tamper, and
witness truncation.
