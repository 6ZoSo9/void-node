# Buy VOID Epoch-2 dormant binder installed qualification V2R

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLED_QUALIFICATION_V2R`.

Status: **read-only qualification source; live host execution remains separately authorized**.

## Purpose

This is the versioned read-only rebound successor to historical V2 after the
canonical installer gained the authenticated native first-entry boundary.

Historical V2 remains frozen against the pre-first-entry installer generation
and is not repinned. V2R preserves the same installed-root/native-self-test
qualification semantics while binding the repaired installer generation.

It consumes only the hardened installer generation whose source Git blob is:

`f3d6b1559be7490303cf36338c4bfa38fdaa390a`.

The installed root is fixed at:

`/opt/void-buy-void-epoch2-dormant-v3r-binding-v2`.

## Read-only qualification contract

A future separately authorized root run requires an exact expected clean
`main` HEAD and independently verifies:

- accepted dormant-binder lock V3;
- exact candidate ID;
- protected installer state
  `DORMANT_BINDER_NATIVE_PAIR_GREEN`;
- root-owned mode-0755 install root;
- exactly two direct children and no extras;
- native preentry root:root mode 0555, 726,976 bytes, exact SHA-256;
- binder JavaScript root:root mode 0444, 39,391 bytes, exact SHA-256;
- visible/opened directory and file generations remain identical.

The qualifier takes three complete installed snapshots:

1. before the first native self-test;
2. between the two self-tests;
3. after the second self-test.

All three snapshots must be identical.

## Bounded executable action

The only executable action in a future `--run` is the installed native
preentry's inert `--self-test`.

The qualifier:
- opens the exact installed native with `O_NOFOLLOW`;
- retains its file descriptor;
- rehashes the retained bytes;
- executes only `/proc/self/fd/<fd> --self-test`;
- passes only that FD;
- requires the exact reviewed self-test transcript;
- revalidates retained and visible native generation after execution;
- repeats the self-test and requires identical output.

The binder JavaScript is **never executed** by this qualification. It is
metadata/content evidence only.

## Authority boundary

Even a GREEN future qualification keeps:

```text
read_only=true
binder_execution=false
live_binding_execution=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
customer_safe_to_pay=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

Hosted CI executes only source syntax, self-test, inert plan, adversarial/static
proof, and diff hygiene. It does not access Precision's protected install root.

V2R source existence or hosted GREEN does not prove the repaired installer has
been applied on Precision. A future separately authorized host run must still
observe the exact installed dormant-binder generation before any live binding
authority can be considered.

After a separately authorized GREEN installed qualification, the next gate is:

`SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING`.

A GREEN V2 binding receipt would then leave the existing three launch gates:
Chain-2050 receipt/fee envelope, one-payment/one-fulfillment canary, and coupled
presale + WC/VOID Sovereign activation.

PROTECT THE CORE.
