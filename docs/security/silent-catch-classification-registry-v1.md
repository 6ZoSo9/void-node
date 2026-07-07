# silent catch classification registry v1

This registry catalogs the remaining literal `catch {}` sites after peer import side-effect write error visibility closure v1.

## Boundary

This lane does not change runtime behavior.

It records the remaining silent catches and proves that immediate side-effect write catches for txIndex, kidx, and receipts are not silent.

## Generated reports

- `docs/security/silent-catch-classification-registry-v1-report.json`
- `docs/security/silent-catch-classification-registry-v1-report.md`

## Proof

Run:

```bash
npx tsx scripts/prove_silent_catch_classification_registry.ts

Expected terminal marker:

VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_V1_GREEN
