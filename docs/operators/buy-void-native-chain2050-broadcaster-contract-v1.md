# Buy VOID Native Chain-2050 Broadcaster Contract v1

Marker: `VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_CONTRACT_V1`

## Current state

This contract is **Uninjected and unmounted**. It introduces no route, service configuration, signer, wallet credential, dependency assignment, runtime enablement, transaction signing, transaction broadcast, or money movement.

## Purpose

Define the first reusable production boundary for submitting an already-signed native VOID transaction to a dedicated EVM-compatible Chain ID 2050 endpoint. The broadcaster is separate from the native delivery signer and separate from the Buy VOID runtime route.

## Endpoint boundary

- Chain ID 2050 only.
- Loopback IP literals only: `127.0.0.1` or `::1`.
- Plain loopback HTTP only; TLS termination, remote URLs, DNS names, credentials in URLs, query strings, fragments, redirects, and proxy routing are forbidden.
- The port must be explicit and server-controlled.
- A read-only `eth_chainId` probe is required at construction and immediately before every broadcast attempt.
- The only mutating JSON-RPC method allowed is `eth_sendRawTransaction`.

## Signed transaction boundary

- The input must already be a valid signed EVM transaction.
- The signed transaction must declare Chain ID 2050.
- The broadcaster computes the expected transaction hash locally before contacting the endpoint.
- No signing occurs in this module.
- No wallet access occurs in this module.
- No secret access occurs in this module.
- `NODE_PRIVKEY_PATH` is outside this authority and must never be reused as a fulfillment wallet.

## Outcome boundary

- A provider success is accepted only when the returned transaction hash exactly matches the locally computed hash.
- Exact returned transaction hash binding is mandatory.
- A chain mismatch prevents `eth_sendRawTransaction` from being called.
- A provider error or ambiguous transport failure after a submission attempt is classified as possibly submitted.
- No automatic retry.
- No receipt wait.
- No reconciliation mutation.

## Persistence boundary

- No raw transaction persistence.
- No raw signed transaction output from the Buy VOID adapter.
- No filesystem read or write.
- No logs containing the raw signed transaction.
- No request-body RPC URL, signer, wallet, secret, or raw transaction override.

## Activation gates

Before this broadcaster can be injected into the native delivery runtime, all of the following remain required:

1. A dedicated loopback Chain ID 2050 endpoint exists and passes the identity probe.
2. A separate balance-capped fulfillment wallet is provisioned through a systemd credential.
3. A production dependency injector binds the signer and broadcaster without reading secrets from request bodies or source control.
4. Policy values remain server-controlled and bounded.
5. Synthetic signing and non-value test-chain broadcast proofs pass.
6. The runtime remains disabled until a separate explicit activation checkpoint.

Cold reserve, treasury, validator identity, and node runtime identity keys remain outside this contract.
