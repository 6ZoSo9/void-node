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
