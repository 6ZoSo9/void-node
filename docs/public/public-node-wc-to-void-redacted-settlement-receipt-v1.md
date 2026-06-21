# VOID WC → VOID Redacted Settlement Receipt v1

Marker: `VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1`

This receipt records the first completed WC → VOID settlement in a public, redacted form.

## Settlement result

- Chain ID: `2050`
- Transaction hash: `0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717`
- Value: `1.000000 VOID`
- Value wei: `1000000000000000000`
- Settlement record key: `710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1`
- Receipt status success: `true`
- Money movement performed: `true`
- WC → VOID settlement complete: `true`

## Approved settlement binding

- Settlement key: `4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e`
- Preview SHA-256: `f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8`
- Approval record SHA-256: `2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721`
- WC settled: `100`
- VOID sent: `1.000000`

## Execution packet binding

- Manual execute packet SHA-256: `88bc15e33afe845561733ed1fc1f9d71d362f6e5e28ea5bd7f6c095d6598dc40`
- Terminal execute request packet SHA-256: `9f6f850a798cb8f0ea2b8ae3e7de5070bdd5ba676876c3a7277573dceeeba0e5`

## Redaction / privacy boundary

Plaintext sender and recipient addresses are intentionally not included in this public receipt.

The private settlement ledger stores hashes and settlement metadata only. This public receipt exposes enough for auditability without exposing plaintext participant addresses.

Privacy flags:

- Plaintext from address written to public receipt: `false`
- Plaintext recipient address written to public receipt: `false`
- Private key seen by chat or repo: `false`
- Seed phrase seen by chat or repo: `false`

## Funding route boundary

Buy VOID remains the canonical funding route.

This receipt does not create a duplicate funding surface, does not create a mutation route, and does not perform any additional money movement.
