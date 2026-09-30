# Chain-2050 role-authority participant live-binding preflight v1

Marker:
`VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1`

## Purpose

Close the source-only canonical role-source binding gap behind authenticated
participant sessions without mounting the participant session routes.

The Chain-2050 role-authority registry is no longer merely source design:

- the accepted registry deployment is recorded at block `37379`;
- its deployed runtime matches the Sovereign-accepted runtime SHA-256;
- deployment ancestry/finality is covered by the verified Sovereign checkpoint;
- the first canonical `SOVEREIGN` registry append is independently reconciled
  at block `37392`.

The remaining identity-side requirement is to prove that one fresh live
read-only observer and the existing canonical registry-binding implementation
refer to exactly that accepted deployment and exact registry history.

## Accepted deployment identity

The preflight pins:

- Chain ID: `2050`
- registry address:
  `0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`
- accepted deployed runtime SHA-256:
  `b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`
- reviewed contract-source SHA-256:
  `a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6`
- live binding ID:
  `participant-role-authority-mainnet0-live-v1`

The contract-source digest is configuration lineage. Runtime identity remains
separately revalidated from `eth_getCode`.

## Historical prerequisites

The preflight reuses the existing exact verifiers for:

1. the verified deployment checkpoint-attestation evidence; and
2. the reconciled Sovereign genesis-append evidence.

A caller cannot replace those facts with a boolean summary.

The committed Sovereign genesis prefix must remain exact:

- identity: `sovereign.zoso`
- role: `SOVEREIGN`
- generation: `0`
- prior root: exact canonical empty root
- role-record SHA-256:
  `1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b`
- resulting registry root:
  `54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041`

Later valid append-only entries are not forbidden. Entry 0 must remain the
accepted genesis prefix.

## Fresh observer rule

The preflight does **not** accept a caller-supplied observer result or
function-bearing observer source.

Its closed input contains only:

- deployment checkpoint evidence;
- Sovereign genesis reconciliation evidence; and
- one scalar loopback `rpc_url`.

The preflight itself invokes
`createChain2050RoleAuthorityLiveRpcObserverV1(...)` with the fixed reviewed:

- registry address;
- accepted runtime SHA-256;
- contract-source SHA-256; and
- 12-confirmation policy.

The canonical observer then enforces:

- Chain ID 2050;
- loopback HTTP JSON-RPC only;
- non-synthetic transport;
- fixed-block observation;
- block-hash revalidation;
- runtime-code revalidation;
- terminal-state revalidation; and
- the reviewed query-contract identity.

The observation block must be at or after the reconciled Sovereign genesis
append block `37392`.

Invoking this preflight therefore performs bounded **read-only loopback RPC**.
It performs no Chain-2050 write and grants no mutation authority.

The observer remains honest about its own authority:
`deployment_verified=false` and
`production_activation_authorized=false`. Historical deployment acceptance
comes from the separate checkpoint evidence, not from the observer claiming it.

## Canonical binding rule

After constructing the canonical observer internally, the preflight invokes the
existing `createChain2050RoleAuthorityLiveRpcBindingV1` path from that observer
source and the fixed binding ID.

A caller cannot supply an `observer_result`, `binding_result`,
descriptor-bearing executable source, or other function-bearing authority
object. Any such extra input is a HOLD.

This closes executable provenance at both layers:

1. only the reviewed observer constructor may create the RPC snapshot source;
2. only the reviewed binding constructor may create
   `readCurrentRoleAuthorityRecordV1()`.

It independently recomputes:

- contract namespace SHA-256 from exact address + runtime identity; and
- complete binding-descriptor SHA-256.

The descriptor must bind the exact reviewed:

- namespace;
- contract-source identity;
- query-contract identity;
- 12-confirmation finality policy; and
- stable binding ID.

The resulting read source must identify itself as
`canonical_chain2050_role_authority`.

## Full snapshot validation is exercised

Descriptor shape alone is insufficient.

The output labels the observer result's registry count/root as
`initial_observed_registry_entry_count` and
`initial_observed_registry_root_sha256`. They are intentionally not called
"current" because the bound source performs its own fresh snapshot read after
the observer's initial observation. The later bound read proves source
usability and canonical history validation without pretending the two reads
were one atomic chain snapshot.

Before GREEN, the preflight calls:

`readCurrentRoleAuthorityRecordV1("sovereign.zoso")`

through the bound source.

That call forces the canonical provider to:

1. re-read the current contract snapshot;
2. re-check descriptor identity;
3. project the contract snapshot;
4. validate the entire append-only registry/root/transition history; and
5. return the current Sovereign record.

Therefore a later snapshot/root/history corruption fails before this preflight
can report a usable role source.

## GREEN meaning

A GREEN result may state:

- `live_chain_registry_bound=true`
- `participant_role_source_ready=true`

Those are GREEN-result facts, not standing authority flags. A held result reports
both facts false. The static authority contract only records that canonical
snapshot validation is required and that any live-binding claim is green-only.

It deliberately still states:

- `durable_participant_session_state_bound=false`
- `public_session_route_mount_authorized=false`
- `runtime_activation_authorized=false`

This lane does not depend on or modify Draft #2191. Once the durable participant
session-state work is accepted separately, a later composition lane may bind
both prerequisites and review startup/restart/rollback behavior.

## Proof coverage

The focused proof uses the committed deployment/checkpoint and genesis
evidence.

For each Node 22/24/26 leg, CI compiles the exact Solidity source with
`solc 0.8.20`, patches the reviewed immutable empty-registry root, and requires
the resulting deployed-runtime SHA-256 to equal the Sovereign-accepted runtime
identity before the proof starts.

The proof then serves those exact runtime bytes and the canonical registry state
from a local JSON-RPC fixture. The preflight must construct the real observer,
perform its fixed-block/revalidation reads, construct the real binding, and
perform the bound Sovereign read end to end.

Adversaries cover:

- mutated deployment-checkpoint evidence;
- mutated genesis reconciliation evidence;
- an observation before the genesis append;
- a changed Sovereign genesis prefix;
- a caller-supplied function-bearing observer result, rejected as an unknown
  input field;
- wrong deployed runtime bytes returned by the RPC fixture;
- non-loopback RPC configuration;
- a caller-supplied executable binding object, rejected as an unknown input
  field; and
- a snapshot whose terminal root is corrupted only after the initial observer
  read.

The last case proves that GREEN requires an actual bound-source read and full
canonical registry validation, not merely descriptor construction.

## Authority boundary

Source, proof and documentation only.

CI performs only local-fixture JSON-RPC. This PR performs no production RPC.

The preflight primitive is intentionally capable of bounded read-only loopback
Chain-2050 RPC when a later reviewed runtime invokes it. It cannot use remote
HTTP(S), cannot sign or broadcast, and cannot write Chain-2050 state.

This lane performs or authorizes no public route mount, listener, service
reload/restart, DNS/Tailscale mutation, credential/private-key access,
wallet/signer action, transaction construction/signing/broadcast, Chain-2050
write, registry append, Work Credit mutation, validator mutation, deployment,
treasury/liquidity action, or funds movement.

## Next gate

After the durable participant session-state prerequisite is independently
accepted:

`review_composition_wiring_and_restart_rollback_preflight`

That later gate must still keep real runtime activation explicit.
