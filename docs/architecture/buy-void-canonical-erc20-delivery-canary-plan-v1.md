# Buy VOID canonical ERC-20 delivery canary plan V1

Status: **SOURCE-ONLY HOLD**

Base generation:

- repository: `6ZoSo9/void-node`
- head: `0d93be0a7ae1395449a386d4fbe14bb680f51c3f`
- tree: `199f3949a8955077124822269560b1a4e1ed5e30`
- plan ID: `voidbverc20canary1_326bd5a4380e20304cf5c9c689240ee3aa5a1271d6693b275b68715e1eb28505`
- plan Git blob: `f598abf5a947d4dc09b75dc7ab007a2d80c13c73`
- proof Git blob: `7a37025688f1b37e00de75c0e48af5bfa78c4fe7`

## Purpose

The canonical Buy VOID delivery path is ERC-20 `VoidToken.transfer(...)`, not
the retired native-value canary. Current source proves the canonical runtime
parent is mounted, while execution readiness, broad production configuration and
presale inventory funding remain false.

This plan defines the evidence for one future bounded production canary. It does
not construct, sign, broadcast, fund, or activate anything.

## Bound current truth

The plan content-binds 53 exact current-main artifacts covering canonical delivery runtime/configuration/composition, transaction preparation, signer/broadcaster adapter, submission guard, execution attempt journal, fulfillment and inventory journals, pipeline coordinator, saga server policy, filesystem bakery lock, credential-binding evidence, source-finality execution preflight, ERC-20 receipt reconciliation, verified-payment/allocation lineage, retired native-canary historical contrast, non-authorizing live-canary preflight, and participant postpurchase control.

The local-import closure claim is intentionally narrower than the complete 53-row provenance list: it applies to the **canonical ERC-20 mutation-critical execution/configuration graph**. The bound retired native-canary proof is opaque historical contrast by exact Git blob only; its own six local runtime/type imports are outside this closure and are not execution authority for the future ERC-20 canary.

Source-finality execution closure additionally binds production-configuration verification, source-finality authority, Chain-finality RPC adapter, V7 provenance, live-process V1/V2 binding, payment RPC observer, authenticated composition and provider-pair binding. Within the canonical ERC-20 mutation-critical closure, their local imports resolve to the bound set.

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
