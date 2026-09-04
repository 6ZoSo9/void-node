# Buy VOID dual-rail authority isolation v1

Marker: `VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1`

Status: source/proof correction for #1463. No runtime, RPC, credential, signer,
transaction, inventory, or money authority is added.

## Defect

The first complete-set policy assigned separate `rpc_identity` and
`finality.adapter_id` fields to Base and Ethereum, but it did not require the
values to be distinct. A configuration could therefore label one shared
identity as both rail authorities while still producing a configured policy.

That contradicted the contract's claim of independent per-rail observation and
left an avoidable ambiguity in later adapter routing and evidence provenance.
Chain ID checks alone do not prove that the configured observation authorities
are distinct.

## Repair

The mandatory authority-isolation guard layered over the lower-level policy now fails closed when either pair collides:

```text
dual_rail_rpc_identity_collision
dual_rail_finality_adapter_collision
```

The guard applies both to environment-built policies and to supplied policy
objects undergoing exact validation. A later runtime integration must consume
`readBuyVoidDualRailAuthorityIsolatedPolicyV1()` or the corresponding strict
validator; the lower-level composition reader alone is not an activation gate.

Receive addresses are not required to differ because one operator may
legitimately control the same EVM address on both chains. USDC contract
addresses remain independently bound per rail but are not treated as the
identity of the RPC or finality authority.

## Executable proof

The five-case supplemental proof requires:

- the canonical distinct Base/Ethereum policy remains valid;
- a shared RPC identity yields `DUAL_RAIL_POLICY_HOLD`;
- a shared finality-adapter identity yields `DUAL_RAIL_POLICY_HOLD`;
- a supplied policy cannot collapse both authority domains after construction; and
- one operator-controlled receive address may remain common to both chains.

These cases supplement the existing 103-case dual-rail policy proof for 108
checked-in cases across the two focused surfaces.

## Authority boundary

This rule identifies configuration domains only. It performs no source-chain
RPC, does not authenticate a provider, does not establish finality, and grants
no payment, fulfillment, inventory, signer, broadcast, activation, or funds
authority.
