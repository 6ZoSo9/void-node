# Participant role-authority session integration v1

Marker:
`VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_INTEGRATION_V1_PROOF_GREEN`

## Outcome

Binds the merged Chain-2050 participant role-authority guard into the existing
participant session/Wallet/Earn path without creating another session
implementation.

## Public session rule

The lower-level read-session primitive retains its legacy unmounted test mode,
but the public session HTTP contract now **requires** a role-authority adapter.

Therefore no public bearer session can be issued through the reviewed HTTP
surface without role authority.

## Signed identity

Role-aware challenges include explicit:

- `identity_id`;
- `account`; and
- the existing challenge id, nonce, expiry and capability.

The role-aware signing domain is:

`VOID_PUBLIC_PARTICIPANT_READ_SESSION_ROLE_LOGIN_V1`

The identity is part of the signed bytes. Substituting identity after signing
fails authentication.

No account-to-identity inference is introduced.

## Login admission

After Ed25519 signature verification and before bearer-session issuance:

1. the current account-to-login-key binding is re-read;
2. its Ed25519 public key is exported as canonical public JWK;
3. the role adapter recomputes the exact
   `identity_id + account_id + Ed25519 JWK` subject binding;
4. current Chain-2050 role authority must be active `AGENT`; and
5. the exact role admission object is captured in the session.

Role-source errors and mismatches collapse to the existing coarse public
authentication failure.

## Protected-read revalidation

Before Wallet/Earn source access, authorization:

1. revalidates the bearer token and exact account;
2. re-reads the current login-key binding;
3. rebuilds the explicit identity/account/current-key subject;
4. revalidates the captured Chain-2050 role admission; and
5. requires the same role generation and record hash.

The account-read projection refuses an authorization result unless it carries
`role_authority_revalidated=true` and `role="AGENT"`.

A revoked or changed role therefore fails before any Wallet/Earn source fetch.

## Production activation hold

The existing public composition gateway currently creates the session HTTP
contract without a live role-authority adapter.

Because the HTTP constructor now requires that adapter, setting the participant
composition activation flag before the live Chain-2050 adapter is wired fails
closed at startup.

This is intentional.

## Authority boundary

No live Chain-2050 observer is added here. No contract deployment, Chain-2050
write, registry append, service restart, runtime activation, Wallet secret,
signer, transaction, Work Credit mutation, validator mutation or funds action
is performed.

## Next gate

The next source gate is a read-only live Chain-2050 role-authority observer that
constructs the exact reviewed role source/binding descriptor for the public
composition gateway. Only after that observer is independently proven should a
separate Precision activation/restart/rollback gate be considered.
