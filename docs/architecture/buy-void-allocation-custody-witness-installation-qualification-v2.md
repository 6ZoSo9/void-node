# Buy VOID allocation custody witness installation qualification v2

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2`
is a pure source evidence classifier for the merged V2 Nimo witness
forced-command handler.

It does not install, start, connect to, or mutate a live host.

V2 exists because the merged V1 installation qualifier is intentionally pinned
to the historical V1 handler. The merged V2 handler consumes one reviewed
machine-ID continuity attestation, so live installation evidence must bind the
V2 executable and that attestation without weakening the V1 SSH, account,
pre-exec, Node, config, or key restrictions.

## Inheritance rule

V2 independently validates the fields that changed from V1:

- exact V2 handler path and Git blob;
- exact V2 forced-command string and SHA-256;
- exact V2 sanitized Node environment marker;
- exact V2 config path; and
- exact installed continuity-attestation path, reviewed SHA-256, attestation ID,
  census receipt reference, ownership, mode, link count, regular-file status,
  and no-symlink status.

After those checks, V2 maps only those reviewed substitutions back to the V1
representation and calls
`classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(...)`.

All unchanged V1 evidence therefore remains governed by the canonical V1
classifier:

- dedicated account and shell identity;
- root-owned mode-0444 `AuthorizedKeysFile`;
- `StrictModes=yes`;
- public-key-only SSH;
- no user environment, `AcceptEnv`, PTY, forwarding, or user RC;
- original-command rejection before environment sanitization;
- exact `/usr/bin/env` and `/usr/bin/node` identity/ancestor requirements;
- closed sanitized Node environment;
- protected config and authority root;
- pinned host, known-hosts, and client-key identities; and
- exact integer evidence generation / collection fields.

V2 never converts a failed V1 decision into success.

## Exact V2 installation identities

Handler source Git blob:

`94dd160bc15ffb5ce75f6f1638df4f074e8d1cc8`

Handler path:

`/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs`

Config path:

`/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json`

Forced command SHA-256:

`sha256:46d3476854cbb8ffdfb9355b0410d15d3a4601561cba33bf583edaf8bb2cf86f`

Continuity attestation path:

`/var/lib/void-allocation-custody-witness-v1/buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json`

Reviewed continuity attestation SHA-256:

`sha256:12a6f037d1297c89f017f4d4ed3ca96c2ffadae820dd6d1b170f3966183481eb`

Reviewed continuity attestation ID:

`voidwica1_49191c526f27da78075973403bc7e98238eedcdd2442fd1339311cf4c45e3eee`

The attestation file must be a single-link mode-0600 regular file owned by the
same dedicated account UID/GID as the witness service evidence.

## Authority boundary

A successful V2 decision is still only a classification of supplied evidence.

The following remain false:

- live evidence origin proof;
- trusted verification clock;
- evidence-generation monotonicity;
- live continuity-attestation installation;
- live Nimo installation;
- live SSH execution;
- key or `authorized_keys` mutation;
- sshd mutation;
- authenticated external transport;
- external witness storage proof;
- runtime integration;
- protected or independent high-water custody;
- production readiness;
- payment acceptance, signing, Chain-2050 mutation, activation, inventory,
  treasury/liquidity, or funds movement.

A later read-only collector must obtain the actual designated-host facts and
feed this exact classifier. Live installation remains a separate explicit
operator gate.

## Focused proof

```bash
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v2.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
npm run typecheck
npm run build
git diff --check
```

The V2 proof covers successful inherited qualification, deterministic
qualification identity, V1 inability to authorize V2 bytes, handler/config/
forced-command/environment substitution rejection, continuity-attestation
identity and filesystem metadata rejection, and representative inherited V1
account/authorized-key/sshd/pre-exec/host-key HOLDs.
