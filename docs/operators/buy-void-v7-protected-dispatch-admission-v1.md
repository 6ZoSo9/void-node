# Buy VOID V7 protected dispatch admission v1

## Purpose

The native pre-entry and protected launcher authenticate the privileged source
and package closure before tool dispatch. Persistent mutation must not be
reachable through a separate direct root Node/TSX CLI that evaluates one of the
authority-bearing TypeScript tools outside that entry chain.

This contract makes the fixed native launcher the only supported persistent
mutation entry for:

- deployment receipt publication;
- provider-pair receipt publication;
- V2 live-process receipt publication.

Direct plan/read-only use remains available where the tool already supports it.

## Launcher handoff

Immediately before dispatch, the protected launcher re-verifies:

- exact HEAD commit;
- exact HEAD tree;
- branch `main`;
- clean tracked/untracked status;
- exact selected tool HEAD blob and visible blob.

It then clears the environment and passes only the reviewed runtime variables
plus a narrow dispatch handoff:

- protected-dispatch marker;
- native-preentry marker;
- fixed protected source root;
- exact commit and tree;
- exact selected tool path;
- exact selected tool Git blob.

## Tool-side apply admission

Each authority-bearing tool requires that handoff for persistent apply and then
independently proves:

- it is executing as root from the fixed
  `/opt/void-buy-void-v7-reviewed-v1` tree;
- the tree and all ancestors are root-owned and non-group/world-writable;
- its own module path is the exact expected protected path;
- current repository commit/tree/main/clean state equal the launcher handoff;
- its exact HEAD blob and visible bytes equal the handed-off tool blob.

The admission check occurs before the first authority read/mutation section of
the apply path. A normal root CLI invocation from a mutable checkout therefore
HOLDS before persistent mutation.

The handoff is not presented as a cryptographic defense against arbitrary
malicious root. Its security purpose is to remove the accidental/operational
bypass around the already authenticated native-first protected generation.

## Native generation

The launcher body change creates a new native-preentry generation. The native
source must bind the exact launcher byte count and SHA-256 before Bash
evaluation, as before.

## Enforcement consequence

The deployment tool's current 49-path enforcement inventory remains the
generation-equivalence boundary. This repair changes several members of that
inventory, so historical enforcement candidates/locks remain invalid. A fresh
candidate and acceptance lock must be derived only after this protected-dispatch
generation is exact-head green.

No Precision apply, service/RPC mutation, credential/key/wallet/signer access,
payment/transaction, presale/WC activation, treasury/liquidity or funds movement
is authorized by this source change.

**PROTECT THE CORE.**
