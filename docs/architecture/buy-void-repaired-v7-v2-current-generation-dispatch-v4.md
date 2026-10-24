# Repaired V7/V2 current-generation dispatch v4

Status: **source/CI-only V4 candidate generation; no deployment or economic authority**.

Dispatch V4 is the explicit successor boundary above Draft PR #3661 exact head
`1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26`. It preserves the accepted V3 candidate and lock, binds the
descriptor-hardened deployment reader, and validates an unaccepted V4 candidate
whose 49-row inventory differs from V3 at exactly one reviewed path:

- `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- V3 blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- V4 blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`

## Exact identities

- predecessor Dispatch V3: `2dd9e7024eaafe4641c0d3ac7d10f542a441bb92`
- V4 candidate proof: `3a7401202fee374f2a7da3f5efc0d29976f9792a`
- V4 candidate JSON: `ec00f0c552e600fff38e4998e4beb128c93b481d`
- V4 candidate JSON SHA-256: `fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60`
- V4 inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`
- V4 enforcement-set SHA-256: `00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a`
- Dispatch V4 proof: `9de04b5340f904b8886562727d5f9006876b7ec5`
- Provider source/support manifests and every frozen provider runtime artifact are reauthenticated on current HEAD before `provider_built_artifact_identity_preserved=true` is emitted.

The candidate remains unaccepted. `candidate_enforcement_identity_accepted`,
deployed artifact generation, runtime mount authority, production source-finality
authority, public presale activation, and funds movement all remain false.

The five current-generation consumers use Dispatch V4. The prior V3 reader
repair workflow is retained as historical evidence and checks out exact head
`1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26`; it does not reinterpret the V4 candidate branch as the old
12-path reader-repair generation.

No receipt is installed, no service is mutated, no credential or wallet is
accessed, no signature or transaction is produced, and no funds move.
