# VOID public-origin binding external acceptance v1

Marker: `VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1`

Status: read-only external qualification receipt.

## Purpose

After a production signed public-origin binding is installed on the seed gateway,
the remaining trust claim is external: can a participant discover Public Earn,
verify the reviewed signed identity, see the same binding bytes on both public
aliases, and receive a copy-ready participant handoff without any mutation?

This tool composes the already-merged read-only trust surfaces into one
create-only mode-0600 receipt.

The production CLI is fixed to:

```text
origin=https://seed.nullfeed.org
node_id=9d89483769e469e0473b489dc50dba96
public_key_fingerprint_sha256=2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b
trust_registry_sha256=49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790
probe_account=void-origin-binding-acceptance-v1
```

The CLI exposes no override for any of those values.

## Read-only composition

The receipt runs the fixed repository tools:

1. `wc-public-opportunity-directory-v1.mjs`
2. `wc-public-opportunity-handoff-v1.mjs`

The directory must report the canonical public origin as a trusted available
entry with the canonical 3 WC award boundary and no unsafe child result.

The handoff must independently prove:

- live `/health` node ID equals the reviewed node ID;
- trust mode is `signed_public_origin_binding`;
- `public_copy_ready=true`;
- fixed reviewed trust-registry SHA-256;
- fixed reviewed public-key fingerprint;
- canonical binding path;
- HTTP 200 signed binding;
- no client execution, identity creation, ticket issuance, receipt submission,
  WC award, wallet access, or settlement attempt.

The generated status/run commands are evidence only. This receipt does not
execute either command.

## External alias identity

The tool then performs GET-only HTTPS reads of:

```text
/.well-known/void-node-public-origin-binding-v1.json
/public-node/identity/public-origin-binding-v1.json
```

Both must:

- return HTTP 200 without redirect;
- remain within 128 KiB;
- be byte-identical; and
- have SHA-256 equal to the binding SHA already verified by the handoff.

The receipt therefore does not introduce a second signature verifier; it reuses
the reviewed handoff verifier and independently proves that both public aliases
serve those exact verified bytes.

## Participant copy-ready evidence

The tool also reads:

```text
/__void/public-participant/status.json
/participant
```

The status JSON must report:

- `available=true`;
- `public_copy_ready=true`;
- `status=copy_ready`;
- canonical public origin;
- canonical node ID;
- `coordinator_node_id_trusted=true`;
- signed-public-origin trust mode;
- the same binding SHA as the handoff/aliases;
- reviewed fingerprint; and
- `manual_coordinator_substitution=false`.

The HTML must report `data-public-copy-ready="ready"`, show the signed identity
message and canonical origin/node ID, and contain none of:

```text
PUBLIC_HTTPS_BASE
COORDINATOR_NODE_ID
Identity HOLD
```

## Usage

```bash
node tools/void-public-origin-binding-external-acceptance-v1.mjs \
  run \
  --output /absolute/external-acceptance-receipt.json
```

The receipt path must be absolute, canonical, absent, and have an existing
canonical parent. Output is create-only mode 0600.

There are no CLI options for origin, node ID, account, timeout, trust registry,
directory tool, handoff tool, client execution, ticket claim, or submission.

## Safety boundary

The production tool uses only:

- the two fixed read-only child tools; and
- four fixed external GET surfaces.

It never:

- executes the generated no-node client commands;
- creates participant identity state;
- claims a ticket;
- fetches a work dataset through the client;
- submits a result or receipt;
- awards or settles WC;
- accesses a wallet or signer;
- changes service/systemd/tunnel/DNS/TLS state;
- mutates validators or runtime;
- submits transactions; or
- moves funds.

## Proof

```bash
node --check tools/void-public-origin-binding-external-acceptance-v1.mjs
node --check scripts/prove_void_public_origin_binding_external_acceptance_v1.mjs
node scripts/prove_void_public_origin_binding_external_acceptance_v1.mjs
node scripts/prove_wc_public_opportunity_handoff_public_origin_binding_v1.mjs
node scripts/prove_public_participant_no_node_handoff_wall_v1.mjs
```

The focused proof injects fixture child outputs and fixture GET responses. It
proves the green composition plus rejection of:

- handoff without `public_copy_ready`;
- binding-alias byte/SHA drift;
- participant status HOLD; and
- placeholder/HOLD HTML.

No real network request or production mutation occurs in CI.

## Live sequencing

This receipt is meaningful only after a real production binding has been signed
and the reviewed seed-service plan has been separately applied.

A green external receipt is evidence of publication/onboarding readiness. It is
not permission to claim a ticket or perform paid work.
