# Public Earn inner rate backstop profile v1

## Purpose

This source-only profile closes the configuration gap identified after the
PROXY-v2 Public Earn source meter and dedicated mutation listener were composed.

The outer Earn edge meters authenticated PROXY-v2 transport sources at:

- claim: 6 requests per source per 60 seconds;
- submit: 30 requests per source per 60 seconds.

The dedicated gateway listener receives those admitted requests over IPv4
loopback. Its existing limiter therefore sees one loopback peer and must not be
left at the same 6/30 ceilings, because one outer-limited caller could consume
that inner bucket and deny another caller.

## Canonical dedicated profile

When and only when the gateway is deployed in
`mutation_ingress.mode=dedicated_loopback` behind the reviewed outer source
meter, the gateway service configuration must set exactly:

```text
VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE=60
VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE=300
```

These values are already within the adapter's reviewed bounds. No adapter source
change is required.

The inner loopback limiter is therefore an aggregate secondary backstop, not a
participant-identity limiter. One fully exhausted outer claim source can consume
at most 6 of 60 inner claim slots, and one fully exhausted outer submit source can
consume at most 30 of 300 inner submit slots. A second source retains its full
outer budget after the first source reaches its outer limit.

The profile intentionally preserves a bounded aggregate wall: ten fully utilized
outer-source budgets can fit before the corresponding inner backstop is reached.

## Trust boundary

This profile does not carry public source identity into the adapter and does not
trust `Forwarded`, `X-Forwarded-For`, `X-Real-IP`, or another caller header.

The authenticated source decision remains at the PROXY-v2 Earn edge. The
adapter's loopback peer address is explicitly not participant identity in
dedicated mode.

The historical shared-listener mode is not changed by this profile. In
`shared_legacy_hold`, the existing peer-address limiter semantics remain as
they are and the mode remains unsuitable for designated public mutation
acceptance.

## Required deployment composition

A live deployment may claim this profile only if all of the following are true:

- the reviewed PROXY-v2 Earn edge is the only admitted local caller of the
  dedicated mutation listener;
- the outer edge retains the reviewed 6/30 per-source 60-second limits;
- the gateway is in `dedicated_loopback` mode;
- the two canonical environment values above are installed on the gateway
  service;
- the old direct/shared public mutation publication is removed or fails closed;
- listener ownership and local nftables/UID isolation are separately verified.

This document grants none of those host/runtime facts by itself.

## Authority boundary

Source policy/test/CI only.

No service installation or restart, systemd mutation, Funnel/Serve, nftables,
network or DNS mutation, credential issuance, paid-work dispatch, Work Credit
write, wallet/key/signer access, transaction, Chain-2050 write, payment,
presale/market activation, validator action, treasury/liquidity action, or funds
movement is authorized or performed.
