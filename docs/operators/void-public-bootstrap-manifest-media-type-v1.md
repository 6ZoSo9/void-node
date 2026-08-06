# VOID public bootstrap manifest media type v1

## Problem

The public clone-and-run workflow fetches the canonical bootstrap manifest from:

```text
https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/bootstrap/v1.json
```

GitHub Raw may serve repository JSON bytes as `text/plain` or
`application/octet-stream`. The bootstrap resolver previously required every
remote response to begin with `application/json`, so all clone-and-run Node
matrices could build successfully and then fail before the readiness endpoint
started.

A global relaxation to arbitrary text responses would weaken the resolver's
closed-response boundary. This repair therefore permits non-JSON media types
only for the exact canonical GitHub Raw repository and manifest path.

## Policy

Normal manifest origins must use either:

```text
application/json
application/*+json
```

The following media types are additionally accepted:

```text
text/plain
application/octet-stream
```

but only when all of these conditions are true:

- hostname is exactly `raw.githubusercontent.com`;
- owner is exactly `6ZoSo9`;
- repository is exactly `void-node`;
- ref is exactly `main` or a 40-character lowercase hexadecimal commit SHA;
- path is exactly `public/bootstrap/v1.json`;
- no extra path component, query, fragment, or credentials exist; and
- the existing resolver transport and response checks also pass.

Wrong hostnames, owner names, repository names, refs, paths, missing media
types, HTML, and globally served text/plain responses remain rejected.

## Preserved resolver boundaries

This change does not alter:

- HTTPS requirements for non-fixture manifests;
- DNS resolution and pinned connected-address verification;
- public-IP enforcement;
- redirect rejection;
- exact HTTP 200 requirement;
- advertised and streamed response-size limits;
- bounded JSON parsing;
- exact manifest and endpoint key sets;
- schema, network, chain ID, and content-derived manifest ID checks;
- authority flags;
- expiration and stable-seed qualification checks; or
- live stable-seed revalidation.

The media policy module performs no network request or filesystem mutation and
has no credential, wallet, signing, transaction-broadcast, or money-movement
authority.

## Proofs

Run:

```bash
node scripts/prove_void_public_bootstrap_manifest_media_type_v1.mjs
node scripts/prove_void_public_bootstrap_manifest_media_integration_v1.mjs
node scripts/prove_void_public_bootstrap_client_closed_response_v1.mjs
```

Expected markers:

```text
VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1_PROOF_GREEN
VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_INTEGRATION_V1_PROOF_GREEN
VOID_PUBLIC_BOOTSTRAP_CLIENT_CLOSED_RESPONSE_V1_PROOF_GREEN
```

The repository clone-and-run matrix remains the live proof that the exact
canonical GitHub Raw manifest can be resolved and the local readiness endpoint
can be sustained.

## Authority boundary

This lane is source, proof, documentation, and CI only. It does not publish or
replace a manifest, change a stable seed, expose a private route, deploy or
restart a service, access credentials or wallets, sign or broadcast a
transaction, mutate validators or Work Credits, or move funds.
