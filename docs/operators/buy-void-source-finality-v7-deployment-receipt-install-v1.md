# Buy VOID source-finality V7 deployment receipt installer V1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_V7_DEPLOYMENT_RECEIPT_INSTALL_V1`

This operator tool prepares the immutable deployment receipt required by V7.
It imports V7's own reviewed-source inspector and receipt-ID function instead of
duplicating either digest algorithm.

The receipt binds:

- exact immutable process commit and tree;
- branch `main` and process marker
  `VOID_NODE_PROCESS_SOURCE_IDENTITY_V1`;
- V7's current eight-file reviewed-source digest;
- accepted predecessor enforcement identity
  `1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b`;
- content-addressed `voidbsfdep1_<sha256>` receipt identity.

`--plan` is read-only and requires the repository to be clean `main` at the
exact operator-supplied commit/tree. Authority-bearing Git reads use the
reviewed absolute Git binary with replacement objects disabled, global/system
config suppressed, and repository-local execution surfaces such as fsmonitor,
hooks, attributes, preload/untracked-cache, and recursive submodules explicitly
disabled.

`--apply` additionally requires root and the explicit
`--confirm-create-v7-deployment-receipt` token. Production application is
restricted to:

`/var/lib/void-source-finality-v7/deployment-receipt.json`

The destination parent is opened and retained with `O_DIRECTORY|O_NOFOLLOW`.
All existing ancestors must already be direct, root-owned, and not group/world
writable. If the final destination parent is absent, it is created only
descriptor-relative beneath its retained trusted grandparent and normalized to
root-owned mode 0755 through the newly created directory descriptor. A
pre-existing parent is never chmod/chowned; a more restrictive safe mode such
as 0700 is preserved.

The final receipt is root-owned, single-link, mode 0444. Temporary creation,
hard-link no-clobber publication, cleanup, verification, and directory fsync
operate through the retained parent descriptor. A symlinked/rebound parent
HOLDs without collateral target metadata mutation. An existing byte-identical
receipt is accepted idempotently; an existing different receipt HOLDs and is
never overwritten.

This PR only creates the tool/proof. It does not run `--apply` on Precision,
change systemd, configure source RPCs, contact a provider, access credentials,
wallets or signers, create/sign/broadcast a transaction, open the presale or
move funds.

The production receipt must be created only after the final deployable source
commit/tree is selected and installed.

PROTECT THE CORE.
