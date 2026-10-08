# Buy VOID enforcement descriptor-relative Linux proof V1

## Security problem being studied

[Draft #2641](https://github.com/6ZoSo9/void-node/pull/2641) derives an
UNACCEPTED V5 enforcement candidate. Its source-only proof reads files after
checking their parent directories with `lstatSync()`, but subsequently opens
the full original pathname. An adversary who can replace an ancestor between
those operations can redirect that pathname through a symlink: `O_NOFOLLOW`
on the *last component* does not protect ancestors. An independent review
[recorded this P1 ancestor race](https://github.com/6ZoSo9/void-node/pull/2641#issuecomment-6065235979).
A separate P1 finding also concerns computed/aliased dynamic loader escapes;
this proof does **not** address the AST language-closure issue.

This separate Draft is **a standalone Linux-only primitive and disposable
negative test**, not a change to #2641, source-finality authority, compiler
artifacts, runtime services, or package identity. It is stacked on #2641's
exact source head `ad5192933e2f8c538bab041bb6d9a164fd67e880`,
without moving that PR or its child #2642.

## Intended proof boundary

`scripts/prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs`
exports `readDescriptorRelativeLinuxV1(root, relative, maxBytes)`. It requires
a safe path relative to an ordinary non-symlink Linux directory root. It
opens the root with `O_DIRECTORY | O_NOFOLLOW`, holds that directory fd,
and walks every next directory via `/proc/self/fd/<parentfd>/<component>`
with the same flags. The leaf is opened *relative to the retained parent*
through `/proc/self/fd/<dirfd>/<leaf>`, protected by `O_NOFOLLOW`. All
directories and leaf are checked against the visible path identity and
their retained fd's `fstat` both before and after a read.

The leaf reader never allocates/consumes more than its preflight size plus
one byte and requires matching file identity, size, link count and timestamps.
This is designed to rule out the earlier **mutable ancestor symlink swap
redirecting the opened file** within the tested Linux+procfs model. It does
not guarantee immutability after verification or lock a hostile filesystem
across subsequent execution. Production use needs independent review of
Linux `/proc/self/fd` semantics, namespace/mount assumptions, permission
model and exactly what execution is bound to those read bytes.

The synthetic self-test mutates only a disposable `os.tmpdir()` fixture:
the same-size benign file must read successfully, a swap of an ancestor
before its directory-fd open must HOLD, a swap before the leaf open must
HOLD even if the old directory descriptor persists, and a concurrent 3 MiB
growth must HOLD with a pre-size+one-byte bound. The unchanged file
must then verify again. No actual VOID checkout/module is read through
this helper in the test.

The exact-head Node 22/24/26 matrix runs this test on an Ubuntu Linux
runner, then compares three emitted receipts byte-for-byte. It has no
node_modules install, Docker, RPC, customer-record, signer or service action.

## Deployment/monetary authority explicitly NOT established

This is a suggested safe source reader primitive for later independent
integration into candidate enforcement scanners. It has **not** been
integrated into #2641 and has **no** approved locked enforcement V5
attestation. In particular the separate computed-global alias dynamic
import vulnerability and code-generated saga module's actual executable
closure still require independent adversarial review. Historical V1/V4/V5
manifests remain immutable; checked V4 entrypoint sibling #2639 must be
reconciled into the runtime source lineage independently.

`compiled_candidate_accepted=false` and
`production_source_finality_authority_ready=false`. No Ready/merge,
deployment, installed host, wallet/key/signer access, operator data,
payment/transaction, Chain-2050/WC, inventory/treasury/liquidity,
presale/market activation or funds movement.

**PROTECT THE CORE.**
