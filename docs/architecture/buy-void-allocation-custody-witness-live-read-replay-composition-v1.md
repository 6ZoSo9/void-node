# Buy VOID allocation custody witness live-read replay composition v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1`
is a pure source composition gate for one durable witness-read ceremony.

It composes five already-defined domains:

1. the materialized V2 witness installation-evidence package plus exact
   client `known_hosts` bytes;
2. a live replay-storage installation-evidence receipt;
3. one successful durable replay `persisted_issue`;
4. one content-addressed live-read packet qualification; and
5. one successful durable replay `persisted_consumed`.

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
- idle `ready_for_issue=true` state;
- `sequence == event_count`;
- even `event_count` with `generation == event_count / 2`; and
- `last_terminal_state == null` if and only if `generation == 0`.

The ready-state counter relation is canonical replay structure, not merely
cross-artifact equality. A caller cannot pair a well-formed generation with a
different even/odd event count, recompute the storage qualification ID, and
still reach storage→issue lineage.

The storage qualification ID is recomputed from its normalized body.

Because that identifier is content-addressed rather than secret, V1 also
revalidates the complete closed replay-storage parent shape instead of trusting
the parent flags alone. It requires:

- canonical hostname syntax;
- exact journal/high-water root field sets;
- absolute canonical root and mount paths;
- private mode-`0700` same-owner roots;
- local `ext4`/`xfs`/`btrfs` mount classes;
- canonical `/dev/...` mount, resolved-source and parent-device paths;
- path-disjoint roots;
- distinct root device, mount ID, major:minor, mount-source, resolved-source,
  parent-device, disk-serial and disk-WWN identities;
- journal/high-water files at the exact fixed names underneath their respective
  roots;
- file device/UID/GID identity matching the parent root;
- mode-`0600`, single-link, regular non-symlink file shape; and
- the canonical 8 MiB journal / 16 KiB high-water byte ceilings.

A caller cannot rewrite storage topology or file-placement fields, recompute the
qualification ID, and still reach storage→issue lineage.

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
- challenge ID suffix exactly equal to the challenge SHA-256 digest, as
  required by the canonical replay-state derivation;
- exact persisted issue and expiry times;
- well-formed poststate journal/high-water SHA-256 identities;
- a non-null poststate tip-event SHA-256;
- poststate journal bytes strictly advanced beyond transition prestate;
- `last_terminal_state` exactly equal to the storage prestate's retained
  terminal state: `null` at genesis, or the prior `consumed` /
  `abandoned` state on later generations; and
- null terminal request/response fields.

The transition time-to-live may not exceed the canonical 38-second replay
limit. The retained terminal-state equality is part of storage→issue lineage:
a later issue cannot erase or substitute the prior terminal outcome merely
because the new challenge fields are otherwise valid.

## Installation-artifact rebinding

The composition requires the exact materialized
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1`
object produced by the V2 installation-evidence lane.

The package body and `package_sha256` are recomputed. Its normalized
installation qualification SHA-256 and `voidwiq2_...` ID must recompute and
must equal the same commitments in the enclosed installation receipt.

The composition then re-runs the canonical
`classifyBuyVoidAllocationCustodyWitnessLiveReadQualificationV1(...)`
classifier using:

- the package's exact installation receipt;
- the package's exact normalized installation qualification;
- the independently classified transport policy;
- the exact supplied client `known_hosts` bytes;
- the durable issue challenge;
- the live-read time/generation/network observations; and
- the exact request/response bytes.

The reclassified live-read qualification ID and complete normalized result must
equal the supplied live-read parent exactly. Therefore installation hostname,
installation/witness machine IDs, identity path, continuity use, SSH network
context, witness state, remote user, host-key/known-hosts/client-key
commitments, runtime-bundle receipt lineage, request identity, and timing cannot
be substituted independently while preserving GREEN.

This is still source-level commitment binding. It does not prove that the
package itself came from a trusted live collector;
`live_evidence_origin_proven=false` remains authoritative.

## Qualified packet binding

The supplied live-read qualification must:

- match the canonical live-read authority object and exact closed parent shape;
- recompute to its `voidwlrq1_...` qualification ID;
- preserve all parent negative live/runtime/custody authority flags;
- carry canonical SHA-256 / qualification-ID fields for installation,
  runtime-bundle, transport, host/client keys, machine identities and witness
  state;
- carry canonical bounded host/user/port, IP-address, challenge-time,
  generation and event-count fields;
- preserve the parent's witness-identity-path / continuity-attestation /
  machine-ID relationship;
- bind remote host/port/user and known-hosts/host-key/client-key digests to the
  independently classified canonical transport policy;
- bind the exact replay issue challenge SHA-256;
- use the exact durable replay event issue time;
- use storage generation as prior generation;
- use issue generation as evidence generation; and
- have response observation time inside both the canonical 38-second live-read
  window and the durable replay issue/expiry window.

V1 still does not claim live origin for the supplied parent receipt; instead it
requires the supplied object to be one the canonical parent classifier could
have emitted and independently revalidates the transport request/response
bindings below.

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

- `installation_artifacts_bound=true`;
- `canonical_live_read_reclassified=true`;
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
npx tsx scripts/prove_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_external_witness_v1.ts
npx tsx scripts/prove_buy_void_filesystem_bakery_lock_async_v1.ts
git diff --check
```

The focused proof uses temporary replay roots and the canonical transport server
classifier. It performs no live SSH or production storage mutation.

It proves both a genesis issue/read/consume cycle and a second complete
issue/read/consume cycle whose issue retains the prior `consumed` storage
terminal state. Rewriting that retained state while keeping the remaining
second-cycle artifacts unchanged must HOLD.

Covered adversaries include:

- forged replay-storage physical disk identity with recomputed qualification ID;
- forged replay journal path/device identity;
- writable/non-private replay root metadata;
- oversized replay high-water file metadata;
- malformed live-read machine digest;
- malformed live-read observed network address;
- inconsistent witness identity-path / continuity-attestation pairing;
- live-read transport host/port drift despite a recomputed qualification ID;
- replay issue time drift from qualified packet;
- stale/wrong storage generation;
- impossible ready-state generation/event-count relationship;
- post-genesis null retained terminal state;
- a same-counter storage artifact with a different journal digest;
- a consumed transition whose prestate digest does not equal the exact issue
  poststate;
- forged terminal consume journal/high-water SHA, journal-byte and tip-event
  poststate fields;
- issue retained-terminal-state mismatch against the exact storage prestate;
- consumed terminal request-ID mismatch;
- consumed terminal response digest mismatch;
- tampered transport response bytes; and
- consumed sequence/event-count jump.

No live operator action is authorized by this source contract.