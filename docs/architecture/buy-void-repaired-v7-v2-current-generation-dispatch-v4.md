# Repaired V7/V2 current-generation dispatch v4

Status: **source/CI-only V4 candidate generation; no deployment or economic authority**.

Dispatch V4 is the explicit successor boundary above Draft PR #3661 exact head
`d66379084ceead538479b776d153bddac2f678e3`. It preserves the accepted V3 candidate and lock, binds the
descriptor-hardened deployment reader, and validates an unaccepted V4 candidate
whose 49-row inventory differs from V3 at exactly one reviewed path:

- `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- V3 blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- V4 blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`

## Exact identities

- predecessor Dispatch V3: `fd4dc893171a666b8abba83873a63261466d36fd`
- V4 candidate proof: `4a10cebe913999bb12a5e2cce44e7e48652ab706`
- V4 candidate JSON: `cde87fb709b727102fd05b106217f3bdeef07985`
- V4 candidate JSON SHA-256: `701a6c493d17e1263ae09b591b3df93feed8fea710b8ee8e2980f3b8c9e2263b`
- V4 inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`
- V4 enforcement-set SHA-256: `e13b69320010736404819dcf24061aaeee5da37b4efae3a140eec8ff08faaeec`
- Dispatch V4 proof: `3726f9f0108b5a8594dba4749939e764d2f89d8b`

The candidate remains unaccepted. `candidate_enforcement_identity_accepted`,
deployed artifact generation, runtime mount authority, production source-finality
authority, public presale activation, and funds movement all remain false.

The five current-generation consumers use Dispatch V4. The prior V3 reader
repair workflow is retained as historical evidence and checks out exact head
`d66379084ceead538479b776d153bddac2f678e3`; it does not reinterpret the V4 candidate branch as the old
12-path reader-repair generation.

No receipt is installed, no service is mutated, no credential or wallet is
accessed, no signature or transaction is produced, and no funds move.
