# VOID public checkpoint discovery transport v1

## Purpose

This generation prepares the source contract for publishing a verified
Mainnet-0 canonical checkpoint through the already-qualified public seed
without creating a second trust root.

It does not publish or upload the real checkpoint and does not activate
checkpoint consumption in the node.

## Trust model

The existing public-bootstrap supervisor chooses and qualifies the stable HTTPS
seed. Its loopback client adapter owns an ephemeral response-authority secret
that is passed to the follower child over the existing IPC authority channel.

Checkpoint transport reuses that boundary:

1. the follower asks its loopback adapter for `/__void/checkpoint/v1.json`;
2. the adapter fetches that route only from the already-qualified seed;
3. the adapter HMAC-binds the exact route, challenge nonce, response status,
   byte length, and body SHA-256;
4. an `available` discovery response identifies one content-addressed
   checkpoint and an exact same-origin packet path;
5. `checkpoint.json` is fetched through the same adapter and response authority;
6. every `blocks.bin` segment is fetched through the same adapter and response
   authority;
7. the checkpoint manifest remains the canonical file-hash contract; and
8. the later consumer must run the merged checkpoint semantic verifier before
   activation.

No arbitrary object URL is accepted. The packet base path is derived from the
checkpoint ID under the same public seed origin.

## Routes

The stable public seed gains these read-only GET/HEAD routes:

```text
/__void/checkpoint/v1.json
/checkpoints/v1/<voidpbc1_id>/checkpoint.json
/checkpoints/v1/<voidpbc1_id>/segments/<8-digit>/blocks.bin
```

Discovery is always present. With no checkpoint configured it returns a closed
`status: unavailable` response and `checkpoint: null`.

An available response binds:

- checkpoint ID;
- checkpoint manifest SHA-256;
- source commit SHA;
- checkpoint head;
- block count;
- segment count;
- payload bytes; and
- exact same-origin packet base path.

## Gateway publication boundary

The public seed gateway remains numeric-loopback only and continues to be
published through the existing separate HTTPS front door.

Checkpoint serving is disabled unless all three environment pins are supplied
together:

```text
VOID_PUBLIC_SEED_CHECKPOINT_ROOT
VOID_PUBLIC_SEED_CHECKPOINT_ID
VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256
```

At startup the gateway:

- requires an absolute, non-symlink checkpoint root;
- validates the exact checkpoint manifest contract;
- recomputes the `voidpbc1_...` content ID;
- requires the all-false authority boundary;
- validates the rebuild contract;
- verifies every segment path, size, and SHA-256;
- verifies aggregate block/payload totals; and
- refuses to start on any mismatch.

Before every manifest or segment response it re-reads and re-hashes the exact
file, so post-start mutation produces `checkpoint_integrity_hold` instead of
serving altered bytes.

The gateway exposes no write, wallet, signer, validator, treasury, Work Credit,
or funds authority.

## Client transport boundary

The public seed transport remains DNS-pinned, redirect-free, and response-size
bounded.

JSON routes still require `application/json`. Canonical segment routes require
`application/octet-stream`.

The route vocabulary remains closed. Unknown checkpoint IDs, malformed
segments, query widening, and path traversal do not become public routes.

## Response authority

The loopback adapter extends the existing challenged HMAC response authority
from historical block ranges to the closed checkpoint route set.

The authority transcript is unchanged: generation, sequence, nonce, method,
route, status, byte length, and body SHA-256 remain bound. No long-lived
checkpoint signing key is introduced.

### Qualification lifetime

Checkpoint authority is additionally bounded by the canonical stable-seed
qualification age.

The HTTPS resolver emits the earliest `qualified_at + 2h` deadline among the
enabled seed set. The clone-and-run launcher requires its verify and live
resolution passes to produce the same deadline and exports that exact value to
the HTTPS adapter.

Checkpoint discovery, manifest, and segment routes fail closed unless:

- response HMAC authority is installed;
- the qualification deadline is present and still live;
- the method is GET; and
- the caller supplies a valid authority challenge nonce.

The adapter checks the deadline both before the remote request and again before
returning the authenticated response. A response that crosses the deadline is
not returned as an authenticated checkpoint response.

This lifetime gate applies only to the new checkpoint route set in this
generation. Existing historical `/blocks/range` behavior is deliberately
unchanged; long-range catch-up qualification refresh remains a separate
lifecycle problem rather than being silently changed by checkpoint transport.

## Deliberately not included

This generation does not:

- upload the 452 MB real checkpoint;
- configure the live seed gateway with the checkpoint root;
- modify `public/bootstrap/v1.json`;
- weaken the two-hour stable-seed qualification rule;
- add a live node restore/activation path;
- overwrite a nonempty node data directory;
- restart or deploy any service;
- change DNS/TLS/Tor/Tailscale state;
- grant any economic or validator authority; or
- move funds.

The next source layer after this transport contract is the fresh-node consumer:
download into a new staging directory, verify the authenticated discovery
pointer and manifest, verify every segment, reconstruct derived store metadata,
atomically select the new generation only for an eligible empty node, and then
range-sync the short tail to the current verified public-seed target.
