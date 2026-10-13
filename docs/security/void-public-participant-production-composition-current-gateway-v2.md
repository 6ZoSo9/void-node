# Public participant source composition — current gateway V2

## Purpose and provenance

This is an additive, **source-only** qualification for the exact reviewed
Buy VOID public-edge gateway generation staged in Draft
[#2823](https://github.com/6ZoSo9/void-node/pull/2823). It is stacked on
its immutable source commit
`2f5a8d98ab3cefafe04286b271552b501dd96704`.

The original public participant production composition preflight V1,
its proof, its historical Git object expectations, and its workflow remain
**byte-for-byte unchanged**. In particular, original V1 must continue to
reject the successor gateway source with
`participant_composition_source_blob_mismatch`.

The only semantic identity rebase inside the new V2 preflight is the
reviewed gateway Git blob:

- historical V1 gateway:
  `850419187facd4a90feeb15aa676b03d785e44b5`;
- new reviewed public-edge gateway:
  `974a1b0d825ec921a26aaca61c5560d5e29fba5f`.

All other 16 source blobs and their structural, durable session, role
authority, source provenance, and read-only security contracts are copied
from the historical reviewed V1 generation. A version-2 marker, source
binding object, and content-addressed `voidppcp2_` preflight ID clearly
separate the new candidate from the old frozen evidence.

## Executable acceptance and negative evidence

`scripts/prove_void_public_participant_production_composition_current_gateway_v2.mjs`
executes the **actual source-backed participant session, account-read,
compiled security module, and gateway-contract** proof against V2.
It first requires that unchanged V1 rejects the new gateway, and binds
the current gateway to the exact Git blob above. The complete copied
V1 behavioral proof remains in place for durable storage shape,
private-key/wallet authority exclusion, hostile Git environment,
post-import source identity and participant role injection.

The additive Node 22/24/26 workflow builds the exact reviewed TypeScript
runtime before exercising the proof. Its expected positive outcome is
`PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BOUND_HOST_LIFECYCLE_HOLD`,
**not** an installed or enabled participant runtime.

## Coupled gates still held

This does **not** waive or rewrite the frozen V1 participant preflight,
Precision recovery or public-ingress source-generation refusals.
It does not merge or deploy sibling #2823, #2811 or #2818; it does not
prove a customer payment, automatic VOID delivery, completed buyer
sidecar journal, signer installation, Work Credit exchange, or the coupled
presale/WC market opening.

No installed services, DNS, routing, network reads, credential or key
access, wallet signing, transaction construction/broadcast, treasury,
customer records, Work Credit state, or funds movement are authorized.
**PROTECT THE CORE.**
