# Buy VOID canonical ERC-20 delivery canary plan V1

Status: **SOURCE-ONLY HOLD**

Base generation:

- repository: `6ZoSo9/void-node`
- head: `0d93be0a7ae1395449a386d4fbe14bb680f51c3f`
- tree: `199f3949a8955077124822269560b1a4e1ed5e30`
- plan ID: `voidbverc20canary1_2a80aedb75d99fbcbcc9e8d2b8e34b00576aa2947f039b03b240b19118e66250`
- plan Git blob: `18b606bb861297ce56e1e98d263035d530290bc0`
- proof Git blob: `47a3f8f3cf75f40b2b92bdcebd943e5f2f3aea25`

## Purpose

The canonical Buy VOID delivery path is ERC-20 `VoidToken.transfer(...)`, not
the retired native-value canary. Current source proves the canonical runtime
parent is mounted, while execution readiness, broad production configuration and
presale inventory funding remain false.

This plan defines the evidence for one future bounded production canary. It does
not construct, sign, broadcast, fund, or activate anything.

## Bound current truth

The plan content-binds 44 exact current-main
sources covering canonical delivery runtime/configuration/composition,
transaction preparation, signer/broadcaster adapter, submission guard, execution
attempt journal, fulfillment and inventory journals, pipeline coordinator, saga
server policy, filesystem bakery lock, credential-binding evidence, source-finality
execution preflight, ERC-20 receipt reconciliation, verified-payment/allocation
lineage, retired native canary source/proof, non-authorizing live-canary
preflight, and participant postpurchase control.

The mutation-critical local import graph is closed through allocation publication/high-water, verified-payment replay/duplicate/custody policy, auto-fulfillment, fulfillment/confirmed/broadcast journals, and the participant broadcaster/native sign-broadcast adapter. The final added layer imports only already-bound modules.

Every bound Git blob identifier is required to be exact 40-hex SHA-1.

Current authority remains HOLD: execution, signing, broadcast, inventory funding,
public delivery, presale activation and funds movement are false.

## Future canary evidence

A separately reviewed implementation must bind one participant-controlled
recipient, exact payment/allocation identity and bounded reserved inventory,
exact Chain-2050/VoidToken/wallet/signer/runtime/composition generations, exactly
one ERC-20 transfer with native value zero, durable nonce + signed-hash + WAL
custody, successful receipt + exact Transfer event + finality + post-balance
reconciliation, replay/idempotence, and participant postpurchase control
evidence.

Canary success is explicitly non-promotional. It cannot enable public delivery,
activate the presale, widen the delivery maximum, fund the whole inventory, or
satisfy authenticated operator-route/custody gates.

## Authority

Source plan only. No credential read, wallet/signer access, RPC, signing,
transaction broadcast, inventory funding, runtime mutation, payment acceptance,
public-delivery activation, presale activation or funds movement.

PROTECT THE CORE.
