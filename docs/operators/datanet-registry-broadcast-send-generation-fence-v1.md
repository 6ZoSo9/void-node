# DataNet Registry Broadcast Send Generation Fence v1

Status: source/proof only. This document does **not** authorize a live RPC send,
credential/key access, signing, transaction broadcast, deployment, Chain-2050
mutation, activation, inventory, treasury/liquidity action, or funds movement.

## Problem

The exact-single DataNet registry broadcaster already publishes a durable
one-shot attempt intent and rechecks the state-root generation immediately
before eth_sendRawTransaction.

That check alone does not serialize the pathname namespace through the send.
A same-UID process can rename the validated state root after the final
generation check. The already-running process may still make its one permitted
send using previously validated inputs, while the durable attempt intent remains
inside the now-detached old state tree. A compatible replacement at the same
pathname could otherwise omit that intent and reopen the exact operation.

## Source boundary

The transaction core now adds two complementary custody boundaries.

### External operation fence

Before the state-root attempt directory is created or used, the broadcaster
publishes one create-only operation fence under the state-root parent in:

    .void-datanet-registry-broadcast-generation-fences-v1/
      <sha256(absolute-state-root-path)>/
        <broadcast-operation-id>.json

The path hash intentionally binds the stable state-root pathname rather than the
current state-root inode. If that pathname is later replaced by a different
directory generation, the replacement resolves to the same external fence
namespace.

The fence binds the exact operation, consumed authorization, request and
transaction identity, the original state-root path digest/device/inode, and
the one-attempt/no-retry/no-replacement policy.

The fence is create-only and directory-fsynced before any state-root attempt
intent is admitted. Existing fence state fails closed before a replacement
state root can create another attempt store.

### Descriptor-bound original attempt store

After the external fence is durable, the current state root is revalidated.
The broadcast-attempts directory is then opened as a private no-follow
directory and retained through intent publication, final checks, the single
RPC send attempt, reconciliation, and terminal result publication.

Intent and result records are created through /proc/self/fd/<dirfd>/... and
the retained directory FD is fsynced directly. A root rename therefore cannot
redirect the in-flight process's result into a replacement state tree.

## Failure semantics

A fence that already exists is treated as an already-recorded exact operation.
No RPC method is invoked. If a new fence is durable and a later pre-send step
fails, the fence is intentionally not removed: uncertainty must not become a
retry opportunity.

The existing operation-bound confirmation, runtime window, exact signed
transaction binding, one-send invariant, reconciliation classification, and
no-retry/no-replacement policy remain unchanged.

## Focused adversary

The dedicated proof uses synthetic inputs and an injected fake RPC. At the fake
send boundary it renames the validated state root, installs a compatible
replacement at the same pathname, and allows exactly one simulated send. It
then proves that intent/result records remain in the descriptor-pinned detached
original generation and that the replacement generation is stopped by the
external fence before any RPC or new attempt-store creation.

This proves the #2549 permitted outcome: a rename can race the first send, but
the replacement generation cannot reopen the same one-shot operation.

## Scope and remaining limits

This repair closes the state-root pathname-replacement replay gap described by
#2549. It is not a claim that an arbitrary same-UID actor cannot delete or
roll back every independent host-state namespace. Broader host rollback,
backup/snapshot custody, OS-user compromise, RPC correctness, and externally
observed deployment truth remain separate gates.

## Relationship to #2547

#2547 reviews the broadcaster executable-source provenance. Its reviewed
27-module closure includes this transaction core even though #2547 does not
edit this path. The lanes are path-disjoint but semantically ordered:

1. merge/reconcile #2547 first, then reconcile #2549 onto that source; or
2. if #2549 lands first, regenerate #2547 exact reviewed closure and hosted
   evidence before #2547 disposition.

Do not merge both stale exact heads independently.

## Verification

Dedicated workflow: VOID DataNet registry broadcast send generation fence v1.
It runs Node.js 22, 24, and 26, syntax checks the core/proof, executes the
deterministic root-replacement adversary, and runs git diff --check.

No live RPC endpoint is used by the focused proof.