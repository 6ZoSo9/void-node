# Buy VOID operator verified-allocation dispatch V2

## Current router generation

This source-only successor preserves dispatcher proof V1 byte-for-byte at
`e58bf39fadc25123771481608fad2a61a8f3133f`. V1 remains bound to the pre-seal-first router and
must refuse the merged router rather than being silently repinned.

V2 binds and rechecks:

- current `src/index.ts` Git blob `1fde828c97175560f98ab070af33eefc595f8002`;
- dispatcher runtime source Git blob `0e27a76e777c326d2d9e2b1550b7f2979fca9abb`;
- payment/allocation writer Git blob `f591f7407d9afc2cf77e0f90923aa11b4817fd4e`;
- dispatcher V2 proof Git blob `5050498f600efd7d5c83af214f75663a66685d6e`;
- seal-first reconstruction proof Git blob `033018d6caee821b370001d558fcfb81edda48f1`.

The seal-first proof independently reconstructs the current router from the
reviewed presale predecessor plus only the qualified startup-order changes.
Dispatcher V2 then parses that complete current router and re-verifies both
operator endpoints and the mounted writer slice.

## Result and HOLD boundary

The currently mounted router is intentionally still the legacy payment-only
producer. The detached dispatcher selects the verified-payment allocation
handoff in source, but the mounted route does not yet invoke it. The workflow
therefore requires all Node 22/24/26 outputs to remain byte-identical while
reporting `mounted_verified_allocation_dispatch=false`.

No host, service, credential, customer ledger, wallet, signer, payment,
allocation, inventory, treasury, presale, or funds action is performed.

## October 11, 2026 — current V3 and frozen V1/V2 discrimination

The original verified-allocation V1/V2 dispatcher scripts are **frozen
historical source generations**. A new central nonpayment writer implements
bounded strict canonical operator-event history validation *inside* the
per-request closeout lock, without mounting verified-payment allocation.
The current writer Git blob is
`101ce2eb806b2adb21035ed8b72874ba2b0026d3`;
the current V3 dispatcher proof Git blob is `f059b42d5befeab94a0b162ce9558375d85b7e76`.
Workflow V1 must prove the frozen V1 source refuses the new tree; the
existing V2 workflow now requires both frozen V1 and frozen V2 refusals
and the actual current V3 source-only positive proof on Node 22/24/26.
Historical test/proof source bytes are unchanged and cannot be treated
as current acceptance. No public runtime, custody UID, funds, payment
or presale authority is enabled by this requalification.


## October 12, 2026 — request-lock router V4

V1/V2/V3 remain immutable historical generations. The request-lock successor
changes public checkout persistence/privacy outside the mounted operator writer
slice, producing exact `src/index.ts` Git blob
`40239e0f76aa1edce43523d18c1b57691e41e8cf`.

Dispatcher V4 reuses the reviewed V3 parser and adversarial plan checks, binds
that exact router, and requires the frozen V3 proof Git blob
`794b3bb8e2c386be7fad607a3adf79aadff5332d` to remain unchanged and refuse
the new router generation. It does not mount the verified-allocation
dispatcher: `mounted_verified_allocation_dispatch=false` remains required.

The source-only V4 proof Git blob is
`752deafb5a8ff884cfcfc0ff7ef8fded2a92287b`. No service, credential,
customer-ledger, wallet, signer, payment, allocation, presale, or funds
mutation is authorized.
