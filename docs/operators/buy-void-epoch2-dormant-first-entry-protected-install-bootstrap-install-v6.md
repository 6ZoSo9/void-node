# Buy VOID Epoch-2 dormant first-entry protected bootstrap install V6

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6`.

Status: **source/test/CI only; no Precision apply is performed by this change**.

## Purpose

Install the accepted dormant first-entry V6 bootstrap into the fixed protected
root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`.

The root contains exactly:

- `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`;
- `source-generation-v3.conf`;
- `policy-v1.conf`.

The accepted bootstrap input is the static V6 ELF published by the merged
materializer:

- bytes: `874608`;
- SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- Git blob:
  `a91707c3e5803071fc73c3451c9bcb3b774f8b48`.

The source-generation V3 manifest is:

- bytes: `2382`;
- SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- Git blob:
  `6e0630af72111bd9976dcc38cdcdada1904dd067`.

Accepted V6 lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`.

## Host policy

The hosted materializer deliberately cannot manufacture the host policy.

A real Precision plan resolves and snapshots the exact root-custodied targets of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

It then constructs exactly:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal>
git_sha256=<64 lowercase hex>
git_bytes=<positive decimal>
```

Those are the same two host-tool identities authenticated by the installed V6
bootstrap before it can invoke the inner V5 installer.

## Read-only plan

A future host plan requires:

- clean exact `main` at explicit `--expected-head`;
- exact accepted V6 lock from that Git object;
- exact accepted mode-`0555` bootstrap artifact;
- exact mode-`0444` source-generation V3 manifest artifact;
- byte equality between the supplied manifest and the exact Git object;
- stable root-custodied Python/Git generations;
- absent staging root;
- either absent final root (READY) or an already exact GREEN root.

The deterministic plan ID prefix is:

`voidbuye2bootstrapinstall6_`.

## Separately authorized create-only apply

Apply requires the exact plan ID and confirmation token:

`INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_CREATE_ONLY`.

It:

1. revalidates all plan bindings;
2. creates a private staging generation beneath `/opt`;
3. writes the accepted bootstrap, exact manifest and host policy create-only;
4. root-owns and mode-binds every object;
5. fsyncs files/directories;
6. verifies the complete staged generation;
7. revalidates checkout, lock, Python/Git and candidate inputs;
8. publishes once with `renameat2(RENAME_NOREPLACE)`;
9. fsyncs `/opt`;
10. verifies the final installed generation again.

Pre-publication failure cleanup is generation-bound. Cleanup failure fails
closed. Once publication may have occurred, rollback is forbidden and a failure
is reported as `published_needs_inspection`.

## Authority boundary

The install lane does **not** execute:

- the V6 bootstrap;
- the inner V5 installer;
- the dormant binder;
- any credential/private-key path;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale/WC activation;
- treasury/liquidity action;
- service/systemd mutation;
- funds movement.

A future GREEN host install advances only to a separately authorized installed
read-only qualification for the V6 bootstrap root.

PROTECT THE CORE.
