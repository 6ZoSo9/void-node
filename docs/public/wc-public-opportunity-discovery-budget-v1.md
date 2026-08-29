# WC public opportunity discovery budget v1

Marker: `VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1`

This repair bounds one read-only public Work Credit discovery invocation as one
logical operation instead of granting each discovered route a fresh request,
analysis, or cleanup budget.

## Contract

Before any participant-visible `available` result is emitted, the tool builds one
complete normalized candidate set from:

- the canonical fallback paths;
- caller-supplied read-only paths; and
- only the explicit top-level `candidate_paths` array of the bounded well-known
  document.

Other JSON strings are data, not routing authority. Metadata, descriptions,
historical values, notes, or unrelated nested strings cannot create candidate
GETs or consume candidate slots merely because their text resembles a safe
public earning path.

That complete set may contain at most **24** candidate paths. The initial
well-known request is separate, so one invocation can start at most 25 read-only
HTTP requests. A primary well-known document that is itself a complete valid
`available` gateway does not bypass the complete-set ceiling.

Candidate execution is deliberately ordered so canonical fallback paths receive
a bounded opportunity before server-advertised hints can consume the shared
deadline. Caller-configured safe paths follow the canonical fallbacks, and
admitted advertised hints run last. This ordering changes only scheduling; the
complete union is still capped before any success terminal.

One monotonic `--timeout-ms` deadline covers the initial well-known request,
every later candidate request, admitted response-body reading, bounded JSON
structure admission, capability analysis, and the participant-visible terminal.
A result that becomes otherwise valid only after the deadline has expired cannot
be emitted as `available`; the logical terminal is
`discovery_deadline_exceeded`. Rejection cleanup is still initiated and its late
rejection/settlement is consumed, but this one-shot bounded CLI gives it no fresh
250 ms caller wait after the logical deadline expires.

Parsed discovery JSON has independent finite work authority: maximum depth 64
and maximum 4,096 visited nodes, enforced during one deadline-aware structure
admission pass. Over-budget structure fails closed before any candidate from
that document can be probed. Attempt summaries use only direct top-level marker
evidence and do not recursively re-walk untrusted bodies.

## Response-generation authority

Positive `available` evidence must be self-contained in one admitted HTTP
response generation. The tool does not retain gateway route, method, or safety
facts from response A and combine them with pilot/claim availability from later
response B merely because both came from the same origin.

A future split-response design would require a separately reviewed immutable
server-produced capability generation/root with exact equality across every
contributing response. Same origin and response order are not generation
authentication.

## Preserved evidence and authority boundary

The repair preserves:

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
  explicit candidate paths to HOLD after only the well-known GET;
- a bounded valid primary `available` document to remain usable after the full
  candidate set passes the ceiling;
- many safe-looking ambient path strings outside `candidate_paths` to contribute
  zero candidate authority and zero probes;
- an immediately healthy canonical gateway to remain reachable even when an
  advertised candidate would stall through the logical deadline;
- gateway authority from response A plus pilot/claim availability from response
  B to remain HOLD rather than become cross-generation `available`;
- slow candidates to share one logical deadline rather than receive fresh
  request budgets;
- a deadline-triggered stalled body whose cancellation never settles to return
  within the original logical budget rather than consume a new teardown window;
- malformed/oversized response rejection to preserve its exact primary reason;
- deep/wide bounded JSON to fail at the explicit structural budget with zero
  candidate probes;
- the production analysis function to fail closed when a deterministic monotonic
  clock crosses the deadline during post-body JSON admission/analysis; and
- the focused workflow to self-enforce shallow credentialless checkout, actual
  Node 22/24/26 configuration, `CI_DIFF_*` authority wiring, shared hygiene
  invocation, and the source/proof dependency bindings it executes.

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_BUDGET_V1_PROOF_GREEN
```

This is source/proof/docs/CI work only. It does not claim a ticket, dispatch
work, write Work Credits, access wallets or signers, submit transactions,
activate a runtime, or move funds.
