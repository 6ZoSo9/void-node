# VOID App Buy presale launch-ready v1

Historical filename: `void-app-buy-presale-readonly-v1.md`

Marker: `VOID_BUY_VOID_APP_LAUNCH_READY_V1`

This contract supersedes the earlier static/read-only Buy shell. The Buy view is
now prepared for the already-reviewed guarded request-creation route, while
remaining fail-closed until the live checkout configuration reports that intake
is enabled.

The browser reads `/__void/buy-void/config.json`,
`/__void/buy-void/status.json`, and `/__void/buy-void/sale-state.json`.
The request form remains disabled unless request intake, payment readiness,
receiver binding, request-intake readiness, and remaining verified inventory
are all green. A readiness refresh immediately enters an explicit pending state,
invalidates the previously accepted snapshot, and keeps Submit disabled until a
newly fetched snapshot passes the complete OPEN contract.

The participant-visible policy price remains mechanically bound to the
canonical `VOID_BUY_PRICE_USDC_PER_VOID` default in `src/index.ts`.

## Readiness-generation binding

A confirmed checkout response is actionable only within the exact browser
readiness generation under which its POST began. The unauthenticated public edge
intentionally exposes only the bounded launch-authority expiry, not internal
activation-generation or receipt identifiers. Therefore any later readiness GET
(including OPEN → OPEN) permanently retires the prior payment instructions to a
conservative prior-request warning. The attempted intent remains no-retry.

An uncertain POST outcome is not payment authority and remains visible as a
warning across readiness refreshes.

## Request boundary

When the gate is OPEN, the page may POST one guarded request to
`/__void/buy-void/request`. It does not connect a wallet, approve USDC, sign a
message or transaction, or send funds.

Request creation retains the reviewed acknowledgements for self-custody,
native USDC on the explicitly selected Base or Ethereum rail,
request-before-payment, sender/destination identity, and the fulfillment
boundary.

Before displaying returned payment instructions, the browser also fails closed
unless the response has the reviewed checkout-result schema, the returned VOID
destination matches the submitted self-custody destination, the returned USDC
amount matches the submitted amount exactly at six-decimal USDC precision,
the returned source chain, chain ID, token contract, and receiver all match the
selected rail, and the returned safety object still
states manual review with automatic fulfillment disabled.

The live snapshot is type-closed rather than coercion-based. Canonical price/rate
policy values must remain the reviewed decimal strings (`0.50` and `2`);
request limits must be finite numeric JSON values representable exactly at six
USDC decimals; sale accounting must be finite numeric JSON values in the
reviewed non-negative domains. Booleans, arrays, null, padded/blank strings,
exponent strings, and other coercible values cannot open the form. All checkout JSON
responses are additionally capped at 131,072 bytes and decoded as strict UTF-8
before parsing; oversized, malformed, or non-JSON responses fail closed.

## Exchange/custody warning

SELF-CUSTODY ONLY. VOID is not listed on any exchange. The selected-rail USDC
sender address is the VOID delivery identity. An exchange or pooled custodian can send
from an address the participant does not control, causing the resulting VOID
delivery to be inaccessible to that participant. VOID cannot recover those
funds. The UI instructs participants to treat exchange/custodial sends as lost.

## WC/VOID and Earn

The Buy page links to separate WC/VOID launch-status and Earn views. Neither
link grants market authority. Useful verified work earns Work Credits; the
future WC/VOID exchange rate is market-determined and is not fixed by the
presale price.

## Authority boundary

- request record creation: activation-gated
- browser wallet connection: false
- token approval: false
- transaction signing: false
- USDC send by page: false
- VOID transfer by page: false
- automatic fulfillment authority created here: false
- WC/VOID trading authority created here: false
- funds movement by this UI source: false

## Proof

```sh
node scripts/prove_void_app_buy_presale_readonly_v1.mjs
```

The historical proof filename is retained so existing CI and branch-protection
continuity do not silently disappear. Its assertions now enforce the
launch-ready, activation-gated contract rather than the retired static shell.

## Request receipt ambiguity and same-intent retries

A client-side network timeout, broken JSON response, or unrecognized response
cannot establish that a `POST /__void/buy-void/request` failed to persist on
the server. Once a POST starts, the Buy view records its exact selected rail,
six-decimal USDC *atom amount*, and case-insensitive destination address as an
attempted intent. The Submit button remains disabled for that same intent
after either a valid returned receipt **or an uncertain result**; changing only
decimal formatting, refreshing live readiness, or rechecking acknowledgements
cannot silently repeat it. A different rail, amount or destination is treated
as a new request. A newly rendered Buy view begins a new local guard lifetime.

A valid returned request ID and its payment instructions remain actionable
only within the original verified readiness generation and bounded lease. Any
later readiness GET, including OPEN → OPEN, permanently retires those payment
instructions; the browser instead warns to verify the original request with
the operator. A transport or validation error after POST is shown
as **REQUEST OUTCOME UNCONFIRMED — DO NOT SEND FUNDS OR RESUBMIT**, with a warning
that the server may have persisted the request and an instruction to confirm
its status with the operator. It is no longer claimed that the request was
definitively not created. If live readiness becomes HOLD or SOLD OUT, the page
shows the authoritative DO NOT SEND status instead of any payment instructions.
Both the attempted-intent guard and its last result remain in memory. When the same Buy view returns to verified OPEN, its matching uncertain-outcome
warning may reappear. Previously confirmed payment instructions do not regain
authority after a newer readiness GET. Submit remains disabled for the
attempted intent.

**Limits:** This is an in-memory, one-Buy-view safeguard and not a server-side
idempotency key, durable browser history, payment-finality attestation,
authoritative request lookup, authenticated custody or guaranteed prevention
of resubmission after reload, a second browser or a different device. The
participant must not send funds on any unknown-result screen; separate
operator verification and real payment-to-allocation readiness remain required.

### Multiple attempted intents in one Buy view

The browser retains a **bounded set of up to 32 attempted canonical intents**
during the same Buy view. Starting a different purchase does not erase the
earlier attempt: after attempts A and B, returning to A cannot submit again
within that view. Once the bound is reached the view disables additional
submission rather than forgetting an earlier potentially committed request.
It does **not** persist across a reload, another tab or device; a real
server-issued idempotency key and authoritative lookup are still required.

During an in-flight new POST, a readiness refresh shows only **Creating guarded
request…** and no earlier payment instructions or uncertain-result notice.
The result is recorded in memory after the POST succeeds or fails. If that
happens after readiness changes to HOLD, SOLD OUT, or a failed/unavailable
readiness state, the authoritative **DO NOT SEND** text remains on screen.
A later verified OPEN refresh may restore the matching uncertain-outcome
warning, but never previously confirmed instructions from a retired readiness
generation. No in-flight or completed POST may bypass its duplicate guard.

The displayed result is bound to the **latest attempted intent**. Selecting a
different intent never displays the latest attempt's payment instructions as
though they belonged to the new amount, chain, or destination. Instead a
conservative warning requires checking prior attempts with the operator. During
HOLD/SOLD OUT, no prior payment receipt or instructions are displayed. A later verified OPEN refresh may restore a matching non-actionable uncertain
outcome; previously confirmed instructions from an older readiness generation
remain retired. A different intent sees the prior-request warning. No
browser/client action is authority to send money or activate the presale.

### Rail-specific receipt restoration gate

A sale-wide OPEN snapshot does not authorize payment instructions on a
separately disabled payment rail. If Ethereum request intake changes to HOLD
while Base remains OPEN, the browser keeps any already attempted Ethereum
intent in its bounded local duplicate guard but renders **DO NOT SEND FUNDS**
instead of the remembered Ethereum payment instructions. The same rule applies
when a pending Ethereum POST resolves after the rail became HOLD. Receipt text can appear only when live verified readiness is OPEN **and** the
original selected rail is individually enabled for the matching intent.
Confirmed instructions may reappear after a rail-only HOLD only within the
unchanged readiness generation; any newer readiness GET retires them.

The existing browser VM regression checks both settled and late-successful
Ethereum responses through rail HOLD and subsequent verified reopening;
no additional POST or wallet transaction is performed. This remains a
browser-only safety condition, not server payment idempotency or presale
activation.

## Suspended-tab and browser-history receipt recheck

Browser timers may be throttled or suspended in inactive tabs or while a page
is stored in the back-forward cache. The Buy view now calls its existing
fail-closed receipt-expiry/clock-skew checker when the tab becomes visible,
the window regains focus, or a page is shown again. A hidden visibility-change
event does not revalidate a receipt. The existing irreversible expiration
flag remains authoritative even if the wall clock later moves backwards.

This is an immediate in-memory check only: it does **not** fetch a new
readiness generation, extend an old payment lease, retry any POST, recover
server request status, sign, or move funds. The existing VM proof injects
suspended timers, elapsed monotonic time, a rolled-back wall clock, and
wall-time-only suspension, then checks all three resume signals.
