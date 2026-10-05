# Coupled native-gas reconciliation custody host evidence v1

Marker: `VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1`

Status: **read-only observation source; production HOLD**.

## Purpose

This lane is the observation bridge for the source-only custody classifier in
#2499. It does not replace that classifier and does not create a second custody
policy.

The collector asks a narrower question:

> Can one designated Linux host produce a stable, internally cross-bound
> observation containing the exact evidence shape that #2499 classifies?

A positive result remains source evidence. It is not a deployment, bootstrap,
runtime mount, or production custody qualification.

## Inputs

The live observer accepts only:

- exact payer root;
- payer address;
- required hostname;
- public runtime systemd unit name; and
- reconciliation-custody systemd unit name.

It derives process IDs from live `systemctl show`; caller-selected PIDs are not
accepted.

## Read-only observation

The collector performs no filesystem, service, mount, chain, or economic
mutation.

It reads:

- `/proc/<pid>/status` for effective UID/GID/groups/capabilities and
  `NoNewPrivs`;
- `/proc/<pid>/stat` for process start-time identity, preventing PID reuse
  from being treated as the same authorization subject;
- `/proc/<pid>/ns/mnt` for mount-namespace identity;
- `/proc/<custody-pid>/mountinfo`;
- payer-root/ancestor/child metadata with no-follow descriptor checks;
- exact `payer-domain-v1.json` bytes;
- `systemctl show` and `systemctl cat` metadata;
- `findmnt --target ... --output UUID`;
- bounded noninteractive `pkcheck` authorization queries for the custody-service control surface; and
- the kernel boot ID and machine ID, which are emitted only as SHA-256.

The collector reuses
`parseMountInfoV1(...)` and `resolveMountForPathV1(...)` from the existing
Buy VOID allocation-custody preflight instead of maintaining a second Linux
mountinfo parser.

## Namespace and mount-table binding

Linux mount IDs are namespace-local. Therefore the collector requires the
collector process, public runtime process, and custody service process to share
one exact mount namespace for V1.

It binds the namespace by the observed `/proc/.../ns/mnt` device/inode/link
identity and requires that identity to be unchanged after collection.

It also reads the custody process's mountinfo before and after collection and
requires the bytes to be identical. Governing mount records are selected by the
existing longest-prefix resolver.

If a future deployment intentionally separates these mount namespaces, it needs
a later reviewed collector generation that explicitly proves their
relationship. V1 does not guess across namespaces.

## Filesystem evidence

The collector observes the exact payer root and:

- `payer-domain-v1.json`;
- `records/`;
- `reconciliations/`; and
- `gas-liability-admission-v1.queue/`.

Visible paths must be exact real paths. Direct root/child opens use
`O_NOFOLLOW`; directories additionally use `O_DIRECTORY`. Visible and
descriptor identities must agree.

The complete path evidence is collected twice around service/process/mount
revalidation and must remain byte-equivalent after normalization.

Ancestor paths are derived from the payer root rather than caller-supplied.
The #2499 classifier remains authoritative for the required root ownership,
modes, root/child mount-ID equality, inode separation, canonical payer-domain
identity, service policy, and negative-test fields.

## Read-only negative evidence

The collector treats public-runtime mount mutation as denied only when the live
runtime process has no inherited, permitted, effective, bounding, or ambient
capabilities and the runtime/custody/collector mount namespace is the same
observed namespace. The custody service is held to the same zero-capability
process condition. `Uid:` / `Gid:` evidence must have identical real,
effective, saved, and filesystem identities; filesystem permission decisions
therefore cannot be derived from a weaker real-ID view.

Payer-root rename/recreate/symlink-substitution denial is derived from the
runtime's effective UID/GID/groups and the parent-directory permission bits.

Bind/remount/alternate-mount-namespace denial is not inferred merely from the
current namespace snapshot. The collector also reads the public runtime unit's
effective `RestrictNamespaces=` policy and requires mount-namespace creation to
be prohibited. Unknown or permissive policy leaves those #2499 negative-evidence
flags false and therefore HOLDS instead of claiming denial.

Systemd service-control denial is obtained with noninteractive Polkit
authorization queries bound to the exact custody unit. The direct
`org.freedesktop.systemd1.manage-units` denial set covers `start`, `stop`,
`reload`, `restart`, `try-restart`, `reload-or-restart`,
`reload-or-try-restart`, `kill`, `kill-subgroup`, `reset-failed`,
`set-property`, `clean`, `bind-mount`, and `mount-image`. The latter two
are especially custody-relevant because systemd can use them to modify the
running service's mount namespace. The collector also requires blanket denial of
`org.freedesktop.systemd1.manage-unit-files` and
`org.freedesktop.systemd1.reload-daemon` for the public-runtime subject.

The Polkit subject is bound as `PID,start-time,UID`, not PID alone. If any
required query is authorized, unavailable, or indeterminate, collection HOLDS.
This prevents a policy that denies only start/stop/restart while permitting a
different unit-control verb from being collapsed into the broader
`public_runtime_can_control_service=false` evidence claim.

These observations still do not prove a globally trusted security boundary.
They are bounded host evidence supplied to #2499.

## Service policy

The collector reads the effective custody service's systemd properties and
maps them into #2499's exact policy fields:

- `UMask`;
- `NoNewPrivileges`;
- `PrivateTmp`;
- `PrivateDevices`;
- `ProtectSystem`;
- `ProtectHome`;
- kernel/control-group protections;
- `LockPersonality`;
- `RestrictSUIDSGID`;
- `RestrictRealtime`;
- capability/ambient-capability sets; and
- `ReadWritePaths`.

The complete `systemctl cat` output is content-addressed. The service metadata
and main PID must remain unchanged across the observation window.

## Freshness and remaining trust gaps

The observation uses a bounded two-minute source TTL and binds hashed boot and
machine IDs. Its evidence generation is derived from the observation timestamp.

That is useful replay context, but V1 **does not** claim a trusted clock or a
monotonic evidence-generation authority.

A successful live collection therefore still reports:

```text
trusted_collector_proven=false
writer_generation_binding_proven=false
bootstrap_receipt_external_trust_proven=false
evidence_generation_monotonicity_proven=false
verification_clock_authority_proven=false
live_host_qualification_performed=false
storage_bootstrap=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
```

The inner #2499 result remains `source_qualified`. This collector only records
where that input came from.

## Synthetic proof boundary

`testOnlyClassifyCollectedHostEvidenceV1(...)` exists only for deterministic
CI. Synthetic evidence can prove parser/composition behavior, but always returns
`live_observation_backed=false` and cannot become live host authority.

The proof covers:

- exact #2499 classifier reuse;
- authority flags;
- proc-status parsing;
- systemd-show parsing and mount-namespace restriction semantics;
- exact systemd direct-control Polkit verb-denial set, including live bind/image mounts, plus unit-file and daemon-reload denial tokens;
- proc start-time parsing, non-divergent FS UID/GID identity, full capability
  masks, and `NoNewPrivs` evidence;
- designated-host mismatch HOLD;
- mountinfo drift HOLD;
- mount-namespace drift HOLD;
- child governing-mount substitution HOLD; and
- static absence of filesystem mutation primitives.

## Usage

Read-only operator observation, when separately authorized:

```bash
node --import tsx \
  tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs \
  --payer-root /absolute/private/payer-root \
  --payer-address 0x... \
  --expected-hostname HOST \
  --public-runtime-unit UNIT \
  --custody-service-unit UNIT
```

This command is not executed by CI and this source lane does not authorize its
execution on a production host.

## Verification

```bash
npm run typecheck
npm run build
node --import tsx \
  scripts/prove_coupled_native_gas_reconciliation_custody_host_evidence_v1.mjs
node --import tsx \
  tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs \
  --help
git diff --check
```

## Next gate

After source review and acceptance, later work must still bind the exact
accepted reconciliation-writer generation, establish protected
bootstrap/qualification receipt custody, establish trusted clock/generation
continuity, and perform a separately authorized designated-host observation.

No live service install/start/restart, mount/remount, chmod/chown, storage
write, RPC, wallet/signer/key action, transaction, Chain-2050 write, gas spend,
market/presale activation, treasury/liquidity action, or funds movement is
authorized here.
