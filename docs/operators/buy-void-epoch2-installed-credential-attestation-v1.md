# Buy VOID Epoch-2 installed credential attestation V1

Marker: `VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1`

## Purpose

This lane supplies the missing operator evidence boundary between the reviewed
Epoch-2 signer source and any later runtime/payment activation decision.

It is intentionally separate from the historical Epoch-1 readiness probe.
The only accepted credential identity is:

`buy-void-epoch2-fulfiller-v1`

and the only accepted public signer is the immutable Epoch-2 fulfiller:

`0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`

The source-only systemd example is:

`ops/systemd/void-node-live.service.d/97-buy-void-epoch2-fulfiller-credential-v1.conf.example`

It contains a placeholder private source path and is **not** installed by this
PR.

## What the explicit probe proves

The live operator path is the builtin-only sealed probe:

`scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs`

It is intentionally **not** loaded from the mutable worktree and does not use
`tsx`, `ethers`, `node_modules`, or any repository module. The reviewed
Git-object bytes are streamed directly to plain Node with an empty environment
except for the minimum user-session variables required to query the user
systemd manager.

After exact operator confirmation, the sealed probe:

1. requires current branch `main`, a clean non-sparse tracked worktree, normal
   index flags, and exact worktree Git blobs for the reviewed E2 source tuple;
2. runs the existing builtin-only Epoch-2 source qualifier only after those
   worktree bytes are pinned;
3. reads the effective **user** `void-node-live.service` state through the
   root-owned `/usr/bin/systemctl` executable;
4. requires exactly one effective
   `LoadCredential=buy-void-epoch2-fulfiller-v1:...` binding and obtains
   `CREDENTIALS_DIRECTORY` plus source commit/tree/branch only from the live
   service MainPID environment;
5. requires the live process source commit/tree to equal the exact attested
   checkout and repeats the systemd/process observation after signing;
6. opens only the fixed systemd materialized credential through retained Linux
   directory/file descriptors with `O_NOFOLLOW`, owner/mode/link/size checks,
   bounded reads, and before/after inode+metadata revalidation;
7. derives the secp256k1 public key with Node builtin crypto and independently
   derives the Ethereum address with an embedded Keccak-256 implementation;
8. self-tests Keccak-256 against the empty-message vector and private-key-1
   against Ethereum address
   `0x7e5f4552091a69125d5dfcb7b8c2659029395bdf` before touching the live
   credential;
9. requires the installed key to derive the immutable Epoch-2 fulfiller
   `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`;
10. signs one fresh domain-separated **non-transaction** ECDSA challenge with
    Node builtin `crypto.sign`, verifies it locally with `crypto.verify`, and
    discards both private-key bytes and raw signature bytes;
11. emits only public source/service identities and hashes. It constructs no
    transaction, performs no RPC request, and cannot submit or broadcast one.

The prior transaction-shaped capability probe remains source/test history. Its
canonical source was additionally hardened to gas limit `1` (below the 21,000
base EVM intrinsic transaction-gas requirement), but it is **not** the live
operator credential path. The legacy TypeScript CLI now refuses explicit
`--probe` with `epoch2_attestation_sealed_git_object_probe_required`.

## Disabled default

The old TypeScript CLI remains useful only for its zero-access disabled output
and source proofs. Running it without `--probe` performs no systemd observation,
no `/proc` read, no credential read, and no signing:

```bash
node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts
```

Do **not** use that TypeScript CLI for a live probe. Explicit probe mode is
fail-closed and cannot reach systemd or credential access.

## Explicit operator probe

Only after this PR is reviewed/merged, the exact source is present on current
`main`, the distinct E2 credential is separately installed, and the live
Precision service is running the same source generation, execute the sealed
Git-object program. This command deliberately clears `NODE_OPTIONS`,
`NODE_PATH`, ambient `GIT_*` variables, global/system Git config, and Git
replacement objects before Node starts:

```bash
env -i \
  HOME="$HOME" \
  PATH=/usr/bin:/bin \
  XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  GIT_OPTIONAL_LOCKS=0 \
  GIT_NO_REPLACE_OBJECTS=1 \
  GIT_CONFIG_NOSYSTEM=1 \
  GIT_CONFIG_GLOBAL=/dev/null \
  GIT_CONFIG_SYSTEM=/dev/null \
  /usr/bin/bash --noprofile --norc -euo pipefail -c '
    /usr/bin/git -c core.fsmonitor=false -c core.hooksPath=/dev/null \
      show HEAD:scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs |
    /usr/bin/node --input-type=module - --probe --confirm \
      probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV1
  '
```

Run the command from the repository root. The sealed probe also requires the
actual Node executable to be root-owned and non-group/world-writable before it
can observe systemd or read the credential. Direct worktree execution of the
sealed file is rejected. The reviewed
pre-execution proof also dirties an authority-bearing module with a top-level
sentinel, launches the sealed program from its Git object, and requires HOLD
with the sentinel never executed.

Do **not** paste a private key, seed phrase, credential file, or credential
contents into ChatGPT, a shell argument, a Git file, or probe output.

A GREEN result is evidence only. It does not enable Buy VOID, mutate the
service, restart systemd, call Chain 2050, construct/broadcast a transaction,
accept a payment, activate the presale/WC market, or move funds.

## Source-generation binding

The operator CLI fails closed unless the stacked #2833 generation has the exact
reviewed identities for the Epoch-2 source qualifier, credential signer,
current full runtime, and this attestation core. The evidence also records
content-addressed source identities plus the existing public credential-source
binding ID.

This addresses the mechanism required for the dormant candidate gates:

- installed systemd credential identity;
- active signing capability;
- binding credential evidence to the current runtime source generation.

It does **not** replace the separate public EIP-191 launch-operator
signer-control challenge and does not itself promote the dormant candidate.

## Verification

These source proofs perform **no live credential access**:

```bash
node --check scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs
node scripts/prove_buy_void_epoch2_credential_attestation_sealed_v1.mjs
node --import tsx scripts/prove_buy_void_epoch2_credential_attestation_v1.ts
node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts
npm run typecheck
npm run build
```

**PROTECT THE CORE.**
