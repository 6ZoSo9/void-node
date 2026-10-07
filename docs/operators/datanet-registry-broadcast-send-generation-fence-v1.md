# DataNet Registry Broadcast Send Generation Fence v1

Status: **fail-closed source seam; external custody integration still required**.

This document does **not** authorize a live RPC send, credential/key access,
signing, transaction broadcast, deployment, Chain-2050 mutation, activation,
inventory, treasury/liquidity action, or funds movement.

## Problem

The exact-single DataNet registry broadcaster records a durable attempt intent
inside a private state root and rechecks that root immediately before
`eth_sendRawTransaction`. A same-UID process can nevertheless rename the root
after the final check. Any fence stored inside that root—or in another
same-UID-controlled sibling—can be renamed with it and recreated.

Therefore pathname separation is not custody independence.

## Source repair in this generation

The transaction core no longer creates or trusts
`.void-datanet-registry-broadcast-generation-fences-v1` beside the state
root.

Instead, the dependency-injected execution core requires two explicit
capabilities:

- `claim_generation_fence(fence)`
- `assert_generation_fence(claim, fence)`

A successful claim must return an exact closed object containing:

- `status = created | exists`;
- the exact content-addressed `broadcast_generation_fence_id`;
- one `sha256:...` custody receipt; and
- `independent_custody_proven=true`.

The custody key is the stable state-root pathname digest plus the exact
broadcast operation. A replacement inode at the same pathname therefore maps
to the same custody slot.

An existing claim fails closed before a replacement state root can create a new
`broadcast-attempts` namespace. A newly created claim is revalidated again
immediately before the single send admission. Both claim and revalidation are
bounded by a hard maximum 5,000 ms wait. Each custody callback receives a
frozen context containing an `AbortSignal` and the bounded timeout. When the
deadline fires the core first settles the timeout rejection and only then
dispatches the abort signal. This ordering prevents a transport abort handler
that resolves with a stale successful assertion from winning the deadline
race. A future AF_UNIX adapter must destroy/close its socket on that abort;
merely ignoring the signal does not qualify as production custody integration. The final
authorization/observation runtime window and visible state-root generation are
checked again **after** custody revalidation returns, so a slow custody response
cannot carry an expired authorization into `eth_sendRawTransaction`.

The attempt directory itself remains descriptor-pinned to the original state
generation so an in-flight root rename cannot redirect intent/result
publication.

## Production fail-closed boundary

The normal exported production wrapper
`submitVoidDatanetRegistryExactSingleBroadcastV1(...)` now returns:

`registry_broadcast_execution_external_generation_custody_required`

It cannot submit a transaction until a separately reviewed external custody
service is integrated.

This deliberately downgrades the prior false closure claim. Source can prove
the broadcaster consumes an independent-custody seam, but this PR does not
claim that a live host has installed or qualified that custody authority.

The dependency-injected function remains available for deterministic source
proofs and future trusted composition.

## Focused adversary

The proof now keeps the authoritative fence in a synthetic external custody
store and separately creates the old same-UID sibling namespace as a decoy.

At the fake send boundary it:

1. renames the validated state root;
2. renames the legacy sibling fence directory too;
3. installs compatible replacements at both original pathnames; and
4. permits exactly one simulated send.

A second invocation at the replacement state-root pathname receives
`status=exists` from the external custody authority, performs zero RPC calls,
and creates no replacement attempt store.

The proof also requires the normal production wrapper to HOLD with zero
transaction submission while no live custody service is integrated. Additional
adversaries prove that a custody revalidation that advances the synthetic clock
to the authorization expiry boundary performs zero RPC. The timeout adversary
uses a real local Unix socket whose peer never replies; it requires the core
deadline to abort the callback signal, the client socket to be destroyed, and
zero RPC submission. A separate adversary deliberately resolves `true` from
the abort handler and requires the already-settled timeout rejection to win,
again with zero RPC.

## Required next gate

Issue #2549 remains open.

The required live closure is a dedicated privilege-separated custody service,
following the repository's existing allocation-custody pattern:

```text
DataNet broadcast runtime UID
  -> bounded AF_UNIX claim/assert request
  -> dedicated broadcast-fence custody UID
       -> protected create-only operation-fence root
```

The socket path and fence root must be server-controlled. The public runtime
must not be able to write, rename, recreate, remount, or service-control the
custody authority. Ancestors must be root-owned, direct, non-symlink, and
non-writable by group/other. The client adapter must enforce a total transport
deadline no greater than the callback context timeout and destroy its AF_UNIX
socket when the supplied AbortSignal fires. A designated-host evidence gate
must prove those facts before live broadcast authority can be restored.

A same-UID writable directory, alternate path under the same user-owned
ancestor, advisory lock, or sibling namespace is not sufficient.

## Relationship to reviewed execution provenance

The isolated reviewed child from merged #2547 remains the only supported
execution boundary. With this source generation its normal broadcaster call
fails closed until external generation custody is integrated.

The reviewed source/provenance boundary does not itself provide durable
generation custody, and this lane does not weaken the null-stdio/no-IPC child
isolation.

## Authority boundary

Source/proof/docs/CI only.

No live RPC endpoint, production signed artifact, credential, private key,
wallet, signer, transaction construction/signing/broadcast, Chain-2050
mutation, deployment, inventory, market/presale activation, treasury/liquidity,
or funds movement is authorized or performed.

## Verification

The focused workflow runs Node 22, 24, and 26 on the exact PR head. It syntax
checks the core/proof, executes the root + sibling-fence replacement adversary,
checks the production fail-closed wrapper, and runs diff hygiene.

Fresh repository-wide CI and review remain required before merge.
