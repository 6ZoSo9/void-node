# Buy VOID allocation custody witness live-read replay installation evidence v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1`
is a read-only designated-host storage-placement qualifier for the merged
live-read replay writer and canonical replay high-water contracts.

It answers a narrow question:

> Are the already-installed replay journal and replay high-water files
> canonical, stable, intent-free, and placed on two path-disjoint local
> filesystem mounts backed by two different physical parent block devices?

The collector does not create storage, write replay state, acquire writer
locks, perform SSH, read or mutate the external witness, access wallets or
signers, construct or broadcast transactions, activate the presale/market, or
move funds.

## Parent contracts

The collector requires:

- `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1`;
- `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1`;
- the existing Linux mountinfo parser/resolver used by allocation-custody
  preflight.

The replay journal filename is fixed:

`live-read-replay-v1.jsonl`

The high-water filename is fixed:

`live-read-replay-high-water-v1.json`

The publication-intent filename is fixed:

`live-read-replay-publication-intent-v1.json`

## Root and file observation

Both caller-selected root paths must be exact absolute real paths. Symlink
aliases or symlink ancestors HOLD.

Each root is opened descriptor-relative with
`O_DIRECTORY|O_NOFOLLOW`. The final visible path and retained descriptor must
identify the same current-UID private directory.

The journal and high-water files are each opened from the retained root
descriptor with `O_NOFOLLOW`. Each file must be:

- owned by the root owner UID/GID;
- mode `0600`;
- single-link;
- regular;
- non-symlink;
- within the canonical byte ceiling.

The reader captures the opened file identity, reads exactly the accepted size,
probes one byte at EOF, and rebinds the visible pathname after the read.

Before returning success, the collector revalidates both root descriptors and
both visible files again. A same-UID root or file replacement during the
observation window therefore HOLDS.

## No pending publication intent

Neither storage root may contain
`live-read-replay-publication-intent-v1.json`.

Intent absence is checked before file observation and again during the terminal
revalidation. The installation qualifier therefore observes only a clean
writer state, not an interrupted transition that still requires recovery.

## Canonical journal/high-water binding

The collector hashes the exact observed journal and high-water bytes and then
calls:

`classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(...)`

A stale, future, malformed, or otherwise mismatched high-water record HOLDS.

The successful receipt exposes the canonical generation, sequence, event
count, pending challenge identity/expiry, last terminal state,
`ready_for_issue`, and canonical high-water SHA-256.

The collector does not define another high-water schema.

## Storage-domain qualification

The collector reads the real `/proc/self/mountinfo` before observation and
again after the root/file/device census. The two byte sequences must be
identical.

Each root must resolve to a local filesystem class:

- `ext4`;
- `xfs`;
- `btrfs`.

The mount source must be a `/dev/...` device.

Journal and high-water roots must be path-disjoint and differ in all of:

- directory `stat.dev`;
- mount ID;
- major:minor identity;
- mount source;
- resolved mount-source path.

This gate is deliberately stronger than merely requiring two partitions.

For each mount source the collector resolves the parent block device through
`lsblk -ndo PKNAME`, then requires a non-empty
`lsblk -ndo SERIAL,WWN` identity.

The two roots must additionally differ in all of:

- parent block-device path;
- disk serial;
- disk WWN.

Two partitions on the same physical parent disk therefore HOLD.

## Double census

A live qualification performs the complete observation twice.

The public snapshots must be canonically identical across both censuses,
including:

- hostname;
- root inode/device/mount identities;
- parent-disk identities;
- file identities;
- journal SHA-256;
- high-water SHA-256; and
- intent absence.

Only then may the result report:

```text
live_storage_observation_proven=true
distinct_local_storage_domains_proven=true
distinct_parent_block_devices_proven=true
double_census_stability_proven=true
```

Synthetic snapshot classification is exported only as an explicitly test-only
helper and keeps those live proof flags false.

## What this still does not prove

Two distinct physical disks on one host are still not proof that an
administrator, hypervisor, RAID/controller, backup tool, snapshot manager,
filesystem restore procedure, or host-wide rollback cannot revert both
domains together.

Therefore a successful live storage placement result still reports:

```text
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
live_evidence_origin_proven=false
external_transport_authenticated=false
external_witness_storage_proven=false
live_remote_read_performed=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
```

The next operator gate must provision the two roots on reviewed separate
devices and execute this collector on the designated host. A later
rollback/snapshot-independence qualification is still required before stronger
custody authority is allowed.

## Usage

```bash
node tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs \
  --journal-root /absolute/private/journal-root \
  --high-water-root /absolute/private/high-water-root \
  --expected-hostname HOST
```

The tool is read-only. It expects the writer's genesis or later coherent files
to already exist.

## Focused proof

```bash
npm run typecheck
npm run build
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
node scripts/prove_buy_void_allocation_custody_preflight_v1.mjs
git diff --check
```

The proof covers:

- canonical genesis journal/high-water binding;
- test-only distinct mount + distinct parent-disk classification;
- same `stat.dev` HOLD;
- same mount-ID HOLD;
- same major:minor HOLD;
- same mount-source HOLD;
- same resolved mount-source HOLD;
- same parent device HOLD;
- same disk serial HOLD;
- same disk WWN HOLD;
- nested-root HOLD;
- non-local/overlay filesystem HOLD;
- owner mismatch HOLD;
- wrong file mode HOLD;
- pending publication-intent HOLD;
- journal byte/digest drift HOLD;
- stale high-water binding HOLD;
- synthetic evidence unable to claim live proof;
- collector source contains no filesystem mutation or SSH path; and
- a real same-host temporary fixture unable to claim independent custody.

No live installation is authorized by this source contract.
