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

The helper signs only after all checks pass. Production signing samples the
clock only after reviewed-package verification/materialization completes,
rechecks expiry immediately before opening the private key, rechecks again
immediately before the signature operation, and refuses to emit the signature
envelope if the challenge expires during signing.

## Key-file boundary

The fixed key file must be:

- a direct regular file;
- no symlink at the file or through any parent-directory alias;
- resolve canonically to the exact absolute path before the read;
- open every parent directory through a retained nofollow directory-descriptor
  chain;
- capture the final file identity through that pinned parent before opening it;
- require the opened file descriptor to match that pre-open device/inode; and
- require the pinned pathname to still reference that same opened identity after
  the read;
- be owned by the current user;
- be exactly mode `0600`;
- contain one 32-byte hexadecimal private key, with optional `0x` prefix;
- contain at most one trailing newline; and
- contain no leading/trailing spaces, tabs, blank lines, or other normalization.

The transferred public challenge file is subject to the same pinned-directory,
pre-open identity and post-read rebind rules. Atomic replacement of an ancestor
directory between validation and file open cannot redirect the read because the
final lookup is performed beneath the retained parent descriptor.

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

Before signing, Nimo must be on the **exact** source HEAD embedded in the
challenge. A clean descendant is not accepted. The reviewed launcher verifies:

- exact challenge SHA-256;
- current checkout HEAD equals `source_binding.source_head_sha`;
- clean tracked/untracked repository state;
- worktree Git blob equality for the launcher, signer, reviewed package-runtime
  helper/profile, control verifier, `package.json`, and `package-lock.json`;
- no private-key access during preflight.

Run the launcher itself from a scrubbed shell:

```bash
/usr/bin/env -i \
  HOME=/home/zoso \
  PATH=/usr/bin:/bin \
  LANG=C \
  LC_ALL=C \
  /bin/bash --noprofile --norc \
  ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh \
  sign \
  /absolute/private-work/challenge.json \
  <64hex> \
  /absolute/private-work/signature.json
```

The launcher then execs the signer through a second `/usr/bin/env -i` boundary
with the exact signer launch marker and absolute `/usr/bin/node`. This excludes
`NODE_OPTIONS`, `NODE_PATH`, dynamic-loader variables, shell-specific
injection variables, and unrelated ambient configuration before Node starts and
before the private key can be opened.

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

This ceremony **does** access the fixed production private key and constructs an
in-memory signer object. Those facts are reported explicitly as
`private_key_access=true`, `credential_access=true`, and
`wallet_or_signer_access=true`.

Signing this challenge does **not** authorize:

- transaction construction or transaction signing;
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
