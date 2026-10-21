# Buy VOID canonical ERC-20 delivery canary plan V1

Status: **SOURCE-ONLY HOLD**

Base generation:

- repository: `6ZoSo9/void-node`
- head: `47acc1485ab264a1a33d6a8c70072c2c18ce56e4`
- tree: `6f5ff9b2bd081a355186084fab74eeb10322ce6e`
- plan ID: `voidbverc20canary1_ca4048a864c8e442b3cdab3ec661af9ae5c592443fd386935f3017ec04694b4b`
- plan Git blob: `d10b1eb9fe9493762b5d6338ddfbfdab49152f0a`
- proof Git blob: `a3c5797bb93b867ea15e1fb3543d7c88a9c1b35b`

## Purpose

The canonical Buy VOID delivery path is now ERC-20 `VoidToken.transfer(...)`, not
the retired native-value canary. Current source proves the canonical runtime
parent is mounted, but execution readiness, broad production configuration and
presale inventory funding remain false.

This plan defines the evidence a future **single bounded production canary** must
carry. It does not construct, sign, broadcast, fund, or activate anything.

## Current source truth

The plan content-binds 21 exact current-main
sources covering canonical delivery runtime/configuration/composition,
transaction preparation, signer/broadcaster adapter, submission guard, execution
attempt journal, ERC-20 receipt reconciliation, verified-payment/allocation
lineage, the retired native-canary source/proof, the non-authorizing live-canary
preflight, and participant postpurchase control.

Current facts remain:

- chain ID is `2050` and canonical asset is `void_token_erc20`;
- the canonical delivery runtime parent is mounted;
- canonical delivery execution is **not ready**;
- presale inventory funding is **not ready**;
- broad production delivery configuration is **not verified**;
- the old native canary is retired for the canonical ERC-20 transition;
- the retained live-canary preflight authorizes no signing or broadcast; and
- participant-control proof is source-only and does not open a public submission
  route or prove token movement.

## Future canary evidence

A separately reviewed canary implementation must satisfy every requirement in the
plan. The essential closed chain is:

1. one explicit participant-controlled delivery recipient;
2. exact verified-payment identity plus exact durable allocation record;
3. a bounded reserved VOID amount already admitted before canary execution;
4. exact Chain-2050, VoidToken, wallet, signer credential, runtime and execution
   composition generations;
5. exactly one canonical ERC-20 transfer with native transaction value zero;
6. durable wallet nonce reservation, signed-transaction hash custody and
   write-ahead broadcast intent before RPC broadcast;
7. successful receipt, exact matching `Transfer` event, finality and recipient
   post-balance reconciliation;
8. replay/idempotence reconciliation instead of blind rebroadcast; and
9. participant postpurchase control evidence tied to the same delivered address.

## Non-promotion rule

A successful bounded canary must **not**:

- enable public delivery;
- activate the presale;
- widen the delivery execution maximum;
- fund the full presale inventory;
- satisfy authenticated operator-route/custody gates; or
- grant signing, transaction or funds authority to this source plan.

Those remain separately reviewed lifecycle and live-evidence gates.

## Authority

This plan is source-only. No credential read, wallet/signer access, RPC call,
transaction construction/signing/broadcast, inventory funding, runtime mutation,
payment acceptance, public-delivery activation, presale activation or funds
movement is authorized.

PROTECT THE CORE.
