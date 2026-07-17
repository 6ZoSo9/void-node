# Signed operator provenance canary v1

Status: **passed**

The deployed v1.6.4 public provenance lane proved the complete Ed25519 SSHSIG lifecycle:

`verified → invalid → revoked → expired`

The invalid state was produced by changing the manifest after signing. The revoked state used the same valid manifest after revoking its trusted key. The expired state used a signature outside the configured trust-validity window.

Cleanup removed the temporary manifest, trust record, and private key, restored the public canary item to absent, and reconfirmed the public POST boundary returned `405`.

Source receipt SHA-256: `d5546b2139f2d913ff986f8771761ce249ffcc11c94b405c5977ba0476ad0b06`

The raw operational receipt is not committed. The repository stores its cryptographic hash and a bounded public summary.

## Authority boundary

This proves signing-key control and identity provenance only. It grants no validator admission, trust admission, ledger access, wallet authority, settlement authority, rewards, or mutation rights.

## External operator onboarding

The source package under `ops/public/operator-onboarding-v1/` lets an outside operator create a sanitized signed submission and lets a maintainer verify it without changing the trust store. Trust admission remains a separate manual review decision.
