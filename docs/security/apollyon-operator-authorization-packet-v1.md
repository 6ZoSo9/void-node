# Apollyon operator authorization packet v1

Marker: `VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1`

Status: **source-only signed-authorization verification contract**.

## Purpose

V78 converts the earlier design-only Apollyon challenge language into an
executable, fail-closed verification contract for one exact future candidate
training attempt on Xiphos.

This source does not load the production operator private key, create a
production signature, consume replay state, claim an attempt, invoke a trainer,
mutate candidate weights, restart a service, access a wallet, sign or broadcast
a transaction, move funds, or merge repository changes.

## Exact authorization payload

A signed payload binds all of the following:

- subject: `Apollyon`;
- action: `candidate_training_attempt_v1`;
- target host: exactly `Xiphos`;
- a fresh 32-byte nonce;
- canonical issue and expiry timestamps with a maximum fifteen-minute window;
- request SHA-256 and byte count;
- canonical source `main` commit and tree 40-hex Git object IDs;
- corpus SHA-256, record count, and `max_length`;
- immutable parent-adapter SHA-256; and
- an exact authority bitmap.

The authority bitmap requires:

```text
attempt_limit=1
training_execution=true
candidate_weight_mutation=true
fresh_corpus_binding=true
xiphos_runtime=true
transaction_signing=false
transaction_broadcast=false
wallet_access=false
funds_movement=false
repository_merge=false
runtime_service_mutation=false
generation_execution=false
```

Any missing, additional, or changed authority field fails closed.

## Signature

The signing domain is:

```text
void.apollyon.operator-authorization.v1
```

followed by one newline, canonical sorted-key JSON for the payload, and one
trailing newline.

`authorization_id` is:

```text
apollyon_authz_v1:<sha256(signing_bytes)>
```

The verifier requires an Ed25519 signature and a separately supplied expected
operator raw-public-key SHA-256. It derives the 32-byte raw Ed25519 public key
from the supplied public SPKI, hashes those raw bytes, and requires exact
equality with the expected fingerprint before accepting the signature.

This matches the operator fingerprint form proven independently by the V76/V77
local capability work without embedding any private key in the repository.

## Replay boundary

A green verification result intentionally reports:

```text
replay_consumed=false
attempt_claimed=false
execution_performed=false
```

Signature validity is necessary but not sufficient for execution. A later
consumer must provide durable single-use replay consumption and must bind the
same exact packet to the actual candidate-training execution before an attempt
can be claimed.

V78 therefore creates **no live training authority by itself**.

## Source proof

```bash
node --check scripts/apollyon_operator_authorization_packet_v1.mjs
node --check scripts/prove_apollyon_operator_authorization_packet_v1.mjs
node scripts/prove_apollyon_operator_authorization_packet_v1.mjs
```

The proof signs only with a fresh ephemeral Ed25519 fixture key. It proves valid
verification and rejects request mutation, forbidden wallet authority, the wrong
host, expiry, signature corruption, and a mismatched public key. It also checks
that the production verifier has no filesystem, subprocess, environment,
private-key-loading, signing, or execution capability.
