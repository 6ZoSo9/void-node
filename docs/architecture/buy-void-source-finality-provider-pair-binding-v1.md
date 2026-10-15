# Buy VOID source-finality provider-pair binding v1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1`.

Status: **dormant source/CI-only prerequisite** for a later V7 successor.

## Purpose

The current V7 quorum design can prove that two HTTPS transports are distinct,
but production authority also needs a separately reviewed operator-controlled
statement of **which two provider identities/fingerprints are approved for each
source chain**.

This contract adds that missing trust input without contacting either provider,
changing runtime configuration, installing a receipt, or granting source-finality
authority.

It deliberately does **not** claim legal provider identity. The policy binds
operator-approved logical provider identities and exact RPC URL fingerprints.

## Canonical custody path

A future operator ceremony may install exactly one canonical receipt at:

`/var/lib/void-source-finality-v7/provider-pair-binding-v1.json`

The verifier requires:

- absolute exact path;
- root-owned, non-group/world-writable canonical ancestor directories;
- a direct root:root regular file;
- mode `0444`;
- single link;
- bounded size;
- `O_NOFOLLOW` descriptor open;
- stable pre-open/open/post-read/visible file identity; and
- exact canonical JSON bytes.

No create/install primitive is included in this PR.

## Receipt contract

The content-addressed receipt binds:

- exact V7 deployment receipt ID;
- exact accepted enforcement-set SHA-256;
- one Base provider pair;
- one Ethereum provider pair;
- primary and secondary logical RPC identity for each chain;
- primary and secondary RPC URL fingerprint SHA-256 for each chain; and
- an all-false economic/runtime authority envelope.

Within each chain, primary and secondary identity **and** URL fingerprint must
both differ.

The receipt ID is:

`voidbsfpp1_<sha256(canonical receipt material)>`

## Verified-result anti-forgery boundary

Reading a structurally valid receipt is not enough for downstream authority.

Only `verifyBuyVoidSourceFinalityProviderPairBindingV1()` may create a
successful verified result, and successful results are registered in a
module-private `WeakSet`.

`assertBuyVoidSourceFinalityProviderPairVerifiedV1()` rejects:

- caller-constructed lookalikes;
- object spreads;
- `structuredClone` copies; and
- any result not created by the live root-custody verifier in this module.

A later V7 successor must call the live verifier and immediately require this
module-owned brand. Visible success booleans alone are not authority.

## Composition requirement

A production-capable V7 successor should require all of these to agree:

1. the same root-custodied deployment receipt ID;
2. the current accepted post-#2865 enforcement set;
3. the requested source chain;
4. the primary observation's RPC identity/fingerprint; and
5. the secondary observation's RPC identity/fingerprint.

This contract intentionally does not solve the separate observation-provenance
problem by itself. The V7 successor must also ensure both successful provider
observations were actually produced by the reviewed observer path rather than
caller-constructed objects.

## Authority boundary

Even a GREEN provider-pair verification reports:

```text
operator_approved_provider_pair_binding=true
same_chain_distinct_provider_identities_verified=true
same_chain_distinct_rpc_fingerprints_verified=true
legal_provider_identity_verified=false
rpc_contact=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

This PR performs no RPC call, deployment receipt installation, runtime/service
mutation, credential/key/wallet/signer operation, transaction, Chain-2050/WC
mutation, presale activation, inventory/treasury/liquidity action or funds
movement.

## Proof

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
node ./node_modules/typescript/bin/tsc -p tsconfig.build.json
node scripts/prove_buy_void_source_finality_provider_pair_binding_v1.mjs
```

The proof uses an in-memory root-custody filesystem fixture only. It does not
write `/var/lib` or contact a provider.
