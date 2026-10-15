# Epoch-2 authenticated credential + signer-control binding v2

## Purpose

This successor replaces the stale V1 signer-control composition with an
unprivileged V2 runner stacked on #3190.

It binds the accepted historical Epoch-2 signer-control evidence only after a
fresh protected V2 dormant-candidate credential-binding child has completed.

## Privilege boundary

The V2 signer-control runner itself must execute as UID 1000 and must not run as
root.

Its own reviewed Git object may be streamed into an unprivileged Node process.
That process executes the exact V2 binder child as another unprivileged Node
process. The child binder is responsible for the only privileged transition:
its fixed native preentry from #3184.

Therefore this layer does not create a second root-JavaScript stdin boundary.

## Exact child generation

Required child source:

```text
ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v2.mjs
Git blob 20105c8ff7ac35aac0f0f2fcbe8884ba441f5870
```

The child receipt must be V2 and must prove:

- systemd credential identity;
- active non-transaction signing capability;
- protected first-entry authentication;
- native preentry policy binding;
- root Node descriptor execution binding;
- retained runner descriptor binding;
- caller stdin JavaScript forbidden;
- exact checkout revalidation after the child;
- transaction/payment/presale/WC/funds authority false.

No caller-supplied child receipt JSON is accepted.

## Accepted signer-control evidence

The historical accepted objects remain immutable:

- dormant candidate v2:
  `6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1`;
- dormant candidate v2 proof:
  `863ea6fcef568314e43ea8994bf495e126b5a434`;
- signer-control public evidence:
  `361aea8767f8b049fafd28663b71b177f38f180d`;
- signer-control verifier:
  `d0f3c575903a44b9a538f0201257584545077be9`;
- signer-control proof:
  `8b34c9c43e28122d7509febfb8f5ab9a001a1b43`.

These are verified as exact Git objects and parsed as data. They are not
re-executed as live authority.

## Composition

The combined V2 receipt may state:

- accepted signer off-chain control evidence bound;
- launch-operator signer-control evidence bound;
- systemd credential identity proven;
- active non-transaction signing capability proven;
- runtime source generation bound;
- authenticated private-manager generation bound;
- protected first-entry authentication proven;
- current system credential matches the immutable fulfiller identity.

It still must state:

- transaction signing unproven;
- transaction broadcast unproven;
- customer_safe_to_pay=false;
- payment acceptance=false;
- public presale activation=false;
- WC/VOID activation=false;
- funds movement=false.

## Remaining gates

After this layer the explicit remaining sequence is:

1. live fee envelope + exact Chain-2050 receipt;
2. one-payment/one-fulfillment bounded canary;
3. coupled presale + WC/VOID sovereign activation.

## Authority

Source/proof/docs/CI only.

No live credential access, live signing, service mutation, transaction,
payment acceptance, public presale/WC activation, treasury/liquidity action,
or funds movement is authorized.

PROTECT THE CORE.
