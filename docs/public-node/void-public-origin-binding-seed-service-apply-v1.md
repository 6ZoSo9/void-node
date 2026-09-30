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

## Rollback

If mutation occurred and any daemon-reload/restart/environment/binding
qualification step fails, the operator restores the exact prior drop-in state
atomically, reloads systemd, and restarts the seed gateway again. Any rollback
restore/reload/restart failure is surfaced in the terminal error as
`rollback_failed`; recovery failure is never silently reported as successful.

A success receipt is mode 0600 and records public digests, target paths, local
alias evidence, and explicit authority facts. It contains no private key or
signing material.

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
- mode-0600 success receipt; and
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
