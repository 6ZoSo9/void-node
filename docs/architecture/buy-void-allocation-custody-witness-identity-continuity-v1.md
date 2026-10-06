# Buy VOID allocation custody witness identity continuity v1

Marker:

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1`

Status: **source-only continuity candidate; V1 witness history is immutable and
runtime admission remains HOLD**.

## Incident

Read-only Nimo qualification found one identity drift:

```text
witness_bound_machine_id_sha256=318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da
live_machine_id_sha256=48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4
identity_drift_class=machine_id_only
```

The same qualification established that all other reviewed continuity anchors
remain stable:

- hostname: `Nimo`;
- root disk serial: `50026B76873B25AB`;
- root disk WWN: `eui.00000000000000000026b76873b25ab5`;
- ED25519 SSH host key fingerprint:
  `SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk`;
- existing `known_hosts` entry matches that live key;
- host-key updates were disabled;
- V1 witness SHA-256:
  `a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a`;
- V1 witness bytes: `1411`;
- V1 witness mode/link count: `0600` / `1`.

The read-only census receipt SHA-256 is:

`17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef`.

## Historical witness rule

The V1 witness is not rewritten, and this continuity generation accepts only
the exact historical Nimo V1 journal:

- witness SHA-256:
  `a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a`;
- bytes: `1411`;
- event count: `1`;
- tip event SHA-256:
  `2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654`.

A different journal that is structurally valid under the V1 parser is still
rejected as an alternate predecessor. This prevents a later or forked witness
history from being relabeled as the immutable V1 continuity anchor.

Its original machine-id field remains a historical identity anchor. A later
runtime may accept the current machine ID only through an explicit reviewed
continuity attestation that binds the predecessor and successor identities.

No caller may silently substitute the current machine ID into historical V1
events.

## Continuity classification

The source contract parses the exact predecessor witness and requires evidence
for `machine_id_only` drift.

The candidate is accepted only when:

- the parsed predecessor journal is the exact historical V1 SHA/bytes/count/tip
  above, not merely any valid V1 witness history;
- predecessor witness SHA/bytes/event count/tip in the evidence match that
  exact journal;
- predecessor hostname, machine ID, root serial and root WWN equal the witness;
- successor hostname equals predecessor hostname;
- successor root serial equals predecessor root serial;
- successor root WWN equals predecessor root WWN;
- successor machine ID is different from predecessor machine ID;
- SSH algorithm is exactly `ssh-ed25519`;
- an exact SHA-256 SSH host-key fingerprint is supplied;
- `existing_known_hosts_match=true`;
- `ssh_hostkey_update=false`;
- witness mode is `0600`, link count is `1`;
- the census is explicitly read-only; and
- a content-addressed census receipt SHA-256 is supplied.

Hostname or disk drift is **not** accepted as continuity. A different
structurally valid predecessor witness is also rejected before successor
evidence can be attested.

## Attestation

A valid candidate deterministically produces:

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1`

The attestation binds:

- predecessor witness SHA and tip;
- predecessor and successor machine IDs;
- stable hostname;
- stable root disk serial and WWN;
- stable ED25519 host-key fingerprint;
- read-only census receipt SHA;
- continuity scope `machine_id_rotation_only`;
- exact V1 witness retention; and
- explicit non-authorization for current-machine-ID runtime admission.

The attestation ID is content-addressed as `voidwica1_<sha256>`.

## Authority boundary

This source contract does **not** prove that the evidence was freshly observed.
That requires the operator/live evidence import gate.

It does not:

- rewrite or append the V1 witness;
- install or mutate the Nimo handler;
- alter `authorized_keys`;
- generate an SSH key;
- authenticate the external transport;
- admit the successor machine ID to runtime;
- activate the presale;
- access wallets/signers;
- broadcast transactions; or
- move funds.

Therefore:

```text
live_evidence_origin_proven=false
live_continuity_attestation_proven=false
handler_integration=false
current_machine_id_runtime_admission=false
external_transport_authenticated=false
production_gate_ready=false
```

## Next gate

After this contract is reviewed and merged:

1. import the exact read-only census receipt into a protected continuity
   attestation ceremony;
2. produce one exact continuity attestation for Nimo;
3. extend the forced-command handler in a successor revision to require that
   attestation when live machine ID differs from the V1 historical anchor;
4. prove exact-old, exact-successor, tampered-attestation and multi-field-drift
   cases; and only then
5. resume dedicated transport-key / forced-command installation qualification.
