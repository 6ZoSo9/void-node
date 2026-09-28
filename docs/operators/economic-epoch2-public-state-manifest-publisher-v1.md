# Epoch-2 public state manifest publisher v1

Marker: `VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1`

This is a two-phase operator helper for the still-false
`successor_genesis_or_state_manifest_public_evidence_ready` gate.

The canonical non-secret client-neutral state artifact is:

- filename:
  `void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json`
- file SHA-256:
  `affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9`
- embedded material SHA-256:
  `286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f`

The publisher accepts only an absolute path whose basename, exact file bytes,
marker/version/status, chain 2050, execution epoch 2, account count, and
non-authority boundary match canonical evidence.

Publication requires an explicit boolean confirmation and writes only:

`public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json`

using create-once atomic semantics. Immediately before the create-once write,
the source file is reopened and its exact SHA-256 plus manifest identity are
revalidated; the earlier qualification step is not treated as a lease on
mutable bytes. The public evidence directory is opened once with directory and
no-follow semantics. Temporary creation and hard-link publication stay anchored
to that held directory descriptor. Existing-target verification and
post-publication readback open the target through the same held parent with
no-follow and nonblocking semantics, then apply `fstat` plus a bounded
descriptor read. A parent replacement detected before mutation, a symlink or
non-regular existing target, or a changed target during read fails closed.
Post-write directory fsync and parent identity are reported explicitly;
uncertainty cannot promote the public-state gate. A pre-existing different file
fails closed.

The hosted proof also runs an inert temporary-repository self-test through the
same internal qualification/publication core. It proves first create, a second
idempotent `already_exact` publication, rejection of a pre-existing conflicting
target, and exact post-write bytes. The self-test profile is private to the
tool; the exported production API remains pinned to the canonical filename,
file SHA-256, material SHA-256, and public target.

## Operator CLI

Qualification is the default and performs no write:

```bash
node tools/void-economic-epoch2-public-state-manifest-publisher-v1.mjs \\
  --repo-root "$HOME/dev/void-node" \\
  --source /absolute/path/void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json
```

The exact production create step requires both `--publish` and the literal
confirmation `publishExactVoidEpoch2StateManifest`:

```bash
node tools/void-economic-epoch2-public-state-manifest-publisher-v1.mjs \\
  --repo-root "$HOME/dev/void-node" \\
  --source /absolute/path/void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json \\
  --publish \\
  --confirmation publishExactVoidEpoch2StateManifest
```

The CLI reports the exact publication outcome, published SHA-256,
directory-fsync result, post-write parent-identity result, and exact next gate,
and repeats the false migration, activation, funds-movement, and
public-state-readiness gates. A wrong or missing publish confirmation fails
closed before the source is qualified or any target write is attempted.

Writing the production artifact does **not** promote the public-state gate. The
exact file must first be committed, independently checked, indexed through the
public-node surface, and then used by a follow-up gate proof.

No network, RPC, service, credential/key, wallet/signer, transaction, Chain-2050
write, migration, activation, or funds authority is present.
