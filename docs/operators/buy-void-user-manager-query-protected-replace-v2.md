# Buy VOID protected authenticated-query replacement v2

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_REPLACE_V2`.

Status: **source-only guarded replacement contract; no live replacement is performed by CI or this PR**.

## Purpose

Precision already has the accepted V1 authenticated query pair installed at the
fixed path expected by the unchanged static preexec:

```text
/opt/void-buy-void-user-manager-query-v1/
  void_buy_void_user_manager_private_unit_query_preexec_v1
  void_buy_void_user_manager_private_unit_query_v1
```

The static preexec hard-codes that directory and query pathname, so the V2
query cannot simply be installed into a different root without changing the
preexec generation.

The accepted V2 lock keeps the preexec byte-identical and changes only the
dynamic query. This successor therefore defines an atomic replacement of the
fixed query file while retaining the exact V1 query inode for rollback.

## Accepted identities

V2 lock:

`voidbuyumqelflock2_295873e6ea531eb2fbbf60103633e742da94c8884f8360a909991c18085a5fc7`

Unchanged preexec:
- 706504 bytes;
- SHA-256 `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`.

Required installed predecessor query:
- 34872 bytes;
- SHA-256 `98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435`.

Accepted V2 query candidate:
- 43064 bytes;
- SHA-256 `af0f005f56693e785cd2bceaeea863aaaf4873d314b288f8eca5daebc0b98f32`.

## Apply state machine

A fresh apply requires:

- root execution under Python isolated mode;
- forbidden loader/Python environment absent;
- trusted root-owned `/`, `/opt`, and existing install root;
- exact unchanged V1 preexec;
- exact V1 query at the fixed query path;
- no predecessor path;
- no staging path;
- exact V2 candidate input bytes;
- explicit apply confirmation token.

The transaction then:

1. creates one exact root-owned mode-0555 V2 staging inode inside the protected install directory using create-only semantics;
2. fsyncs that inode and directory;
3. atomically exchanges staging and the fixed query pathname with Linux `renameat2(RENAME_EXCHANGE)`;
4. verifies the fixed path now contains the exact V2 query and staging contains the exact V1 query;
5. moves the V1 inode to the fixed predecessor name with `RENAME_NOREPLACE`;
6. fsyncs and re-verifies the V2 target, V1 predecessor, and unchanged preexec.

No query is executed by this transaction.

## Failure rollback

If a failure occurs after the exchange, the installer uses another atomic
exchange to restore the exact V1 query to the fixed path, verifies it, and
removes only the exact V2 staging/predecessor residue it created.

It reports `automatic_rollback_attempted=true` and `automatic_rollback_green=<true|false>`.

## Deliberate rollback

A separately confirmed rollback requires the exact successful V2 state:
V2 query at the fixed path plus exact V1 predecessor. It atomically exchanges
them, verifies V1 at the fixed path, verifies V2 in the predecessor slot, then
removes the V2 predecessor inode.

## Nonclaims

This transaction:
- does not replace the static preexec;
- does not execute the query;
- does not touch systemd or the live node service;
- does not read request/payment contents;
- does not access credentials, private keys, wallets or signers;
- does not accept payment, activate the presale/WC market, or move funds.

A separately versioned V2 live qualification must execute the replaced query
read-only before it can be used by request-root evidence.

PROTECT THE CORE.
