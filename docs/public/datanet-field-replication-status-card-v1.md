# VOID DataNet Field Replication Status Card v1

Status: **GREEN**

Marker: `VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1`  
Green marker: `VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN`

## Claim

Precision created and served a public-safe DataNet field object. Nimo on cellphone data plus tailnet pulled and verified it. Nimo mirrored it. Precision pulled Nimo's mirror back and verified the exact SHA-256.

## Verified payload

- SHA-256: `5b4cbc3c4a26a7032ed951bbc17f8470d5e8c865d76817fbdad740562606ede7`
- Bytes: `174`
- Roundtrip match: `true`
- Tailnet addresses: redacted from public status card

## Proof markers

- `VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN`
- `VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN`
- `VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN`
- `VOID_DATANET_PULL_TAILNET_DIAGNOSTICS_V1_GREEN`

## Boundary

Public status only. Read-only. No wallet movement, WC settlement, validator admission, public mutation route, or ledger write.

<!-- VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_STATUS_UPDATE_V1 -->
## Safe serve proof update

Status: GREEN.

The field replication loop has now been verified using the repository safe serve command instead of a generic Python HTTP server.

- Source serve command: `npm run public-node:serve -- --port 8088`
- Field mirror serve command: `npm run public-node:serve -- --port 8089`
- Safe serve marker: `VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY`
- Field runner marker: `VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN`
- Roundtrip verifier marker: `VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN`
- Verified mirror SHA-256: `feed57f0441871cc0a27153025808becf3f9d3a9c264a54189d0de88a2ec33cb`
- Boundary: serves `public/` only; dangerous paths touched: `false`
- Tailnet addresses: redacted from public status

No wallet movement, WC settlement, validator admission, public mutation route, or ledger write is enabled by this status update.

<!-- VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_RUNBOOK_DISCOVERY_V1 -->
## Safe serve runbook discovery

The repeatable safe-serve field replication runbook is now discoverable from this status card.

- Public HTML: `/public-node/datanet/field-replication-safe-serve-runbook-v1.html`
- Public JSON: `/public-node/datanet/field-replication-safe-serve-runbook-v1.json`
- Source doc: `docs/public/datanet-field-replication-safe-serve-runbook-v1.md`
- Boundary: private tailnet addresses redacted; dangerous authorities remain disabled.

