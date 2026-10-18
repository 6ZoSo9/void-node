# Apollyon durable attempt-claim store service source candidate v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2`

Status: **source-only candidate boundary; no service/publisher implementation and no host installation**.

## Purpose

This gate is the first source candidate after the accepted protected-store contract (#3233) and read-only Xiphos host-identity plan (#3265).

It does not implement the claim service, publisher, systemd unit, AF_UNIX listener, durable claim writer, or training-start consumer. Instead, it freezes the complete policy surface that every later implementation must satisfy so implementation work cannot silently narrow the accepted contract.

## Exact parents

- accepted store-contract head: `9475035552881f34658a7c8f3a6b336199fda159`
- accepted store-contract blob: `bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc`
- accepted host-plan head: `30edd98609877c15be44d26b46916cf8c5d1f174`
- accepted planner blob: `9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d`
- stable store policy:
  `apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137`

## Fixed names and paths

The candidate binds the #3265 fixed role names:

- claim service: `voidapollyonclaim:voidapollyonclaim`
- claim publisher: `voidapollyonclaimpub:voidapollyonclaimpub`
- claim IPC group: `voidapollyonclaimipc`

and fixed future paths:

- state root: `/var/lib/void-apollyon-attempt-claim-v2`
- socket parent: `/run/void-apollyon-attempt-claim-v2`
- socket: `/run/void-apollyon-attempt-claim-v2/claim.sock`
- unit: `/etc/systemd/system/void-apollyon-attempt-claim-v2.service`
- reviewed service root: `/opt/void-apollyon-attempt-claim-v2-reviewed-v1`
- reviewed publisher root: `/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1`

Numeric UID/GID values remain deliberately unresolved. A caller-supplied JSON receipt is explicitly insufficient. The future provisioning gate must re-execute the exact reviewed #3265 planner on Xiphos, revalidate machine/local-identity/trusted-parent state, recompute the content-addressed plan ID, and compare the exact fresh result before binding numeric identities.

The candidate freezes the exact host-plan receipt boundary: marker/version/status,
#3233 parent and policy, fixed names/paths, exact five selected-candidate keys,
positive-safe-integer, pairwise-distinct, system-range and current-local-identity
absence requirements, #3265 source-generation head/planner/contract evidence,
target-name/path absence, plan-only candidate status, and every
provisioning/store/claim/training flag that must still be false.

The repaired #3265 host-plan boundary is now explicit in this candidate too.
Any later numeric-identity binding must require a fresh host-plan receipt proving:

- selected candidate values are absent from current live-process credentials;
- read-only root process-census authority is established under the reviewed
  host PID namespace **and** reviewed host user namespace;
- planner and PID 1 match both namespace leases;
- procfs is authoritative/no-hidepid;
- all four UID slots, all four GID slots and supplementary groups were consumed;
- initial and final live-process censuses were performed;
- selected candidates remain clear in the final live-process census;
- the full live-process census is repeated immediately before provisioning;
- the host user-namespace lease is repeated immediately before provisioning;
- `candidate_slots_provisioning_ready=false` remains mandatory at this source
  gate.

A future implementation/install gate must validate that exact receipt and repeat
both the local-identity and authoritative live-process/namespace censuses
immediately before create-only provisioning.

## Complete policy projection

The candidate imports and embeds the accepted #3233 policy objects without reducing them:

- dangerous loader/runtime environment names;
- complete systemd service requirements;
- complete AF_UNIX/socket lifecycle and peer-auth requirements;
- complete persistent store, generation, migration, replay, durability and training-start-consumption requirements;
- exact request, claim-record, success/failure response, store-generation and continuity-receipt schemas;
- exact service and publisher least-authority evidence-key schemas.

The candidate is deeply frozen and content-addressed.

## Service/publisher separation

The planned implementation boundary remains:

- a dedicated non-root claim-service identity owns claim state and the AF_UNIX listener;
- a distinct publisher identity may submit reviewed requests but must not obtain direct claim-root write/rename/unlink authority;
- training, custody, public runtime and interactive operator identities remain separate;
- publisher/service source and process identities require later exact qualification;
- durable claim success does **not** itself authorize training start;
- one-time training-start admission/consumption remains a separate gate after durable claim.

## Authority

This gate contains no filesystem/network/child-process import and no service implementation.

The exported candidate authority also preserves the accepted zero-authorization state explicitly:

- `durable_attempt_claim=false`;
- `attempt_claim_authorized=false`;
- `attempt_claimed=false`;
- `training_execution_authorized=false`;
- `training_execution=false`;
- `candidate_weight_mutation=false`.

It performs no:

- account/group provisioning;
- file/directory/unit/socket creation;
- systemd mutation or service action;
- claim publication or store generation mutation;
- training-start consumption;
- training/model execution or candidate-weight mutation;
- credential/private-key/signing/wallet/transaction/funds action.

The next source gate is `apollyon_durable_attempt_claim_store_service_source_implementation_v2`.

PROTECT THE CORE.

## Current reviewed host-plan generation

The service candidate pins the reviewed planner source at
`30edd98609877c15be44d26b46916cf8c5d1f174` with exact Git blob
`9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d`. The host-plan proof binds
that source head and blob as one exact generation; no provenance claim is made
through an unrelated historical merge parent. The parent host plan excludes stale
numeric UID/GID process collisions, verifies host PID and user namespace leases,
and traverses raw Git commit-object ancestry breadth-first under its unchanged
4,096-object cap. Numeric identities remain unprovisioned, and a new live
read-only host-plan recensus is required before any future account creation.
