# Buy VOID prepared-transaction custodian credential composition v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1`

Decision:

`SOURCE_ONLY_PRIVATE_CUSTODIAN_PLUS_FIXED_SYSTEMD_CREDENTIAL_SIGNER_COMPOSITION_UNSTARTED`

## Purpose

The crash-consistent Buy VOID saga can now advance through
`prepare_transaction`, but its private custodian IPC still needs a production
signer that satisfies the custodian service's idempotent `prepare_once(...)`
contract.

The repository already has a fixed systemd-credential-backed native fulfillment
wallet signer. That signer intentionally exposes only `get_address()` and
`sign_transaction(...)`.

This lane adapts that existing signer into the stronger private custodian
contract and composes it with the existing prepared-transaction custodian
service.

The composition returns the service **unstarted**.

## Credential boundary

The adapter reuses the existing fixed credential ID:

`buy-void-native-fulfillment-wallet-v1`

Private key bytes are read only by the existing systemd credential signer and
only after an actual private `prepare_once(...)` call.

Composition creation does not read the credential, construct a wallet, or sign
anything.

The caller supplies only server-controlled:

- absolute systemd credential directory;
- expected public fulfillment-wallet address;
- private custodian store directory; and
- private Unix socket path.

The signer fingerprint is a public SHA-256 derivation over the adapter domain,
fixed credential ID, and expected public wallet address. It contains no secret.

## Idempotent preparation boundary

The adapter validates the exact closed custodian preparation request and
independently verifies the deterministic custody idempotency key.

Its private idempotency state lives beneath:

`<custody_store>/credential-signer-idempotency-v1/`

That directory remains inside the same private custody security boundary.

Before credential use, the adapter durably writes the exact normalized request
intent. On the first successful signing call it independently decodes the
signed EIP-1559 transaction and binds:

- sender;
- chain ID `2050`;
- nonce;
- delivery address;
- native value;
- gas limit;
- maximum fee;
- priority fee;
- empty calldata;
- empty access list; and
- final transaction hash.

The exact raw signed transaction is then durably cached in a private `0600`
record before `prepare_once(...)` returns success.

Later duplicate calls return those exact cached bytes without reading the
credential or signing again.

## Crash window

A process can terminate after the credential signer returns but before the
signer-cache record is durable.

For the existing ethers `Wallet` credential signer, signing the same exact
type-2 transaction with the same key is byte-deterministic. The focused proof
injects this exact crash window, performs the recovery signing call, and requires
the two resulting raw signed transactions to be byte-identical before accepting
the recovered cache.

A future HSM or remote signer must provide equivalent exact-byte idempotency;
this source composition does not claim that arbitrary external signing systems
have that property.

## Custodian composition

`createBuyVoidPreparedTransactionCustodianCredentialCompositionV1(...)`:

1. validates server-controlled path/policy shape;
2. creates the lazy credential signer adapter without reading the credential;
3. places signer idempotency state beneath the private custodian store;
4. loads the existing private custodian service;
5. injects the signer and expected signer fingerprint; and
6. returns the service without calling `service.start()`.

No runtime route is mounted and no startup execution is added.

## Focused proof

Expected marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1_PROOF_GREEN`

The proof uses only a hard-coded synthetic test private key in a temporary
private credential directory. It locally starts the temporary custodian Unix
socket only inside the proof fixture.

It proves:

- composition performs no credential read or signing;
- the existing fixed systemd credential signer is reused;
- one synthetic preparation crosses the real custodian IPC;
- duplicate preparation does not read the credential again;
- restart duplicate recovery works after removing the synthetic credential;
- the injected after-sign/before-cache crash reproduces byte-identical signed
  bytes;
- signer cache files are private and live inside the custodian store;
- application IPC never exposes raw signed bytes;
- invalid idempotency fails before credential access; and
- no real RPC, broadcast, deployment, or money movement occurs.

## Authority boundary

Source, proof, documentation, and CI only.

This lane does not:

- read a production credential;
- start a production custodian service;
- mount a new runtime route;
- enable `prepare_transaction` in production;
- start the broadcaster service;
- mount `execute_prepared_transaction`;
- make live RPC calls;
- broadcast or rebroadcast a transaction;
- decrement inventory;
- close a public fulfillment;
- mutate Work Credits or validators;
- deploy or restart services; or
- move funds.

Production credential binding, service activation, transaction-preparation
apply, broadcaster-service activation, execute-action mounting, and any real
transaction submission remain separate explicit authorization gates.
