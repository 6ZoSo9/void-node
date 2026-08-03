# VOID Luanti useful-work game foundation v1

Marker: `VOID_LUANTI_USEFUL_WORK_GAME_FOUNDATION_V1`

Working title: **VOID Realms**

## Decision

Use **Luanti** as the voxel engine and test compatibility against
**Mineclonia** as a development reference. Do not download, vendor or fork
either upstream in this phase.

Luanti is the correct engine boundary because its ordinary mods run on the
server, not secretly on player devices. A user-contributed worker therefore
must be a separately installed, visible **VOID Worker Companion**.

## Product architecture

```text
Luanti client
    |
    | gameplay protocol
    v
VOID Realms Luanti server
    |
    | server-side void_work mod
    | intent + sanitized status only
    v
VOID coordinator/status bridge
    ^
    | signed bounded tickets and verified receipts
    |
VOID Worker Companion on the player's machine
```

The game and worker are separate planes.

The Luanti mod cannot launch the companion, cannot run player compute and
cannot award rewards. The companion cannot receive wallet keys and cannot
write Work Credits. Only the existing verified VOID earning adapter may award
WC after a valid receipt.

GameNetworkingSockets may later carry companion messages, but it is optional
and cannot become a consensus, identity or wallet dependency.

## First useful jobs

Start with bounded, public, independently verifiable jobs:

1. DataNet public-object fetch and integrity verification.
2. Public-object mirror availability and content verification.
3. Public block-header range verification.
4. Public content duplicate detection.

Do not initially allow:

- consensus voting;
- validator or wallet key use;
- transaction signing;
- payment execution;
- private-data processing;
- arbitrary code execution.

## Consent and resource rules

There is no hidden mining.

The worker is default-off and requires separate consent in the game and in the
companion. The companion must show a persistent status indicator and a
one-action pause control.

Initial defaults:

- 10% CPU cap;
- 128 KiB/s bandwidth cap;
- AC-power-only operation;
- thermal guard;
- automatic pause when gameplay becomes resource constrained;
- no background autostart.

## Rewards

Useful work earns **Work Credits**, not direct VOID.

A coordinator issues a bounded ticket. The companion returns a deterministic
receipt. The existing verified earning adapter enforces duplicate protection,
per-account caps and the ledger write. The game receives only sanitized status
such as progress, pending WC and credited WC.

Game progression must not require compute. Buying or contributing more compute
must not create pay-to-win combat or progression advantages.

## Upstream and branding

Mineclonia is a compatibility and development reference, not a project to
seize. A future fork must preserve GPL and CC BY-SA obligations, attribution
and source availability.

Do not copy Minecraft textures, sounds or proprietary assets. Public branding,
characters, blocks and media for VOID Realms must be original or clearly
licensed.

## Ordered gates

1. Merge the GameNetworkingSockets feasibility PR.
2. Land this source-only foundation contract and mod skeleton.
3. Capture exact Luanti and Mineclonia source, tag and license receipts.
4. Perform a reproducible local installation/build plan.
5. Run a private Luanti server smoke test with no worker.
6. Build a local mock Worker Companion using the existing no-node earning
   client and synthetic tickets.
7. Connect sanitized status to the `void_work` mod.
8. Run one explicit, resource-capped public-data verification job.
9. Award WC only through the existing verified adapter.
10. Review public-server, age, reward and distribution policy before launch.

## Current authority boundary

This lane performs no upstream download or fork, package installation, server
start, listener start, external connection, worker start, work execution,
ticket issuance, Work Credit write, settlement, wallet access, payment,
restart, deployment or money movement.
