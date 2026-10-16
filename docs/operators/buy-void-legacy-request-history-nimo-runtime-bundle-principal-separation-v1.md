# Nimo runtime-bundle principal-separation source contract v1

Marker:
`VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_V1`

Issue: #3293.

Status: **source-policy prerequisite only; no V3 runtime-bundle candidate has
been derived or accepted by this contract**.

## Why this contract exists

Historical V2 candidate #3249 improved compiler, build-input and runtime-output
byte custody, but its hosted proof assigned two incompatible roles to the same
runner UID: adversarial builder and sudo-capable root orchestrator.

Root ownership cannot exclude a principal that can invoke the same root
authority. `sudo -n` removes prompts; it does not create principal separation.

V2 therefore remains negative/review evidence. This contract freezes the V3
principal boundary before another candidate derivation is attempted.

## Trusted supervisor domain

The future V3 derivation must model root/operator orchestration as an explicitly
trusted supervisor domain, not as the hostile builder principal.

The supervisor contract requires:

- root-domain execution;
- content-addressed supervisor source identity;
- content-addressed supervisor executable identity;
- a separately reviewed first-entry provenance boundary;
- no claim that the outer sudo-capable runner UID is adversarially excluded;
- no arbitrary caller-selected root command becoming candidate authority.

This source contract does **not** prove supervisor first entry. A future V3
derivation must supply that evidence.

## Dedicated builder principal

The actual compiler must run under a distinct non-root UID/GID with:

- zero supplementary groups;
- `no_new_privs=true`;
- no sudo authority;
- no login/session authority;
- no setuid privilege-regain path;
- no file-capability privilege-regain path;
- zero pre-existing builder-UID processes;
- exactly one admitted builder process generation;
- no observation of more than one concurrent builder-UID process;
- retained PID/start-ticks/pidfd/source identity for the admitted generation;
- zero builder-UID processes after the generation terminates.

The contract deliberately does not select production numeric UID/GID values.

## Input custody before builder launch

Before the builder starts:

- compiler snapshot is root-custodied and non-writable by the builder;
- build-input snapshot is root-custodied and non-writable by the builder;
- checkout compiler/input reopen during the build is forbidden.

The source contract requires this order but does not authenticate a filesystem
observation itself.

## Runtime-output terminal handoff

The output tree may be builder-writable only during the bounded compile
interval. Candidate evidence must not observe output while the builder remains
live.

Required order:

```text
compiler/input custody complete
  -> builder launch
  -> compiler exit
  -> retained generation terminal
  -> builder-UID process census == 0
  -> output root custody/finalization
  -> parent fsync
  -> output generation/bytes revalidation
  -> candidate observation
```

After custody, output descendants are non-writable. Post-exit substitution or a
second builder process must therefore HOLD before candidate hashing.

## Pure shape classifier

The classifier validates this policy/evidence *shape* only. Its positive status
is:

`PRINCIPAL_SEPARATION_SHAPE_QUALIFIED_NOT_AUTHENTICATED`

It always keeps these facts false:

- supervisor first-entry provenance authenticated;
- builder process-census provenance authenticated;
- builder generation provenance authenticated;
- compiler/input custody provenance authenticated;
- runtime-output custody provenance authenticated;
- V3 candidate derivation authorized;
- runtime-bundle candidate accepted;
- protected Nimo install;
- Nimo/SSH/witness access;
- key/signing/payment/transaction/presale/WC/funds authority.

A future V3 candidate must bind this policy ID and replace those unauthenticated
shape facts with separately reviewed evidence. It must not reuse V2 as current
authority.

## Adversarial proof

Focused proof rejects:

- non-root or untrusted supervisor shape;
- any outer-runner hostile-same-UID exclusion claim;
- arbitrary-root-command candidate authority;
- root/invalid builder UID/GID;
- supplementary groups;
- missing no-new-privs;
- sudo/login authority;
- setuid or file-capability privilege regain;
- pre-existing or second builder-UID process;
- lost retained pidfd generation;
- compiler/input snapshots writable by builder;
- checkout compiler/input reopen;
- candidate observation while builder is live;
- output custody/finalization/fsync/revalidation omissions;
- timeline reorder that observes candidate bytes before terminal handoff;
- policy-ID drift and extra-field drift.

## Authority

Source/test/CI only.

No Nimo contact, SSH, filesystem/install mutation, authorized_keys change,
witness read/append, private-key access, Sovereign signing, payment acceptance,
transaction, presale/WC activation, treasury/liquidity action or funds
movement.

PROTECT THE CORE.
