# DataNet content-commitment registry deployer selection v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_REGISTRY_DEPLOYER_SELECTION_V1`

Status: dedicated registry deployer selected; source-only.

## Selected deployer

`0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb`

Credential ID:

`datanet-content-commitment-registry-deployer-wallet-v1`

Address fingerprint SHA-256:

`bbf87ccd6c56e68fc486c310a12074d51a23af79df8e9c4727fe156099b864d1`

## Ceremony provenance

The key was generated on offline Nimo as a fresh dedicated secp256k1 EOA.
The private key was not printed or committed. Its encrypted backup on
`VOID_AUTHORITY` was verified.

Public ceremony receipt SHA-256:

`81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3`

Ceremony ID:

`20260928T121413Z`

## Separation

The deployer is distinct from the canonical DataNet publisher:

`0x926aa1d35824e6957fae1a05510e6cc6a0d57be6`

It does not reuse the legacy treasury address, the existing role-authority
deployer, or the presale deployer.

## Remaining gate

The deployer has not yet been observed against live Chain 2050. Before an
unsigned deployment plan exists, Precision must perform a fresh read-only
observation of:

1. chain ID 2050;
2. latest deployer nonce;
3. pending deployer nonce;
4. deployer native balance;
5. the CREATE address implied by the exact deployer+nonce; and
6. code/account vacancy at that predicted registry address.

No funding, transaction construction, signing, broadcast, contract deployment,
Chain-2050 write, token/funds movement, migration, or activation is authorized.
