# crypto keypair empty catch visibility v1

This lane closes the single literal empty catch body in `src/crypto/keypair.ts`.

## Boundary

This does not change key loading semantics.

The loader still attempts PEM/PKCS8 Ed25519 parsing first. If PEM parsing fails, it still falls back to raw 32-byte Ed25519 seed parsing. The PEM parse fallback is now visible through a non-fatal warning marker instead of disappearing through `catch {}`.

## Required marker

`VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_crypto_keypair_empty_catch_visibility.ts
```

Expected terminal marker:

`VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_V1_GREEN`
