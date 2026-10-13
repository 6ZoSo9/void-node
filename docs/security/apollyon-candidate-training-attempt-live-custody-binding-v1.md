# Apollyon candidate-training attempt live custody binding v1

Marker: `VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_LIVE_CUSTODY_BINDING_V1`

Status: **read-only live pre-claim binding; no durable claim and no training execution**.

## Purpose

V86 closes the binding deliberately left unproven by V85. It proves that the
V84 live Xiphos custody qualification, the V81 custody assertion, and the exact
V80 custody record all remain attached to one stable live custody boundary while
the read-only pre-claim check runs.

V86 does not create an attempt claim. Its next gate remains the durable
candidate-training attempt-claim executor.

## Exact source pins

```text
V84 live qualification tool 3dae4db82a9316eaa88f475cec41ddc05a441536
V85 claim contract          f97fafb0148527ae3a954e2752faef8c7fc9e88e
V81 custody client          fb31dbbda76c94f0ad08e38094c151a24a78b486
```

The tool recomputes all three Git blob identities before live use.

## Live binding sequence

V86 requires root on Xiphos for read-only cross-UID observation. It:

1. opens and retains descriptors for the configured custody state root and
   `consumed/` directory, both required to remain mode `0700`;
2. records the advertised AF_UNIX socket inode identity;
3. records the custody systemd MainPID plus `/proc/<pid>/stat` start time;
4. runs the exact V84 live qualification;
5. requires the retained directories, socket inode, and service-process identity
   to remain unchanged;
6. queries the exact V81 custody service over that same AF_UNIX socket using
   `assertConsumed(authorization_id)`;
7. rechecks all live identities;
8. reads the exact mode-`0600`, single-link custody record through the retained
   `consumed/` descriptor and verifies canonical bytes/hash;
9. rechecks all live identities again; and
10. feeds the V84 receipt, custody assertion, and exact record into V85.

Importing V86 grants no proof. Its exported authority metadata states
`same_live_custody_session_binding_proven_by_import=false`.

Only after all checks pass does a live V86 result report:

```text
same_live_custody_session_binding_required=true
same_live_custody_session_binding_proven=true
live_socket_identity_stable=true
service_process_identity_stable=true
state_root_identity_stable=true
consumed_directory_identity_stable=true
```

The process identity uses both MainPID and kernel process start-time ticks, so a
PID reuse is not treated as continuity.

## Authority boundary

V86 is read-only except for stdout/stderr. It performs one local AF_UNIX custody
query, but no external network access.

A GREEN result still states:

```text
durable_attempt_claim_required=true
durable_attempt_claim_performed=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
generation_execution_performed=false
operator_private_key_access_performed=false
production_signing_performed=false
wallet_access_performed=false
transaction_signing_performed=false
transaction_broadcast_performed=false
funds_movement_performed=false
host_mutation_performed=false
service_action_performed=false
external_network_access_performed=false
persistent_receipt_write_performed=false
```

## Live invocation

The operator supplies identifiers only; no evidence JSON is accepted:

```bash
sudo node tools/apollyon-candidate-training-attempt-live-custody-binding-v1.mjs \
  --training-user <training-user> \
  --custody-user <custody-user> \
  --ipc-group <ipc-group> \
  --state-root /absolute/custody/state/root \
  --socket-path /absolute/custody.sock \
  --service-unit <custody-service>.service \
  --authorization-id apollyon_authz_v1:<sha256>
```

## Next gate

`durable_candidate_training_attempt_claim_executor_v1`

That later executor must durably publish the exact one-attempt claim before any
trainer process can be invoked. V86 itself never claims or trains.
