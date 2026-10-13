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
Git-object bytes are streamed directly to plain Node with a minimal clean
environment. The sealed probe does not trust an ambient
`XDG_RUNTIME_DIR` or `DBUS_SESSION_BUS_ADDRESS`; it derives the canonical
`/run/user/<uid>/bus` endpoint itself and validates the runtime directory and
Unix socket before querying the user systemd manager.

After exact operator confirmation, the sealed probe:

1. requires current branch `main`, a clean non-sparse tracked worktree, normal
   index flags, and exact worktree Git blobs for the reviewed E2 source tuple;
2. verifies the same 27-object Epoch-2 source tuple directly as Git/worktree
   data and executes **no repository source module** during live qualification;
3. reads the effective **user** `void-node-live.service` state through the
   root-owned `/usr/bin/systemctl` executable using only the canonical
   `unix:path=/run/user/<uid>/bus` endpoint, and requires that bus pathname
   identity to remain stable across the query;
4. requires the reported `MainPID` to be bound by
   `/proc/<pid>/cgroup` to
   `/user.slice/user-<uid>.slice/user@<uid>.service/.../void-node-live.service`,
   and requires the process environment `INVOCATION_ID` to equal systemd's
   reported invocation ID;
5. requires exactly one effective
   `LoadCredential=buy-void-epoch2-fulfiller-v1:...` binding. When systemd
   exposes the binding normally, the sealed probe uses that exact value. On
   systemd builds that return exactly `LoadCredential=[unprintable]`, it
   accepts no generic redaction bypass: `FragmentPath` must identify a
   trusted stable base unit containing no `LoadCredential`,
   `LoadCredentialEncrypted`, `SetCredential`,
   `SetCredentialEncrypted`, `ImportCredential` or
   `ImportCredentialEx` directive; `DropInPaths` must contain **exactly one
   active drop-in total**, the reviewed
   `97-buy-void-epoch2-fulfiller-credential-v1.conf`; and that same-UID
   regular single-link private file must contain only the exact E2
   `LoadCredential` binding with an absolute normalized source path. Any
   additional active drop-in or credential-provisioning base-unit directive
   fails closed because the redacted effective precedence cannot otherwise be
   proved from source files alone;
6. obtains `CREDENTIALS_DIRECTORY` plus source commit/tree/branch only from
   the cgroup-bound live service MainPID environment, requires the materialized
   fixed E2 credential to exist there under systemd's private namespace, and
   requires the live process source commit/tree to equal the exact attested
   checkout. The complete systemd/process/cgroup observation is repeated after
   signing;
7. opens only the fixed systemd materialized credential through retained Linux
   directory/file descriptors with `O_NOFOLLOW`, owner/mode/link/size checks,
   bounded reads, and before/after inode+metadata revalidation;
8. derives the secp256k1 public key with Node builtin crypto and independently
   derives the Ethereum address with an embedded Keccak-256 implementation;
9. self-tests Keccak-256 against the empty-message vector and private-key-1
   against Ethereum address
   `0x7e5f4552091a69125d5dfcb7b8c2659029395bdf` before touching the live
   credential;
10. requires the installed key to derive the immutable Epoch-2 fulfiller
   `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`;
11. signs one fresh domain-separated **non-transaction** ECDSA challenge with
    Node builtin `crypto.sign` and verifies it locally with `crypto.verify`;
12. emits the random challenge nonce, the 64-byte IEEE-P1363 signature encoded
    as hex, and the signer public key encoded as SPKI DER hex. These are public
    verification materials: an offline reviewer can reconstruct the exact
    challenge, verify the signature with Node builtin crypto, derive the
    secp256k1 public point and independently confirm the immutable Ethereum
    fulfiller address. The private-key and in-memory signature buffers are
    zeroed after the public evidence record is constructed;
13. emits only public source/service identities, hashes and public
    cryptographic verification material. It never emits credential contents,
    a private key, or the raw systemd credential path. It constructs no
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
`NODE_PATH`, native loader variables such as `LD_PRELOAD`, `LD_LIBRARY_PATH`,
and `LD_AUDIT`, ambient `GIT_*` variables, global/system Git config, and Git
replacement objects before Node starts. The sealed probe independently rejects
those loader variables and launches Git children with a minimal explicit
environment:

```bash
env -i \
  HOME="$HOME" \
  PATH=/usr/bin:/bin \
  GIT_OPTIONAL_LOCKS=0 \
  GIT_NO_REPLACE_OBJECTS=1 \
  GIT_CONFIG_NOSYSTEM=1 \
  GIT_CONFIG_GLOBAL=/dev/null \
  GIT_CONFIG_SYSTEM=/dev/null \
  /usr/bin/bash --noprofile --norc -euo pipefail -c '
    head=$(/usr/bin/git -c core.fsmonitor=false -c core.hooksPath=/dev/null \
      rev-parse --verify HEAD)
    [[ "$head" =~ ^[0-9a-f]{40}$ ]]
    /usr/bin/git -c core.fsmonitor=false -c core.hooksPath=/dev/null \
      show "${head}:scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs" |
    /usr/bin/node --input-type=module - --probe --confirm \
      probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV1 \
      --expected-head "$head"
  '
```

Run the command from the repository root. The wrapper captures one exact
40-hex Git head before streaming the probe and the probe independently requires
that same head during source qualification; a concurrent local branch advance
therefore HOLDS before systemd or credential access. No ambient user-bus variables are
needed or accepted as authority. The sealed probe derives the current UID's
canonical runtime/bus path, requires the runtime directory to be private to
that UID, requires the bus leaf to be a same-UID Unix socket, and binds the
reported MainPID to the real user-service cgroup plus matching process
`INVOCATION_ID`. The sealed probe also requires the actual Node executable
to be root-owned and non-group/world-writable before it can observe systemd or
read the credential. Direct worktree execution of the
sealed file is rejected. The reviewed
pre-execution proof also dirties an authority-bearing module with a top-level
sentinel, launches the sealed program from its Git object, and requires HOLD
with the sentinel never executed.

Do **not** paste a private key, seed phrase, credential file, or credential
contents into ChatGPT, a shell argument, a Git file, or probe output.

A GREEN result is evidence only. It does not enable Buy VOID, mutate the
service, restart systemd, call Chain 2050, construct/broadcast a transaction,
accept a payment, activate the presale/WC market, or move funds.

## Independent public verification

The GREEN JSON is intentionally sufficient for offline cryptographic review
without the credential file. A reviewer can:

1. reconstruct the exact NUL-delimited challenge fields in this order:
   `domain`, `source_head`, `source_tree`, `source_branch`, `service`,
   decimal `main_pid`, `invocation_id`, `credential_id`,
   `loadcredential_binding_sha256`, `credentials_directory_sha256`,
   `main_pid_cgroup_sha256`, `process_source_commit`,
   `process_source_tree`, `process_source_branch`, and `nonce_hex`;
2. require the SHA-256 of those bytes to equal `challenge_sha256`;
3. import `public_key_spki_der_hex` as a secp256k1 SPKI public key;
4. verify `public_signature_p1363_hex` over the reconstructed challenge with
   SHA-256 and IEEE-P1363 encoding;
5. derive the uncompressed secp256k1 public point from that public key, apply
   Ethereum Keccak-256 address derivation, and require
   `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`;
6. require the signed process source commit/tree/branch to equal the top-level
   attested source and require the signed service/credential hashes and cgroup
   identity to remain part of the evidence record.

The public signature, public key and nonce are not credential secrets. The
credential scalar, credential bytes, raw credential path and signed transaction
bytes remain absent.

The checked-in offline classifier is
`tools/void-buy-void-epoch2-installed-credential-public-evidence-v1.mjs`.
Its proof is
`scripts/prove_buy_void_epoch2_installed_credential_public_evidence_v1.mjs`.
The production classifier fixes the expected signer to the immutable Epoch-2
fulfiller and rejects mutations of any signed systemd/source field, signature,
evidence ID, or activation-authority flag. A GREEN classifier result verifies
the public record; it does **not** authorize payment signing, transaction
broadcast, public presale activation, WC/VOID market activation or funds
movement.

## Source-generation binding

The sealed probe fails closed unless current `main` has the exact reviewed
identities for all 27 Epoch-2 source-tuple objects, the historical source
qualifier, and this attestation core. These files are opened and hashed as data;
none is imported or executed by the live probe. The evidence also records
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
