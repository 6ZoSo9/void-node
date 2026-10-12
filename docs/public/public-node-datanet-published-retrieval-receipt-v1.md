# DataNet Published Retrieval Receipt v1

Marker: `VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_DOC_V1`

Public route:

`GET /public-node/datanet/published-retrieval-receipt-v1.json`

This lane proves a complete public-safe DataNet retrieval chain for a deterministic operator-published fixture:

1. Discover a published dataset through the public-safe registry.
2. Read its public-safe manifest.
3. Select an object from that manifest.
4. Fetch the object by SHA-256.
5. Verify fetched bytes against the manifest SHA-256.
6. Emit a public-safe retrieval receipt.

Safety boundary:

- Public route is read-only.
- Public route does not accept uploads.
- Public route does not mutate runtime state.
- Public route does not write ledger entries.
- Public route does not award Work Credits.
- Public receipt does not disclose absolute source paths.
- Public receipt does not disclose operator home paths.
- Public receipt does not disclose local storage roots.

This is a bridge lane between DataNet retrieval and future WC candidate review. It proves retrieval, but it does not create an award.
