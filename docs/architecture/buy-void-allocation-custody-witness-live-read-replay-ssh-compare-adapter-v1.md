# Buy VOID witness replay pinned SSH compare adapter v1

## Purpose

The guarded writer entry points merged in PR #2584 take a synchronous
\`compare_live\` callback while both replay roots remain under the existing
bakery lock. The packet classifier validates the bytes but cannot prove
that a caller actually performed a pinned authenticated Nimo SSH exchange.

This source-only adapter defines a bounded transport implementation for that
callback. It introduces no runtime mutation, credential installation, service
changes, wallet access, Chain-2050 write, or presale activation.

## Trust boundaries

The source code fixes:

- the \`/usr/bin/ssh\` executable with \`-F /dev/null\`;
- the target \`voidwitness@100.91.79.112\` and \`HostKeyAlias=nimo\`;
- an exact expected Nimo ED25519 fingerprint
  \`SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk\`;
- an independent *not-yet-provisioned* key path
  \`/var/lib/void-replay-compare-transport-v1/id_ed25519\`;
- an independent *not-yet-provisioned* root-owned host pin
  \`/etc/void/replay-compare-transport-v1/known_hosts\`;
- local Linux custody identity UID 994 / GID 981;
- key mode \`0600\`, parent mode \`0700\`, and owner UID 994;
- known-hosts mode \`0444\` with root UID/GID and parent mode \`0755\`;
- one canonical unaliased \`nimo ssh-ed25519\` known-hosts line whose
  public-key fingerprint is recomputed and compared to the pinned value;
- no agent, password, keyboard auth, user SSH config, port forwarding,
  hostname canonicalization, proxy, or connection sharing; and
- 12-second synchronous process timeout, one connection attempt,
  and 64-KiB response cap.

Every invocation reconstructs a canonical request from the **exact journal
and high-water byte copies supplied inside the writer lock**. It validates
the local high-water binding before opening transport, generates a fresh
random request ID, and requires exit status zero, no signal/error, an empty
stderr channel, and a canonical \`matched\` compare response validated by
the existing source packet classifier. Either ahead direction, ambiguity,
mismatched request/response, timeout, unexpected stderr, and all other errors
throw: the guarded writer catches the error and HOLDS without publishing a
new transition.

The adapter does **not** trust a response field claiming transport
authentication; the server's source response must retain the conservative
\`external_transport_authenticated=false\` boundary.

## Deployment requirements before live use

The key in \`~/.config/void/replay-witness-transport-v1\` is a pre-existing
operator credential with broader permissions. **Do not copy it** into the
new custody-owned compare path.

An operator gate must first provision a *new* dedicated custody compare-only
key and register a separately restricted forced command on Nimo. That
server-side command must reject \`append\` and any non-compare operation even
when the key is valid. The new host pin must be installed through an
independent fingerprint verification process. After provisioning, test a
read-only \`matched\` compare under custody UID 994 with no mutation and
verify the remote witness bytes stayed unchanged.

No such credentials or Nimo compare-only restriction are installed by this
source-only PR.

The SSH subprocess will read its dedicated transport private key after
installation. That is intentional SSH authentication, **not** wallet or signer
key access. The adapter's JavaScript does not read or return the key material.
The authority object therefore reports `private_key_access=true` for the
SSH transport capability, alongside `wallet_or_signer_access=false` and
`private_key_material_read_by_adapter_js=false`.

## Source-only / not production authority

The public factory is
\`createBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareAdapterV1\`.
It returns the callback signature consumed by the guarded writer. It checks
the pinned credential/identity boundary on every invocation. Until the
installation ceremony is complete, it fails closed.

The \`testOnly...\` functions use synthetic responses for deterministic CI.
They cannot establish authenticated transport or live protection.

In particular, these remain false:

\`\`\`text
server_compare_only_authorization_proven=false
compare_key_provisioned=false
runtime_integration=false
unguarded_entrypoints_retired=false
guarded_writer_exclusivity_proven=false
live_authenticated_compare_executed=false
live_policy_enforcement_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_movement=false
\`\`\`

The old unguarded replay writer APIs continue to exist. Merely linking this
adapter does **not** prove they are unreachable from an operational runtime.
To promote enforcement, one exclusive operator-controlled execution path must
use the guarded APIs with this adapter and prove post-transition sequential
Nimo witness catch-up, crash recovery, and no bypass route.

## Focused proof

\`\`\`bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_ssh_compare_adapter_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_guarded_compare_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
git diff --check
\`\`\`

The proof simulates the transport process and exercises exact request bytes,
fixed SSH args, matched packet revalidation, both ahead directions, request
mismatch, claimed server authority, injected recovery/mutation, process
failure, timeout, stderr, malformed local state, and negative production
authority. It does not use a real SSH key or live host.
