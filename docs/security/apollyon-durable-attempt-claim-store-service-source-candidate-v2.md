# Apollyon durable attempt-claim store service source candidate v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2`

Status: **source-only candidate boundary; no service/publisher implementation and no host installation**.

## Purpose

This gate is the first source candidate after the accepted protected-store contract (#3233) and read-only Xiphos host-identity plan (#3265).

It does not implement the claim service, publisher, systemd unit, AF_UNIX listener, durable claim writer, or training-start consumer. Instead, it freezes the complete policy surface that every later implementation must satisfy so implementation work cannot silently narrow the accepted contract.

## Exact parents

- accepted store-contract head: `fe7e1ad9b78a24b77a1657067e4d08f7c56a7731`
- accepted store-contract blob: `6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe`
- accepted host-plan head: `5693e0e060dd567acbbf7a1e44ab641efded4a98`
- accepted planner blob: `03ea7df9b7a548c73ec1c715d716391be5d5d223`
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

The candidate freezes the exact host-plan receipt boundary: marker/version/status, #3233 parent and policy, fixed names/paths, exact five selected-candidate keys, positive-safe-integer, pairwise-distinct, system-range and current-local-identity-absence requirements, #3265 source-generation head/planner/contract evidence, target-name/path absence, plan-only candidate status, recensus requirement, and every provisioning/store/claim/training flag that must still be false. A future implementation/install gate must validate that exact receipt and recensus local identity state immediately before create-only provisioning.

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
