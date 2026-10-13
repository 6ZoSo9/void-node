# Buy VOID Nimo V3 historical refusal / V4 current-generation qualification v1

This is a source/CI-only dependency-generation successor stacked on dependency
Draft #2865. It does not install or contact Nimo.

## Problem

The frozen Nimo V3 candidate proof is intentionally bound to the older
allocation-ledger generation:

```text
V3 ledger source Git blob =
66617a89d5ad9f81b5a21d98cca55fcda6902a80
```

Current source is the already-reviewed first-original ledger generation:

```text
current ledger source Git blob =
8d84955e1e093a5c5af63241e62b8722fadd2f29
```

Current main already contains the explicit V4 inactive successor for that ledger
generation. The dependency remediation branch changes the package generation as
well:

```text
package.json =
14fbdf5717b07fd4c734f5da7a8e84ed59bee93f

package-lock.json =
15b5c82ea36f13079a2f9e8863722f654eb3f201
```

The old V3 workflow therefore must not repin or relabel V3 as current.

## Closed generation dispatch

The existing V3 workflow is changed to recognize only two generations.

Historical V3:

- historical package/lock pair;
- historical V3 ledger generation;
- executes the original V3 candidate, V3 runtime qualification and V3 evidence
  proof unchanged.

Audited current V4:

- exact audited #2865 package/lock pair;
- current ledger
  `8d84955e1e093a5c5af63241e62b8722fadd2f29`;
- current replay source
  `b451bcd895986dadaf6e53954671062068316ccf`;
- frozen V3 must fail closed specifically on the allocation-ledger source drift;
- current V4 inactive bundle must reproduce its exact existing content-addressed
  candidate.

Every mixed or unknown generation HOLDs.

## Current V4 identity

The positive current-generation proof preserves the existing V4 identities:

- candidate:
  `voidwfb4_b5d9516e5fa462ca7ed2333ebe3ef715eaf62ecdd3c0a6b049ecc9eb1e1659c2`;
- canonical inactive archive: 266240 bytes;
- archive SHA-256:
  `6bb01af17cc87dfb42b63942143458f3e95990d8ae1ef6c1671fc5cd7d4feaf8`;
- current compiled ledger: 47309 bytes;
- ledger SHA-256:
  `51de81388631ecef2a8c3feea68960040ccbda75fd29ada171cb9c9c7b53188a`.

The proof performs V4 plan, create-once package, independent archive inspection,
private-stage plan and the existing disposable private-stage self-test. It
compares one normalized receipt byte-for-byte across Node 22, 24 and 26.

## Historical preservation

The V3 proof is not changed. On the current generation it must report the exact
ledger source drift from historical `66617a89...` to current `8d84955e...`.
That refusal is evidence, not a defect to suppress.

The V4 builder and private-stage source are likewise pinned by exact Git blob.

## Authority boundary

All of the following remain false:

```text
live_nimo_installed=false
verified_payment_to_allocation_mounted=false
custody_reserve_or_recover_enabled=false
production_gate_ready=false
presale_activation=false
funds_moved=false
```

This work performs no SSH, Nimo installation, authorized-keys change, root
write, service action, customer/payment/allocation mutation, wallet/key/signer
access, transaction, Chain-2050/WC mutation, market/presale activation,
inventory/treasury/liquidity action or funds movement.

This child must not merge independently of #2865.
