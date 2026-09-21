# Participant read-only session v1

Marker: `VOID_PARTICIPANT_READONLY_SESSION_V1`

Status: **source/proof only; production session issuance disabled**.

## Purpose

The public VOID App intentionally withholds account-scoped Wallet and Earn data
from anonymous visitors. This contract defines the cryptographic boundary that
can eventually reveal exactly one participant's existing read-only Wallet/Earn
views after that participant proves possession of the reviewed root identity
bound to the current canonical Chain-2050 role-authority record.

It does not weaken anonymous public-safe mode and does not activate a login
route, challenge route, cookie, browser signer, registry, wallet, or mutation.

## Subject binding

The canonical subject binding is:

```json
{
  "schema": "void.participant-subject-binding.v1",
  "chain_id": 2050,
  "identity_id": "<stable participant identity>",
  "account_id": "<one participant account>",
  "public_key_jwk": {
    "crv": "Ed25519",
    "kty": "OKP",
    "x": "<32-byte base64url-no-padding public key>"
  }
}
```

`subject_binding_sha256` is SHA-256 of `void-canonical-json/1` bytes for that
closed object.

The role-authority record must be active, have role exactly `PARTICIPANT`, and
carry that exact subject-binding digest. Account knowledge alone is never proof
of account ownership.

A subject-binding change is therefore an authorization-generation change. Key
rotation or account rebinding invalidates every session created under the prior
role-authority pair.

## Challenge and proof

A server-created challenge binds:

- Chain ID 2050;
- exact HTTPS origin;
- stable identity ID;
- exact account ID;
- exact Ed25519 public JWK;
- exact subject-binding digest;
- role `PARTICIPANT`;
- canonical issue/expiry timestamps;
- at most 60 seconds of lifetime; and
- a canonical base64url nonce with at least 16 random bytes.

The participant signs the canonical challenge object with the bound Ed25519
private key. Private-key transmission is forbidden.

Verification requires:

1. exact closed challenge/proof shapes;
2. same exact HTTPS origin;
3. current challenge lifetime;
4. canonical subject-binding reconstruction;
5. valid Ed25519 signature;
6. current canonical Chain-2050 role-authority read;
7. active exact `PARTICIPANT` role;
8. exact subject-binding digest; and
9. successful single-use challenge-nonce consumption.

The nonce is consumed only after all cryptographic and role-authority checks
succeed. Replay fails closed.

## Logical session

A successful proof can create one opaque logical session containing:

- 32-byte session ID;
- SHA-256 of an opaque bearer token, never the bearer token itself;
- exact origin;
- identity ID;
- account ID;
- subject-binding digest;
- exact `(role_authority_generation, role_record_sha256)` pair;
- issue/expiry timestamps; and
- a closed read-only capability map.

The maximum logical-session lifetime is 30 days. A future runtime may rotate
transport/session token material underneath the same participant login model,
but root-key authentication must not silently survive loss of the exact
role-authority pair.

## Per-read revalidation

Every protected Wallet/Earn read must re-read current role authority using the
session's exact pair.

The session fails closed on:

- revoke or restore generation change;
- role change;
- subject-binding change;
- authority-policy change;
- same-generation record conflict;
- source/read failure;
- session expiry;
- token mismatch;
- origin mismatch;
- account mismatch; or
- any route outside the closed allowlist.

The only session-authorized routes in v1 are:

```text
/__void/ui/wave3/wallet.json
/__void/ui/wave4/earn.json
```

The caller-supplied `account_id` must equal the session account exactly. There
is no account-directory or arbitrary-account lookup capability.

## Closed authority boundary

A v1 session has exactly these positive capabilities:

```text
wallet_read=true
earn_read=true
```

The following remain exactly false:

```text
account_enumeration
generic_private_node_read
wallet_signing
wallet_send
work_credit_mutation
validator_mutation
transaction_broadcast
money_movement
```

A participant session does not create wallet custody, unlock a wallet, sign a
transaction, send VOID, redeem/swap WC, award WC, register/activate validators,
call private RPC, or gain operator/Sovereign authority.

## Production activation hold

`VOID_PARTICIPANT_READONLY_SESSION_PRODUCTION_ACTIVE = false`.

The repository's current Chain-2050 role-authority documents explicitly state
that the live append-only participant-role registry / authoritative production
read source is not yet bound.

Therefore this source must not be used to activate:

- public challenge endpoints;
- public login/session endpoints;
- authenticated Wallet/Earn routes;
- authorization headers or session cookies; or
- browser account selection on the public composition gateway.

Activation requires a separately reviewed live provider satisfying the existing:

```text
chain2050_role_authority_registry_read_source_binding_v1
```

contract and independent runtime/deployment acceptance.

## Browser follow-up

After that identity source is live-bound, the public app may add a same-origin
login flow. The recommended runtime shape is:

1. anonymous page requests challenge for one identity/account/public key;
2. participant signs the challenge with the local root identity;
3. server verifies proof and current role authority;
4. server issues an opaque `Secure; HttpOnly; SameSite=Strict` session cookie;
5. Wallet/Earn browser code sends no raw bearer token and may request only the
   exact session account;
6. server revalidates current role authority on every account-scoped read; and
7. logout/session loss requires root-key authentication again.

Anonymous public-safe mode remains unchanged.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_participant_readonly_session_v1.ts
```

The focused proof covers valid proof/session authorization plus signature
tamper, origin mismatch, expiry, nonce replay, private-JWK rejection, wrong role,
revocation, subject-binding mismatch, token mismatch, account mismatch,
forbidden route, session expiry, and role-authority generation drift.

No live route, listener, key, wallet, signer, transaction, Work Credit
mutation, validator mutation, deployment, service restart, routing change, or
funds action occurs.
