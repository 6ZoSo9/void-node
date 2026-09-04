# Chain-2050 / DataNet anchor-of-truth boundary v1

Marker: `VOID_CHAIN2050_DATANET_ANCHOR_BOUNDARY_V1`

Status: source-backed design and evidence packet; unapproved; source-only.

## Purpose

This packet turns `VOID_COORDINATION_CONTROL_PLANE_V510` into one compact,
reviewable contract.

The central rule is:

> Chain-2050 and the source payment chains own finalized truth. DataNet owns
> availability of the bytes referenced by that truth. Local indexes and journals
> are bounded pre-finalization aids or rebuildable caches; they are not a second
> ledger.

This packet does not modify `#1352` or `#1314`. It does not assign a source
owner, activate the presale, deploy a service, access a wallet or signer, or
move funds.

## Source generation

- repository: `6ZoSo9/void-node`
- source commit inspected: `13e8fdbe6b7bdc933e171770cac3c626566f6ed6`
- coordination issue: `#1301`
- coordination marker: `VOID_COORDINATION_CONTROL_PLANE_V510`
- machine-readable packet:
  `fixtures/architecture/chain2050-datanet-anchor-boundary-v1.json`
- closed schema:
  `schemas/chain2050-datanet-anchor-boundary-v1.schema.json`
- executable proof:
  `scripts/prove_chain2050_datanet_anchor_boundary_v1.mjs`
- dual-rail execution proof:
  `scripts/prove_buy_void_dual_usdc_rails_v1.ts`

The machine-readable packet binds the relevant source files by Git blob SHA-1.
A source change therefore invalidates the packet until the affected claim is
reviewed and rebound.

## Presale payment rails

The presale requirement is two USDC rails:

1. Base USDC
2. Ethereum USDC

These are separate source-chain namespaces. Their canonical payment identity is
not merely a transaction hash. Current source derives:

```text
voidpay1:<normalized-source-chain>:<transaction-hash>:<log-index>
```

The chain and log index are required because transaction hashes alone do not
identify one event across every rail or every multi-transfer receipt.

Current source supports a policy map keyed by chain for:

- allowed chains;
- required confirmations;
- USDC contract;
- receiving address; and
- exact payment admission.

The existing proof fixture already declares both `base` and `ethereum`.
The new dual-rail proof executes both paths rather than merely carrying
Ethereum as an unused policy entry.

This is source support, not live activation. Real token contracts, receiver
addresses, RPC endpoints, finality policy, credentials, and funding remain
separate production gates.

The reviewed economics remain:

```text
finite presale cap = 10,000,000 VOID
rate               = 2 VOID per 1 USDC
price              = $0.50 per VOID
exact payment      = required
one payment reuse  = forbidden
payment confirmed  != fulfillment completed
```

## CHAIN_OWNS

### Source payment identity

After the applicable source-chain confirmation/finality rule is met, the source
payment chain owns the payment event:

- source chain;
- transaction hash;
- log index;
- token contract;
- sender;
- receiver;
- amount;
- block identity; and
- confirmation/finality evidence.

Local state may cache or index those facts. It may not redefine them.

### Chain-2050 delivery receipt

Current source can query Chain-2050 with the read-only methods:

- `eth_chainId`
- `eth_getTransactionReceipt`
- `eth_blockNumber`

The reconciler verifies an exact VOID token transfer, including token contract,
fulfillment wallet, recipient, amount, transaction status, block identity, and
confirmation count. It re-reads the receipt before accepting the observation.

This makes the Chain-2050 receipt the source of delivery-observation truth. A
local “fulfilled” record is only a projection of that receipt.

### Current on-chain gaps

Two required correlations are not proven on-chain by current source.

#### Payment-to-fulfillment binding

Current delivery construction calls ordinary ERC-20:

```text
transfer(deliveryAddress, tokenAmountAtoms)
```

That calldata does not carry the Base/Ethereum payment identity. Current code
joins the payment intent and delivery receipt locally.

Therefore current Chain-2050 state can prove that a VOID transfer occurred, but
not by itself that:

```text
this exact source-chain payment -> this exact VOID fulfillment
```

Until a reviewed on-chain fulfillment anchor exists, one small bounded
cross-chain correlation record remains necessary.

A target anchor should be deterministic and one-shot, keyed by a digest of the
canonical payment identity. It should bind at least:

- payment rail;
- payment transaction hash;
- payment log index;
- delivery account;
- VOID amount; and
- a unique fulfilled terminal.

The exact contract/event/state design is a later sensitive source decision. This
packet does not create or authorize it.

#### DataNet object commitment

Current field-object tooling creates `sha256:<digest>` identities and verifies
retrieved bytes against the expected digest. That is useful content addressing,
but current inspected source does not prove a finalized Chain-2050 commitment
for the object or manifest.

Until that anchor exists, the digest is an off-chain integrity identifier, not a
finalized on-chain ownership/version statement.

## DATANET_OWNS

DataNet owns availability, not canonical economic or governance truth.

Its responsibilities are:

- retain payload bytes;
- retain enough independent replicas;
- advertise bounded retrieval routes;
- retrieve from surviving peers;
- verify exact bytes against accepted commitments;
- reject stale, malformed, oversized, or forged responses;
- repair missing replicas with verified bytes;
- preserve content-addressed manifests;
- publish local generations failure-atomically;
- recover owned incomplete generations after crash;
- preserve foreign replacements;
- compact without changing accepted object identity; and
- expose truthful availability status.

A chain hash proves what bytes are expected. It does not prove that any peer
still has those bytes.

Accordingly:

```text
chain object exists + no verified replica = canonical truth present,
                                          availability failure

verified replica + no accepted chain anchor = bytes present,
                                              canonical status unknown
```

Neither condition may be misreported as full success.

## LOCAL_STATE_REQUIRED

Only four classes of local state remain justified.

### 1. Unfinalized cross-chain fulfillment correlation

Current Chain-2050 transfer calldata does not include the source payment
identity. A bounded exact-identity record may bridge that gap until both chains
are accepted under their finality policies and an on-chain correlation anchor
exists.

This state must never override either chain.

### 2. Broadcast-unknown and nonce custody

A broadcaster may submit a transaction and lose the response. Blind retry can
duplicate effects or collide on nonce state.

A bounded unfinished-operation record may preserve:

- exact signed transaction hash;
- nonce;
- expected recipient and amount;
- submission identity;
- broadcast-unknown terminal; and
- reconciliation state.

It retires only after the exact transaction is proven finalized or definitively
not broadcast.

### 3. DataNet replica index

Peer/object indexes accelerate lookup and repair. They are disposable.

After loss, rebuild them from accepted object commitments and verified peer
inventory. The index does not define ownership, version, payment, or
fulfillment.

### 4. DataNet local publication intent

Failure-atomic byte publication still needs bounded local recovery state.
Recovery must identify exact owned generations and preserve foreign
replacements.

## V4_RETAIN_DELETE

The previous broker design mixed durable byte custody with a complete local
economic ledger. V510 separates those concerns.

### Retain

Retain these mechanisms where they protect bytes or unfinished operations:

- failure-atomic publication;
- create-only/no-replace publication;
- exact-byte verify-to-use coupling;
- foreign-generation preservation;
- content-addressed manifests;
- bounded unfinished-operation recovery;
- crash-ordered durable roots when a compact local availability checkpoint
  actually needs them;
- stale-peer and stale-generation fencing; and
- explicit resource limits.

### Delete from the presale critical path

Delete these assumptions:

- local authority over finalized source payments;
- local authority over finalized Chain-2050 deliveries;
- local public status that can contradict the chains;
- replaying a full local economic history to recover finalized truth;
- the V4 22-petabyte theoretical local economic archive;
- one local record for every possible minimum-unit payment over the entire
  presale domain; and
- dedicated process/UID complexity whose only purpose was protecting the
  redundant local ledger.

### Conditional

The following survive only with a specific reviewed justification:

- dedicated role UIDs and strict kernel controls;
- a paired A/B root selector;
- cross-chain payment-to-fulfillment correlation records; and
- pre-finalization WAL state.

Each retained mechanism must name the exact byte-custody or unfinished-operation
hazard it closes.

## Finality boundary

Confirmation count and finality are related but not identical.

Current payment and delivery code can enforce configurable confirmation
thresholds and revalidate receipts. Mainnet-0 documentation also treats accepted
checkpoints as operator-recognized canonical reference points.

The repository’s current “live canonical chain-state finality API” boundary is
still a helper/response-file boundary. Its own documentation says it is not:

- an actual live HTTP route call;
- fork choice; or
- peer quorum.

Therefore this packet sets:

```text
hard_finality_route_live = false
fork_choice_bound        = false
peer_quorum_bound        = false
```

No component may silently promote “N confirmations” to stronger finality than
the reviewed policy provides.

## Restart and reconstruction algorithm

1. Query the source payment chain using chain, transaction hash, and log index.
2. Apply the configured rail confirmation/finality rule.
3. Query Chain-2050 for the exact delivery transaction and transfer.
4. Apply Chain-2050 confirmation plus accepted-checkpoint/finality policy.
5. Until an on-chain correlation anchor exists, consult only the bounded
   unresolved correlation record.
6. Rebuild disposable DataNet object and replica indexes.
7. Request payload bytes from surviving peers.
8. Hash the exact received bytes before admitting them.
9. Accept only bytes matching the accepted object/manifest commitment.
10. Create-only publish replacement replicas.
11. Report truth and availability separately.

A local disk loss must not change finalized chain truth. A total replica loss
must not be hidden merely because a digest remains on-chain.

## Nimo designated-host evidence

On 2026-09-03, an operator-captured disposable probe on Nimo, Ubuntu/ext4 with
4096-byte blocks, passed 11 of 11 tested primitives:

- `O_TMPFILE`
- anonymous-inode write and `fsync`
- proc-fd create-only publication
- exact published inode identity
- directory `fsync`
- foreign-destination preservation
- `AF_UNIX SOCK_SEQPACKET`
- `SO_PEERCRED`
- `SCM_RIGHTS`
- `memfd`
- `pidfd_open`

This supports the low-level local publication design.

It does not prove the strict V4 process-isolation profile. The captured host had
ordinary operator defaults rather than the old proposed `ptrace_scope=3`,
`fs_suid_dumpable=0`, hidden procfs, and disabled core handling.

The evidence is operator-attested and not cryptographically authenticated. It
must not be promoted beyond the exact primitive boundary.

## Acceptance gates

A successor design is not source-ready until all of these are independently
green:

1. exact source bindings;
2. executable Base USDC and Ethereum USDC proof;
3. explicit chain facts and explicit on-chain gaps;
4. no local override of finalized chain truth;
5. no confusion of a chain hash with byte availability;
6. on-chain payment-to-fulfillment correlation or a reviewed bounded interim
   record;
7. exact Chain-2050 finality rule;
8. DataNet retention, retrieval, partition, stale-peer, and repair proofs;
9. disposable-index loss and rebuild proof; and
10. independent review on the exact generation.

## Authority boundary

This packet is source-only evidence.

It authorizes none of the following:

- assignment of the `#1352` source owner;
- ready-for-review or merge;
- deployment or service restart;
- production configuration;
- credential, private-key, wallet, or signer access;
- transaction construction, signing, or broadcast;
- inventory funding;
- validator or Work Credit mutation;
- treasury, liquidity, or funds movement; or
- public presale activation.
