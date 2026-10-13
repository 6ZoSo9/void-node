# VOID Tor bootstrap manifest candidate v1

Marker: `VOID_TOR_BOOTSTRAP_MANIFEST_CANDIDATE_V1`

Issue: #2854.

This source-only tool closes the missing handoff between a fresh Tor seed
qualification receipt and the existing offline release-root signing ceremony.
It creates only an **unsigned** short-lived manifest plus the exact
release-root signing payload. It does not load a private key, sign, publish,
restart a service, or grant payment / validator / Work Credit / funds authority.

## Bound inputs

The builder requires:

- a canonical `void_public_seed_tor_qualification_v1` receipt;
- an operator-supplied expected 40-hex source SHA equal to the receipt source;
- virtual port 80 and the restricted gateway contract;
- all qualification authority fields false;
- a receipt no more than 15 minutes old;
- the committed active Tor release root; and
- the already signed `public/bootstrap/tor-signed-v1.json` predecessor.

The predecessor may be `authenticated_stale`, but its release-root signature
must remain valid and its single onion identity must match the fresh receipt.
Expiry and stale qualification are never waived.

The expected source SHA is a continuity assertion, not a live source census. A
production renewal must use a qualification produced by the reviewed Tor
activation path that bound `--expected-head` to the installed clean repository,
or separately prove the installed service source. Do not guess current `main`.

## Candidate

The manifest has no clearnet sync endpoints, one non-temporary Tor v3 endpoint,
all authority false, and 60-90 minutes validity. Expiry must remain inside the
native two-hour qualification freshness window.

```bash
node scripts/build_void_tor_bootstrap_manifest_candidate_v1.mjs \
  --receipt /absolute/path/qualification.json \
  --expected-source-sha <installed-qualified-source-sha> \
  --manifest-output "$HOME/Downloads/void-tor-manifest-candidate.json" \
  --payload-output "$HOME/Downloads/void-tor-manifest-signing-payload.bin" \
  --validity-minutes 90
```

Outputs must remain outside the repository and are create-only. The payload is
the exact domain-separated byte sequence from the existing release-root
contract and contains no private key material.

## Offline signing boundary

The authorized offline custodian may sign those exact payload bytes using the
already approved Ed25519 release-root key. Private key bytes must never enter
GitHub, CI, chat, or this tool. Detached signature verification and signed
envelope assembly remain a separate reviewed step; this V1 deliberately does
not expose a signing primitive or treat an unsigned candidate as publishable.

Before replacing `public/bootstrap/tor-signed-v1.json`, require fresh installed
source evidence, review the receipt/candidate/payload digest, complete the
offline signing and envelope verification, publish through a separate source PR,
and pass strict outside-machine Tor plus HTTPS/Tor multipath acceptance on the
exact published generation.
