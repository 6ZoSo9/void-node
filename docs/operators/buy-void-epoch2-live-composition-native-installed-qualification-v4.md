# Buy VOID Epoch-2 V6R2 native installed qualification V4

Marker: `VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V4`.

Status: **source/test/CI only**. This PR does not execute the qualification on Precision.

## Purpose

Qualify the protected generation after the atomic V4-to-V6R2 root transition from #3335.

The qualification requires both:

1. the accepted V6R2 current root; and
2. the exact retained historical V4 predecessor at
   `/opt/.void-buy-void-epoch2-live-composition-v3.predecessor-v4`.

Both generations are included in every before/middle/after snapshot.

## V6R2 current generation

- accepted lock:
  `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`;
- candidate:
  `voidbuye2nativecand6r2_5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d`;
- native: 726976 bytes,
  SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- repaired runner: 45147 bytes,
  SHA-256 `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`.

The qualifier consumes the exact V5 upgrader source blob
`2f1a834e378c3ae8062140079c43beb16fad9d14`.

## Retained V4 predecessor

The predecessor must remain exactly:

- native: 722880 bytes,
  SHA-256 `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
- runner: 40616 bytes,
  SHA-256 `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- policy: 305 bytes,
  SHA-256 `d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc`.

## Future separately authorized read-only run

The V4 qualifier:

1. verifies the accepted V6R2 lock, current checkout, Git/setpriv/Node generations,
   installed V6R2 root, and retained V4 predecessor;
2. opens the installed native with `O_NOFOLLOW` and retains the descriptor;
3. hashes that retained descriptor and executes only
   `/proc/self/fd/<fd> --self-test`;
4. revalidates retained and visible generations;
5. repeats the complete snapshot/self-test sequence;
6. requires before/middle/after snapshots and both native transcripts to be stable.

The proof preserves the V3 pathname-swap adversary: only the retained original
native may execute; replacing the visible path cannot redirect execution and
forces qualification HOLD.

## Authority boundary

Hosted CI performs syntax, self-test, deterministic adversarial proof and inert
plan only.

The qualification does **not** execute the V6R2 runner and does not access
credential contents or private keys. It does not sign, construct/submit/
broadcast transactions, call RPC, accept payment, activate public presale/WC,
mutate services/systemd, perform treasury/liquidity actions, or move funds.

After a future GREEN installed qualification, the next separately authorized
gate is:

`SEPARATELY_AUTHORIZE_EPOCH2_V6R2_NATIVE_LIVE_COMPOSITION_V3`.

PROTECT THE CORE.
