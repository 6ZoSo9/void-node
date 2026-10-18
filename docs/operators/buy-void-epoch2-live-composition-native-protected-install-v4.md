# Buy VOID Epoch-2 live-composition native protected upgrade V4

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V4`.

Status: **source/test/CI only**. No Precision mutation or live execution is authorized by this PR.

## Purpose

The existing Precision protected root at
`/opt/void-buy-void-epoch2-live-composition-v3` already contains the accepted
historical V4 generation. The repaired V3R runner generation cannot therefore
use a create-only installer targeting the same root.

V4 upgrades that already-installed generation to the accepted V6
native/repaired-runner pair by exchanging the complete protected directory
atomically, retaining the historical generation as a rollback predecessor.

## Accepted V6 generation

- lock ID:
  `voidbuye2nativecandlock6_016c2764d5d33c9078fd5120addd2ff7ef25c8d6bf30d5d6741b05a5036a1f22`
- lock Git blob:
  `6b38ab9ffc8a272340f7d2c9af706a5dbd1cf663`
- candidate ID:
  `voidbuye2nativecand6_06aa80d52c84e6e466dc4c43ed21dcf1de79e1d69f0280ba9e3ffb8212404a53`
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
3. creates a private root-owned V6 staging directory;
4. creates native, runner, and policy create-only inside the stage and fsyncs;
5. revalidates checkout/tool/Node/predecessor state immediately before exchange;
6. exchanges the stage and live protected root with
   `renameat2(RENAME_EXCHANGE)`;
7. verifies the V6 current root and the historical generation now held at the
   stage path;
8. renames the historical stage to
   `/opt/.void-buy-void-epoch2-live-composition-v3.predecessor-v4` with
   `RENAME_NOREPLACE`;
9. fsyncs the parent and verifies both generations again.

The upgrade executes neither native nor runner.

## Failure / rollback

Before exchange, failures clean only the V6 stage.

After exchange, any failure triggers an automatic attempt to exchange the exact
historical generation back into the live root and clean the V6 stage. If that
rollback itself cannot be proven green, the receipt is conservative and
requires inspection; it does not claim a clean state.

The predecessor is retained after success so later rollback/qualification can
prove exactly which generation was replaced.

## Authority boundary

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
