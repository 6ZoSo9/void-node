# Buy VOID custody — detached second-control Ed25519 verification V1

Status: **source-only, disconnected from the V2 controller and any protected host adapter**.

## Purpose

The parent [Draft #3632](https://github.com/6ZoSo9/void-node/pull/3632) gives each V2
noncustomer custody rollback approval a canonical content-addressed identity
binding its plan, authorization, operation, claim, challenge, lease, host,
rollback target, high-water checkpoint and external witness. A callback can
still compute that hash on its own. This successor defines how a *later*
independently trusted approver's detached Ed25519 signature could be
mathematically verified **without accepting the callback as an authority**.

Nothing in this PR allows a custody rollback or presale customer activity.

## Source generation and API

- Parent source: `5b2079f19f9419e524ccd79b93ce5b193bd3cdd9`.
- V2 controller Git blob: `7a42e1863f3f4d842dd59060b366901adb402848`.
- V2 plan: `voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844`.
- V2 plan Git blob: `1cdecf34117e4e890f67e62b412419d32870dfa0`.
- New module: `tools/void-buy-allocation-custody-second-control-signature-verifier-v1.mjs`.
- New module source blob: `72c9c451eb8d949b61a159fc9ffa4753b0bb895a`.
- New fixture-only proof: `scripts/prove_buy_void_custody_second_control_signature_verifier_v1.mjs`.
- Proof blob: `a9c55d11caebf01150a1a8c61e8f77203fc40a6c`.

**Verification inputs** are a closed V2 approval body, its exact V2
content ID, a detached attestation (V1 marker, V2 approval ID, Ed25519 SPKI
DER public key and 64-byte detached signature, each strictly canonical
base64), and an **externally declared** key policy containing the permitted
approver key SPKI SHA-256 and a different operator key SHA-256. Only the
existing content-ID builder defines the accepted V2 approval body.

The signing message is domain-separated by
`VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_APPROVAL_ED25519_V1\0`, and
includes an exact canonical V2 approval body and ID **plus the reviewed
V2 controller Git blob**. The verifier rejects invalid body shapes, V1
markers, unaccepted Ed25519 SPKI DER, mismatched pin, equal operator key,
noncanonical base64, invalid signature length and failed Ed25519
verification.

## What verification establishes — and does not

A successful `verifyBuyVoidCustodySecondControlSignatureV1` establishes
only:

```text
signature_cryptographically_verified=true
```

The *same* result explicitly retains:

```text
caller_key_pin_independently_authenticated=false
distinct_approving_principal_authenticated=false
replay_prevention_proven=false
approved_second_control_proven=false
host_execution_authorized=false
storage_mutation_authorized=false
rollback_test_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
funds_movement=false
```

**A matching public-key fingerprint supplied by the same untrusted caller
is not a trust anchor.** A compromised callback could create its own
keypair, its own matching allowed-key pin, and a mathematically valid
signature. The proof explicitly exercises that possibility and requires
all independent-trust and economic authority flags to remain false.

Even two different Ed25519 keys need not correspond to two distinct
people, machines, or independent approving organizations. A future
source-authenticated, independently approved root-of-trust policy must
bind the approver's actual public key and authority, key rotation and
revocation, accepted operation lifetime and expiry, identity/role
separation, physical custody, one-time durable claim/lease and replay
rejection. **Do not feed arbitrary pin fields from the callback into a
production verifier** and then label the result authorized.

## Fixture-only proof

GitHub Actions generates **ephemeral, in-memory synthetic Ed25519 keys**
to sign disposable fake data. They are not the VOIDKEY2 USB, Nimo release
root, live wallet/validator keys or any persistent user credential. No
fixture key is exported or saved. The tests reject forged signatures,
altered signed bodies, V1/foreign IDs, ten different foreign V2 operation
contexts, invalid key algorithms, invalid base64, equal operator/approver
pin declarations, and proxy/accessor invocation.

No existing V2 controller file or plan is modified. This helper is
**not** wired into `obtain_second_control_approval`, because wiring
without a separately authenticated approver key/root and actual protected
adapter would invent authority.

**Next gate:** genuinely independent review of the V2 plan/controller
and this verifier, then a separately authorized immutable trusted approver
root/role policy with secure rotation/revocation, and a fail-closed
protected-host signature, replay and physical-custody adapter.

PROTECT THE CORE.
