# WC/VOID launch-controller control offline signing v1

Marker: `VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1`

Status: reviewed offline operator helper for the fresh launch-controller
proof-of-control ceremony.

This helper is deliberately narrower than a wallet or transaction signer. It
may sign only the public EIP-712 control challenge defined by
`VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1`.

## Fixed reviewer identity

The helper is hard-bound to:

```text
0x2f1e0005e865b772b268bd8c797bf3eaa901d97e
```

The private key path is also fixed:

```text
~/.local/share/void/offline-keys/wc-void-launch-controller-v1/private-key.hex
```

There is no `--key-file` override.

A challenge naming any other candidate address fails before signing. A private
key deriving any other address also fails before signing.

## Reviewed package runtime

The signing helper does not trust ambient `ethers` package bytes.

Before the private key is opened, it:

1. reads the reviewed package-runtime profile
   `ops/security/reviewed-node-package-runtime-ethers-v1.json`;
2. rederives and verifies profile ID
   `voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77`;
3. requires package aggregate
   `5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73`;
4. verifies the installed package closure byte-for-byte;
5. materializes a private reviewed package tree outside the repository;
6. reverifies that private tree; and
7. imports `ethers` from that exact private tree.

Same-version ambient package-byte drift therefore holds before private-key
access.

## Challenge validation

The Nimo helper requires:

- an absolute, mode-`0600`, nofollow public challenge file;
- its exact SHA-256 from Precision;
- marker/version and exact challenge keys;
- execution epoch 2;
- the fixed launch-controller role ID;
- the fixed selected reviewer address;
- current coupled launch bytes32;
- current compiled vault identity;
- canonical Epoch-2 VOID token;
- exact EIP-712 domain and type schema;
- exact typed-value/challenge field binding;
- typed-data digest equality;
- content-addressed challenge-ID equality;
- exact non-authorizing challenge authority;
- challenge TTL from 60 through 1800 seconds; and
- current Nimo clock inside the challenge window.

The helper signs only after all checks pass.

## Key-file boundary

The fixed key file must be:

- a direct regular file;
- no symlink;
- owned by the current user;
- exactly mode `0600`;
- one 32-byte hexadecimal private key, with optional `0x` prefix.

The raw key is never printed, returned, copied into the repository, placed in
process arguments, or written into the public signature envelope.

The process clears its direct input buffer/string reference after constructing
the signer. The actual key remains process memory only for the lifetime of the
short-lived offline signing process.

## Output

The output is create-only mode `0600` outside the repository:

```json
{
  "marker": "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1",
  "version": 1,
  "challenge_id": "voidwclcc1_...",
  "signature": "0x..."
}
```

The signature is public cryptographic evidence. The helper prints only IDs and
hashes, not the raw signature or private key.

## Ceremony

### Precision — prepare the public challenge

Use the canonical control-requalification tool from an exact clean main
generation:

```bash
node tools/void-wc-void-launch-controller-control-requalification-v1.mjs \
  prepare \
  --candidate-address 0x2f1e0005e865b772b268bd8c797bf3eaa901d97e \
  --ttl-seconds 1800 \
  --output /absolute/private-work/challenge.json
```

Record the printed `challenge_sha256`, challenge ID, typed-data digest and
expiry.

Transfer only the challenge JSON and its SHA-256 to Nimo.

### Nimo — offline sign

Disconnect Nimo from network access before opening the key.

Ensure the challenge file is mode `0600`, create a private output directory,
and run:

```bash
node ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs \
  sign \
  --challenge /absolute/private-work/challenge.json \
  --challenge-sha256 <64hex> \
  --output /absolute/private-work/signature.json
```

Return only `signature.json` and its printed output SHA-256 to Precision.

### Precision — verify

Before expiry:

```bash
node tools/void-wc-void-launch-controller-control-requalification-v1.mjs \
  verify \
  --challenge /absolute/private-work/challenge.json \
  --challenge-sha256 <64hex> \
  --signature /absolute/private-work/signature.json \
  --signature-sha256 <64hex> \
  --output /absolute/private-work/control-evidence.json
```

A green result proves current control only.

## Authority

Signing this challenge does **not** authorize:

- transaction construction or signing;
- transaction submission/broadcast;
- Chain-2050 writes;
- WC ledger writes;
- credential access;
- runtime/service mutation;
- deployment;
- inventory funding;
- WC/VOID market activation;
- public presale activation;
- liquidity/treasury movement; or
- funds movement.

The separately merged reviewer-role decision is the only reason this exact
address may later authenticate a related-identity review manifest. The fresh
control evidence must still be reverified at the current evaluation time. No
fallback reviewer identity is authorized.

## Verification

Focused CI uses synthetic test keys only:

```bash
node scripts/prove_void_nimo_wc_void_launch_controller_control_signing_v1.mjs
```

CI never reads the production key path and never performs a production
signature.
