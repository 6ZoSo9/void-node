# Buy VOID history-carrier runtime binding v1

Marker: `VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1`

Status: source/runtime binding only. The live carrier authority is now durable on
Precision, but this gate **does not** authorize payment-keyed runtime enablement
or apply.

## Purpose

The dormant host previously carried one fixed snapshot pin:

```text
VOID_BUY_VOID_HISTORY_CARRIER_ROOT_SHA256=
32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a
```

That remains valid evidence for the dormant generation, but it is not a live
rotation mechanism.

The durable authority created by #1739 and initialized on Precision must be the
runtime's server-owned source of current carrier truth before any later enable
transition is considered.

## Runtime selector

The source gate adds one server-controlled path selector:

```text
VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_ROOT
```

It is a local private directory path, not a carrier-root hash and not
request/caller material.

Production host custody currently uses:

```text
/home/zoso/.local/state/void-buy-void-history-carrier-root-authority-v1
```

The reviewed designated-host systemd carrier is:

```text
ops/systemd/void-node-live.service.d/95-buy-void-history-carrier-runtime-binding-v1.conf.example
```

It contains exactly one `Environment=` assignment—the authority-root selector—
and does not set either payment-keyed enable flag, parent runtime enablement,
credentials, or service lifecycle directives.

The runtime binding accepts only an absolute normalized direct authority root
whose durable snapshot revalidates through
`readBuyVoidHistoryCarrierRootAuthoritySnapshotV1`.

## Required durable snapshot

The binding requires:

- authority mode `production`;
- pool exactly `buy-void-presale-v1`;
- at least generation 1;
- contiguous verified generation count equal to current generation;
- at least one verified referenced page;
- page publication complete;
- zero missing page digests;
- exact current carrier-root/index-root/generation-record bindings; and
- runtime/apply/public activation authorization all still false in the authority
  snapshot.

The current generation and root are read dynamically from durable authority.
They are not part of a mutable systemd root-hash setting.

## Full-runtime binding

`buyVoidPaymentKeyedFullRuntimePolicyStateV1` now requires a valid carrier
runtime binding and binds the durable authority identity and canonical authority
root realpath fingerprint into the full-runtime policy fingerprint.

Status may report the current durable generation/root/index record for operator
inspection.

The policy fingerprint deliberately binds the stable authority identity, not the
current carrier generation/root. Future verified successors can therefore
advance durable carrier truth without a service restart or environment rewrite.

## Activation hold

This gate intentionally reports:

```text
successor_publication_mounted=true
runtime_activation_ready=true
activation_hold_reason=history_carrier_successor_publication_not_mounted
```

The full runtime fails closed **before stage selection** while that condition is
false.

That means setting the runtime enable flag prematurely cannot preview, sign,
broadcast, reconcile, close out inventory, or move funds.

A later separately reviewed source gate must mount verified carrier-successor
publication at the correct payment-history mutation boundary before this
activation hold may become true.

## Authority boundary

This source gate performs only bounded read-only carrier-authority validation and
runtime-policy binding.

It does not:

- mutate the durable carrier authority;
- publish a successor carrier root;
- alter systemd;
- restart a service;
- enable the payment-keyed runtime;
- enable apply;
- activate public Buy VOID;
- read credential content;
- access a wallet or signer;
- call Chain-2050 RPC;
- sign or broadcast;
- write Chain-2050;
- mutate inventory;
- mutate treasury/liquidity; or
- move funds.

## Next gate

After source acceptance, install only the authority-root path selector on
Precision while both existing payment-keyed child flags remain `0`.

Then prove the live process can read the initialized production authority
without changing PID/invocation or enabling runtime/apply.

Only after that host binding is GREEN should successor-publication runtime
integration be considered.

Refs #1683 #1739 #1744.
