# Buy VOID allocation-custody Node binary profile v1

Marker: `VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1`.

Status: **source selection of one exact expected Precision Node binary identity**.
This is not live at-use verification and is not an installation or runtime
acceptance receipt.

## Evidence basis

A read-only Precision operator census reported the fixed path
`/usr/bin/node` as:

- version: `v22.23.3`;
- bytes: `124827920`;
- SHA-256:
  `fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48`;
- UID/GID: `0/0`;
- mode: `0755`;
- hard links: `1`;
- direct regular ELF: true;
- stable during the read-only observation: true.

The observed ancestry `/` -> `/usr` -> `/usr/bin` was root-owned,
mode `0755`, and not group/world writable.

The census source SHA-256 was
`9d8413c8930e671a36783b2147e93a867072343ee5009741784f1b42d56e9134`.

## What this profile selects

The profile makes those exact bytes and metadata the reviewed **expected**
Node identity for the future custody V2 ExecStart.

A consumer may classify a fresh observation as matching only when every field,
including all ancestor metadata, exactly equals this profile.

This closes selection ambiguity. It does not make an old observation fresh.

## Mandatory at-use revalidation

Any future install, service plan, service start, or live qualification that
depends on this profile must independently re-open and re-hash the fixed
`/usr/bin/node` binary and recheck its direct path, ownership, link count,
mode, ELF identity, stable inode/metadata and trusted ancestor chain at the
relevant operation boundary.

The historical operator evidence is not cryptographically signed or
authenticated, and the transcript did not provide a separately authenticated
observation timestamp. Accordingly:

```text
operator_evidence_authenticated=false
operator_evidence_signed=false
observation_time_bound=false
observation_freshness_proven=false
live_at_use_reverification_required=true
node_binary_identity_verified=false
```

The final `node_binary_identity_verified` flag remains false until a later
live at-use verifier establishes the expected identity in the operation that
needs it.

## Runtime-bundle relationship

Merged runtime-bundle lock v1 already accepts the package-free ten-file custody
runtime candidate, while deliberately retaining
`node_binary_identity_verified=false`. This profile does not modify or repin
that historical lock. It supplies the separate expected host-binary identity
that a future installer/verifier must compose with it.

## Authority boundary

Source/test/CI only.

No host write, package install, service/systemd mutation, permission change,
request/payment/customer/ledger/custody-content read, credential/key/wallet or
signer access, RPC, transaction, Chain-2050/WC mutation, reserve/recover,
payment acceptance, public presale activation, treasury/liquidity or funds
movement is authorized or performed by this profile.
