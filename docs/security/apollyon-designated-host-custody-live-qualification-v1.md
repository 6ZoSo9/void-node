# Apollyon designated-host custody live qualification v1

Marker: `VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V1`

Status: **read-only live qualification runner**.

## Purpose

V84 closes the provenance gap between the merged V83 live collector and the
merged V82 pure policy classifier.

V82 accepts supplied evidence by design. V83 derives evidence from Xiphos but
does not itself classify it. V84 does not accept an evidence JSON input at all.
Instead it invokes the exact reviewed V83 collector twice and immediately feeds
both observations into V82.

## Exact source binding

V84 pins both source components by Git blob SHA-1:

```text
V83 collector 899864a8305c54c64bcc2bab6dc1f50b599b0706
V82 policy    6f34e79d94c502e31ca4923fd78922d4875550a5
```

Both blobs are recomputed from local repository bytes before live collection.

## Two-observation rule

One host snapshot is not enough to prove the collector's generation is moving
forward. V84 therefore runs V83 twice with the same identifiers and requires:

- both observations pass V82;
- both target Xiphos;
- the same boot-ID SHA-256;
- strictly increasing CLOCK_BOOTTIME evidence generation;
- non-regressing kernel realtime/observation timestamps; and
- byte-equivalent policy-critical host state after removing only observation
  time/generation fields.

Host-state drift between the two observations HOLDs.

## Caller input

The caller may supply only the six identifiers needed by V83:

- training user;
- custody user;
- IPC group;
- absolute state root;
- absolute socket path; and
- custody systemd service unit.

There is no evidence-file, JSON-body, public-key, trust-root, or state-generation
input.

## Success meaning

A successful V84 result means the exact reviewed collector observed a stable
Xiphos custody layout twice on one boot and both observations passed the exact
reviewed V82 policy.

The receipt may therefore state:

```text
verification_clock_authority_proven=true
evidence_generation_monotonicity_proven=true
live_host_qualification_performed=true
independent_custody_proven=true
custody_production_gate_ready=true
```

It still states:

```text
attempt_claim_authorized=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
operator_private_key_access_performed=false
production_signing_performed=false
wallet_access_performed=false
transaction_signing_performed=false
transaction_broadcast_performed=false
funds_movement_performed=false
persistent_receipt_write_performed=false
```

V84 writes no receipt file. Its canonical result is stdout only.

## Live invocation

```bash
sudo node tools/apollyon-designated-host-custody-live-qualification-v1.mjs \
  --training-user <training-user> \
  --custody-user <custody-user> \
  --ipc-group <ipc-group> \
  --state-root /absolute/custody/state/root \
  --socket-path /absolute/custody.sock \
  --service-unit <custody-service>.service
```

If V83 HOLDs, V84 propagates the exact V83 reason after
`apollyon_live_qualification_collector_held:`.

## Next gate

`candidate_training_attempt_claim_contract_v1`

That gate is still source-only design work until a live V84 qualification is
actually observed on Xiphos.
