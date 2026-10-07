# Buy VOID allocation custody witness forced command v2

Marker:

`VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V2`

Status: **source-only successor handler; not installed on Nimo**.

## Purpose

V1 correctly fails closed because the historical witness is bound to Nimo's
predecessor `/etc/machine-id`.

The reviewed continuity ceremony proved one machine-ID-only transition while
retaining the exact historical V1 witness:

```text
predecessor_machine_id_sha256=318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da
successor_machine_id_sha256=48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4
attestation_id=voidwica1_49191c526f27da78075973403bc7e98238eedcdd2442fd1339311cf4c45e3eee
attestation_sha256=12a6f037d1297c89f017f4d4ed3ca96c2ffadae820dd6d1b170f3966183481eb
```

V2 adds a narrow successor identity path without rewriting the V1 witness.

## Identity rule

The historical path is unchanged:

- hostname must match the witness tip;
- root disk serial must match;
- root disk WWN must match;
- if the live machine ID equals the witness-tip machine ID, no continuity
  attestation is consumed.

Only when the machine ID differs does V2 consider continuity.

The successor path requires all of the following:

- witness-tip machine ID is the exact historical Nimo machine ID;
- live machine ID is the exact reviewed successor machine ID;
- hostname is unchanged;
- root disk serial is unchanged;
- root disk WWN is unchanged;
- the current witness begins with the exact historical 1411-byte genesis
  journal;
- that prefix has the exact historical SHA-256, event count and tip;
- the fixed continuity-attestation file exists directly in the protected
  witness authority root;
- it is a regular single-link mode-0600 file under the V1 descriptor-pinned
  authority root;
- its complete bytes equal the reviewed ceremony artifact SHA-256;
- its canonical JSON and content-addressed attestation ID are exact;
- the census receipt, predecessor/successor machine IDs, stable host/disk
  identity and reviewed ED25519 host-key fingerprint are exact; and
- the attestation itself still says runtime admission and production readiness
  are false.

The attestation is evidence for the identity transition, not a general
authorization primitive.

## Recovery boundary

The same V2 host/continuity identity check is used by normal reads, fresh
appends and durable append-intent recovery, but **recovery authority is
append-only**.

Before any recovery mutation, the handler runs the same pure canonical request
parser used by the transport server contract. That preflight requires canonical
JSON, the exact closed read/append key set, marker/version, current policy
SHA-256, challenge SHA-256, a recomputed `voidwreq1_` request ID, canonical
append-line encoding, and all typed append fields. A partial append-shaped
envelope is therefore not recovery authority.

Only a fully canonical `append` request may enter
`recoverIntentUnderLock(...)`. If a durable intent exists, its retained
canonical request bytes must also be byte-identical to the request currently
asking for recovery before any truncate, append, fsync or cleanup may occur.
A different but otherwise valid append request cannot recover another request's
intent.

A `read`, unknown, malformed or mismatched append request never truncates,
appends or cleans up an append intent. With a durable intent present these cases
HOLD before witness or intent mutation. The focused proof covers:
- intent-only, torn-partial and full-append-before-cleanup read attempts;
- extra-key and missing-field append envelopes;
- a bad request ID; and
- a canonical/recomputed-ID append whose transition fields differ from the
  request that created the pending intent.

Every HOLD requires the witness bytes and pending intent bytes to remain exact.

For successor identity append recovery, a missing or invalid attestation still
HOLDs before truncate, append or intent cleanup. The V2 proof creates a torn
append, removes the attestation, proves witness/intent bytes remain unchanged,
then restores the exact attestation and completes append recovery.

## Fixed later installation name

The reviewed attestation bytes must later be installed on Nimo as:

`buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json`

directly inside the same protected authority root that contains the V1 witness.

This source lane does not perform that installation.

## Authority boundary

This PR is source/proof only. It does not:

- install V2 on Nimo;
- copy the continuity attestation to Nimo;
- change `authorized_keys`;
- generate a transport key;
- mutate the witness;
- alter sshd/systemd;
- authenticate Precision-to-Nimo transport;
- integrate reservation admission;
- activate the presale;
- access wallets/signers;
- broadcast transactions; or
- move funds.

Therefore:

```text
live_nimo_installed=false
live_continuity_attestation_installed=false
current_machine_id_runtime_admission_proven=false
external_transport_authenticated=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
```

## Next gate

This handler-byte change invalidates the prior installed-handler and
runtime-bundle identities. After exact-head CI and merge, any Nimo use requires
a separate operator-authorized reinstall/requalification of the exact reviewed
handler and bundle before a fresh read-only live observation can count.
Installation and transport-key authorization remain separate operator
ceremonies.

## Config-parent trust-domain correction

The forced-command config is an immutable policy input, not writable witness
state. Its fixed live parent `/etc/void` must remain root-owned and not
group/world writable, and the final config inode itself must be a root:root,
single-link regular file at mode `0444`.

The dedicated witness account may therefore read the policy but cannot rewrite
its bytes in place, chmod it, or replace the pathname through the protected
parent. Writable witness authority state remains a separate trust domain owned
by the dedicated witness account at mode `0700`.

V2 uses distinct descriptor-pinned policies for these roles:

- config parent: root-owned, non-group/world-writable, symlink-free;
- config file: root:root, mode `0444`, single-link, regular/no-symlink;
- witness authority root: executing-account-owned, mode `0700`, symlink-free.

The production config reader composes the root-owned parent opener with the
root-owned read-only file validator. A separately named test-only reader
preserves non-root temporary fixture coverage with account-owned mode-`0600`
files and is not used by the forced-command CLI path.

This corrects the previously inconsistent state in which the installation
qualification required a root-owned config parent while the handler attempted
to validate that same parent as account-owned private state.
