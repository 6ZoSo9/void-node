# VOID Tor bootstrap release-root candidate builder v1

Marker: `VOID_TOR_BOOTSTRAP_RELEASE_ROOT_CANDIDATE_V1`

## Purpose

Build a deterministic **active Tor bootstrap release-root candidate** from
already-exported Ed25519 public SPKI material without giving the builder any
production private-key input surface.

This is ceremony-preparation tooling for the Tor branch of the multipath public
bootstrap gate. It does not generate keys, load private-key files, sign a Tor
manifest, publish trust material, activate a runtime, or perform network I/O.

## Input boundary

The CLI accepts only:

- `--threshold <n>`;
- one to eight repeated `--spki-base64 <canonical-ed25519-spki-der-base64>`
  values; and
- one new `--output <path>`.

Public keys are canonicalized as Ed25519 SPKI DER, assigned their content-derived
`voidtpk1_...` IDs, deduplicated, and sorted before the `voidptr1_...` root
ID is computed.

The output is validated through the existing production Tor release-root
validator with `allowHold: false`. Existing output files are never overwritten.

## Example

```bash
node tools/void-tor-bootstrap-release-root-candidate-v1.mjs \
  --threshold 1 \
  --spki-base64 "$TOR_BOOTSTRAP_PUBLIC_KEY_SPKI_BASE64" \
  --output /tmp/void-tor-bootstrap-release-root-candidate-v1.json
```

A 1-of-1 root is operationally sufficient but makes that one release key a
single signing authority. A future rotation may raise the threshold after
independent keys exist. Key generation, custody, publication, and signature
production remain separate offline steps.

## Proof

```bash
node scripts/prove_void_tor_bootstrap_release_root_candidate_v1.mjs
```

Expected marker:

`VOID_TOR_BOOTSTRAP_RELEASE_ROOT_CANDIDATE_V1_PROOF_GREEN`

The proof covers deterministic canonical sorting, duplicate rejection, threshold
bounds, Ed25519-only admission, exclusive output creation, and source-level
absence of private-key generation/loading APIs in the candidate builder.

## Authority boundary

A generated file is a candidate only. This tool does not:

- replace `config/void-tor-bootstrap-release-root-v1.json`;
- authorize publication or activation;
- create or read a production private key;
- generate a Tor manifest signature;
- publish a signed manifest;
- deploy/restart a service or change DNS/firewall/router/network state;
- access a wallet, signer, validator, Work Credit, treasury, or chain authority;
- sign or broadcast a transaction; or
- move funds.
