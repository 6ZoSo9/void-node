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
- `getfacl` output for every retained file/directory and ancestor used in permission inference;
- `systemctl show` and `systemctl cat` metadata;
- `findmnt --target ... --output UUID`;
- bounded noninteractive `pkcheck` authorization queries for the custody-service control surface; and
- the kernel boot ID and machine ID, which are emitted only as SHA-256.

The collector reuses
`parseMountInfoV1(...)` and `resolveMountForPathV1(...)` from the existing
Buy VOID allocation-custody preflight instead of maintaining a second Linux
mountinfo parser.


## Namespace and mount-table binding

Linux mount IDs are namespace-local. The collector therefore treats the
**custody service mount namespace** as the only mount-ID authority.

The collector process itself must already be executing in that exact custody
mount namespace. It must also share the custody process's exact filesystem-root
identity (`/proc/self/root` versus `/proc/<custody-pid>/root`). A shared
mount namespace alone is not enough because a process may have a different
chroot/root directory. Namespace or filesystem-root mismatch HOLDS.

This keeps ordinary path/descriptor observations and
`/proc/<custody-pid>/mountinfo` in one mount-ID domain and one absolute-path
view.

The public runtime is **not** required to share the custody namespace or
filesystem root. Its
`/proc/<pid>/ns/mnt` identity and `/proc/<pid>/mountinfo` bytes are
fingerprinted separately and revalidated before/after collection. This is
intentional because systemd filesystem hardening such as `PrivateTmp=true`
may place a service in a private filesystem namespace.

The collector fingerprints the public runtime filesystem root independently.
Whether or not its mount namespace/root identity differs, the collector resolves
the canonical payer-root pathname and every retained ancestor through
`/proc/<public-pid>/root/...`. Those objects must map to the same underlying
`(dev,ino)` identities observed in the custody namespace, and the runtime's
UID/GID/groups must still lack mutation permission on the mapped root and
ancestors. If the canonical path maps to different objects, collection HOLDS
instead of inferring safety from custody-namespace mode bits.

The custody and public-runtime mountinfo snapshots are each read before and
after collection and must remain byte-identical. Governing mount records for
the protected storage are selected only from the custody process's mountinfo
with the existing longest-prefix resolver. Public-runtime mount IDs are
recorded only as namespace-local evidence and are never compared to custody
mount IDs as if they were global.

The collector itself performs no namespace entry. A separately reviewed
operator wrapper may establish the custody service's mount namespace before
launching this read-only process. A normal host-shell invocation outside that
namespace HOLDS.

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
Before mode-bit permission analysis, the collector runs fail-closed `getfacl`
checks on every retained file/directory and every ancestor. Named user/group
ACL entries and default ACLs are rejected. This prevents a named ACL grant to
the public-runtime UID from being hidden behind apparently non-writable owner /
group / other mode bits. Missing or unparsable ACL evidence HOLDS.

The #2499 classifier remains authoritative for the required root ownership,
modes, root/child mount-ID equality, inode separation, canonical payer-domain
identity, service policy, and negative-test fields.


## Read-only negative evidence

The collector treats public-runtime filesystem mutation as denied only when the
live runtime process has no inherited, permitted, effective, bounding, or
ambient capabilities and its canonical payer-root/ancestor view is explicitly
cross-bound to the same underlying objects used by the custody classifier.
The custody service is held to the same zero-capability process condition.
`Uid:` / `Gid:` evidence must have identical real, effective, saved, and
filesystem identities; filesystem permission decisions therefore cannot be
derived from a weaker real-ID view.

The collector and custody process must share one exact mount namespace. The
public runtime may be in a different namespace; that namespace identity,
mountinfo snapshot, canonical path mapping, and before/after stability are
content-bound separately.

Payer-root rename/recreate/symlink-substitution denial is derived only after
the public runtime's canonical parent/root objects have been matched back to
the custody objects. A different public-runtime mapping HOLDS rather than being
treated as stronger isolation without proof.

Bind/remount/alternate-mount-namespace denial is not inferred merely from the
current namespace snapshot. The collector also reads the public runtime unit's
effective `RestrictNamespaces=` policy and requires mount-namespace creation
to be prohibited. Unknown or permissive policy leaves those #2499
negative-evidence flags false and therefore HOLDS instead of claiming denial.

Systemd service-control denial is obtained with noninteractive Polkit
authorization queries bound to the exact custody unit. The direct
`org.freedesktop.systemd1.manage-units` denial set covers `start`, `stop`,
`reload`, `restart`, `try-restart`, `reload-or-restart`,
`reload-or-try-restart`, `kill`, `kill-subgroup`, `queue-signal`,
`freeze`, `thaw`, `reset-failed`, `set-property`, `clean`,
`bind-mount`, and `mount-image`. Freeze/thaw and queued signals are direct
unit-control surfaces; the latter two mount verbs
are custody-relevant because systemd can use them to modify the running
service's mount namespace. The collector also requires denial of
`org.freedesktop.systemd1.manage-unit-files` and
`org.freedesktop.systemd1.reload-daemon` for the public-runtime subject.

The Polkit subject is bound as `PID,start-time,UID`, not PID alone. Every
required verb/action query is executed even if an earlier query would already
make the aggregate result HOLD; there is no short-circuit sampling. The full
required unit/action/verb denial set is sampled twice: once before the host
census and once after process, mount, namespace, root, and path revalidation.
Both policy snapshots must remain byte-canonically identical and fully denied.
A deny→allow, allow→deny, unavailable, indeterminate, or otherwise changed
result HOLDS with `service_policy_changed_during_observation` instead of
exporting stale negative authority.

This remains a bounded direct-control proof; it does not claim the runtime can
never obtain some other privileged delegate through a broader host policy.

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
CI. Synthetic evidence can prove parser/composition behavior, but always
returns `live_observation_backed=false` and cannot become live host authority.

The proof covers:

- exact #2499 classifier reuse;
- authority flags;
- proc-status parsing;
- systemd-show parsing and mount-namespace restriction semantics;
- exact systemd direct-control Polkit verb-denial set, including live
  bind/image mounts, plus unit-file and daemon-reload denial tokens;
- before/after custody-control policy equality and explicit deny→allow drift
  rejection;
- proc start-time parsing, non-divergent FS UID/GID identity, full capability
  masks, and `NoNewPrivs` evidence;
- simple POSIX ACL acceptance plus named/default extended ACL rejection before
  mode-bit permission inference;
- designated-host mismatch HOLD;
- custody mountinfo drift HOLD;
- public-runtime mountinfo drift HOLD;
- collector/custody namespace mismatch HOLD;
- collector/custody filesystem-root mismatch HOLD;
- public-runtime namespace/root separation accepted and fingerprinted;
- public-runtime or custody namespace/root drift HOLD;
- public-runtime canonical payer-root mapping mismatch HOLD;
- child governing-mount substitution HOLD; and
- static absence of filesystem mutation primitives.


## Usage

Read-only operator observation, when separately authorized, must execute the
collector **inside the custody service mount namespace**. The collector itself
does not call `nsenter`, `setns`, mount, remount, or any service mutation.

A separately reviewed operator wrapper must establish that namespace before
invoking:

```bash
node --import tsx \
  tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs \
  --payer-root /absolute/private/payer-root \
  --payer-address 0x... \
  --expected-hostname HOST \
  --public-runtime-unit UNIT \
  --custody-service-unit UNIT
```

A normal host-shell invocation outside the custody namespace **or** with a
different filesystem root HOLDS instead of mixing host-view path metadata with
custody-view mount IDs and absolute paths.

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
