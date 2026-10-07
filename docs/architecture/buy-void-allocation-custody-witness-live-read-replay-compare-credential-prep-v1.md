# Buy VOID replay compare-only credential preparation v1

## Scope

This operator procedure prepares the independent SSH client credential required
by the merged guarded replay writer and pinned Nimo compare adapter (PRs
#2584, #2586, #2588 and #2589). It is deliberately **Precision-only**.

Source script:

\`\`\`text
tools/void-buy-allocation-custody-witness-live-read-replay-compare-credential-prep-v1.sh
\`\`\`

The script is idempotent for an already valid installation and HOLDS on partial
keypairs, unexpected ownership, symlinks, noncanonical host pins, source blob
changes, ambiguous/changed host keys, or an attempt to reuse the existing
append-capable/generic witness credentials. It does not overwrite an existing
key or host pin.

## Source and host binding

Before any Git fetch, Nimo key scan, `sudo` admission, directory creation or
key generation, the mutating path requires the reviewed non-secret Precision
host identity:

```text
hostname=zoso-Precision-Tower-7810
machine_id_sha256=sha256:11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2
```

The machine ID digest follows the canonical witness convention: trim
`/etc/machine-id` to its exact 32 lowercase hexadecimal characters and
SHA-256 those UTF-8 bytes. A hostname or machine-ID mismatch HOLDS before any
credential or privileged action. The focused proof uses an inert wrong-host
environment and requires that Git/network/`sudo`/key-generation sentinels are
never invoked.

Only after that host guard does the operator script bind current `origin/main`
to exact reviewed Git blobs for the compare-only forced command and client
adapter.

It independently retrieves Nimo's ED25519 host public key from
\`100.91.79.112:22\`, requires exactly one unique key and verifies its
fingerprint equals:

\`\`\`text
SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk
\`\`\`

The pin becomes exactly one \`nimo ssh-ed25519 ...\` line, matching the
existing adapter's \`HostKeyAlias=nimo\` rule.

## Client-side credential

The new SSH private key is generated only if **both** files are absent,
under the pinned local custody identity:

\`\`\`text
/var/lib/void-replay-compare-transport-v1/                 UID 994 GID 981 0700
/var/lib/void-replay-compare-transport-v1/id_ed25519       UID 994 GID 981 0600
/var/lib/void-replay-compare-transport-v1/id_ed25519.pub   UID 994 GID 981 0600 or 0644
/etc/void/replay-compare-transport-v1/                     root:root 0755
/etc/void/replay-compare-transport-v1/known_hosts         root:root 0444
\`\`\`

The public key must derive from the private key, and the fingerprint must
differ from the two existing witness identities.

The private key is never printed, uploaded, added to an agent, or copied to
Nimo. There is no wallet/signer or transaction authority.

## Deliberate non-actions

The script does not touch Nimo's existing witness handler, witness journal,
append intent, sshd, or \`authorized_keys\`. It does not create the new third
authorized-key entry, and it does not install the server compare-only wrapper.
It does not invoke the replay writer or mutate chain, replay, witness or funds
state.

A separate reviewed gate must deploy the exact compare-only wrapper to Nimo,
install one new restricted root-controlled authorized-key entry while
preserving both existing entries byte-for-byte, reject \`read\` and \`append\`
through that new key, and prove authenticated \`matched\` at replay sequence 2.
Only then may the client adapter be used as the guarded writer's compare
callback.

Even after provisioning, runtime guarded-writer exclusivity, rollback
resistance, protected high-water custody, independent custody and production
readiness remain false until their own enforcement evidence qualifies.

## Operator invocation

From the Precision workstation, with an interactive \`sudo\` session:

\`\`\`bash
bash tools/void-buy-allocation-custody-witness-live-read-replay-compare-credential-prep-v1.sh
\`\`\`

Successful output ends with:

\`\`\`text
VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1_GREEN
\`\`\`

An existing key is reused only after revalidating UID/GID/mode, matching the
public key to the private key, and excluding both old transport fingerprints.

## Source-only proof

\`\`\`bash
bash -n tools/void-buy-allocation-custody-witness-live-read-replay-compare-credential-prep-v1.sh
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_compare_credential_prep_v1.mjs
git diff --check
\`\`\`

The CI proof never executes the install path; it runs only \`--help\` and
inspects the fail-closed source guardrails. Consequently a GREEN CI result
proves script syntax/boundary expectations but not installation.
