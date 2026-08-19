# WC public opportunity discovery budget v1

Marker: `VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1`

This repair bounds one read-only public Work Credit discovery invocation as a
single logical operation instead of treating every discovered candidate as a
fresh independent request budget.

## Contract

The discovery tool now enforces both limits before participant-visible
availability can be accepted:

- at most **24** normalized same-origin candidate paths may be considered after
  combining caller-supplied paths, paths advertised by the bounded well-known
  document, and the canonical fallback paths; and
- one monotonic `--timeout-ms` deadline covers the initial well-known request
  plus every later candidate request and response-body settlement.

The well-known request is separate from the 24 candidate-path ceiling, so one
invocation can start at most 25 read-only HTTP requests. Later candidates receive
only the remaining time from the original logical deadline. When the candidate
set exceeds the reviewed ceiling, the tool fails closed before probing any of
those candidate routes.

## Why this matters

Before this repair, a bounded well-known response could advertise many unique
same-origin status paths. The tool would probe them sequentially and grant each
probe a fresh full timeout. A single discovery invocation could therefore expand
into an unreviewed request count and wall-clock lifetime even though every
individual response was separately size- and timeout-bounded.

The repair does not change the evidence required for `available`. It preserves
public HTTPS / reviewed-private HTTP admission, GET-only transport, strict pilot,
gateway, claim, authentication/replay and fixed-3-WC evidence, 64 KiB response
ceilings, bounded rejected-body teardown, and zero ticket/WC/wallet/settlement
authority.

## Focused adversarial proof

```bash
node scripts/prove_wc_public_opportunity_discovery_budget_v1.mjs
```

The proof requires:

- an over-limit well-known candidate list to fail after the well-known request
  with zero candidate probes; and
- two slow candidate routes to share one 300 ms logical deadline rather than
  consuming independent full request timeouts.

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1_PROOF_GREEN
```

This is source/proof/CI work only. It does not claim a ticket, dispatch work,
write Work Credits, access wallets or signers, submit transactions, activate a
runtime, or move funds.