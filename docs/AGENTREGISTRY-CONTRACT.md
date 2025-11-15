# VOID Network – AgentRegistry Contract Spec (v1)

AgentRegistry is the on-chain registry for VOID agents (wallet agents, relayers, AI workers).

- Tracks: owner, metaHash, active, trusted.
- Anyone can register an agent (subject to basic checks).
- Owners can update their own agent metadata and active flag.
- Governance/master can flip the trusted flag and override active in emergencies.
- Off-chain infra reads this registry; no AI or jobs execute on-chain here.

This is a v1 stub spec; the solidity + tests (`AgentRegistry.t.sol`) are the
authoritative behavior until we expand this document further.
