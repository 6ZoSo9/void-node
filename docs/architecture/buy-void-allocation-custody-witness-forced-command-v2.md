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

The same V2 identity check is used by normal reads, fresh appends and durable
intent recovery.

For successor identity recovery, a missing or invalid attestation therefore
HOLDs before truncate, append or intent cleanup. The V2 proof creates a torn
append, removes the attestation, proves witness/intent bytes remain unchanged,
then restores the exact attestation and completes recovery.

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

After exact-head CI and merge, stage the exact reviewed attestation and V2
handler for a **read-only Nimo installation qualification**. Installation and
transport-key authorization remain separate operator ceremonies.
