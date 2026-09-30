# VOID public-origin binding external acceptance v1

Marker: `VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1`

Status: source-only read-only external qualification collector.

## Purpose

The public-origin source chain now includes:

- fixed production unsigned-request compilation;
- manual exact-request signing;
- signed-binding verification;
- activation-packet compilation;
- crash-recoverable seed-service apply; and
- participant copy-ready gating.

After a real apply, one final trust/evidence question remains:

> does the public HTTPS surface actually expose the reviewed signed binding, and
> does the existing public WC directory -> handoff chain accept it as
> `public_copy_ready=true`?

This collector records that evidence without executing the no-node client or
issuing any capability ticket.

## Fixed production target

The live CLI is pinned to:

```text
base=https://seed.nullfeed.org
node_id=9d89483769e469e0473b489dc50dba96
public_key_fingerprint_sha256=2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b
account=void-public-origin-acceptance-v1
```

There is no CLI override for origin, node ID, account, reviewed fingerprint,
directory tool, handoff tool, binding paths, signer, wallet, or service target.

## External HTTPS alias evidence

The collector performs read-only HTTPS GETs for both canonical binding aliases:

```text
/.well-known/void-node-public-origin-binding-v1.json
/public-node/identity/public-origin-binding-v1.json
```

Each request has:

- a fixed canonical HTTPS origin;
- explicit socket-inactivity timeout;
- independent absolute total deadline;
- redirect refusal;
- exact HTTP 200 requirement;
- bounded response bytes;
- content-length validation; and
- aborted/incomplete response ownership.

Both bodies must be byte-identical.

Each body is independently parsed and passed through the reviewed signed
public-origin verifier for the exact canonical origin and node ID. Both
verifications must resolve to the reviewed Ed25519 fingerprint and the same
canonical binding SHA-256.

## Directory -> handoff acceptance

The collector runs only the existing read-only tools:

```text
tools/wc-public-opportunity-directory-v1.mjs
tools/wc-public-opportunity-handoff-v1.mjs
```

The directory is invoked for the one fixed canonical HTTPS origin and must
return exactly one trusted available result with the canonical +3 WC policy and
all mutation/ticket/receipt/WC/wallet/settlement flags false.

The directory JSON is stored only in a private temporary directory so the
existing handoff CLI can consume it.

The handoff must return:

- marker `VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1`;
- `status=green`;
- `handoff_state=ready`;
- the exact fixed base and node ID;
- `trust_mode=signed_public_origin_binding`;
- `public_copy_ready=true`;
- reviewed public-key fingerprint;
- canonical first binding path with HTTP 200;
- binding SHA-256 equal to the independently verified external alias evidence;
- read-only safety flags; and
- `client_executed=false`, `ticket_issuance_attempted=false`,
  `receipt_submission_attempted=false`, and `wc_award_attempted=false`.

The returned status/run commands are validated for exact origin/node/account
binding but are **not executed**.

## Evidence receipt

Successful collection writes one create-only mode-0600 JSON receipt containing:

- exact public origin/node/fingerprint;
- raw alias artifact SHA-256;
- canonical binding SHA-256;
- both alias URLs, byte counts, and validity timestamps;
- directory availability summary;
- handoff trust/public-copy-ready summary; and
- explicit all-false mutation/key/signing/systemd/service/transaction/validator/
  funds authority facts.

The receipt contains no private key, capability token, wallet secret, or
signature-creation authority.

## Command

```bash
node tools/void-public-origin-binding-external-acceptance-v1.mjs collect \
  --output /absolute/external-acceptance.json
```

Optional timeout controls remain timing-only:

```text
--request-timeout-ms
--alias-inactivity-timeout-ms
--alias-total-timeout-ms
```

The total alias deadline must be at least the inactivity deadline.

## Authority boundary

This collector does **not**:

- execute the no-node client;
- create an executor identity;
- claim a ticket;
- submit a result;
- award Work Credits;
- access a wallet or private key;
- create a signature;
- mutate systemd or service configuration;
- restart any service;
- submit a transaction;
- mutate validators; or
- move funds.

It is a read-only post-activation evidence collector.

## Proof

```bash
node --check tools/void-public-origin-binding-external-acceptance-v1.mjs
node --check scripts/prove_void_public_origin_binding_external_acceptance_v1.mjs
node scripts/prove_void_public_origin_binding_external_acceptance_v1.mjs
node scripts/prove_wc_public_opportunity_directory_v1.mjs
node scripts/prove_wc_public_opportunity_handoff_public_origin_binding_v1.mjs
```

CI uses an ephemeral signed binding and synthetic directory/handoff evidence for
the successful validator path. It performs no external network access and never
uses the production node key.

## Production boundary

Source acceptance of this collector is not authorization to sign, apply, or
restart anything.

A real evidence run is meaningful only after a separately authorized production
sign/apply sequence succeeds. A green external receipt then proves the final
signed-origin/public-copy-ready acceptance gate for the public participant
handoff.
