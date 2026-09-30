# Epoch-2 private QBFT runtime activation v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1`

Status: source-reviewed activation controller. No validator is started merely by
merging this source.

## Purpose

Provide one explicit, single-attempt ceremony for starting the installed
three-host Epoch-2 Besu QBFT successor only after all earlier private-plan,
prepared-bundle, bundle-set, and inactive-install receipts are exact.

The controller defaults to plan-only mode. Plan-only mode performs no SSH,
private-key read, systemd action, Docker mutation, listener creation, or
Chain-2050 write.

Applied activation requires the exact confirmation:

`startPrivateEpoch2QbftSuccessorV1`

and the exact content-addressed activation-plan ID.

## Consensus truth

The genesis contains exactly three validators:

- Precision — `0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863`
- Nimo — `0x02f967953386188397b992c208239d3a25180db6`
- Xiphos — `0x461bf06270d9d28962f7570182c061b828799b66`

The runtime uses QBFT with a five-second block period and two-of-three quorum.

This three-validator configuration can produce blocks when two validators are
operating, but its Byzantine fault tolerance is **zero**. Four validators are
required before one Byzantine validator can be tolerated. This ceremony must
therefore not be described as Byzantine-fault-tolerant production.

## Start order

Applied activation is fixed to:

1. Precision;
2. Nimo;
3. Xiphos.

Precision starts first because it owns the only RPC publication, loopback
`127.0.0.1:18553`.

With Precision alone, the controller requires:

- Chain ID `0x802`;
- the exact three-validator set from
  `qbft_getValidatorsByBlockNumber("latest")`; and
- block height remains zero for more than two block periods.

Nimo starts second. This is the first step that can create authoritative
successor blocks because two-of-three quorum becomes possible. The controller
requires block progress and at least one Precision peer before continuing.

Xiphos starts third only after quorum has already been proven. Final acceptance
requires two Precision peers, the exact validator set, further block progress,
and all three services active.

## Fresh pre-start revalidation

Before the first start, all three hosts must pass one fresh revalidation of:

- clean `main` descended from the corresponding install receipt;
- current tailnet address equal to the private runtime plan;
- exact installed genesis/static-peer/unit hashes;
- empty Besu data directory;
- exact plugin SHA-256;
- exact pinned Besu image in the existing rootless Docker context;
- exact rootless Docker socket and owner;
- exact role-specific node-key filesystem shape;
- node-key public key and validator address derived from the private key;
- disabled/inactive systemd state with no autostart link;
- `Restart=no`;
- P2P port 30313 vacant; and
- Precision RPC port 18553 vacant.

The private validator key is read during this applied preflight to derive and
compare its public identity. The key bytes must never be printed, exported, or
written to an evidence file.

Nimo uses one interactive SSH authentication prompt through an ephemeral
ControlMaster socket. The controller does not read or persist the SSH
credential. Xiphos remains BatchMode-only.

## Failure containment

Activation is one attempt with zero automatic retries.

If any preflight, start, RPC, peer, validator-set, or block-progress check fails,
the controller stops every validator service started by that attempt in reverse
order.

Stopping validators can halt further block production. It cannot erase any
blocks already produced after two-validator quorum was reached.

Services are never enabled for boot and units remain `Restart=no`.

## Successful activation authority truth

A successful activation receipt truthfully records:

- systemd reload: true;
- service start: true;
- Docker mutation: true, because starting the service creates/runs Besu
  containers;
- private-key access: true for identity revalidation and validator operation;
- authoritative Chain-2050 write: true, because QBFT blocks were produced;
- validator-set mutation: false;
- transaction construction/signing/submission/broadcast: false;
- token/funds movement: false;
- migration authorization: false; and
- public activation authorization: false.

The activation receipt status remains:

`PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD`

## Next gate

After a green private activation receipt, the next intended operation is the
already-reviewed DataNet registry deployer observer against Precision's private
successor RPC. It may read the deployer nonce, balance, and predicted CREATE
address vacancy, but transaction construction/signing/submission remains a
separate gate.
