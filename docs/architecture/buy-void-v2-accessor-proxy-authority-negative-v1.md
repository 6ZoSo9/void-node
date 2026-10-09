# Buy VOID V2 accessor/proxy authority — negative witness V1

## Negative security result

This Draft is stacked on the repaired primitive-type boundary in PR #2697.
It does not modify verified-payment V2 source.

The repaired V2 source rejects array/object values masquerading as scalar
strings and integers, but it still directly reads authority-bearing properties
from caller objects. JavaScript getters and Proxy traps can therefore execute
while request, policy, receipt and log values are being converted into a
verified payment event.

The exact V2 source blob under test is:

`0df94fb35681f358318416fe6c48f3b794cd6074`.

A GREEN workflow means this **negative** behavior was reproduced. It is not
payment-readiness evidence.

## Reproduction

The proof creates one valid synthetic Base native-USDC checkout and first
requires the plain-data control to verify.

It then requires five executable-object variants to still verify and emit the
same canonical payment event:

1. an accessor-backed request ID;
2. an accessor-backed policy allowlist;
3. an accessor-backed receipt log array;
4. a Proxy-backed request object; and
5. a Proxy-backed transfer-log object.

Each case records that the getter or Proxy trap actually executed.

## Why this matters

A payment verifier should classify inert data, not execute caller-controlled
object behavior while establishing payment authority. Even when real JSON-RPC
responses originate as parsed JSON, V2 has multiple internal callers and should
not rely on an undocumented promise that every object reaching this boundary is
a plain, stable, accessor-free object.

The expected repair direction is a one-time plain-data snapshot before any
authority check:

- reject Proxy objects;
- require ordinary/null-prototype records at reviewed object boundaries;
- read only own enumerable data descriptors, never accessors;
- copy reviewed arrays from own indexed data properties;
- validate nested policy maps, payment instructions, receipt/log objects and
  topic arrays before normalization; and
- use the detached snapshot consistently for the entire verification.

## Authority boundary

This Draft adds proof/workflow/documentation only. It does not call a real RPC
endpoint, read customer data, write allocation/custody state, mount services,
access wallet/key/signer material, construct/sign/broadcast transactions,
mutate Chain-2050/WC, activate the presale/market, or move funds.

Keep Draft/unmerged. If V2 is repaired, this negative witness should fail and
be retired or converted into positive regression evidence.

**PROTECT THE CORE.**
