# Buy VOID source-finality V7 deployment receipt installer V1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1`

This operator tool prepares the immutable deployment receipt required by V7.
It imports V7's own reviewed-source inspector and receipt-ID function instead of
duplicating either digest algorithm.

The receipt binds:

- exact immutable process commit and tree;
- branch `main` and process marker
  `VOID_NODE_PROCESS_SOURCE_IDENTITY_V1`;
- V7's current seven-file reviewed-source digest;
- accepted predecessor enforcement identity
  `ea7abb9300215e4f76caea4706fa4c4c81465c32f30a3350fe4f01177f845cfb`;
- content-addressed `voidbsfdep1_<sha256>` receipt identity.

`--plan` is read-only and requires the repository to be clean `main` at the
exact operator-supplied commit/tree.

`--apply` additionally requires root and the explicit
`--confirm-create-v7-deployment-receipt` token. Production application is
restricted to:

`/var/lib/void-source-finality-v7/deployment-receipt.json`

The parent directory is root-owned mode 0755. The final receipt is root-owned,
single-link, mode 0444. Publication uses an exclusive temporary file followed
by an atomic hard-link no-clobber publication and directory fsync. An existing
byte-identical receipt is accepted idempotently; an existing different receipt
HOLDs and is never overwritten.

This PR only creates the tool/proof. It does not run `--apply` on Precision,
change systemd, configure source RPCs, contact a provider, access credentials,
wallets or signers, create/sign/broadcast a transaction, open the presale or
move funds.

The production receipt must be created only after the final deployable source
commit/tree is selected and installed.

PROTECT THE CORE.
