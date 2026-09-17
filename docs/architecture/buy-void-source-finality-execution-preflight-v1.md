# Buy VOID source-finality execution preflight v1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1`

## Outcome

Insert the accepted source-finality stack into the live ERC-20 delivery dependency path without granting production source-finality authority, mounting a new route, deploying source, accessing a signer, broadcasting a transaction, mutating Chain-2050, changing presale inventory, or moving funds.

This lane is intentionally fail-closed. The current V4 source-finality generation remains a candidate and still reports:

```text
source_generation_verified=false
deployed_artifact_generation_verified=false
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

Therefore the production-default preflight cannot release signer or broadcaster access yet.

## Why the guard wraps dependencies

`buy_void_delivery_runtime_integration_v1.ts` injects the signer and broadcaster into `runBuyVoidErc20ExecutionCompositionV1(...)`.

The execution composition may use those dependencies during prepare/broadcast stages, but reconciliation and terminal recovery do not require them. Guarding the injected dependency methods therefore places enforcement immediately before the sensitive capability while preserving post-broadcast recovery:

- `signer.get_address()` is guarded;
- `signer.sign_transaction(...)` is guarded;
- `broadcaster.broadcast_signed_transaction(...)` is guarded;
- the preflight result is cached once per operator command; and
- a reconciliation path that never calls signer/broadcaster does not invoke the preflight merely because `apply=true`.

A preflight failure throws before the underlying dependency method is invoked. Existing execution-composition error handling then holds the command fail-closed.

## Server-controlled source-finality policy

The new preflight consumes the existing canonical presale server policy for:

- accepted source chains;
- USDC contracts;
- receive addresses;
- minimum confirmation counts; and
- canonical presale economics.

It adds only source-provider transport configuration through server environment variables:

```text
VOID_BUY_VOID_SOURCE_FINALITY_BASE_RPC_URL
VOID_BUY_VOID_SOURCE_FINALITY_BASE_RPC_IDENTITY
VOID_BUY_VOID_SOURCE_FINALITY_ETHEREUM_RPC_URL
VOID_BUY_VOID_SOURCE_FINALITY_ETHEREUM_RPC_IDENTITY
VOID_BUY_VOID_SOURCE_FINALITY_TOTAL_TIMEOUT_MS
VOID_BUY_VOID_SOURCE_FINALITY_RPC_TIMEOUT_MS          # optional
VOID_BUY_VOID_SOURCE_FINALITY_RPC_MAX_RESPONSE_BYTES  # optional
```

RPC URL fingerprints are derived by the server from normalized URLs. Caller-supplied source-finality policy, RPC URLs, fingerprints, transaction plans, private keys, mnemonics, or raw signed transactions are not accepted by the operator route.

HTTPS is required for non-loopback RPC URLs; HTTP is accepted only for loopback proof/test transports, matching V3's authenticated composition boundary. Credentials in URL userinfo and fragments are rejected.

## Request reconstruction

The preflight does not trust a caller to restate the payment being authorized. It loads the exact execution attempt and its unique fulfillment intent from the server-owned journals and reconstructs the V1 request from the persisted verification binding:

- request ID;
- source chain;
- payment transaction hash;
- receive address;
- delivery address;
- requested USDC units; and
- quoted VOID units.

The persisted 6-decimal unit integers are converted back to exact decimal strings before V4 observation. The reconstruction also rechecks instruction/binding identity fields and fails closed on ambiguity or mismatch.

## Process source identity

The preflight requires the immutable process identity already established by the checked-in live launcher:

```text
VOID_PROCESS_SOURCE_IDENTITY_MARKER=VOID_NODE_PROCESS_SOURCE_IDENTITY_V1
VOID_PROCESS_SOURCE_COMMIT=<40 hex>
VOID_PROCESS_SOURCE_TREE=<40 hex>
VOID_PROCESS_SOURCE_BRANCH=main
```

V1 validates the closed identity shape before any source-chain RPC observation. This does not relabel the process identity as a reviewed/deployed generation. The separately accepted Precision runtime receipt proved the currently running process at merged #1476, but this source-only PR does not embed that mutable runtime receipt or claim that future deployments are automatically accepted.

## Production authority truth boundary

A preflight may return `ready` only if the upstream observation simultaneously proves all of:

```text
reviewed_source_files_verified=true
authenticated_transport_identity_verified=true
total_operation_deadline_verified=true
source_generation_verified=true
deployed_artifact_generation_verified=true
ancestry_verified=true
provider_quorum_verified=true
production_source_finality_authority_ready=true
```

Current V4 cannot satisfy that set, by design. Its successful candidate result still carries false generation/ancestry/quorum/production-authority flags. #1477 therefore integrates enforcement without activating money movement.

A future authority lane must independently close those remaining truth conditions and update the production-default observer before the guard can release signer/broadcaster access.

## No runtime activation in this PR

This PR is source/CI only. It does not:

- fetch or synchronize a production checkout;
- install packages or build on a production host;
- restart, reload, enable, or edit `void-node-live.service`;
- alter runtime environment variables;
- access credentials, private keys, wallets, or signers;
- sign or broadcast transactions;
- mutate Chain-2050;
- reserve/decrement/activate presale inventory;
- change treasury/liquidity state; or
- move funds.

The existing delivery runtime remains separately controlled by its enable/configuration/dependency gates, and V4's `production_source_finality_authority_ready=false` remains authoritative until a later reviewed source-finality authority generation replaces it.
