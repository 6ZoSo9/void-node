# Buy VOID allocation custody witness transport v1

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1`

## Purpose

This source-only contract defines the least-authority protocol boundary for
moving the canonical allocation-custody witness between Precision and the
separate Nimo witness domain.

It is stacked on the reviewed external-witness contract. It does not execute
SSH, read credentials, contact Nimo, write a remote file, install a key, or
claim that external transport/storage is already trustworthy.

## Dependency

The append request builder does not accept a caller-created witness event.

It calls
`planBuyVoidAllocationCustodyExternalWitnessAdvanceV1(...)` with the exact
current witness, canonical allocation ledger, canonical allocation high-water
and supplied current-state evidence. Only that parent planner may produce the
one exact next witness line.

If the parent reports idempotence or HOLD, no append request is produced.

## Pinned transport policy

The pure policy requires an SSH-shaped deployment profile with:

- exact remote host, port and witness-only account;
- `ssh-ed25519` host-key algorithm plus pinned host-key SHA-256;
- pinned dedicated known-hosts content SHA-256;
- `ssh-ed25519` client public-key identity SHA-256;
- exact forced-command endpoint marker;
- `BatchMode=yes`;
- `StrictHostKeyChecking=yes`;
- `IdentitiesOnly=yes`;
- no TTY;
- all forwarding cleared;
- no local command;
- forced-command-only remote authority;
- no remote shell;
- no caller-selected remote command;
- no caller-selected remote path;
- fixed 8-second connect deadline;
- fixed 30-second operation deadline;
- bounded request and response sizes.

Those fields are content-addressed into one policy SHA-256. The policy is a
source contract, not evidence that an installed SSH key or server actually
implements it.

This pure classifier also does **not** prove who selected that policy. A caller
can supply any policy that satisfies the closed schema and security flags. The
later live executor must load the remote host, port, account, host-key identity,
known-hosts identity, client-key identity, endpoint marker, and deadlines from a
server-controlled protected configuration. A payment/request caller must not be
able to choose or override any of those fields. Until that composition exists:

`server_controlled_policy_origin_proven=false`.

## Canonical requests

Requests are recursively key-sorted canonical JSON plus exactly one trailing
newline.

Each request binds:

- operation;
- caller challenge SHA-256;
- exact policy SHA-256; and
- deterministic content-addressed `voidwreq1_<sha256>` request ID.

The challenge is **content-bound but not made fresh by this pure contract**.
Reusing the same challenge with the same policy and operation intentionally
reproduces the same request ID, so a previously captured response could also be
replayed against that repeated request. The later live executor must generate a
cryptographically unpredictable one-use challenge for every remote operation
and reject challenge reuse before treating a response as current. Until that
live state exists:

- `challenge_freshness_proven=false`; and
- `response_replay_resistance_proven=false`.

### Read

A read request carries no remote path and no command text.

The pure server classifier returns a canonical response containing the exact
witness JSONL bytes (base64 encoded), full witness SHA-256, event count and tip
event SHA-256.

Client validation re-parses the returned witness through the parent witness
parser before returning the bytes.

### Append

An append request binds:

- exact prior witness-file SHA-256;
- exact prior event count and tip hash;
- exactly one canonical next witness line;
- exact next event count and tip hash; and
- expected next witness-file SHA-256.

The server classifier has only three outcomes:

1. **append_ready** — current witness exactly equals the requested prior state
   and prior + one line parses to the exact requested next state;
2. **idempotent** — current witness already equals the requested next state and
   its exact final line plus reconstructed prior prefix reproduce the request;
3. **HOLD** — any other current state, stale request, alternate history, skipped
   sequence, malformed line or compare-and-swap conflict.

The classifier returns exact next bytes but performs no filesystem mutation.

A later persistence endpoint must write those exact bytes under its own reviewed
local lock, fsync, re-read, and only then call the pure append-response builder.

## Append acknowledgement is not witness authority

An append response is only a bounded acknowledgement.

It must bind the exact request ID, challenge, policy, prior witness/tip and
expected resulting witness/tip. It also states whether the endpoint performed
the append or observed an already-idempotent next state.

Every successful append acknowledgement carries:

`round_trip_read_required=true`.

Precision must issue a fresh read and validate the returned full witness through
this transport contract and the parent witness classifier before treating the
remote witness as current. An acknowledgement alone cannot prove durable remote
storage.

## Deployment shape required later

The reviewed live transport should use a dedicated witness-only SSH key with a
server-side forced command / restriction equivalent to:

- no interactive shell;
- no caller command;
- no caller path;
- no PTY;
- no agent, X11, local, remote or dynamic forwarding.

Prefer a separate Nimo witness service identity whose forced-command ingress can
request only exact `read` and compare-and-swap `append` operations from a
local narrow service. The SSH account should not receive arbitrary filesystem
write authority.

The remote handler must use a server-controlled witness path and must not expose
generic write, rename, delete, chmod, shell or service-control primitives.

## Journal growth boundary

The parent witness currently caps the entire witness JSONL at 16 MiB. This
transport can carry that bounded witness, but it does not claim a larger
long-horizon event capacity.

Segmentation/rotation, if later required, must preserve append-only ancestry and
must be separately reviewed. Do not silently truncate or rotate the witness to
keep transport payloads small.

## Authority

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_AUTHORITY_V1` keeps all
live authority false, including:

- network access / SSH execution;
- credential read/write;
- remote filesystem read/write;
- server-controlled remote-identity policy origin;
- challenge freshness / response replay resistance;
- authenticated external transport;
- proven external witness storage;
- live remote read/append;
- runtime integration;
- protected / independent custody;
- production readiness;
- payment acceptance;
- wallet/signer/private-key access;
- transaction construction/signing/broadcast;
- Chain-2050 mutation;
- presale/market activation; and
- funds movement.

Source-green therefore means only that request/response bytes and least-authority
policy semantics are reviewed.

## Focused verification

```bash
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_external_witness_v1.ts
npm run typecheck
npm run build
git diff --check
```

The focused proof covers policy downgrade rejection, hostile host text,
deterministic read requests, read response tampering, policy mismatch, exact
parent-planner append, alternate canonical allocation-history CAS conflict,
append idempotence, request/response tampering, mandatory read-after-append,
and static absence of network/filesystem/child-process execution in the source
contract.

## Next gate

After this contract is reviewed, the separate gate is a source-only forced-command
handler / remote-store persistence implementation plus synthetic proof. Actual
SSH key creation/installation, known-hosts installation, Nimo service setup,
remote store bootstrap and live transport observation remain separately
authorized operator actions.
