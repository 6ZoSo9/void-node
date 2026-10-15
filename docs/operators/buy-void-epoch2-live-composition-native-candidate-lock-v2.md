# Buy VOID Epoch-2 live composition native candidate lock v2

Marker:
`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V2`.

Lock ID:
`voide2nativecandlock2_0d824d2f5a367b3f15e37b8ee80d2a6a16e647db06400a38bd9866e4baf310c2`.

Status: **candidate identity accepted; installation and live execution remain
unauthorized**.

## Accepted predecessor

Candidate PR generation:
`de1d19d8782405afa4d62ae670b11087d9c7e93e`.

Accepted source parent:
`907bc1780110717f4caaae06595ec742976162f1`.

Candidate source/qualification identities:

- candidate workflow:
  `f3f644ad6c1ee916465a5a471e5b8edb23d18e8d`;
- candidate operator document:
  `e1a0b0cf19947bd6364d980e08b571fdc37fa479`;
- native preentry source:
  `4aa091e7835b32aa5c4e7b8e4059651c69a64eb3`;
- V2 runner source:
  `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
- source trust proof:
  `4db3583c5c058a581fce69ef49312f7d3534b8ca`;
- source trust workflow:
  `85c28fdf03345240332cbf41d46fbda065958ec7`;
- sealed credential V2 source:
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Accepted candidate wire identity

The three independent #3200 derivations and cross-job compare produced one
byte-identical candidate:

```text
native_binary_sha256=78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589
native_binary_bytes=726976
runner_sha256=2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73
runner_bytes=30103
runner_install_mode=0444
cc_sha256=1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26
strip_sha256=0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42
```

The native executable is static and has no `PT_INTERP`.

## Lock proof

The lock proof independently:

1. requires the exact candidate/source Git blobs above;
2. requires the candidate PR generation and accepted source parent as
   ancestors of the lock generation;
3. recomputes the content-addressed lock ID;
4. rehashes the exact compiler and strip tool used by the accepted candidate;
5. recompiles and strips the native source with the candidate's deterministic
   flags;
6. requires the exact 726,976-byte native SHA-256;
7. independently verifies static/no-`PT_INTERP` shape and native self-test;
8. rehashes the exact runner source and requires its accepted SHA-256/length;
9. reruns runner self-test and inert plan;
10. requires repository cleanliness before and after the derivation.

A GREEN lock accepts only the reviewed candidate **identity**.

## Host-bound facts remain later

This lock deliberately does not freeze the future Precision policy's:

- `expected_head`;
- exact installed `/usr/bin/node` SHA-256/size;
- protected filesystem inode generations;
- installed policy bytes.

Those are at-use host facts. A separately reviewed protected installer must
bind them to this accepted native/runner identity immediately before
publication.

## Authority

GREEN means:

- `candidate_accepted=true`;
- `native_binary_identity_accepted=true`;
- `runner_identity_accepted=true`.

It still means:

- `install_authorized=false`;
- `live_execution_authorized=false`;
- `credential_access=false`;
- `private_key_access=false`;
- `transaction=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`.

No Precision installation, credential read, signing, transaction, payment,
activation, or funds movement occurs in this lock.

PROTECT THE CORE.
