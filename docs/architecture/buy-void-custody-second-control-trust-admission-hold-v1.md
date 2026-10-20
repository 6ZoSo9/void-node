# Buy VOID custody — accepted approver trust admission HOLD V1

Status: **Source-only, unconditional HOLD. No accepted live approver key or principal.**

## Why this gate is necessary

[Parent PR #3634](https://github.com/6ZoSo9/void-node/pull/3634)
defines pure detached Ed25519 signature verification for the V2 custody
noncustomer rollback second-control context. The verifier deliberately accepts
**caller-declared** approver and operator SPKI SHA-256 key fingerprints.
A caller can generate both keys, sign with one, declare their fingerprints,
and produce a mathematically valid verification response. Even unequal key
fingerprints do not establish **separate people, roles, or independently
approved trust roots**. Such a response must never become authority to
perform an irreversible rollback or take custody/financial action.

This successor defines a **separate fail-closed downstream policy boundary**
and supplies its source-only proof. This generation intentionally contains
**NO public key pin**, no selected approver identity, no accepted root
generation or real role assignment. It never reads protected host files,
performs live signing, or calls the V2 controller. There is no secret
material in the source, proof or CI artifacts.

## Exact source lineage

- Base: [Draft #3634](https://github.com/6ZoSo9/void-node/pull/3634)
  head `a91e60e33277a5bab9ef299882f0c654b9d29e00`.
- Verifier exact Git blob: `72c9c451eb8d949b61a159fc9ffa4753b0bb895a`.
- V2 controller exact Git blob: `7a42e1863f3f4d842dd59060b366901adb402848`.
- V2 plan exact Git blob: `1cdecf34117e4e890f67e62b412419d32870dfa0`.
- New source: `tools/void-buy-custody-second-control-trust-admission-hold-v1.mjs`
  (Git blob `f07701e5f89f82fbe5e97b0df1bc91deee7a9ea7`).
- New fixture proof:
  `scripts/prove_buy_void_custody_second_control_trust_admission_hold_v1.mjs`
  (Git blob `cb361599401e568c2f3a700b5c20d8052eb9eb3f`).

## Contract: accepted trust is NOT user-supplied

`UNCONFIGURED_ACCEPTED_TRUST_POLICY_V1` is frozen and requires
`trust_root_status=UNCONFIGURED`,
`accepted_trust_root_generation=null`, and
`accepted_approver_spki_sha256=null`. All other trust, role separation,
revocation, trusted-clock, durable replay, host-adapter, independent-review
and economic authorities remain false.

`assessBuyVoidCustodySecondControlTrustAdmissionHoldV1({verification})`
accepts only the exact, closed-format output of the source-only Ed25519
mathematical verifier. It rejects any unexpected field, proxy, accessor or
positive assertion of independently authenticated approver/principal,
replay, second-control approval, host execution, payment or funds authority.
It **cannot** accept a caller's alternative trust policy, key pin,
`acceptedRootId`, approval flag or trust-generation argument.

Even after receiving a mathematically valid V2-context signature, it returns
a frozen verdict:

```text
marker=VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_TRUST_ADMISSION_HOLD_V1
status=HOLD
reason=independently_accepted_approver_root_unconfigured
mathematical_signature_verification_reported=true
trusted_approver_key_pin_verified=false
independent_approver_principal_verified=false
revocation_and_expiry_verified=false
durable_replay_and_lease_proven=false
approved_second_control_proven=false
host_execution_authorized=false
rollback_test_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
funds_movement=false
```

**This is a source-design invariant, not a production verifier or live
authentication implementation.** A future accepted policy cannot be
introduced simply by filling a blank string in this version. It requires a
new, separately reviewed policy generation and verifier/admission code.

## Disposable synthetic proof

Hosted Node 22/24/26 generates ephemeral in-memory Ed25519 fixture keys
to exercise the existing detached-signature verifier. No user key,
VOIDKEY2, Nimo key, validator key or wallet key is used. It proves that:

- mathematical verification may succeed, while the trust-admission verdict
  remains `HOLD`;
- a synthetic attacker who signs with their own key and declares its matching
  approver pin still cannot obtain approval;
- fabricated positive authority flags, a caller-selected trusted root,
  changed domains/identities, unknown fields, proxies, revoked proxies,
  or property accessors cannot promote or bypass the gate; and
- the returned result is frozen, and no host or economic authority becomes
  true.

## Concrete blockers before any real accepted approver

A new independently reviewed admission generation must authenticate all of
the following **from an accepted source rather than the same untrusted
callback**: a governed trust-root key fingerprint and immutable generation,
identity and role of the distinct approving principal, separation from the
operator despite possible key-sharing, secure key rotation/revocation,
trusted request/expiry clock, durable one-time approval replay store and
exclusive operation claim/lease binding, and the signed exact context of the
V2 source, approved noncustomer rollback, host/storage generation and
physical custody. It must receive independent security review before a
separately authorized protected-host adapter is even considered.

Nothing in this PR grants approval to install a controller, access signing
keys, run a rollback, accept customer payments, open public presale/WC, or
move treasury/funds.

**PROTECT THE CORE.**
