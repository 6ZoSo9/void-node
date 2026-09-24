# VOID bootstrap release-root candidate builder v1

Marker: `VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_CANDIDATE_V1`

## Purpose

Build a deterministic **active release-root candidate** from already-exported
Ed25519 public SPKI material without giving the builder any production private-key
input surface.

This is a ceremony-preparation tool for the public-P2P trust gate. It does not
generate keys, load key files, sign records, publish trust material, activate the
runtime, or perform network I/O.

## Input boundary

The CLI accepts only:

- `--threshold <n>`;
- one to eight repeated `--spki-base64 <canonical-ed25519-spki-der-base64>`
  values; and
- one new `--output <path>`.

It does not accept a private-key path, private-key bytes, wallet/signer input, or
an arbitrary JSON trust root. Public keys are canonicalized as Ed25519 SPKI DER,
assigned their content-derived `voidbrk1_...` IDs, deduplicated, and sorted before
the root ID is computed.

The output is validated through the existing production release-root validator
with `allowHold: false`. Existing output files are never overwritten.

## Example

```bash
node tools/void-bootstrap-record-release-root-candidate-v1.mjs \
  --threshold 2 \
  --spki-base64 "$PUBLIC_KEY_A_SPKI_BASE64" \
  --spki-base64 "$PUBLIC_KEY_B_SPKI_BASE64" \
  --spki-base64 "$PUBLIC_KEY_C_SPKI_BASE64" \
  --output /tmp/void-bootstrap-record-release-root-candidate-v1.json
```

For production ceremony design, a threshold such as 2-of-3 avoids making one
release key sufficient by itself. Key generation, custody, device separation,
and signature production remain separate offline steps and are intentionally not
implemented by this tool.

## Proof

```bash
node scripts/prove_void_bootstrap_record_release_root_candidate_v1.mjs
```

Expected marker:

```text
VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_CANDIDATE_V1_PROOF_GREEN
```

The proof covers deterministic canonical sorting, duplicate rejection, threshold
bounds, Ed25519-only admission, exclusive output creation, and source-level
absence of private-key generation/loading APIs in the candidate builder.

## Authority boundary

A generated file is a candidate only. This tool does not:

- replace `config/void-bootstrap-record-release-root-v1.json`;
- authorize publication or activation;
- create or read a production private key;
- generate a signature or signed bootstrap-record ID;
- create a signed observer authorization or relay-introduction artifact;
- deploy/restart a service or change DNS/firewall/router/network state;
- access a wallet, signer, validator, Work Credit, treasury, or chain authority;
- sign or broadcast a transaction; or
- move funds.

The current committed production root remains `hold_no_signing_keys` until a
separately reviewed ceremony supplies public keys and an explicit publication
step replaces it.
