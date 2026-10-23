# Hardened V5 staging manifest-candidate derivation acceptance V1

Status: **candidate-derivation authorization only**. This record is not launcher
source acceptance and is not production-manifest acceptance.

Acceptance ID:

`voidv7v5stagemanifestcandidateaccept1_d3b7f15b65a2d91dbf64b0d5c093612ae8092669a480e80d25c174d31d22bf0b`

## Corrected review meaning

The exact #3721 launcher source identity remains useful input for manifest
candidate derivation, but it still carries the recorded P1 pre-acceptance
manifest/root-of-trust binding gap. Therefore this generation deliberately
states:

```text
launcher_source_identity_bound_for_manifest_candidate_derivation=true
hardened_launcher_source_review_accepted=false
launcher_p1_manifest_root_of_trust_binding_gap=true
payload_manifest_candidate_generation_authorized=true
payload_manifest_candidate_is_repair_input=true
payload_manifest_accepted=false
```

A future manifest candidate may be generated as repair input for the launcher
root-of-trust design. This record may not be consumed as evidence that the
current launcher has passed source review.

## Staging-pair qualifier repair

The exact #3725 generation is separately bound:

- head `a672d6be15815a008bbf664ba099fc9ce72bfc92`;
- qualifier blob `661fa682fab32704f9596d7984b8899f968d5649`;
- qualifier proof blob `89b7e89a69a08e0218a2bfa4a8bc0a1e6df44d60`;
- focused workflow `39846484405`, job `120060989089`: SUCCESS.

That closes the previously recorded P2 pair-generation/custody defect at the
source/hosted-fixture level. Qualification remains a point-in-time predicate,
not protection from a malicious privileged actor after qualification.

## Acceptance proof input hardening

The proof no longer authenticates a Git tree entry and then separately reads a
mutable pathname with `readFileSync`.

It opens the acceptance file once with
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK`, requires a bounded regular single-link
file, compares pre/open/post/visible generations, rejects short reads and
growth, recomputes the Git blob over the exact bytes read, and parses that same
authenticated buffer.

Disposable negatives require rejection of:

- same-length pathname replacement;
- symlink substitution;
- FIFO substitution at the actual open boundary;
- oversized input;
- in-place growth.

The proof also mutates the parsed decision in memory and requires a specific
failure if the finding-bearing #3721 launcher is relabeled
`hardened_launcher_source_review_accepted=true`.

## Remaining prerequisite

The complete manifest contract requires separately reviewed exact identities
for:

- `runtime/bin/python3.12-static`;
- `runtime/lib/python312.zip`.

No accepted byte count/SHA-256 exists for those runtime inputs yet. Candidate
derivation therefore remains gated on static-runtime identity qualification.

Next gate:

`QUALIFY_STATIC_PYTHON_STDLIB_IDENTITIES_THEN_DERIVE_HARDENED_V2_CLOSED_TREE_PAYLOAD_MANIFEST_CANDIDATE`.

## Authority

Everything production-relevant remains false:

```text
payload_manifest_accepted=false
closed_tree_bootstrap_install_authorized=false
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
transition_journal_mutation=false
consumer_fence_mutation=false
service_mutation=false
systemd_mutation=false
provider_rpc_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

PROTECT THE CORE.
