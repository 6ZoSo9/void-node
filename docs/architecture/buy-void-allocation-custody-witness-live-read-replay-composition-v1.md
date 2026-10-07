# Buy VOID allocation custody witness live-read replay composition v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1`
is a pure source composition gate for one durable witness-read ceremony.

It composes four already-defined domains:

1. a live replay-storage installation-evidence receipt;
2. one successful durable replay `persisted_issue`;
3. one content-addressed live-read packet qualification; and
4. one successful durable replay `persisted_consumed`.

The composition contract performs no filesystem access, SSH, credential access,
network operation, witness mutation, replay mutation, payment, wallet/signer
access, transaction construction/signing/broadcast, Chain-2050 write,
presale/market activation, inventory mutation, treasury/liquidity action, or
funds movement.

## Why this gate exists

Before this contract, the source tree could separately prove:

- replay storage placement;
- a durable single-use replay challenge;
- a structurally qualified witness-read packet; and
- a durable consumed terminal event.

But there was no single contract proving that all four artifacts described the
**same ceremony**.

V1 closes that source-level composition gap.

## Storage prestate binding

The parent replay-storage evidence must be a live
`LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED` result and must report:

- live storage observation;
- distinct local storage domains;
- distinct parent block devices;
- canonical journal/high-water binding;
- no pending publication intent;
- stable double census;
- idle `ready_for_issue=true` state.

The storage qualification ID is recomputed from its normalized body.

The composition also requires exact canonical-file prestate binding:

- `normalized.journal_file.sha256` equals
  `issue_result.transition_before_journal_sha256`;
- `normalized.journal_file.bytes` equals
  `issue_result.transition_before_journal_bytes`; and
- `normalized.high_water_file.sha256` and `normalized.high_water_sha256` equal
  `issue_result.transition_before_high_water_sha256`.

The storage generation/sequence/event-count remains the exact counter
predecessor of the durable issue result, but equal counters alone are not
accepted as state identity.

## Durable issue binding

The replay writer result must be `persisted_issue` with:

- no writer recovery during this ceremony;
- exactly one generation/sequence/event advance over storage prestate;
- pending challenge state;
- exact transition challenge SHA-256 and challenge ID;
- exact persisted issue and expiry times;
- well-formed poststate journal/high-water SHA-256 identities;
- a non-null poststate tip-event SHA-256;
- poststate journal bytes strictly advanced beyond transition prestate;
- `last_terminal_state=null`; and
- null terminal request/response fields.

The transition time-to-live may not exceed the canonical 38-second replay
limit.

## Qualified packet binding

The supplied live-read qualification must:

- match the canonical live-read authority object;
- recompute to its `voidwlrq1_...` qualification ID;
- preserve all parent negative live/runtime/custody authority flags;
- bind the exact replay issue challenge SHA-256;
- use the exact durable replay event issue time;
- use storage generation as prior generation;
- use issue generation as evidence generation; and
- have response observation time inside the durable replay issue/expiry window.

V1 deliberately does not reinterpret the parent installation or known-hosts
proofs.

## Transport request and response revalidation

The composition contract independently reclassifies the supplied transport
policy.

It rebuilds the canonical read request from that policy plus the durable replay
challenge and requires byte-for-byte equality with the supplied request.

The rebuilt request ID must equal:

- the live-read qualification request ID; and
- the durable consumed terminal request ID.

The supplied response is independently revalidated through
`validateBuyVoidAllocationCustodyWitnessTransportResponseV1(...)`.

Its witness SHA-256, event count and tip event SHA-256 must equal the parent
live-read qualification.

The exact response bytes are SHA-256 hashed and that digest must equal the
durable consumed terminal response SHA-256.

## Durable consume binding

The consumed replay result must:

- be `persisted_consumed`;
- have `transition_before_journal_sha256`,
  `transition_before_journal_bytes`, and
  `transition_before_high_water_sha256` exactly equal to the persisted issue
  result's post-transition journal/high-water identities;
- remain in the same generation as the issue;
- advance sequence/event count by exactly one;
- repeat the exact issue challenge SHA/ID and issue/expiry timestamps;
- end with `last_terminal_state=consumed`;
- carry well-formed final journal/high-water SHA-256 identities and a non-null
  final tip-event SHA-256;
- strictly advance final journal byte length beyond the issue poststate;
- clear pending challenge state; and
- expose the exact qualified request ID and exact response-byte SHA-256.

This is the source-level proof that the durable replay terminal event consumed
the exact qualified packet supplied to this composition.

## What V1 proves

A GREEN composition reports:

- `validated_packet_binding_proven=true`;
- `durable_consume_packet_binding_proven=true`;
- exact storage snapshot → issue transition prestate digest/byte lineage;
- exact issue poststate → consume transition prestate digest/byte lineage;
- validated issue/consume poststate journal/high-water/tip identities;
- exact storage-prestate → issue generation progression;
- exact issue challenge/time → qualified packet binding;
- canonical request reconstruction;
- canonical response revalidation; and
- exact consumed request/response persistence binding.

## What V1 does not prove

This remains a pure composition of supplied parent artifacts.

Accordingly V1 still reports:

- `live_durable_storage_proven=false`;
- `rollback_resistance_proven=false`;
- `protected_high_water_custody_proven=false`;
- `independent_custody_proven=false`;
- `trusted_verification_clock_proven=false`;
- `evidence_generation_monotonicity_proven=false`;
- `challenge_entropy_proven=false`;
- `challenge_unpredictability_proven=false`;
- `challenge_freshness_proven=false`;
- `response_replay_resistance_proven=false`;
- `live_evidence_origin_proven=false`;
- `live_sshd_connection_context_proven=false`;
- `external_transport_authenticated=false`;
- `external_witness_storage_proven=false`;
- `live_remote_read_performed=false`;
- `runtime_integration=false`;
- `production_gate_ready=false`; and
- `funds_movement=false`.

The next gate must be an executor that itself generates challenge entropy,
performs the SSH read, captures the live network/clock observations, calls this
composition contract, and emits one content-addressed ceremony receipt.

## Focused proof

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_composition_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
git diff --check
```

The focused proof uses temporary replay roots and the canonical transport server
classifier. It performs no live SSH or production storage mutation.

Covered adversaries include:

- replay issue time drift from qualified packet;
- stale/wrong storage generation;
- a same-counter storage artifact with a different journal digest;
- a consumed transition whose prestate digest does not equal the exact issue
  poststate;
- forged terminal consume journal/high-water SHA, journal-byte and tip-event
  poststate fields;
- issue result carrying a non-null terminal state;
- consumed terminal request-ID mismatch;
- consumed terminal response digest mismatch;
- tampered transport response bytes; and
- consumed sequence/event-count jump.

No live operator action is authorized by this source contract.
