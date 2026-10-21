# Repaired V7/V2 current-generation dispatch v4

Status: **source/CI-only V4 candidate generation; no deployment or economic authority**.

Dispatch V4 is the explicit successor boundary above Draft PR #3661 exact head
`0344d7dab153be75716646d5c6f5162f926f25ee`. It preserves the accepted V3 candidate and lock, binds the
descriptor-hardened deployment reader, and validates an unaccepted V4 candidate
whose 49-row inventory differs from V3 at exactly one reviewed path:

- `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- V3 blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- V4 blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`

## Exact identities

- predecessor Dispatch V3: `fba37e94a90b3d4278fd3fba10fbe6313f2f0625`
- V4 candidate proof: `f33a579e62c8201de24d5076cfcbffab66df8dae`
- V4 candidate JSON: `5893e300a78dc4ca7729ef47f95a8e3eea2043cf`
- V4 candidate JSON SHA-256: `bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c`
- V4 inventory SHA-256: `8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0`
- V4 enforcement-set SHA-256: `ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2`
- Dispatch V4 proof: `51a51a7f85c8068269bad0e09e3ae872c4323a58`

The candidate remains unaccepted. `candidate_enforcement_identity_accepted`,
deployed artifact generation, runtime mount authority, production source-finality
authority, public presale activation, and funds movement all remain false.

The five current-generation consumers use Dispatch V4. The prior V3 reader
repair workflow is retained as historical evidence and checks out exact head
`0344d7dab153be75716646d5c6f5162f926f25ee`; it does not reinterpret the V4 candidate branch as the old
12-path reader-repair generation.

No receipt is installed, no service is mutated, no credential or wallet is
accessed, no signature or transaction is produced, and no funds move.
