# Buy VOID V7 provider-pair receipt installer V1

## Purpose

Provide the missing create-once operator path for the reviewed V7
provider-pair binding receipt without selecting providers in source and without
handling raw RPC URLs or API credentials.

The installer consumes only:

- a safe operator-approved identity label for each Base/Ethereum primary and
  secondary provider; and
- the SHA-256 fingerprint of each normalized RPC URL.

It never accepts or prints a raw RPC URL.

Before producing the provider-pair receipt it reads the canonical root-custodied
V7 deployment receipt and requires:

- root-owned, non-writable ancestors;
- root:root mode-0444 single-link receipt custody;
- stable O_NOFOLLOW descriptor identity;
- exact deployment receipt schema/content address;
- the current reviewed V7 source-file count and digest; and
- the current audited accepted enforcement set.

The resulting receipt is content-addressed by the canonical provider-pair
contract and is installed create-once at:

`/var/lib/void-source-finality-v7/provider-pair-binding-v1.json`

## Modes

`--plan` performs no host mutation.

`--apply` requires root plus exact confirmation:

`installBuyVoidSourceFinalityProviderPairReceiptV1`

A byte-identical existing receipt is accepted idempotently. A different or
metadata-invalid existing receipt HOLDs.

## Authority boundary

This installer does not:

- contact an RPC endpoint;
- read an RPC credential/API key;
- access a wallet/signer/private key;
- start/restart/reload a service;
- sign or broadcast a transaction;
- accept a payment;
- mutate Chain-2050/WC/inventory/treasury/liquidity;
- activate the presale; or
- move funds.

The installed receipt is one prerequisite only. V7 must still independently
verify the deployment receipt, same-live-process binding, provider observations,
quorum/finality, and the exact provider-pair receipt before production
source-finality authority may become true.

**PROTECT THE CORE.**
