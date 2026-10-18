# Buy VOID Epoch-2 V6R2 native installed qualification V5

Marker: `VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V5`.

Status: **source/test/CI only**. No Precision qualification or live runner is
executed by this source generation.

## Purpose

V4 installed qualification was accepted for the pre-repair V6R2 atomic
upgrader. PR #3340 repairs publication/rollback receipt truth in that upgrader,
so V4 is frozen as historical evidence and must not be silently repinned.

V5 preserves the reviewed read-only qualification semantics and binds only the
repaired upgrader generation:

`fd7a06490ccf6fb14831d8b0372a892e2764c9dc`.

## Required protected state

A future separately authorized root run requires:

- current V6R2 protected root exactly GREEN;
- exact retained V4 predecessor root;
- accepted V6R2 candidate lock/candidate identities;
- exact expected checkout;
- exact Git, setpriv, and Node generations;
- stable current and predecessor metadata/hashes across before/middle/after;
- two byte-stable native `--self-test` transcripts.

The native is opened with `O_NOFOLLOW`, retained by descriptor, hashed through
that descriptor, and executed only through `/proc/self/fd/<fd>`.
A pathname replacement during execution is rejected even if the retained
original executable ran successfully.

## Generation identities

Current V6R2:
- native 726,976 bytes,
  SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- runner 45,147 bytes,
  SHA-256 `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- accepted lock
  `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`.

Retained V4 predecessor:
- native SHA-256
  `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
- runner SHA-256
  `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- policy SHA-256
  `d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc`.

## Authority boundary

Even a GREEN future host qualification remains read-only. It does not:

- execute the V3 live-composition runner;
- access credential contents or private keys;
- sign;
- construct, submit, or broadcast transactions;
- perform RPC calls;
- accept payment;
- activate public presale or WC/VOID;
- mutate service/systemd state;
- perform treasury/liquidity actions;
- move funds.

The next separately authorized runtime gate remains:

`SEPARATELY_AUTHORIZE_EPOCH2_V6R2_NATIVE_LIVE_COMPOSITION_V3`.

PROTECT THE CORE.
