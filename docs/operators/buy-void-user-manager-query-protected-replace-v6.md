# Buy VOID protected user-manager query replacement v6

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_REPLACE_V6`.

Status: **source/CI contract only; no Precision mutation is authorized by this
artifact**.

## Purpose

Advance the already-installed protected authenticated user-manager query from
the exact historical V2 host generation to the accepted V6 generation while
preserving predecessor evidence.

Current protected host state required before apply:

- static preexec: 706504 bytes, SHA-256
  `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- installed V2 query: 43064 bytes, SHA-256
  `d11304cb35be20dd4775677a2d5bf41c09f0f0b7a747ec7a8fea952e4bc8639c`;
- retained V1 predecessor: 34872 bytes, SHA-256
  `98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435`;
- no V2 predecessor path;
- no V6 staging residue.

The installed V2 identity is historical host evidence from lock
`voidbuyumqelflock2_c643213ce46d6f2b4dfe04675a7fbbcaad2b6aea40418cb921586362a054f474`.

## Accepted V6 target

Accepted lock:

`voidbuyumqelflock6_3627a98945579452b01c79b4d114c54d858122496f2b20a20ddfd7fae6b0307c`.

The corrected lock records the observed V5 live diagnostic separately from protected installation, and records the V6 disposable live probe separately from protected installation and production-host authority. V5 was superseded at the candidate-generation layer; V6 was successfully probed from disposable source bytes, but neither fact grants or implies protected `/opt` installation or production live-query authority.

V6 query:

- 43064 bytes;
- SHA-256
  `e791944bfa025a510d3693093668d71a9d122de8c581a924a1b45b4331ab43a6`;
- source Git blob
  `fc1f640689b7da7278ff013669ef8a10cd8f6659`.

The static preexec is not replaced.

## Protected state machine

Only two steady states are accepted.

Before replacement:

`V2_GREEN_WITH_V1_PREDECESSOR_READY_FOR_V6`

After replacement:

`V6_GREEN_WITH_V1_V2_PREDECESSORS`

The successful V6 state contains:

- V6 at the fixed query path;
- unchanged static preexec;
- retained V1 predecessor at
  `.predecessor-lock-v1`;
- retained V2 predecessor at
  `.predecessor-lock-v2`;
- no stage file.

Anything else fails closed.

## Apply

Apply requires:

- root;
- Python isolated mode;
- no loader/Python environment injection variables;
- exact accepted V6 candidate bytes;
- explicit confirmation token:

`ATOMIC_EXCHANGE_ACCEPTED_USER_MANAGER_QUERY_V2_TO_V6`.

The operation:

1. verifies the complete V2/V1 protected state;
2. creates an exact root-owned 0555 V6 stage;
3. fsyncs it;
4. atomically exchanges stage and installed V2 using
   `renameat2(RENAME_EXCHANGE)`;
5. verifies installed V6 and staged V2;
6. moves staged V2 to the V2 predecessor path using
   `RENAME_NOREPLACE`;
7. fsyncs and re-verifies V6, V2 predecessor, V1 predecessor and preexec.

The script executes no query and performs no service/systemd action.

## Automatic failure rollback

If apply fails after staging or exchange, the script attempts to restore exactly:

`V2_GREEN_WITH_V1_PREDECESSOR_READY_FOR_V6`.

Only a verified V6 residue may be removed during this recovery.

## Deliberate rollback

Emergency rollback requires the exact V6 green state plus confirmation token:

`ATOMIC_EXCHANGE_ROLLBACK_USER_MANAGER_QUERY_V6_TO_V2`.

It atomically exchanges V6 with the retained V2 predecessor, verifies V2,
keeps the V1 predecessor, removes the verified V6 predecessor residue and
requires the original V2-ready state.

## Authority boundary

Source and hosted CI do not authorize apply or rollback.

No query execution, service/systemd mutation, request/payment content read,
credential/key/wallet/signer access, payment acceptance, public presale/WC
activation, transaction, or funds movement occurs in this PR.

A separate actual-host read-only plan and a separate explicit operator
authorization are required before apply.

PROTECT THE CORE.
