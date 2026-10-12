# DataNet Content Commitment Publisher Credential Binding v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_CREDENTIAL_BINDING_V1`

Status: identity-only credential binding. This gate may read one fixed server-controlled systemd credential and derive its EOA address. It does not return a private key, expose a signer object, call RPC, revalidate a transaction, sign, broadcast, write Chain-2050, mutate validators/governance/Work Credits, restart services, or move funds.

## Purpose

The merged pre-sign gate deliberately stops with:

- `signer_identity_bound=false`;
- `signer_access_authorized=false`;
- `transaction_signing_authorized=false`.

This gate closes only the first of those gaps: it proves that one fixed DataNet publisher credential derives to the exact `from_address` in the pre-sign unsigned type-2 candidate.

It does **not** convert the pre-sign result into bearer signing authority.

## Fixed credential

The only accepted credential ID is:

`datanet-content-commitment-publisher-wallet-v1`

The caller supplies only the absolute systemd credentials directory. The file name is not caller-selectable.

The gate rejects:

- relative credential directories;
- path escape;
- missing files;
- symlinks;
- non-regular files;
- empty or oversized credentials;
- group/world-accessible credential files;
- owner-executable credential files;
- malformed 32-byte secp256k1 private-key text; and
- any derived address that differs from the exact candidate publisher.

The raw key is never returned. Address derivation uses `computeAddress`; no Wallet/signer object is exposed.

## Upstream admission

Before credential access, the gate checks the pre-sign result still carries the strict no-sign/no-broadcast boundary and the repaired freshness contract, including:

`pending_nonce_rechecked_after_final_preflight=true`

A forged upstream authority field therefore HOLDs before any credential read.

## Result

GREEN binds:

- Chain ID 2050;
- exact pre-sign revalidation ID;
- fixed DataNet credential ID;
- exact candidate publisher address;
- SHA-256 fingerprint of that address;
- credential file mode and size; and
- a deterministic credential-binding ID.

GREEN still sets:

- raw private-key output = false;
- signer object exposed = false;
- RPC = false;
- transaction revalidation = false;
- signing authorization = false;
- signing performed = false;
- broadcast authorization = false;
- broadcast performed = false;
- Chain-2050 write authorization = false.

## Mandatory next gate

The next gate is:

`revalidate_exact_bound_candidate_immediately_before_separate_signing_authorization`

That gate must not trust this identity binding as freshness evidence. It must reconstruct/revalidate the exact candidate again against Chain-2050 immediately before any separate signing authorization is even considered.
