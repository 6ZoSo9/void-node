# VOID public-origin binding seed-service plan v1

Marker: `VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1`

Status: source-only service configuration plan compiler.

## Purpose

The merged public-origin activation packet proves one signed binding and emits
the exact three environment variables needed by the serving boundary. This
compiler binds those values to the **canonical public seed gateway service**
without writing systemd state.

The fixed target is:

```text
unit=void-public-seed-gateway-v1.service
bind=127.0.0.1
port=4111
dropin=95-void-public-origin-binding-v1.conf
```

The 4122 Public Earn gateway is not the target. Public Earn tunnel routing sends
non-Earn paths such as the signed `/.well-known` binding back through the 4111
seed gateway.

## Inputs

The production CLI requires:

- one mode-0600 activation packet produced by
  `VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1`; and
- one absolute create-only output path.

It derives the seed gateway's clean-environment input from the fixed canonical
operator path:

`~/.config/systemd/user/void-public-seed-gateway-v1.service.d/90-void-nullfeed-clean-environment.conf`

There is no production `--clean-environment-dropin` override. The pure builder
retains an injectable path only for deterministic source proofing.

The activation packet is not trusted by shape alone. The compiler re-runs the
merged activation-packet builder against the packet's signed binding and
requires exact canonical equality. An expired, replaced, tampered, or otherwise
unverifiable binding therefore cannot produce a service plan.

## Clean-environment conflict check

systemd applies `UnsetEnvironment=` after environment composition. A drop-in
that merely adds `Environment=` cannot safely override a denylist removing the
same variable.

The production compiler reads that exact canonical clean-environment drop-in as
a direct mode-0600 file and fails closed if it unsets any of:

```text
VOID_PUBLIC_ORIGIN_BINDING_FILE
VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN
VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID
```

This lane does not rewrite or reset the existing `UnsetEnvironment=` list.

## Output

The mode-0600 JSON plan contains:

- content addresses for the activation packet and signed binding;
- the fixed target unit, loopback port, and drop-in name;
- the clean-environment source path and SHA-256;
- the exact three environment values;
- the exact future drop-in text and SHA-256; and
- explicit all-false mutation authority.

The future drop-in contains exactly three `Environment=` directives and no
`UnsetEnvironment=`.

## Authority boundary

The plan compiler does not:

- write a systemd drop-in;
- run `daemon-reload`;
- enable/start/restart any service;
- restart or alter the named tunnel;
- change DNS/TLS;
- read a private key;
- sign anything;
- mutate VOID runtime, Work Credits, validators or transactions; or
- move funds.

The plan states that future installation requires a seed-gateway
`daemon-reload` and restart. Those are requirements, not authority.

## Proof

```bash
node --check tools/void-public-origin-binding-seed-service-plan-v1.mjs
node --check scripts/prove_void_public_origin_binding_seed_service_plan_v1.mjs
node scripts/prove_void_public_origin_binding_seed_service_plan_v1.mjs
node scripts/prove_void_public_origin_binding_activation_packet_v1.mjs
```

The focused proof uses an ephemeral signed binding through an injected test
verifier. The actual CLI keeps the reviewed production verifier and rejects
that unreviewed key. It also proves activation-packet tamper rejection,
clean-environment conflict rejection, rejection of a caller-selected decoy
clean-environment path, exact 4111 service binding, deterministic mode-0600
output, and absence of systemd/service mutation primitives.

## Next gate

After a real production binding is signed and a real activation packet exists,
this compiler may be run on the intended seed host to produce the exact reviewed
service plan.

Writing the drop-in, reloading systemd, restarting
`void-public-seed-gateway-v1.service`, and external signed-binding/WC handoff
qualification remain a separate explicit activation authorization.
