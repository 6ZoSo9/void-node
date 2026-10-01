# Participant post-purchase at-use revalidation v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1`

Status: source/read-only freshness binding for the participant-control evidence
required by the WC/VOID bounded-canary semantic promotion.

This lane does not move tokens, submit transactions, update the coupled
candidate, activate the market/presale, or move funds.

## Why this exists

The production participant runtime-binding receipt already proves:

- exact participant-control finality import;
- exact delivery and control transaction identities;
- exact delivery/control block identities;
- exact public read-status and receipt routes;
- participant address and delivered amount;
- participant control-transfer recipient and amount;
- immutable source/public-read authority boundaries; and
- `production_runtime_binding_verified=true`.

Those facts remain useful after collection, but the v1 runtime-binding receipt
does not contain a collector-owned or chain-derived wall-clock freshness
anchor.

A newly timestamped bounded-canary envelope must not be allowed to combine a
fresh market-vault receipt with arbitrarily old participant-control evidence.

## Exact source bytes

The collector requires both:

- the exact persisted production runtime-binding bytes plus their SHA-256; and
- the exact original participant-finality input bytes plus their SHA-256.

Both byte strings are embedded base64 in the content-addressed at-use artifact.
The verifier decodes the exact bytes, checks both hashes, reparses them, and
re-runs the finality import.

The runtime-binding receipt is then independently checked for:

- exact runtime-binding shape and marker;
- exact finality import/binding/source-evidence cross-links;
- exact public origin `https://seed.nullfeed.org`;
- exact production read-status route;
- exact delivery/control receipt routes;
- canonical Chain 2050 / execution epoch 2;
- canonical VoidToken receipt target;
- delivery/control participant actors;
- exact transaction and block identities;
- receipt success semantics;
- recomputed receipt `source_evidence_id` values;
- recomputed `voidpprtb1_<sha256>` runtime-binding ID; and
- exact no-signing/no-broadcast/no-token-movement/no-activation authority.

## Fresh Chain-2050 head

The freshness layer uses a separate injected read-only head transport. It is
restricted to:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
```

No built-in network endpoint is selected by this source.

One collection requires a stable head:

1. read Chain 2050 identity;
2. read the current head number;
3. read the exact head block number/hash/timestamp;
4. reread the delivery block and require its hash still matches the runtime
   binding;
5. reread the control block and require its hash still matches;
6. reread the head number; and
7. reread the exact original head block and require number/hash/timestamp to
   remain unchanged.

Current confirmation depth is then recomputed from that head for both delivery
and control. It may not regress below the confirmation depth already proven by
the runtime binding.

## Freshness clock

The source maximum evidence age is 600 seconds.

The collector records its own UTC start/completion interval with
`Date.now()`. The validity deadline is derived from the stable Chain-2050 head
timestamp:

```text
valid_until = head_block_timestamp + 600 seconds
```

The head timestamp may not be more than 30 seconds ahead of the collector clock
and may not already be older than 600 seconds when collection completes.

Rewrapping old participant evidence therefore cannot make it fresh again if
Chain 2050 itself has not supplied a sufficiently current stable head.

## One participant in v1

This artifact binds exactly one participant-control runtime receipt and exposes:

```text
participant_count=1
participant_control_evidence_id=sha256:<content digest>
revalidation_id=voidppau1_<same digest>
```

Issue #2199 must require `participant_count=1` for this v1 evidence contract.
A multi-participant canary requires a separately reviewed aggregate
participant-control evidence format.

The artifact also binds:

- participant address;
- delivered VOID amount;
- control-transfer recipient and amount;
- delivery/control transaction hashes;
- delivery/control block numbers and hashes;
- current stable head number/hash/timestamp;
- recomputed delivery/control confirmation counts;
- exact runtime-binding bytes and file SHA;
- exact finality-input bytes and file SHA; and
- the current reviewed coupled launch
  `sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`.

## Later source-only verification

`verifyVoidParticipantPostpurchaseAtUseRevalidationV1(...)` performs no
network call.

It re-imports the embedded finality input, reparses and revalidates the exact
runtime-binding bytes, recomputes runtime-binding identity and current
confirmation arithmetic, verifies content identity and timing consistency, and
requires the explicit evaluation time to remain within the head-derived
freshness window.

A valid artifact returns
`PARTICIPANT_CONTROL_AT_USE_EVIDENCE_VERIFIED_CURRENT` and still reports:

```text
production_candidate_binding_allowed=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

This artifact is an upstream input to #2199. It does not make
`bounded_canary_green=true` by itself.

## Authority

```text
explicit_evidence_bytes_required=true
finality_reimport_required=true
runtime_binding_identity_recomputed=true
read_only_chain2050_head_rpc=true
injected_head_transport_required=true
collector_wall_clock_read=true
chain_head_timestamp_bound=true
source_only_reverification=true
participant_count_bound_to_one=true

filesystem_read=false
filesystem_write=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
token_movement=false
candidate_mutation=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

Verification:

```bash
node scripts/prove_void_participant_postpurchase_at_use_revalidation_v1.mjs
```
