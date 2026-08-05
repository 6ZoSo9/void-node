# Public earning and validator-candidate onboarding v1

Marker: `VOID_PUBLIC_EARN_VALIDATOR_ONBOARDING_V1`

This is the one-command participant path for a person who has downloaded a
VOID node and wants to:

1. prove that the local node is healthy enough for read-only observer
   validation;
2. use the existing bounded Work Credit earning client;
3. prepare a self-custodied validator-candidate registration; and
4. verify candidate, waiting, or active registry state without giving VOID a
   wallet key.

The command does **not** turn a download into an active consensus validator.
Active admission remains a separate explicit process.

## What is available

| Capability | Current result |
|---|---|
| Run and inspect a local VOID node | Available |
| Verify readiness, latest block, and peer visibility | Available |
| Earn from a coordinator-issued bounded ticket | Available when a ticket is offered |
| Prepare a validator-candidate wallet transaction | Available when a reviewed candidate registry is deployed and configured |
| Register with exactly 10,000 VOID | Participant-signed transaction only |
| Move Candidate to Waiting | Registry-authority action; not automatic |
| Move Waiting to Active | Separate capped activation; not automatic |
| Enable consensus duties on the participant node | Separate runtime proof and activation |

## Prepare the download

From the repository or verified release directory:

```bash
./run-void-node.sh prepare
```

Run the node in one terminal:

```bash
./run-void-node.sh run
```

In a second terminal, run the combined readiness command:

```bash
./void-participant.sh onboard
```

The command creates a mode-600 report below:

```text
~/.local/state/void/public-earn-validator-onboarding-v1/
```

It checks the local health, readiness, peer, and latest-block surfaces. A green
observer check means the node can independently inspect current public chain
state. It is not a claim that the account is in the active consensus set.

## Configure earning

Obtain these values from the trusted Public Earn coordinator:

- participant account ID;
- exact HTTPS gateway origin;
- exact lowercase coordinator node ID.

Add them to the local `.env`, or pass them on the command line:

```text
VOID_PARTICIPANT_ACCOUNT=
VOID_PUBLIC_EARN_COORDINATOR_BASE=
VOID_PUBLIC_EARN_COORDINATOR_NODE_ID=
```

Check ticket availability:

```bash
./void-participant.sh earn-status
```

Run one coordinator-selected ticket:

```bash
./void-participant.sh earn
```

The default path reuses the existing no-node earning client even when a full
node is installed. It generates a separate local Ed25519 execution identity and
never asks for a wallet. The coordinator chooses the bounded task and credits
WC only after verifying the signed result and canonical accounting change.

A participant who has a trusted ticket file and a compatible local executor may
instead use:

```bash
./void-participant.sh earn \
  --earn-mode local-executor \
  --ticket-file "$HOME/Downloads/void-wc-ticket.json" \
  --coordinator-base https://public-void-gateway.example \
  --coordinator-node-id 0123456789abcdef0123456789abcdef
```

Current pilot awards and caps remain whatever the coordinator-issued ticket and
existing proof-gated client specify. This onboarding lane does not create a
generic-credit route and cannot directly write WC.

## Configure validator candidacy

The candidate registry contract enforces a minimum of **10,000 VOID**. The
participant must control the candidate wallet and reward address.

Configure only public values:

```text
VOID_CHAIN_RPC=
VOID_VALIDATOR_CANDIDATE_REGISTRY=
VOID_VALIDATOR_OWNER=
VOID_VALIDATOR_REWARD=
VOID_VALIDATOR_PUBLIC_ENDPOINT=
VOID_VALIDATOR_P2P_MULTIADDR=
```

Never paste a private key, seed phrase, mnemonic, or wallet file into `.env`,
the onboarding command, GitHub, chat, or a support request.

Prepare the unsigned packet:

```bash
./void-participant.sh candidate-packet
```

The tool verifies:

- chain ID is exactly `2050`;
- contract bytecode exists at the configured registry address;
- `minValidatorStake()` is exactly 10,000 VOID;
- the candidate has not already registered;
- the candidate balance covers the required stake;
- the local public node identity is available;
- the encoded call is exactly
  `registerCandidate(reward, consensusKeyHash, metadataHash)`; and
- the packet contains no Waiting or Active transition.

The resulting packet is content-addressed and contains an unsigned EIP-1559
transaction request. Sign that exact transaction in the participant's own
wallet. The wallet remains outside VOID.

To submit an already signed transaction, save the raw signed transaction in a
private local file and run the explicit confirmation gate printed by the tool:

```bash
./void-participant.sh candidate-submit-signed \
  --packet ~/.local/state/void/public-earn-validator-onboarding-v1/candidate-packet-latest.json \
  --signed-transaction-file "$HOME/private/validator-candidate.signed.txt" \
  --confirm 'SUBMIT VOID VALIDATOR CANDIDATE 0xYourChecksummedAddress ON CHAIN 2050'
```

Before broadcast, the tool decodes the signed transaction and requires exact
chain, sender, contract, stake value, reward, consensus-key hash, and metadata
hash equality with the reviewed packet. It cannot sign the transaction.

## State after registration

A successful public registration begins in **Candidate state**.

It does not activate the validator and does not automatically move the entry to
Waiting. Registry authority may later move an eligible Candidate to Waiting.
A separate capped activation may later move Waiting to Active. Even an Active
registry record still requires runtime, peer, key, epoch, and consensus proof
before anyone should claim that the downloaded node is performing consensus
duties.

Check the on-chain record:

```bash
./void-participant.sh candidate-verify
```

The output distinguishes:

- `candidate` — participant registration exists;
- `waiting` — admitted to the waiting pool;
- `active` — registry marks active, but runtime consensus proof is still
  required; and
- `none` — no registration exists for the configured owner.

## One-command combined run

After the trusted earning and candidate values are configured:

```bash
./void-participant.sh onboard --earn-now true
```

This checks the node, runs one available bounded earning ticket, and prepares a
candidate packet when the registry configuration is complete. It does not sign
or broadcast a validator transaction, move a candidate to Waiting, activate a
validator, restart a service, settle WC to VOID, access a wallet, or move funds.

## Current deployment boundary

The source contract and local proofs exist, but a public candidate-registry
address must be separately deployed, reviewed, and published before candidate
submission can be live. When no reviewed address is configured, the command
returns `candidate_registry_configuration_missing` or
`candidate_registry_not_deployed` instead of inventing an address.

## Proof

```bash
npm run participant:onboard:proof
```

The proof covers deterministic packet construction, exact 10,000 VOID value,
wrong-chain and under-stake rejection, offline participant-signature checking,
observer-node checks, no automatic Candidate-to-Waiting or Waiting-to-Active
transition, and the absence of any private-key input.
