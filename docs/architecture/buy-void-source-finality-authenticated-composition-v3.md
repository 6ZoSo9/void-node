# Buy VOID authenticated source-finality composition V3

## Purpose

This source-only successor closes two remaining source-finality composition seams above #1471/#1472:

1. production composition must not trust an arbitrary injected transport object; and
2. the full multi-RPC finality observation/recheck sequence needs one absolute total deadline rather than only independent per-call timeouts.

The V3 composition creates its own read-only HTTP transport from the server-controlled source-finality policy, privately registers that transport as module-owned, passes it directly into the exact #1471 observation function, and immediately feeds the resulting exact observation into #1472.

No caller-supplied transport or caller-supplied finalized-payment/finality object enters the composition function.

## Exact stack

- current repository main after #1472 merge: `5659e9246c32833ee75e844e883b284369b71d44`
- #1471 exact source-finality adapter semantic generation: `036c34a479d8dacbfd663fcb610adabbd0008428`
- #1472 repaired authority semantic generation: `70a12eeb30c5beb2f05e789bab9e75b57cc50e4d`
- #1472 final proof-only head before merge: `f7fb86e80d6c3d1444081348cfd20ee911fa303b`

The V3 source pins the semantic #1471/#1472 source generations and current #1471 success-path RPC count of ten. The later #1472 proof-only commit is preserved in stack history but is not substituted for the semantic source-generation identity.

## Module-owned transport identity

The composition accepts only:

```text
request
policy.source_finality_policy
policy.authority_policy_generation
policy.total_timeout_ms
```

There is no `transport` input.

The module constructs the HTTP transport itself from the source-finality policy and records the exact transport object in a module-private `WeakMap`. The successful result is permitted to set:

```text
authenticated_transport_identity_verified=true
observation_generated_in_composition=true
```

only after the same module-owned transport produces the #1471 observation and the resulting chain/RPC identity agrees with the transport metadata.

Here `authenticated_transport_identity_verified=true` has a narrow in-process meaning: the transport object was created by this module from the exact admitted server-controlled RPC URL/fingerprint/identity. It is **not** a claim that the remote RPC company/provider has a separately authenticated legal or cryptographic identity.

Therefore the result also hard-codes:

```text
remote_provider_identity_verified=false
```

## URL and RPC boundary

The V3 transport preserves the existing public observer boundary:

- HTTPS is accepted for non-loopback endpoints;
- HTTP is accepted only for `127.0.0.1`, `::1`, or `localhost`;
- URL credentials and fragments are forbidden;
- the normalized URL SHA-256 must exactly equal the configured `rpc_url_fingerprint_sha256`;
- the RPC allowlist is exactly:
  - `eth_chainId`
  - `eth_getTransactionReceipt`
  - `eth_blockNumber`
  - `eth_getBlockByNumber`
- response bytes remain bounded to at most 1 MiB;
- redirects are not followed by this transport;
- no write/sign/broadcast method exists.

## One total operation deadline

The source-finality policy may retain its bounded per-request timeout, but V3 additionally requires:

```text
total_timeout_ms > 0
total_timeout_ms <= 120000
```

A monotonic deadline is established before the first RPC call. Before every call, the transport checks remaining time. The current in-flight HTTP request also receives an independent hard timer equal to the remaining total operation budget. When the total deadline expires, that request is destroyed; the sequence cannot continue merely because individual socket activity remains alive.

After #1471 returns and again after the #1472 projection is built, the composition rechecks the same monotonic deadline before returning success.

A deadline breach returns:

```text
source_finality_total_deadline_exceeded
```

and cannot become a successful authority result.

The current exact #1471 successful sequence is also bound to exactly ten RPC calls. A different call count fails closed and requires a new reviewed source generation.

## Result boundary

A successful V3 projection preserves the exact #1472 payment/finality/hash fields and adds:

```text
authenticated_transport_identity_verified=true
remote_provider_identity_verified=false
total_operation_deadline_verified=true
observation_generated_in_composition=true
source_generation_verified=false
production_source_finality_authority_ready=false
total_timeout_ms
expected_rpc_call_count=10
observed_rpc_call_count=10
transport_identity_sha256
composition_policy_sha256
```

`transport_identity_sha256` binds the module-owned transport origin, source chain, EVM chain ID, configured RPC identity, and normalized RPC URL fingerprint.

`composition_policy_sha256` additionally binds the total timeout, expected #1471/#1472 semantic-generation tuple, transport identity digest, and #1472 stable-policy digest.

## Remaining negative truth

V3 deliberately does not turn the source-finality stack into final production authority. It retains:

```text
source_generation_verified=false
remote_provider_identity_verified=false
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

`source_generation_verified=false` means this source stack still does not cryptographically attest the deployed artifact/commit at runtime. Direct in-process composition prevents caller assembly of the #1471 observation, but artifact provenance remains a separate release/integration boundary.

`remote_provider_identity_verified=false` means URL/TLS/config binding is not independent provider identity or provider quorum.

Ancestry/provider-quorum requirements remain dependent on the selected production finality threat model.

## Proof boundary

The focused proof uses only an ephemeral loopback JSON-RPC harness. It executes no Base or Ethereum RPC.

It proves:

- a module-owned transport completes the exact ten-call #1471 sequence;
- the resulting observation is directly consumed by #1472;
- transport identity and total-deadline flags become true only in that composition path;
- a cumulative slow multi-call sequence exceeds the one total deadline and fails;
- a forged RPC URL fingerprint fails before any network call;
- caller transport injection is rejected by the closed top-level input;
- unknown source-finality policy fields fail before network;
- the total timeout has a finite hard maximum;
- transport/composition digests are bound; and
- wallet, signer, transaction, inventory, Chain-2050 and money authority remain absent.

The dedicated workflow also preserves the repaired #1472 proof, including malformed rail-order rejection, before repository build acceptance.

## Authority boundary

This PR is source/proof/docs/CI only. It does not execute live Base/Ethereum RPC, mount runtime, deploy/restart a service, access credentials/keys/wallets/signers, construct/sign/broadcast transactions, reserve or fund inventory, mutate Chain-2050, activate the public presale, mutate validators/Work Credits, or move funds.

Refs #1301 #1463 #1465 #1469 #1470 #1471 #1472.
