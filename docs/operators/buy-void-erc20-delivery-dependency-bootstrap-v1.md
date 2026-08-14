# Buy VOID ERC-20 delivery dependency bootstrap v1

Marker: `VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1`

This lane composes the source-level dependency bundle required by the canonical
Buy VOID ERC-20 sign/broadcast adapter without mounting or activating it.

## Why a new composition is required

The retained native-value dependency path cannot be reused unchanged:

- the canonical asset is `VoidToken`;
- the canonical transaction targets the token contract;
- transaction value is exactly zero;
- calldata is the exact `transfer(recipient, token_amount_atoms)` payload; and
- the existing prepared-transaction custodian request contract is native-value
  specific.

This lane therefore does not reconnect the native custodian contract or the
legacy native runtime dependency injector.

## Composition boundary

`createBuyVoidErc20DeliveryDependencyBootstrapV1(...)` returns the three
dependencies required by `buy_void_delivery_sign_broadcast_adapter_v1.ts`:

1. the existing durable delivery submission guard;
2. a lazy credential-backed signer; and
3. a canonical ERC-20 Chain-2050 broadcaster whose factory performs no RPC.

Composition itself performs no filesystem write, credential read, RPC call,
signing, transaction broadcast, or money movement.

The signer returns the server-controlled expected public wallet address without
reading the credential. Only an eventual `sign_transaction(...)` call may load
the existing fixed systemd credential
`buy-void-native-fulfillment-wallet-v1`. Before that read, the wrapper
independently requires Chain 2050, type-2 EIP-1559, canonical `VoidToken`
target, zero native value, and exact positive ERC-20 `transfer(...)` calldata.
After signing it independently revalidates sender, token target, chain, nonce,
fees, zero value, and calldata.

The existing fixed credential primitive is reused only for guarded key loading
and signing; the native prepared-transaction custody contract is not reused.

## Broadcaster boundary

The ERC-20 broadcaster reuses the existing Chain-2050 broadcaster state machine
but replaces its default HTTP transport with an ERC-20 transport that enforces
both:

- socket inactivity timeout; and
- one total wall-clock deadline through complete response-body consumption.

The total deadline is not reset by slow-drip response bytes. A terminal HTTP
status or Content-Type rejection destroys the response before the caller is
settled, so clearing the deadline cannot leave a rejected slow-drip socket
alive. Once an `eth_sendRawTransaction` transport attempt begins, failures are
conservatively reported as possibly submitted for reconciliation rather than
made retry-safe. Request serialization failures are held before socket creation.
Response bytes and request size are bounded, and oversized responses are
explicitly destroyed. The response media type must be exactly
`application/json` apart from an optional parameter suffix; deceptive substring
forms such as `application/jsonp` remain rejected. The RPC URL is loopback HTTP
only, and the only methods accepted by this transport are `eth_chainId` and
`eth_sendRawTransaction`.

The broadcaster independently parses the signed transaction before delegation
and requires Chain 2050, the exact canonical token target, zero native value,
and exact positive ERC-20 transfer calldata.

Calling the returned broadcaster is value-bearing capability. This source PR
does not call it against a real node.

## Proof

The focused proof:

- creates the composition while both credential and submission-guard paths are
  absent and proves they remain absent;
- proves `get_address()` does not read the credential;
- proves the real composition succeeds without a credential file, RPC server,
  or submission-guard state directory;
- calls the signer wrapper only with a deliberately invalid nonzero-value
  transaction and proves it fails before credential access or signing;
- invokes the broadcaster only with malformed local bytes and proves rejection
  happens before any chain probe or submission;
- does not invoke a valid signing or valid broadcast path;
- proves non-serializable request parameters are held before socket creation;
- runs only read-only `eth_chainId` loopback fixtures against the built-in
  transport, requiring the total deadline to terminate a valid parameterized
  200/JSON slow drip;
- proves non-200, wrong/deceptive-Content-Type, and oversized slow-drip
  responses are rejected and their underlying connections close within the
  configured bound; and
- proves the canonical parent still reports
  `canonical_delivery_dependency_bootstrap_ready=false` and does not import
  this source module.

Existing independently reviewed signer, broadcaster, submission-guard, and
canonical adapter proofs remain the evidence for those primitives themselves.
This lane proves their safe lazy composition without performing signing or
transaction submission.

## Canonical sequencing

Merging this lane establishes a reviewed source composition only. It does not
flip canonical readiness.

A later, separate integration gate may set
`canonical_delivery_dependency_bootstrap_ready=true` only after exact-head CI
and independent review confirm that this composition is the intended canonical
dependency source. Runtime parent mounting, production credential binding,
service/runtime activation, execution enablement, inventory funding, and any
real transaction remain later independent gates.

## Authority boundary

This PR performs no deployment, service start, runtime route mount, production
credential access, signing, broadcast, treasury/liquidity action, inventory
funding, or funds movement.

The returned dependency methods are intentionally capable of durable submission
guard writes, credential reads, signing, broadcasting, and money movement **if
a later authorized runtime actually invokes them**. Source availability is not
execution authority.

`PROTECT THE CORE`
