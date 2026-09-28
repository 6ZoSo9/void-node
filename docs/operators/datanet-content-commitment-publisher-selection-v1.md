# DataNet content commitment publisher selection v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_PUBLISHER_SELECTION_V1`

Status: dedicated publisher selected; source-only.

## Selected publisher

The production DataNet content-commitment publisher is:

`0x926aa1d35824e6957fae1a05510e6cc6a0d57be6`

Credential ID:

`datanet-content-commitment-publisher-wallet-v1`

Address fingerprint SHA-256:

`cfeeeb9e2ebaf80e6637aaa706a89ed1ab9d5f2c70b6eb5ed9ba2fe12e240214`

## Ceremony provenance

The key was generated as a fresh dedicated secp256k1 EOA on Nimo while the host
was offline. The private key was not printed or committed. It was backed up to
the encrypted `VOID_AUTHORITY` volume and the backup was re-read only to
re-derive and verify the same public address.

The public ceremony receipt SHA-256 is:

`119d634591a324d6b5cd4736ff97d21ad527a69ad6f4a6982fc6ebd360ce701a`

Ceremony ID:

`20260928T120250Z`

This source artifact records only public identity/provenance. It does not contain
or authorize access to private material.

## Separation

This publisher selection does not imply a deployer selection.

It does not reuse the historical treasury authority and does not imply that any
existing Chain-2050 deployer is approved for this deployment.

The first registry predecessor remains the zero address under
`GENESIS_ZERO_PREDECESSOR_ONLY_V1`.

## Remaining deployment gate

Before a registry deployment plan can be finalized:

1. select/review the exact registry deployer;
2. derive the expected CREATE address from that deployer and exact nonce;
3. bind the exact reviewed compiler identity and constructor arguments;
4. perform fresh read-only Chain-2050 nonce/address/balance observations;
5. keep signing and broadcast separately authorized.

This selection grants no RPC, transaction construction, signing, broadcast,
contract deployment, Chain-2050 mutation, validator/governance/WC mutation,
migration, activation, token movement, or funds movement.
