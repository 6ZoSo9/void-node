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
`O_NOFOLLOW` beneath a root-owned non-writable parent.

The authority root must be a direct same-UID mode-0700 directory. Witness and
intent files must be single-link mode-0600 regular files.

## Request protocol

Exactly one canonical JSON line is accepted.

Two operations exist:

### read

The request carries no replay payload. It returns the current witness state and
performs no mutation unless it is completing the exact append request already
bound by a pending durable intent. A read while an unrelated append intent is
pending HOLDS.

### append

The request carries only canonical Precision replay-journal bytes and canonical
replay-high-water bytes as base64. The server constructs source/witness identity
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

The intent is fsynced before witness mutation.

Recovery accepts only:

- exact prior witness;
- an exact prefix of the intended next line after a torn append; or
- the exact complete intended next witness before intent cleanup.

A torn append is truncated back to the exact prior byte count, fsynced, then the
same intent-bound line is appended. Unknown/mismatched bytes HOLD.

Recovery is request-bound. A different append request cannot recover an
existing intent. Non-append requests HOLD while an intent is pending.

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
read HOLD with pending intent, mismatched recovery request, host-identity drift,
caller path injection, and negative live/economic authority flags.

## Next gate

After #2551 and this stacked source contract are both merged, a separate
operator gate may install the exact handler/config/storage on Nimo and perform a
read-only authenticated qualification before any append is authorized.
