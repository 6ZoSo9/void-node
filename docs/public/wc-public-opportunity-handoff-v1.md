# WC public opportunity handoff v1

<!-- VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1 -->

WC public opportunity handoff converts a trusted `available` entry from the merged multi-node directory into exact commands for the merged no-node public earn client.

The handoff is read-only. It does not execute the client.

## Usage

Create a directory result:

```bash
node tools/wc-public-opportunity-directory-v1.mjs \
  --base https://node-one.example \
  --base https://node-two.example \
  > directory.json
```

Create the handoff:

```bash
node tools/wc-public-opportunity-handoff-v1.mjs \
  --directory-json directory.json \
  --account outside-user-1
```

When multiple trusted opportunities are available, select one explicitly:

```bash
node tools/wc-public-opportunity-handoff-v1.mjs \
  --directory-json directory.json \
  --account outside-user-1 \
  --select-base https://node-one.example
```

Use `--directory-json -` to read JSON from standard input.

## Strict selection

A candidate is eligible only when the directory result reports:

- `state=available`
- `trusted=true`
- Coordinator enabled
- Fixed award matches
- Public claim configured and enabled
- Read-only and GET-only child result
- Public award boundary explicitly confirmed
- No mutation attempt

No eligible candidate produces `hold`. Multiple eligible candidates also produce `hold` until `--select-base` is supplied.

Coordinator-origin admission intentionally matches the canonical no-node client: public coordinators require HTTPS; HTTP is allowed only for exact `localhost`, loopback IPs including bracketed IPv6 loopback `[::1]`, RFC1918/private IPv4, CGNAT `100.64.0.0/10`, and `.ts.net` hostnames. Aliases such as `worker.localhost`, adjacent public IPv4 ranges, and non-loopback IPv6 over HTTP remain rejected unless the canonical client contract is separately changed and reviewed.

## Coordinator identity binding

After selection, the handoff first performs:

```text
GET /health
```

The response must contain `ok=true` and a 32-character lowercase hexadecimal
`nodeId`. For a public HTTPS coordinator, that self-report is freshness
evidence only; it is not the trust root.

Public HTTPS handoff now loads the fixed reviewed
`config/void-public-node-identity-trust-v1.json` registry and requires its
exact reviewed SHA-256. The live `nodeId` must have one trusted Ed25519
fingerprint entry. The handoff then fetches exactly:

```text
GET /.well-known/void-node-public-origin-binding-v1.json
```

from the selected origin with redirect refusal, an exact final-URL check, the
same bounded request deadline, strict UTF-8/JSON decoding, and a 128 KiB body
ceiling. The signed credential must pass
`VOID_NODE_PUBLIC_ORIGIN_BINDING_V1` verification and bind:

- the exact selected coordinator origin;
- the exact live `/health.nodeId`;
- VOID Mainnet-0 / Chain 2050;
- the reviewed node Ed25519 fingerprint;
- the fixed GET-only health/WC-status surface;
- a valid issuance/expiry interval; and
- zero mutation, payment, wallet/signer, WC-write, validator, governance,
  treasury/liquidity, settlement, runtime-mutation, or operator authority.

Only that path reports
`trust_mode=signed_public_origin_binding` and `public_copy_ready=true`.
There is no CLI option for a trust registry, trusted fingerprint, or binding
public key.

Private HTTP origins admitted by the canonical development policy retain a
separately labeled `development_self_report_only` path so local/private
proofing remains usable. That path reports `public_copy_ready=false` and must
not be represented as cryptographically trusted public onboarding.

The health response remains bounded to 64 KiB. A declared or accumulated body
above the limit, a non-stream-readable body, invalid UTF-8, interrupted body,
timeout, malformed JSON, invalid node identity, unknown reviewed node ID,
missing/oversized/malformed binding, signature failure, origin/node mismatch,
fingerprint mismatch, expiry, redirect, or elevated signed authority produces
`hold`.

## Generated commands

The output contains argv and shell-safe forms of:

```text
node tools/void_public_earn_no_node_client_v1.mjs status ...
node tools/void_public_earn_no_node_client_v1.mjs run ...
```

Optional values include `--state-dir` and an HTTPS `--dataset-url-template` containing `{dataset_id}`.

The focused contract is bound to the canonical no-node client source. A client-only interface change schedules this handoff workflow, and the proof feeds the generated `status` and `run` argv through the real client parser plus its read-only coordinator preflight contract. The proof also executes origin-policy parity cases for public HTTPS, exact `localhost`, bracketed IPv6 loopback `[::1]`, loopback/private/CGNAT IPv4 HTTP, `.ts.net` HTTP, `worker.localhost`, non-loopback IPv6 HTTP, and adjacent rejected public IPv4 ranges. It does not execute the full client, create participant identity state, claim a ticket, or submit work.

## Safety boundary

The handoff validates the directory marker, directory safety contract, and selected child safety contract. It uses `GET /health` and, for public HTTPS only, one fixed same-origin `GET` for the signed public-origin binding. It never executes the client, creates an identity, claims a ticket, fetches work, submits a result, awards or settles WC, accesses a wallet, restarts a service, or mutates runtime data.

## Focused proof

```bash
node scripts/prove_wc_public_opportunity_handoff_v1.mjs
```

The base proof exercises a successful private-development self-report handoff; generated-command compatibility with the canonical client parser and read-only coordinator preflight; origin-policy parity with the canonical client; and declared-oversize, streamed-oversize, interrupted-body, multi-candidate, no-candidate, and unsafe-directory HOLD behavior. `scripts/prove_wc_public_opportunity_handoff_public_origin_binding_v1.mjs` separately proves the fixed reviewed trust-registry composition, absence of caller-selectable trust roots, rejection of a same-origin self-signed forged canonical node identity, and the public-HTTPS/private-development trust-mode split.

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1_PROOF_GREEN
VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_PUBLIC_ORIGIN_BINDING_V1_PROOF_GREEN
```
