# VOID participant onboarding

<!-- VOID_PUBLIC_PARTICIPANT_ONBOARDING_CURRENT_STATE_V3 -->

This guide explains what a participant can do now and which actions remain guarded.

Open the participant application at:

```text
/app/
```

## 1. Understand the capability labels

VOID uses four practical states:

- **Live** — usable within the documented boundary.
- **Bounded pilot** — real, but capped or coordinator-gated.
- **Guarded** — requires explicit trusted action.
- **Planned** — not yet available.

See the [current capability matrix](current-capability-matrix.md).

## 2. Clone, prepare, and run a node

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
./run-void-node.sh prepare
./run-void-node.sh run
```

The launcher creates a node identity only. It does not create a wallet,
validator-stake signer, treasury key, or operator-authority key.

In a second terminal, run the unified participant check:

```bash
./void-participant.sh onboard
```

See [public earning and validator-candidate onboarding v1](public-earn-validator-onboarding-v1.md).

## 3. Keep wallet custody local

Wallet material must remain local to the participant.

- Never share a private key or seed phrase.
- Never upload a wallet file to a support ticket.
- Never paste secrets into chat, Discord, Reddit, GitHub, `.env`, or a public receipt.
- Confirm network, chain ID, contract, amount, and fee before signing.

VOID does not provide a public custodial signer.

## 4. Earn Work Credits

Work Credits account for useful, verifiable work. Current earning is bounded,
coordinator-issued, receipt-verified, capped, and duplicate-protected.

Configure the trusted coordinator values in `.env`:

```text
VOID_PARTICIPANT_ACCOUNT=
VOID_PUBLIC_EARN_COORDINATOR_BASE=
VOID_PUBLIC_EARN_COORDINATOR_NODE_ID=
```

Then use:

```bash
./void-participant.sh earn-status
./void-participant.sh earn
```

The default path reuses the existing Public Earn no-node client, so a person who
has downloaded a full node can earn without exposing the node or enabling an
inbound executor. A compatible local executor may instead consume a trusted
ticket file through `--earn-mode local-executor`.

The flow is:

1. A coordinator offers a capability-bound ticket.
2. The participant executes the specified bounded task.
3. The participant produces a signed result receipt.
4. The coordinator verifies ticket, result, and execution identity.
5. Duplicate and cap checks run.
6. The canonical participant account receives the ticket-defined WC award.

There is no public generic-credit route and no permissionless WC settlement.
The policy conversion remains `100 WC : 1 VOID`, but settlement is a separate
authorized process.

## 5. Observer validation

A running participant node can independently check readiness, peer visibility,
and the latest block:

```bash
./void-participant.sh node-check
```

A green observer result proves that the local node can inspect public chain
state. It does not mean the wallet is registered or the node is in the active
consensus set.

## 6. Validator candidacy

The locked Mainnet-0 candidate minimum is **10,000 VOID**.

Configure only public candidate values:

```text
VOID_CHAIN_RPC=
VOID_VALIDATOR_CANDIDATE_REGISTRY=
VOID_VALIDATOR_OWNER=
VOID_VALIDATOR_REWARD=
VOID_VALIDATOR_PUBLIC_ENDPOINT=
VOID_VALIDATOR_P2P_MULTIADDR=
```

Prepare a self-custodied unsigned registration packet:

```bash
./void-participant.sh candidate-packet
```

The tool verifies chain ID `2050`, registry bytecode, the exact 10,000 VOID
minimum, participant balance, node identity, and exact
`registerCandidate(...)` calldata. It never accepts a wallet key.

A successful participant-signed registration creates **Candidate** state only.
Candidate-to-Waiting and Waiting-to-Active transitions are separate authority
actions and are never automatic. Active registry state still requires runtime,
epoch, peer, and consensus proof.

Verify the public record with:

```bash
./void-participant.sh candidate-verify
```

The repository currently contains the contract and proofs, but candidate
submission remains blocked until a reviewed public registry address and RPC are
published. The tool fails closed rather than inventing an address.

## 7. Use DataNet

Participants can publish, read, verify, mirror, pin, and review DataNet objects
within the available local or authorized path. Public-node evidence remains
read-only and grants no generic write authority.

## 8. Buy and settlement boundaries

Buy VOID fulfillment remains payment-verified and explicitly authorized. Do not
send blind deposits, exchange withdrawals, custodial sends, or funds based only
on a direct message.

WC-to-VOID settlement is not a permissionless public route. It requires account,
capacity, authorization, and transaction evidence.

## 9. Verify before trusting

Verify exact claims through public proofs and receipts:

- node readiness and peers;
- latest block visibility;
- DataNet object identity;
- Work Credit ticket and receipt status;
- candidate registry state and stake;
- transaction references;
- operator evidence checksums; and
- signed attestations.

A page, receipt, candidate record, or signature has only the authority described
by its schema and verification policy.

## Need help?

- [Start here](start-here.md)
- [Current public status](mainnet0-current-public-status.md)
- [Public earn and validator onboarding](public-earn-validator-onboarding-v1.md)
- [Support guide](../../SUPPORT.md)
- [Security policy](../../SECURITY.md)
