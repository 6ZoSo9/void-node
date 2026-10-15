# Epoch-2 dormant candidate live binding v2

## Purpose

This is the protected-entry successor to the historical V1 dormant-candidate
binder. It is stacked on #3184 and consumes #3184's native-preentry-bound V2
live-composition receipt rather than executing root JavaScript from caller
stdin.

The binder itself remains unprivileged.

## Exact child boundary

Source provenance is pinned to:

- V2 live runner Git blob
  `8ab77a4f0782f228171a2895641a56cb37c5659e`;
- native preentry source Git blob
  `4aa091e7835b32aa5c4e7b8e4059651c69a64eb3`;
- dormant candidate Git blob
  `2c861c021192c034c98404989cd25b26788cd0f0`.

Live child execution is only through the fixed installed native entry:

```text
/opt/void-buy-void-epoch2-live-composition-v2/
  void_buy_void_epoch2_live_composition_native_preentry_v1
```

The binder opens `/dev/null` itself and passes that descriptor as child stdin.
It invokes the fixed native entry through fixed `/usr/bin/sudo -n`. It never
streams JavaScript across the root boundary.

A future operator run therefore requires either a valid cached sudo
authentication established separately with `sudo -v` or an independently
reviewed non-interactive sudo policy. The binder itself does not handle or read
a sudo password.

## Binder execution boundary

The binder is intended to run as UID 1000, not as root.

Its own reviewed bytes may still be streamed from an exact Git object into an
unprivileged Node process. That is not a privileged first-instruction boundary.

Before and after the native child it requires the exact expected checkout:

- exact 40-hex HEAD;
- branch `main`;
- clean tracked and untracked state;
- replacement objects disabled;
- global/system Git configuration disabled.

It independently verifies that the expected source head contains the pinned V2
runner and native-preentry source blobs before invoking the installed child.

## Required V2 child truth

The returned child receipt must be the V2 content-addressed generation and must
prove:

- `privileged_first_entry_authenticated=true`;
- native preentry policy bound;
- root Node descriptor execution bound;
- retained runner descriptor bound;
- native parent retained for the complete Node-child lifetime;
- parent/child Linux process start-time generations bound;
- installed native/runner/Node generations bound;
- native parent + installed generations revalidated after the sensitive sequence;
- stdin JavaScript forbidden;
- sealed V2 credential generation retained through signing;
- sealed V2 final-observation generation revalidation;
- sealed V2 immediate pre-close generation revalidation;
- transaction/payment/presale/WC/funds authority false.

The embedded sealed receipt itself retains
`privileged_first_entry_authenticated=false`, because the sealed child does
not prove its own caller. The outer V2 live-composition receipt is the source
that binds the native entry.

## Dormant candidate binding

After the protected child returns, the binder revalidates the exact checkout
again and only then constructs the V2 dormant-candidate binding receipt.

The binding may promote these facts from the protected child:

- systemd credential identity proven;
- active non-transaction signing capability proven;
- runtime source generation bound;
- authenticated private-manager generation bound;
- protected first entry authenticated;
- surviving native-parent process/installed-generation provenance proven.

It still leaves the following HOLD:

- accepted Epoch-2 signer-control composition;
- live fee envelope and exact Chain-2050 receipt;
- one-payment/one-fulfillment canary;
- coupled presale and WC/VOID sovereign activation.

`customer_safe_to_pay=false` remains explicit.

## Operator shape

A future separately authorized live run is expected to use a clean exact-main
checkout and a reviewed binder Git object, for example conceptually:

```bash
sudo -v
# verify exact main/head and binder object first
/usr/bin/node --input-type=module - --run \
  --confirm RUN_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2 \
  --expected-head <accepted-head> \
  < <(/usr/bin/git show <accepted-head>:ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v2.mjs)
```

The Node process above remains unprivileged. Its child root transition is
restricted to the fixed native preentry, and the child receives `/dev/null`
rather than binder/operator stdin.

This document does not authorize that live command.

## Authority

Source/proof/docs/CI only.

No live credential access, live signing, protected installation, service
mutation, transaction, payment acceptance, customer payment authorization,
public presale activation, WC/VOID market activation, treasury/liquidity action,
or funds movement is authorized.

PROTECT THE CORE.
