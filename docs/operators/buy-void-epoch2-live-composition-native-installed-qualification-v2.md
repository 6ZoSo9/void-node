# Buy VOID Epoch-2 native installed qualification v2

Marker:

`VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V2`.

Status: **read-only installed-state qualification source; live run remains separately authorized**.

## Purpose

V2 is the read-only successor to protected installer V2 and the V3 protected namespace.

It verifies only the installed privileged first-entry generation. It does **not**
run the live V3 composition runner, touch credentials, sign, transact, or mutate
the host.

## Bound installer generation

Reviewed installer:

`ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v2.py`

Git blob:

`c565c2f2327586e58100aaad4954602b85e7ebdb`.

A future separately authorized run therefore inherits the exact V4 accepted
lock, V3 namespace, V3 policy, Node/Git/setpriv checks, and clean-main checkout
binding from that installer generation.

## Read-only qualification sequence

A future root run requires an exact expected 40-hex main HEAD.

It:

1. loads the exact installer V2 source;
2. verifies the V4 accepted lock;
3. verifies fixed checkout/head/blob set;
4. measures fixed Git, setpriv, and Node;
5. rebuilds the exact V3 policy in memory;
6. requires protected state
   `EPOCH2_LIVE_COMPOSITION_V3_PROTECTED_INSTALL_GREEN`;
7. snapshots root/native/runner/policy plus host-tool and checkout generations;
8. opens the installed V3 native with `O_RDONLY|O_NOFOLLOW`;
9. hashes the retained descriptor and requires the accepted V4 native identity;
10. executes **only** that retained native FD with `--self-test`;
11. revalidates retained FD and visible native identity;
12. repeats the installed snapshot + retained-FD self-test;
13. requires before/middle/after installed generations identical and both
    self-test transcripts byte-identical.

## Executed-generation binding

The native self-test is not reopened by pathname after verification. Execution
uses:

`/proc/self/fd/<fd>`

with the exact retained descriptor passed into the child.

The source proof performs a pathname-swap adversary between descriptor
retention and execution. The retained original must execute; the replacement
path must not execute; visible-generation drift must fail qualification.

## V3 native self-test boundary

The required native marker is:

`VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN`.

The self-test exits before the native live path. It proves fixed-path/policy
mechanics without running the V3 live-composition runner.

The qualifier reports:

```text
runner_execution=false
live_composition_execution=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## Authority

Hosted CI runs only syntax, synthetic/source self-tests, the pathname-swap
proof, and inert `--plan`.

It performs no protected installation, production native self-test, live
composition, credential read, signature, transaction/RPC, payment acceptance,
presale/WC activation, treasury action, or funds movement.

A future live `--run` remains separately authorized.

After a GREEN separately authorized installed qualification, the next sensitive
gate is:

`SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_LIVE_COMPOSITION_V3`.

That later operation can reach the sealed credential child and perform a
non-transaction signature; this source grants none of that authority.

PROTECT THE CORE.
