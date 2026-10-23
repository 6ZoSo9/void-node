# Accepted protected V4 lock + canonical producer V5 composition V2

## Purpose

Advance existing Draft #3682 onto the exact repaired-router protected V4 lock in
Draft #3667 while preserving the prior #3682 composition in history and reusing
the exact seven repaired canonical V5 source paths from Draft #3681.

Current parents:

- prior composition history: `0527288a18ebb16161579089427a70d6fa402368`;
- accepted V4 lock: `1fa91ea0e31ce1497ab2ca596eb1177e8588d768` (#3667);
- canonical V5 source donor: `0b9567057af7a9bae271ead8f42c1b71794742f9` (#3681).

The present tree is based on #3667. The superseded V1 composition evidence
files are absent from this tree and replaced by three V2 evidence files.

## Accepted V4 preservation

These identities remain byte-for-byte unchanged:

- V4 candidate: `b8341906d9563739a50dac98ea184a1d93267531`;
- V4 lock: `416202f5a7ee4c55950d5db9d13a718c721fc801`;
- V4 lock proof: `1eb43afaea8e46dfc061a67e15e5dae099874091`;
- V4 lock document: `7654605ce6c895656c694e8104efdbbf35c59138`;
- V4 lock workflow: `c8043b9db6dbce4b4f86805091ccc553090c11d3`.

The accepted V4 lock still applies only to the exact V4 source generation.

## Canonical V5 transition

The range router remains `src/index.ts@a09661797aa4295371c036be36d82995e5233269`. Canonical V5 changes
exactly one protected inventory row:

- V4 runner: `6fb040de128ce0df16e848d61ea5f4acb62794da`, mode `100755`;
- V5 runner: `bc6a17ccdf389299fb139db37e742f0b1ad9dc4e`, mode `100755`.

The V5 guard, proof, dispatcher, launcher, workflows, and custody document are
copied byte-for-byte from exact #3681 head `0b9567057af7a9bae271ead8f42c1b71794742f9`.

A new protected candidate V5 and a separate V5 acceptance lock are required.
The accepted V4 lock is preserved rather than silently repinned.

## Lifecycle boundary

This composition creates no candidate V5, no V5 lock, no deployment receipt,
and no runtime cutover. The deployment receipt installed for V4 remains
evidence only for the installed V4 generation.

No service mutation, credential or signer access, provider RPC contact,
transaction/payment acceptance, presale/WC activation, treasury/liquidity
action, or funds movement occurs.

PROTECT THE CORE.
