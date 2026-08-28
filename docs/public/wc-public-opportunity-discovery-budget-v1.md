# WC public opportunity discovery budget v1

Marker: `VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1`

This repair bounds one read-only public Work Credit discovery invocation as one
logical operation instead of granting each discovered route a fresh request or
cleanup budget.

## Contract

Before any participant-visible `available` result is emitted, the tool builds one
complete normalized candidate set from:

- caller-supplied read-only paths;
- paths advertised by the bounded well-known document; and
- the canonical fallback paths.

That complete set may contain at most **24** candidate paths. The initial
well-known request is separate, so one invocation can start at most 25 read-only
HTTP requests. A primary well-known document that is itself a complete valid
`available` gateway does not bypass the complete-set ceiling.

One monotonic `--timeout-ms` deadline covers the initial well-known request,
every later candidate request, admitted response-body reading, and all
caller-visible rejection handling. Rejection cleanup is still initiated and its
late rejection/settlement is consumed, but this one-shot bounded CLI gives it no
fresh 250 ms caller wait after the logical deadline expires.

Parsed discovery JSON has independent finite work authority: maximum depth 64
and maximum 4,096 visited nodes. Over-budget structure fails closed before any
candidate from that document can be probed.

## Preserved evidence and authority boundary

The repair does not change the evidence required for `available`. It preserves:

- public HTTPS and reviewed private/dev HTTP admission;
- same-origin GET-only discovery;
- strict gateway, pilot, claim, authentication/replay, and exact fixed-3-WC
  evidence;
- the 64 KiB response ceiling and fatal UTF-8 admission;
- exact primary rejection reasons distinct from true deadline expiry; and
- zero ticket issuance, Work Credit write, wallet, signer, settlement, runtime,
  or funds authority.

## Focused adversarial proof

```bash
node scripts/prove_wc_public_opportunity_discovery_budget_v1.mjs
```

The proof requires:

- an otherwise-valid `available` well-known document advertising more than 24
  candidate paths to HOLD after only the well-known GET;
- a bounded valid primary `available` document to remain usable after the full
  candidate set passes the ceiling;
- slow candidates to share one logical deadline rather than receive fresh
  request budgets;
- a deadline-triggered stalled body whose cancellation never settles to return
  within the original logical budget rather than consume a new teardown window;
- malformed/oversized response rejection to preserve its exact primary reason;
  and
- deep/wide bounded JSON to fail at the explicit structural budget with zero
  candidate probes.

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1_PROOF_GREEN
```

This is source/proof/CI work only. It does not claim a ticket, dispatch work,
write Work Credits, access wallets or signers, submit transactions, activate a
runtime, or move funds.
