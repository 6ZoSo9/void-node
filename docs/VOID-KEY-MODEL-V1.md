# VOID Network – Key & Governance Model (v1)

## Roles

- **MasterKey (Tier 0)**: controls AdminGate/UpdateGate/ConfigGate. Used only for protocol
  upgrades and critical config. Stored offline. If offline, the chain keeps running.
- **Operator Keys (Tier 1)**: own deployer roles and ops-level admin where needed.
  Rotatable by the MasterKey.
- **Validator / Node Keys (Tier 2)**: live on each node. Used only for consensus/block
  signing. Each operator stores them locally. If compromised, the damage is local to that
  validator, not the entire network.
- **User Keys**: normal wallet keys. Deploy and interact with smart contracts. Never gated
  by the MasterKey.

## Decentralization guarantees

- Validators run independently. The network continues to produce blocks even if the
  MasterKey is unplugged and offline.
- The MasterKey cannot remotely shut down nodes or confiscate balances. It steers
  protocol *version* via UpdateGate, not history or balances.
- Any node operator can refuse a protocol upgrade and fork away; the “canonical” VOID
  chain is defined socially (by what most operators, users, and infra follow), not by
  a kill switch.

## MasterKey power

- May:
  - Update protocol version and manifest hash in UpdateGate.
  - Adjust protocol configuration via ConfigGate.
  - Rotate operator / governance keys and validator control keys.
- May NOT:
  - Bypass the max supply cap of VOID.
  - Arbitrarily seize user funds in VoidToken.
  - Prevent honest validators from producing valid blocks under the current rules.

## Node keys

- Each validator node has its own key stored on that machine only.
- These keys are not part of the repo and are never committed.
- Losing or rotating a node key affects that validator only; the chain and other validators
  continue unaffected.

## Philosophy

- VOID is decentralized at the consensus and data layer.
- Governance is opinionated and upgrade-driven: protocol evolution follows the MasterKey
  (you + core maintainers), not DAO votes.
- Community and DAOs may advise and signal, but final protocol activation flows through
  UpdateGate and the MasterKey.
