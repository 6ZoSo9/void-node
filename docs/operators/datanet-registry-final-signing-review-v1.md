# DataNet registry final signing review v1

Marker: `VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_V1`

Status: final source review before a separate exact signing authorization. No
signing authority is granted here.

## Purpose

Combine the exact unsigned registry-deployment candidate with:

- its original construction evidence;
- the prior Nimo deployer credential identity binding;
- the fresh read-only candidate-state revalidation;
- the detailed fresh fee/funding packet from that revalidation; and
- a **new, distinct** Nimo deployer credential binding created after the fresh
  revalidation.

The result proves the candidate and deployer identity are both fresh enough for
a separate signing-authorization decision.

## Revalidation evidence rebuild

The review does not trust a rehashed candidate-revalidation receipt by itself.

It independently validates:

- the exact unsigned transaction candidate and its construction evidence;
- the prior credential binding as lineage only;
- the fresh fee packet against the deployment-input plan;
- candidate nonce against the fresh pending nonce;
- predicted CREATE address and vacancy;
- creation-data identity;
- activation-height and block-hash continuity;
- candidate gas limit against the fresh 120%-buffered gas estimate;
- candidate fee caps against the reviewed fee policy; and
- current deployer balance against the candidate's own maximum gas cost.

## Fresh credential binding

The new credential binding must:

- bind the exact same candidate ID;
- bind the exact unsigned transaction hash and transaction fingerprint;
- bind the same selected deployer address;
- remain signing-authority false;
- have a different binding ID from the prior binding;
- occur **after** the candidate revalidation observation; and
- occur before the candidate-revalidation receipt expires.

The final review itself never reads the credential. The private-key read occurs
only in the separately confirmed Nimo binding operation.

## Time boundary

The review is valid only until the earlier of:

- the candidate revalidation expiry; and
- the candidate's own expiry.

A fresh binding that happens before the revalidation or after its window is
rejected.

## Output

A green artifact has status:

`FINAL_SIGNING_REVIEW_GREEN_SINGLE_TRANSACTION_AUTHORIZATION_REQUIRED`

It binds only public/evidence identifiers:

- candidate ID;
- unsigned transaction hash;
- transaction fingerprint;
- fresh candidate-revalidation ID;
- prior credential-binding ID;
- fresh credential-binding ID; and
- fresh fee/funding packet ID.

The review does not embed raw private-key material and does not create a signer.

## Authority boundary

A green review records:

- review artifact only;
- RPC call false;
- credential access false;
- private-key access false;
- wallet access false;
- signer object exposed false;
- deployer funding false;
- transaction construction false;
- transaction signing authorized false;
- transaction signing false;
- transaction submission/broadcast false;
- deployment false;
- Chain-2050 mutation false;
- funds movement false;
- migration authorization false; and
- public activation authorization false.

It explicitly records:

`signing_authorized=false`

## Next gate

Only a **separate exact single-transaction signing authorization** may advance
from this review.

That later authorization must identify this review and the exact candidate
hash/fingerprint, be time-bounded and single-use, and still must not imply
broadcast authority.
