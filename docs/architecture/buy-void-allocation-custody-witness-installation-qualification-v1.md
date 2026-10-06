# Buy VOID allocation custody witness installation qualification v1

Marker:

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1`

Status: **pure source evidence classifier; no live Nimo installation or SSH
execution**.

## Purpose

This contract defines the exact installation profile that a later read-only
Nimo qualification packet must satisfy before the merged witness transport and
forced-command handler can be treated as a candidate authenticated external
witness boundary.

It does not inspect Nimo, open a network connection, install a key, edit
`authorized_keys`, change sshd, write the witness, start a service, or grant
production authority.

Success is:

`installation_evidence_qualified_not_live`

and deliberately keeps `live_evidence_origin_proven=false`.

## Reviewed source identities

The classifier pins the merged source identities used by the future
installation:

- transport source Git blob:
  `6d697468e29fb55d6892ab1269401be485ebeba8`;
- transport source SHA-256:
  `d7ef969c408d5bd2217374020cd97a773e27c8b603245837a6a29d6f0b7abca1`;
- forced-command handler Git blob:
  `e19fa1094981b10cea6052ac86281fd6e760b800`;
- forced-command handler SHA-256:
  `8b0f2fc8b3e93ad728f9022459a3f0b3cbe6633d07dd38d2fdb3d9744d8423ba`.

A deployed handler with any other path, blob, byte digest, owner, mode, link
count, symlink status, or unsafe ancestor chain HOLDs.

## Fixed server paths

The reviewed installation profile is intentionally caller-independent:

- handler:
  `/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs`;
- config:
  `/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json`;
- authority root:
  `/var/lib/void-buy-allocation-custody-witness-v1`;
- witness file:
  `buy-void-allocation-custody-high-water-witness-v1.jsonl`;
- Node:
  `/usr/bin/node`;
- account shell:
  `/usr/bin/dash`.

The handler and executable binaries require root-owned, non-writable ancestor
chains. The protected config is mode 0600, single-link, non-symlink, owned by
the dedicated witness account, beneath a root-owned non-writable ancestor
chain.

The config SHA-256 is not a caller label. The classifier re-derives the exact
canonical #2504 config bytes from the validated #2502 transport policy, fixed
authority root, and fixed witness filename and requires the evidence digest to
match.

## Dedicated account and shell

The remote account name must equal the #2502 transport policy
`remote_user`. Its UID/GID must be non-root and its account is explicitly
classified dedicated to this boundary.

The login shell is fixed to absolute `/usr/bin/dash` and its observed binary
identity is content-addressed, root-owned, mode 0755, direct/non-symlink, and
under root-owned non-writable ancestors.

A generic `/bin/sh` alias or `nologin` shell is not accepted. OpenSSH
forced commands execute through the account shell; the reviewed profile
therefore uses one explicit executable shell identity and separately eliminates
caller-controlled shell startup/environment paths.

## Sanitized forced command

The authorized-key command must equal exactly:

```text
/usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json
```

No relative executable, handler, config, or witness path is accepted.

The effective child environment is exactly:

1. `LANG=C`
2. `LC_ALL=C`
3. `PATH=/usr/bin:/bin`
4. `VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1`

The evidence must state that dangerous pre-exec variables are absent and that
neither user RC nor shell startup code nor caller-selected command/path
execution occurred. These are evidence requirements only; the pure classifier
does not claim the evidence came from a live host.

## Authorized key

The evidence must carry one exact line shaped as:

```text
restrict,command="<exact forced command>" ssh-ed25519 <base64-key> void-allocation-witness-v1
```

The line is content-addressed and must bind the same dedicated client-key
identity as the #2502 transport policy.

No additional authorized-key option is accepted by this v1 grammar. In
particular, caller-controlled `environment=` is rejected.

The `restrict` boundary is additionally backed by the effective sshd profile
below; the source contract does not assume one keyword alone is sufficient
deployment evidence.

## Effective sshd boundary

The supplied effective-configuration evidence must require:

- `PermitUserEnvironment=no`;
- `PermitUserRC=no`;
- empty `AcceptEnv`;
- agent forwarding disabled;
- TCP forwarding disabled;
- X11 forwarding disabled;
- tunneling disabled;
- gateway ports disabled; and
- TTY disabled.

This intentionally rejects looser host defaults even if the key line is
otherwise restricted.

## Transport identity binding

The installation evidence must bind the exact #2502 policy SHA and reproduce
its:

- remote witness account;
- ED25519 host-key algorithm and host-key identity;
- known-hosts identity; and
- dedicated ED25519 client-key identity.

The pure classifier validates the policy with the merged #2502 classifier
rather than accepting a caller-provided policy digest independently.

## Freshness

Evidence has one `observed_at_ms` and is accepted only within 15 minutes of
the supplied verification time.

The verification clock itself is not trusted by this contract. A later
content-addressed live receipt/ceremony must establish evidence origin and
clock authority before any production claim.

## Deliberately false authority

A source-green result still reports false for:

- live evidence origin;
- live Nimo installation;
- key generation or authorized-keys mutation;
- sshd mutation;
- server-controlled policy origin proven;
- challenge freshness / replay resistance;
- authenticated external transport;
- external witness storage proven;
- live remote read/append;
- protected / independent custody;
- runtime integration;
- production readiness;
- payment acceptance;
- wallet/private-key/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 mutation;
- presale/market activation;
- inventory, treasury, liquidity, or funds movement.

The next operator gate remains a content-addressed live Nimo qualification
receipt and negative-control ceremony. This source contract is not permission
to perform that ceremony.

## Focused proof

```bash
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
npm run build
node scripts/prove_buy_void_allocation_custody_witness_forced_command_v1.mjs
git diff --check
```

The synthetic proof covers:

- exact valid source evidence;
- handler blob/byte/path/symlink drift;
- config digest/mode drift;
- dedicated-account and shell drift;
- Node and shell binary path/symlink drift;
- forced-command alteration;
- missing `restrict`;
- caller `environment=` injection;
- dangerous `AcceptEnv` and `PermitUserEnvironment`;
- user-RC, forwarding and PTY downgrade;
- extra pre-exec environment;
- caller-selected path/command claims;
- host-key / known-hosts / policy mismatch; and
- stale evidence.

No proof step performs SSH or mutates Nimo.
