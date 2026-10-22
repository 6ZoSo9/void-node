# Buy VOID canonical ERC-20 delivery canary plan V1

Status: **SOURCE-ONLY HOLD**

Base generation:

- repository: `6ZoSo9/void-node`
- head: `e83b1df4bc3b52d08d5e38e076fa6c80085f7e01`
- tree: `016ed94a40ad7b25565f9233e3ad29375f7f37b3`
- plan ID: `voidbverc20canary1_7149b3d05bb5c4fa856d3d3494cc556541a514925f465fa0fcc6c13222690d86`
- plan Git blob: `3727d3759012072443f11ff97343d5c0c66bc5c7`
- proof Git blob: `8b99edf0859cbc034ad16bf08238c04aa9121321`

## Current-main rederivation — October 22, 2026

This V1 plan has been rederived on current `main@e83b1df4bc3b52d08d5e38e076fa6c80085f7e01`.
All **53/53** bound source Git identities were compared against the complete
current-main tree and are byte-identical to the prior reviewed generation.
Only the provenance envelope changed: base head/tree, content-addressed plan ID,
and the corresponding plan/proof/document/workflow identities. No canary
execution or economic authority was added.

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
