# Apollyon durable attempt-claim native peer guard integration v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_V2`

Status: **pure source/test integration contract; no runtime implementation or host action**.


## Current-parent lineage reconciliation

The native guard parent #3300 was merge-forwarded non-force onto current #3291
while preserving the compiled Linux C primitive byte-identically. This
integration child must therefore reference the current handoff and native-guard
proof generation, rather than a historical exact-head certificate. Complete Git
tree comparison from this child's historical #3300 base to its updated parent
found 350 changed paths, with zero overlap against the four files owned here.

The integration's source/proof bindings now name the exact #3291 handoff blob
`3feed7f71fb6941f8feccf393f151fa9e973d7a4`, unchanged native C blob
`defd863de841a1f1460e10985d1990ba1a382f70`, and current
native-guard proof blob `45421969be31286f295c0daba6c36a4e4698010e`.
The integration state machine remains source-only; this rebind is not
installed process-role qualification, a privileged handoff or claim authority.
Descendants must prove their own current-parent provenance before promotion.

## Purpose

Accepted #3291 defines the privileged revalidator / publisher / claim-service
provenance state machine. Accepted #3300 current generation `0c2235b5236e435bf41bb5678cc215362b02ba8e` proves a bounded set of Linux kernel
primitives in a self-test-only native candidate.

This gate binds those two sources without pretending the native self-test is
already a claim-service implementation or Xiphos host qualification.

## Exact inputs

- parent #3291 revalidation-handoff source blob:
  `3feed7f71fb6941f8feccf393f151fa9e973d7a4`;
- #3300 native peer-guard source blob:
  `defd863de841a1f1460e10985d1990ba1a382f70`;
- #3300 focused proof blob:
  `45421969be31286f295c0daba6c36a4e4698010e`.

The hosted proof recompiles and executes the exact native self-test again.

## What the native candidate supplies

The future implementation must use equivalent reviewed primitives for:

- AF_UNIX `SO_PEERCRED`;
- retained pidfd live and exited-state observation;
- process start-ticks generation identity;
- executable inode comparison;
- exec-in-place executable drift detection;
- exact 64-byte response framing;
- write-half-close + EOF;
- overflow, short-EOF, delayed-extra and missing-EOF rejection;
- read-half availability for the later acknowledgment.
- negative-frame receiver rejection counts only after the adversary sender is proven to have completed its intended send/half-close sequence with exit status 0.

The source candidate remains self-test only. It has no live mode.

## What remains deliberately unproven

The self-test runs same-UID ephemeral children. It does **not** prove:

- Xiphos cross-UID observation;
- the direct publisher PPid relationship required by #3291;
- exact interpreted body/cmdline/script identity;
- root revalidator or non-root publisher source installation;
- claim-service integration;
- systemd sandboxing or socket namespace ownership;
- protected-store mutation or durability;
- durable attempt claim or training admission.

The integration contract therefore keeps all of those runtime proof fields
false.

## Future implementation boundary

A later source implementation must preserve every accepted #3291 invariant:

1. authenticate root revalidator and publisher on the same fixed claim AF_UNIX
   socket before any publisher body read;
2. root control never carries or publishes a claim body;
3. publisher is the direct child of the retained revalidator generation;
4. exact canonical request bytes come only from the private inherited
   root-to-publisher pipe and are forwarded byte-for-byte;
5. pidfd, PID/start generation and exact source identity are checked before body
   read, before store mutation, and before success acknowledgment;
6. interpreted implementations additionally bind exact cmdline/script/body
   identity or use fixed fully-native executables;
7. the fresh 32-byte challenge / exact 64-byte response / half-close / EOF
   protocol from #3291 is preserved;
8. no protected-store mutation occurs until the fresh challenge succeeds and
   all local #3233 checks are revalidated;
9. provenance loss after mutation may be indeterminate but can never return a
   false success.

## Authority

No filesystem, account/group/systemd, service/socket/network, protected-store,
claim, training, key/signing/wallet, transaction or funds authority is granted.

Next gate:
`apollyon_durable_attempt_claim_store_service_source_implementation_v2`.

Keep Draft. PROTECT THE CORE.
