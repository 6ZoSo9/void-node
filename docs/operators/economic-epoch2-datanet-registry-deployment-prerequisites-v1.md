# Epoch-2 DataNet registry deployment prerequisites v1

Marker: `VOID_ECONOMIC_EPOCH2_DATANET_REGISTRY_DEPLOYMENT_PREREQUISITES_V1`

Status: HOLD on explicit publisher selection and separate Chain-2050 deployment.

The epoch-2 state-root anchor payload is now public and exact, but the existing
`DatanetContentCommitmentRegistryV1` is not yet an attested production
Chain-2050 deployment.

Current compiled identity:

`voiddccci1_81d496b90721265d126a12e331432c10ca5403cc650fe634adce92b15c6afed6`

Current checked-in unresolved fields remain null for:

- registry contract address;
- deployment transaction hash;
- deployment block hash; and
- publisher address.

V1 deployment attestation supports only a genesis registry with zero
predecessor. Therefore the reviewed predecessor mode for this first deployment
is `GENESIS_ZERO_PREDECESSOR_ONLY_V1`.

The publisher remains deliberately unselected. The credential identity is
`datanet-content-commitment-publisher-wallet-v1`, but that credential name does
not itself select an address. In particular, the legacy epoch-1
`VoidTreasury.admin()` address
`0x4e77786f32d41e40e7cef28389068d6f31f1d6a2` is recorded only as historical
authority context and is not automatically promoted into the DataNet publisher
role.

## Next gate

1. explicitly review/select the production DataNet publisher address;
2. separately authorize a registry deployment plan;
3. after deployment, verify exact CREATE address, creation transaction, runtime
   code, immutable publisher/predecessor views, and confirmation floor;
4. only then perform the fresh object-uncommitted preflight for the approved
   anchor tuple.

This lane does not select an address, construct/sign/submit/broadcast a
transaction, deploy a contract, mutate Chain-2050, access wallet/private-key
material, move tokens/funds, authorize migration, or activate the public
economic successor.
