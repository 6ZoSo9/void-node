# DataNet registry unsigned deployment input plan v1

Marker: `VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1`

Status: source-only deployment-input plan. This is **not** a signable
transaction.

## Purpose

Bind a green activation-bound deployer-resolution observation into the exact
inputs needed for the next fee/gas/funding gate, without accessing the deployer
credential or constructing a signable transaction.

The plan binds:

- private Epoch-2 activation plan and activation receipt lineage;
- activation-height continuity;
- exact read-only deployer-resolution packet;
- stable deployer nonce with no pending transaction;
- observed deployer native balance;
- canonical deployer and publisher addresses;
- genesis-zero predecessor;
- predicted CREATE contract address and confirmed vacancy;
- accepted dual-compiler contract identity;
- exact creation bytecode plus constructor ABI words; and
- deployment value of zero.

## Independent source validation

The plan validator does not trust a recomputed plan ID by itself.

It independently rechecks:

- canonical compiled identity ID;
- exact contract source SHA-256;
- exact creation-bytecode SHA-256;
- activation plan/receipt ID shapes;
- resolution-packet ID and loopback RPC fingerprint;
- observation block at or above the activation block floor;
- pending-nonce and observation-block-hash revalidation flags;
- canonical deployer and publisher;
- CREATE address from deployer + nonce;
- constructor ABI words for publisher + zero predecessor;
- creation bytecode SHA-256 after removing the constructor suffix; and
- Keccak-256 of the complete creation data.

A plan edited and rehashed after changing the predicted address or creation
bytes therefore fails closed.

## Deliberately unresolved

This lane intentionally does **not** select or observe:

- gas limit;
- gas estimate;
- max fee per gas;
- max priority fee per gas;
- fee envelope;
- required native balance; or
- whether the deployer currently has enough native gas.

Those fields remain explicit null/false values.

The deployer balance is evidence only at this stage; it does not imply funding
sufficiency or funding authority.

## Not a signable transaction

Although the plan contains the exact contract-creation bytes, deployer address,
nonce, value, and predicted CREATE address, it intentionally lacks gas and fee
fields and records:

- `signable_transaction_materialized=false`; and
- `exact_unsigned_transaction_hash=null`.

This source object must not be treated as a transaction envelope or signing
request.

## Authority boundary

The Precision compiler performs no RPC call. It consumes the already-generated
activation-bound resolution packet and repository-reviewed public artifacts.

It does not:

- read a secret or credential;
- access a wallet or private key;
- fund the deployer;
- estimate gas;
- select fees;
- construct a signable transaction;
- sign, submit, or broadcast;
- deploy a contract;
- mutate Chain-2050 or validators;
- move tokens or funds;
- authorize migration; or
- authorize public activation.

## Next gate

The next gate is a **fresh read-only gas-estimate, fee, and funding-envelope
resolution** on the active private successor.

Only after that separate evidence gate is green may source work consider a
signable transaction construction lane.
