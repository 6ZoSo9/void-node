# Buy VOID allocation custody witness live-read replay external forced command v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1`
is the source-only forced-command storage boundary for the replay external
high-water witness defined by the parent #2551 source contract.

It is intended for a later Nimo installation. This PR does not install the
handler, change `authorized_keys`, mutate sshd, create live witness storage,
perform SSH, access wallets/signers, construct transactions, activate markets,
or move funds.

## Fixed storage contract

The handler accepts a root-owned read-only config containing:

- one fixed account-owned authority root;
- the exact fixed witness filename
  `buy-void-allocation-custody-witness-live-read-replay-external-v1.jsonl`;
- the reviewed Precision source identity:
  hostname, replay journal root, replay high-water root, and both disk WWNs;
- the reviewed expected Nimo identity:
  hostname, machine-ID SHA-256, root-disk serial, and root-disk WWN.

Callers cannot select a path, command, policy, source identity, witness identity,
or arbitrary event bytes.

The production CLI accepts only one absolute `--config=...` path. The config
file must be root:root, mode 0444, single-link, and opened with
`O_NOFOLLOW` beneath a root-owned non-writable parent. The parent is not
trusted by pathname alone: the handler walks every ancestor descriptor-relative
from filesystem root with `O_DIRECTORY|O_NOFOLLOW`, requires each visible and
opened ancestor to remain root-owned and non-writable, binds the config's
visible inode to the opened descriptor before reading, and revalidates both the
file and pinned parent after the read.

The authority root must be a direct same-UID mode-0700 directory. Witness and
intent files must be single-link mode-0600 regular files.

## Request protocol

Exactly one canonical JSON line is accepted.

Two operations exist:

### read

The request carries no replay payload and performs no mutation. It returns the
current witness state only when no durable append intent is pending. If any
durable append intent exists, read HOLDS before intent recovery; the exact
append retry owns recovery and cleanup.

### append

The request carries only canonical Precision replay-journal bytes and canonical
replay-high-water bytes as base64. Canonical replay genesis is represented by an
empty replay journal and therefore uses the exact empty base64 string `""`;
the high-water payload remains non-empty. The server constructs source/witness identity
from the protected config plus live Nimo host observation, then calls:

`planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1`

The caller cannot supply `event_jsonl_line` or `next_witness_jsonl`.

The planner may return:

- `planned_genesis`: append external witness event 1 for replay genesis;
- `planned`: append exactly one next external event;
- `idempotent`: no write;
- HOLD: no write.

## Crash consistency

Before any append the handler writes a durable same-root intent binding:

- exact canonical request bytes and SHA-256;
- prior witness SHA-256/byte count/event count/tip;
- exact planner-produced next JSONL line;
- expected next witness SHA-256/byte count/event count/tip/replay sequence.

The intent is fsynced before witness mutation. Its exact bytes are then
descriptor/path rebound immediately before witness mutation and again after a
fsynced append. Final intent removal fsyncs the directory and revalidates the
visible authority-root pathname before success may return.

The intent-size ceiling is derived from the 12 MiB canonical request ceiling,
one maximal 4 KiB witness event, and bounded metadata. It is intentionally
larger than the replay journal ceiling because the request already base64-wraps
the replay/high-water payload and the durable intent base64-wraps those exact
canonical request bytes again. A near-capacity valid replay state must not pass
planning and then fail solely because its crash-recovery intent cannot represent
the accepted request.

When a durable intent exists, recovery re-runs the canonical #2551
external-witness planner against the exact reconstructed prior witness and the
exact request bytes bound by that intent. The stored next line, complete next
witness bytes, replay sequence, event count, tip, and digest must all equal that
fresh planner result before any truncate, append, or intent cleanup may occur.

Intent-backed recovery accepts only:

- exact prior witness;
- an exact prefix of the intended next line after a torn append; or
- the exact complete intended next witness before intent cleanup.

A torn append is truncated back to the exact prior byte count, fsynced, then the
same intent-bound line is appended. Unknown/mismatched bytes HOLD. A different
append request cannot recover an existing intent. Non-append requests HOLD while
an intent is pending.

The same-UID authority root is not claimed to make the intent pathname
undeletable. If the intent is missing and the witness contains a torn final
line, only an `append` request may attempt orphan-torn recovery. The handler:

1. takes the bytes through the last complete newline as the candidate prior
   witness;
2. requires that prior witness to parse and bind the configured source/witness
   identity;
3. re-runs the canonical planner using the supplied replay journal/high-water
   and that exact prior witness;
4. requires the observed torn tail to be a non-empty strict byte prefix of the
   freshly planned one-event line;
5. requires the fresh next witness to equal prior bytes plus that exact line;
6. recreates and rebinds a durable intent before truncating or appending; and
7. postchecks the exact final witness before intent cleanup.

This orphan path is **planner/source-state bound**, not caller-request-ID
authority: the forced-command request ID is not an input to the witness planner.
A `read` never repairs an orphan torn witness and performs no mutation. Any
tail not reproduced exactly by the canonical planner HOLDS.

## Identity enforcement

Nimo host facts are observed by the server from:

- `/etc/machine-id`;
- hostname;
- root mount source;
- parent disk serial;
- parent disk WWN.

They must match the protected config exactly.

Existing witness history must match both the protected Precision source identity
and the observed Nimo identity. Identity drift HOLDS.

## Authority boundary

Source-green does not mean installed or authenticated. All of these remain
false:

```text
live_nimo_installed=false
server_controlled_policy_origin_proven=false
external_transport_authenticated=false
external_witness_storage_proven=false
live_remote_read_performed=false
live_remote_append_performed=false
runtime_integration=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_movement=false
```

## Focused proof

```bash
npm run typecheck
npm run build
node --check tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
git diff --check
```

The proof covers empty read, canonical genesis append, one-event advance,
idempotence, intent-only crash, torn append, full append before intent cleanup,
read HOLD with pending intent, mismatched intent-backed recovery request,
canonical-but-forged intent rejection before witness mutation, deletion of the
just-created intent before append with zero witness bytes written, orphan-torn
recovery after intentional intent loss, nonmutating read against that orphan
torn state, final-cleanup authority-root rebind, host-identity drift, caller
path injection, root-owned descriptor-walked config ancestry and file binding,
the nested-base64 near-capacity request/intent bound, and negative live/economic
authority flags.

## Next gate

After #2551 and this stacked source contract are both merged, a separate
operator gate may install the exact handler/config/storage on Nimo and perform a
read-only authenticated qualification before any append is authorized.