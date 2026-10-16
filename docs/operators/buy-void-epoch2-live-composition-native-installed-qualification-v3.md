# Buy VOID Epoch-2 V6 native installed qualification V3

Marker: `VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V3`.

Status: **source/test/CI only**. This PR does not execute the qualification on Precision.

## Purpose

Qualify the post-upgrade protected generation after the atomic V4-to-V6 root
transition.

The qualification requires both:

1. the accepted V6 current root; and
2. the exact retained historical V4 predecessor at
   `/opt/.void-buy-void-epoch2-live-composition-v3.predecessor-v4`.

Both generations are included in every before/middle/after snapshot.

## V6 current generation

- native: 726976 bytes,
  SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- repaired runner: 45147 bytes,
  SHA-256 `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- candidate lock:
  `voidbuye2nativecandlock6_016c2764d5d33c9078fd5120addd2ff7ef25c8d6bf30d5d6741b05a5036a1f22`.

## Retained predecessor

The retained predecessor must remain exactly:

- native: 722880 bytes,
  SHA-256 `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
- runner: 40616 bytes,
  SHA-256 `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- policy: 305 bytes,
  SHA-256 `d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc`.

## Read-only run

A future separately authorized root run:

1. verifies the accepted lock, exact expected checkout, Git/setpriv/Node
   generations, current V6 root, and retained V4 predecessor;
2. opens the current native with `O_NOFOLLOW` and retains the descriptor;
3. hashes the retained descriptor and executes only
   `/proc/self/fd/<fd> --self-test`;
4. revalidates retained and visible generations;
5. repeats the complete snapshot/self-test sequence a second time;
6. requires before/middle/after snapshots and both native transcripts to be
   byte-stable.

The proof includes a pathname-swap adversary: the retained original native is
the only executable reached; a replacement visible path is not executed and
the qualification rejects the generation change.

## Authority

The qualification does not execute the repaired V3 runner and does not access
credential contents or private keys. It does not sign, construct/submit/
broadcast transactions, make RPC calls, accept payment, activate presale/WC,
mutate services/systemd, perform treasury actions, or move funds.

After a future GREEN host qualification, live composition remains a separate
authorization gate behind the native operator-first-entry successor.

PROTECT THE CORE.
