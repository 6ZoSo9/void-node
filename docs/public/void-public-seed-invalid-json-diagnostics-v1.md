# Fail-closed public seed non-JSON response diagnostics v1

The scheduled [qualification run 37773892667](https://github.com/6ZoSo9/void-node/actions/runs/37773892667)
failed on 2026-10-08 because the public `/__void/ready.json` response was
not parseable as JSON. The log did **not** contain HTTP status, media type
or an exact response fingerprint. No replacement qualification artifact was
produced. One failure does not prove continuing public-seed unavailability.

A non-JSON response now rejects through the pinned-address HTTP Promise,
rather than throwing synchronously inside Node's `end` callback. The error
includes only a stable failure marker, numeric HTTP status, **closed** media
type (application/json / text/html / text/plain / other), bounded byte count,
and SHA-256 response hash. No untrusted response body, raw header or
credential is printed. The digest is diagnostic evidence, **not authentication**.

The failure still HOLDs the **entire** three-sample qualification. No retry,
relaxed JSON parsing, source re-pin, fresh receipt, publication or system
change is performed. TLS checks, DNS/address pins, body size/deadline,
redirect and private-route checks remain as before.

Run the existing synthetic loopback proof on a checked-out source revision:

```bash
node --check scripts/lib/void_public_seed_probe_v1.mjs
node scripts/prove_void_public_seed_qualification_v1.mjs
```

The adversaries use a local fake HTTP server returning 503 HTML with a secret
body, 200 invalid JSON with an unapproved content-type, and a valid JSON 200.
No external network is accessed by these new fixtures.

**Current publication limitation:** the old `public/bootstrap/v1.json` is
expired and reviewed Draft #2623's three-sample receipt expired under the
existing two-hour freshness policy, regardless of its 72-hour candidate
manifest lifetime. A new validated three-sample source-pinned qualification,
fresh packet, owner-approved publication, and independent served-copy check
are separate gates. Do not backdate or lower the age limit. No live
service/validator identity, key/wallet/signer, payment, Chain-2050/WC,
inventory, treasury/liquidity, presale or funds authority.
