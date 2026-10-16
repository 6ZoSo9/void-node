# Buy VOID Epoch-2 live-composition native protected upgrade V5

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5`.

Status: **source/test/CI only**. No Precision mutation or live execution is authorized by this PR. This generation binds the fresh post-preservation V6R2 trust root; historical V6 locks remain evidence only.

## Purpose

The existing Precision protected root at
`/opt/void-buy-void-epoch2-live-composition-v3` already contains the accepted
historical V4 generation. The repaired V3R runner generation cannot therefore
use a create-only installer targeting the same root.

V5 upgrades that already-installed generation to the accepted V6R2
native/repaired-runner pair by exchanging the complete protected directory
atomically, retaining the historical generation as a rollback predecessor.

## Accepted V6R2 generation

- lock ID:
  `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`
- lock Git blob:
  `bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b`
- candidate ID:
  `voidbuye2nativecand6r2_5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d`
- native: 726976 bytes,
  SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- repaired runner: 45147 bytes,
  SHA-256 `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`,
  Git blob `499df9b94b5b89354837570da0c7e47ec280025d`;
- repaired V3R qualifier Git blob:
  `74c69fe8a95ed5f361a39971618f43f7c768c865`.

## Required predecessor generation

Before mutation the current protected root must be exactly:

- native: 722880 bytes,
  SHA-256 `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
- runner: 40616 bytes,
  SHA-256 `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- policy: 305 bytes,
  SHA-256 `d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc`.

An absent, unknown, already-partially-upgraded, or staged root fails closed.

## Atomic transition

The future separately authorized apply path:

1. emits and flushes a PRE_MUTATION authority receipt;
2. verifies confirmation, root/isolated Python context, exact candidates,
   exact plan ID, checkout, Git/setpriv/Node generations, and exact predecessor;
3. creates a private root-owned V6R2 staging directory;
4. creates native, runner, and policy create-only inside the stage and fsyncs;
5. revalidates checkout/tool/Node/predecessor state immediately before exchange;
6. exchanges the stage and live protected root with
   `renameat2(RENAME_EXCHANGE)`;
7. verifies the V6R2 current root and the historical generation now held at the
   stage path;
8. renames the historical stage to
   `/opt/.void-buy-void-epoch2-live-composition-v3.predecessor-v4` with
   `RENAME_NOREPLACE`;
9. fsyncs the parent and verifies both generations again.

The upgrade executes neither native nor runner.

## Failure / rollback

Before exchange, failures clean only the V6R2 stage.

After exchange, any failure triggers an automatic attempt to exchange the exact
historical generation back into the live root and clean the V6R2 stage. The
implementation retains a monotonic `publication_occurred` fact from the first
successful `RENAME_EXCHANGE`; exchanging the historical root back does not erase
that audit boundary.

Every terminal after that publication boundary remains publication-aware,
including a **proven-green filesystem rollback**. A green rollback reports
`publication_state=published_rolled_back_green`, preserves the bounded original
failure, and separately reports rollback attempted/green. It never regresses to
generic `not_published`.

Filesystem rollback success alone does **not** prove the broader final state.
After a green rollback the upgrader rechecks the same Node and checkout/Git/
setpriv bindings carried by the plan. Only if those bindings still match may
`rollback_final_state_verified=true` and `final_state_verified=true` be
reported. If node/checkout/tool drift caused the post-exchange failure, the
filesystem rollback may remain green while final-state verification stays
false.

If rollback cannot be proven green — including the case where the historical
live root is restored but cleanup of the staged V6R2 generation is ambiguous —
the terminal reports `published_needs_inspection`.

The focused proof executes the real production apply state machine with
synthetic/injected host primitives and no real `/opt` I/O. It requires:
- a complete success transition;
- failure immediately after the first root exchange with successful rollback,
  requiring a publication-aware green-rollback receipt;
- failure after predecessor retention with successful rollback, with the same
  monotonic publication truth;
- failure of the parent fsync immediately after exchange with rollback,
  requiring the original `OSError` to be wrapped in a publication-aware
  terminal instead of escaping the receipt surface;
- post-exchange Node-generation drift with a green filesystem rollback but
  `final_state_verified=false`;
- post-exchange checkout-generation drift with the same conservative result;
- rollback-stage cleanup ambiguity after the historical live root has been
  exchanged back, requiring a publication-aware inspection receipt;
- rollback rename failure with publication-aware HOLD; and
- a retained-parent descriptor close failure after a fully verified success.

A descriptor-close failure after the final V6R2 live-root and V4 predecessor
verification is **not** allowed to regress to a generic no-publication receipt.
That terminal reports that the upgrade/publication occurred, the final state was
verified, parent fsync completed, and only the retained parent descriptor close
failed. It does not roll back an already verified successful upgrade solely
because close reported an error.

The predecessor is retained after success so later rollback/qualification can
prove exactly which generation was replaced.

## Authority boundary

This repair is source/test/CI only. Merged #3335 remains a no-apply HOLD until
the repaired exact generation is separately accepted. Source-level synthetic
apply tests do not grant host mutation authority.

This PR does not authorize or perform:

- the atomic protected-root upgrade on Precision;
- native or runner live execution;
- credential/private-key access;
- signing;
- transaction construction, submission, broadcast, or RPC;
- payment acceptance;
- public presale or WC/VOID activation;
- service/systemd mutation;
- treasury/liquidity action;
- funds movement.

A native operator-first-entry successor and an installed read-only qualification
successor are required before any future live handoff.

PROTECT THE CORE.
