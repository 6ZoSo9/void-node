# Start with VOID Network

<!-- VOID_PUBLIC_START_HERE_CURRENT_STATE_V2 -->

VOID Network is building a decentralized data and useful-work network for people and AI agents.

Mainnet-0 is live, but capabilities are released in layers. Public evidence does not automatically imply public mutation authority.

## Choose your path

### Explore the network

Open the public-node surface:

```text
/public-node
```

The machine-readable discovery entry is:

```text
/.well-known/void-public-node.json
```

Use the [current public status](mainnet0-current-public-status.md) and [capability matrix](current-capability-matrix.md) to distinguish live, bounded, guarded, and planned features.

### Use the participant application

Open:

```text
/app/
```

The app contains:

- Home
- Wallet
- Earn
- Data
- Buy
- Validate
- Network

A visible surface is not a promise of unrestricted execution. Wallet, settlement, fulfillment, and validator actions retain explicit gates.

See [participant onboarding](participant-onboarding.md).

### Run a node

Follow [Run a node](run-a-node.md).

A local node can:

- Join the P2P network.
- Serve block and transaction APIs.
- Expose DataNet and public-node discovery.
- Participate in read-only verification.
- Produce a public operator evidence pack.

Running a node does not automatically make it an active validator or Work Credit coordinator.

### Earn Work Credits

Current earning is a bounded pilot.

The normal flow is:

1. Receive a coordinator-issued capability ticket.
2. Execute the described useful work.
3. Produce a receipt.
4. Return the receipt for verification.
5. Receive the fixed or bounded WC award only after verification and cap checks.

There is no unrestricted public WC credit endpoint.

A full VOID node is not required for the supported one-shot participant path.
The [Public Earn No-Node Client v1](void-public-earn-no-node-client-v1.md)
creates a private local executor identity, verifies the explicitly trusted
coordinator, performs one server-selected task, and requires exact `+3 WC`
canonical accounting. Its `status` check must pass before `run`, and
coordinator availability and caps still apply.

### Review operator evidence

The one-command operator workflow creates a self-check, reviews it, builds an evidence pack, signs the exact pack, and verifies the attestation offline.

See [public-node operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md).

### Register as a validator candidate

Validator registration is candidate/waiting only. Positive readiness evidence exists, but active admission remains disabled.

See [validator registration positive-readiness public release](../validators/validator-registration-positive-readiness-public-release-v1.md).

## What is safe to do now

- Browse public node and proof surfaces.
- Verify DataNet and runtime evidence.
- Run a node.
- Use local wallet setup and explicit local signing.
- Participate in approved useful-work earning.
- Create a guided Buy VOID request.
- Submit validator candidate information through the documented guarded path.
- Create and share an operator evidence pack.

## What remains guarded

- Public signer access.
- Anonymous ledger writes.
- Unrestricted WC issuance.
- WC-to-VOID settlement.
- Buy VOID fulfillment.
- Active validator admission.
- Treasury movement.
- Private operator and mutation APIs.

## Basic safety

- Never share a private key or seed phrase.
- Never publish a wallet file or `.env`.
- Do not send blind deposits or exchange withdrawals.
- Verify the exact node, route, amount, recipient, and transaction reference.
- Treat evidence as proof of its exact claim, not as unlimited authority.

## Next documents

- [Current public status](mainnet0-current-public-status.md)
- [Current capability matrix](current-capability-matrix.md)
- [Run a node](run-a-node.md)
- [Participant onboarding](participant-onboarding.md)
- [Public docs index](README.md)
