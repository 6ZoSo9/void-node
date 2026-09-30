# VOID public-origin binding seed-service apply v1

Marker: `VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1`

Status: manual activation operator source. Merging this operator does not apply
a plan or mutate the live seed.

## Purpose

The seed-service plan compiler already proves the exact three public-origin
environment values, canonical seed service, drop-in text, clean-environment
compatibility, and signed-binding lineage.

This operator is the separately gated mutation boundary for installing that
already-reviewed plan.

The fixed production target is:

```text
unit=void-public-seed-gateway-v1.service
unit_path=~/.config/systemd/user/void-public-seed-gateway-v1.service
bind=127.0.0.1
port=4111
dropin=95-void-public-origin-binding-v1.conf
systemctl=/usr/bin/systemctl
```

There are no CLI overrides for unit, port, home directory, systemctl path,
origin, node ID, signed-binding path, drop-in name, or tunnel service.

## Read-only inspect

```bash
node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs \
  inspect \
  --plan /absolute/seed-service-plan.json
```

Inspect:

1. reads the mode-0600 plan as a direct regular file;
2. re-runs the merged seed-service plan compiler against the plan's activation
   packet and the fixed canonical clean-environment source;
3. requires exact canonical plan equality; and
4. prints the exact apply confirmation.

It performs no systemd or filesystem mutation.

The confirmation format is:

```text
apply-void-public-origin-binding-seed-service-plan-v1:<plan_id>:<dropin_sha256>
```

## Apply

A real apply additionally requires:

```bash
node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs \
  apply \
  --plan /absolute/seed-service-plan.json \
  --receipt /absolute/activation-receipt.json \
  --confirmation 'apply-void-public-origin-binding-seed-service-plan-v1:<plan_id>:<dropin_sha256>'
```

The exact confirmation is checked before systemd inspection or drop-in writes.

The live apply path does not accept a caller-selected verification clock. It
uses its own current clock for the initial plan verification, performs only the
read-only systemd preflight, then re-runs the full signed-binding/plan
verification with a fresh current-clock reading immediately before it inspects
or writes the target drop-in. The second read must reproduce the same plan ID,
plan artifact SHA-256, confirmation, and canonical plan bytes. A binding that
expires during preflight therefore fails closed before mutation.

Before mutation the operator requires:

- canonical existing user systemd directory;
- direct canonical
  `void-public-seed-gateway-v1.service` unit file;
- systemd `FragmentPath` equal to that exact user unit path;
- seed gateway already active;
- create-only receipt path.

## Mutation scope

The only intended mutation is the one mode-0600 drop-in:

```text
~/.config/systemd/user/void-public-seed-gateway-v1.service.d/95-void-public-origin-binding-v1.conf
```

The operator installs the exact drop-in bytes already committed to the reviewed
plan, then runs only:

```text
/usr/bin/systemctl --user daemon-reload
/usr/bin/systemctl --user restart void-public-seed-gateway-v1.service
```

It does **not** enable/disable the service, restart the named tunnel, change DNS
or TLS, restart Public Earn, access a private key, create a signature, touch a
wallet, submit a transaction, mutate validators, or move funds.

## Post-restart qualification

After restart the operator requires:

- seed gateway active;
- effective systemd environment contains the exact three plan values;
- both local binding aliases return HTTP 200 on loopback port 4111;
- both aliases are byte-identical; and
- returned bytes SHA-256 equal the signed-binding artifact SHA-256 from the
  reviewed plan.

Exact aliases:

```text
/.well-known/void-node-public-origin-binding-v1.json
/public-node/identity/public-origin-binding-v1.json
```

No named-tunnel restart is performed. External HTTPS/WC handoff qualification
remains a later evidence step.

## Crash journal and rollback

Before the first drop-in mutation, an apply that changes the reviewed drop-in
publishes one mode-0600 content-addressed journal at the fixed user-systemd
location:

```text
~/.config/systemd/user/.void-public-origin-binding-seed-service-apply-v1.journal.json
```

The journal binds the exact plan/artifact/binding digests, fixed target paths,
intended receipt path, whether the drop-in directory existed, its prior mode,
and the exact prior drop-in bytes/mode (or exact absence). Prior drop-in bytes
are captured through one `O_NOFOLLOW` file descriptor with before/after
device/inode/size/mtime/ctime checks and a single-link requirement. The journal
is durably published before mutation.

If any ordinary post-write daemon-reload/restart/environment/binding
qualification step fails, the operator restores the exact prior drop-in and
directory state and reads it back before doing anything else. If restore or
readback fails, recovery stops immediately and does **not** daemon-reload or
restart an unknown generation. Only an exact restored generation is followed by
daemon-reload. If that rollback daemon-reload fails, restart is **not**
attempted; the journal remains for explicit recovery. A restart is attempted
only after the restored generation has been successfully reloaded. The journal
is removed only after rollback succeeds. Any
restore/readback/reload/restart or journal-cleanup failure is surfaced as
`rollback_failed`.

A process crash leaves the journal in place. A later `apply` refuses to start
while that journal exists. Recovery is explicit:

```bash
node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs \
  inspect-recovery

node ops/public/void-public-origin-binding-seed-service-apply-v1.mjs \
  recover \
  --confirmation 'recover-void-public-origin-binding-seed-service-apply-v1:<journal_id>'
```

`inspect-recovery` performs no mutation. The recovery confirmation is bound to
the exact content-derived journal ID. Recovery proceeds only when the current
drop-in is either the journaled desired generation or the exact journaled prior
generation. After the fixed unit-path preflight, recovery repeats that exact
state check synchronously immediately before restore; if the target changed
during recovery preflight, it HOLDs before any restore, daemon-reload, or
restart. Unknown/foreign bytes are therefore not intentionally overwritten.
Recovery is retry-safe: if prior bytes were restored but the recovery restart
failed, the same journal remains and a later exact recovery can retry from the
already restored state.

After successful post-restart qualification, journal removal plus parent
directory fsync is the apply commit point. If the process stops before that
commit point, recovery conservatively restores the prior serving state. If it
stops after journal removal but before receipt publication, the desired serving
state is committed; a later exact apply can requalify it and create a receipt
without another drop-in mutation.

Drop-in replacement/removal renames are followed by directory fsync so the file
generation transition is crash-durable.

A success receipt is mode 0600 and records public digests, target paths, local
alias evidence, the apply-journal ID when a mutation occurred, and explicit
authority facts. It contains no private key or signing material.

## Proof

```bash
node --check ops/public/void-public-origin-binding-seed-service-apply-v1.mjs
node --check scripts/prove_void_public_origin_binding_seed_service_apply_v1.mjs
node scripts/prove_void_public_origin_binding_seed_service_apply_v1.mjs
node scripts/prove_void_public_origin_binding_seed_service_plan_v1.mjs
```

The proof uses only temporary files, an ephemeral signed binding, an injected
fake systemd runner, and an injected fake loopback fetcher.

It proves:

- wrong confirmation performs zero systemd calls and no write;
- a plan that becomes invalid between entry and the fresh pre-mutation recheck
  permits only read-only FragmentPath/is-active preflight and performs no write,
  reload, restart, fetch, or receipt creation;
- live apply has no caller-selected verification clock;
- canonical fixed seed unit/drop-in target;
- exact planned drop-in mode 0600;
- daemon-reload/restart orchestration;
- exact effective environment check;
- two byte-identical binding aliases with expected artifact SHA-256;
- mode-0600 success receipt;
- a durable journal exists before the first drop-in mutation and is removed only
  after successful qualification;
- a stale journal blocks a new apply;
- wrong recovery confirmation causes zero systemd calls;
- foreign/unknown drop-in bytes refuse recovery;
- a target changed during the recovery preflight is rejected before restore;
- crash recovery restores exact prior bytes and retries safely after a recovery
  restart failure;
- directory fsync follows drop-in generation changes; and
- rollback restores a prior drop-in and attempts a recovery restart after a
  simulated restart failure.

No real systemd command, production binding, production key, service restart,
network mutation, or funds movement occurs in CI.

## Production boundary

Source acceptance of this operator is not live activation authorization.

A production apply requires a real reviewed seed-service plan generated from a
real signed production binding and a separate explicit authorization for the
exact plan ID/drop-in digest confirmation.

After a successful apply, external HTTPS binding verification plus existing
directory -> WC handoff acceptance must still prove `public_copy_ready=true`.
