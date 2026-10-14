# Buy VOID V7 protected privileged receipt launcher V1

## Purpose

Close the privileged-code trust gap called out by the V7 deployment,
provider-pair and live-process receipt lanes.

A real root receipt operation must never execute TypeScript, TSX, Git helpers or
package bytes from ZoSo's ordinary writable checkout.

This launcher therefore does **not** make a checkout trusted and does not install
one. It only dispatches receipt tools after the source tree has already been
installed beneath root-owned, non-group/world-writable ancestry.

## Qualification

Before any tool execution the launcher requires:

- Linux root caller;
- exact root-owned/non-writable system Git, Node and `setpriv` binaries;
- explicit runtime UID/GID, expected Git commit and tree;
- exact Git branch `main`;
- clean tracked/untracked worktree;
- the existing
  `runtime/canonical-producer-source-custody-v1.cjs` check executed after
  dropping to the runtime UID/GID with cleared groups and no-new-privileges;
- a second exact commit/tree/branch/status census after source custody; and
- exact tracked Git-blob equality for the selected receipt tool.

Git inspection runs with a fixed environment, system/global Git configuration
disabled, replace objects disabled, optional locks disabled and no credential
prompting.

Tool execution uses an empty/minimal environment and the TSX CLI inside the same
protected source tree. Ambient `NODE_OPTIONS`, `NODE_PATH`, `LD_*`, npm
prefix, Git variables and arbitrary PATH shims are not inherited.

## Closed tool allowlist

Only:

- `deployment` ->
  `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`;
- `provider-pair` ->
  `ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts`;
- `live-process` ->
  `ops/precision/void_buy_void_source_finality_live_process_binding_receipt_install_v1.ts`.

`--qualify-only` performs no tool execution or host mutation.

The receipt tools retain their own plan/apply and exact confirmation gates. The
launcher does not weaken or synthesize those confirmations.

## Kernel-backed proof

The CI proof creates a disposable Git repository under `/var/lib`, copies the
real source-custody checker and launcher, then transfers the fixture to
root:root ownership.

It proves:

- a protected root-owned tree qualifies when checked as the unprivileged runtime
  UID;
- an ordinary mutable checkout is rejected even when root invokes the launcher;
- group/world-writable protected source is rejected by the custody checker;
- a root-only tracked-file modification is rejected by Git cleanliness;
- wrong expected commit is rejected; and
- a hostile ambient PATH Git shim is never executed.

No real receipt tool is invoked by the proof.

## Remaining operator boundary

GREEN source/CI means the launcher contract is reviewable. It does not install
a protected source tree on Precision and does not run a real receipt operation.

A later explicitly authorized host lane must install an exact accepted main
generation as a root-owned protected tree, qualify this launcher there in
`--qualify-only` mode, and only then plan the deployment/provider/live-process
receipt sequence.

No service/config/RPC, credential/key/wallet/signer, payment, transaction,
Chain-2050/WC, inventory/treasury/liquidity, presale activation or funds
movement occurs here.

PROTECT THE CORE.
