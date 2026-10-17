# Buy VOID V5 enforcement lock / canonical Epoch-2 source composition V1

**Status: source/test/CI-only integration. Not a production release or an activation gate.**

## Exact source generations

This is a two-parent, byte-preserving composition of the verified **combined
range + receipt-custody V5 enforcement lock** with current canonical
`main`'s independent Epoch-2 first-entry source additions.

| Generation | Exact identity |
| --- | --- |
| V5 proposed lock parent (PR #3398) | `c005ca30ab156427deb7731d596cde52d7a669ac` |
| Canonical Epoch-2 `main` | `206d3d61e5051704e9fd0c47068bcfe56a15c85f` |
| Common integration baseline | `adc5a87d0200aa354b03d9910cbfc1cb2d59bb38` |
| Two-parent composition commit | `38614797be01f2dd7d6d87503874182c5669c22d` |
| Composed tree | `01b460d46c703b619a43c8747b1dc5537a39019e` |

The composition commit's first parent is **exactly** the V5 lock parent;
its second parent is **exactly** canonical `main`. This adds no runtime or
deployment authority, changes no preexisting file bytes/modes, and does
not force-push or rewrite any of the two histories.

**Source-scope proof:**
- canonical baseline → V5 lock: exactly **60 economic paths**;
- canonical baseline → newer main: exactly **15 ADD-only Epoch-2 paths**;
- intersection: **zero**;
- V5 lock parent → composition: those exact **15 ADD-only** main paths,
  byte- and mode-identical to their canonical main identities;
- main → composition: those exact **60** economic paths,
  byte- and mode-identical to their reviewed lock lineage;
- this proof/doc/workflow add only three new files on top of the composed tree.

## Enforcement authority preserved, not expanded

The reviewed full selected candidate is PR #3396 at
`a884c8b69d19523e99da02899ff5fa8ab18e7100` with enforcement set:

`1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf`

The V5 lock source blob
`61a9d85d285f9c9d249adf401580822c44c6dac6`
and tracked candidate projection blob
`dd849928bc945478a1a8fcf687f374cfca59f4e4`
are **unchanged**. The source verifier requires the exact **49-row protected
inventory**, its canonical SHA-256, every tracked Git blob and executable
mode, source-only V5 accepted identity, and all production authority
flags unchanged.

The parent V5 lock independently rederives the full candidate in its
own CI. This composition does **not** claim to repeat that expensive
derivation; it proves source-identity preservation and independently
exercises the actual **deployment-receipt planner `--plan`** on the
composed checkout. The planner must accept the current lock and reject
any mutation or unexpected path, source or lock identity.

## Hosted qualification

The focused workflow checks the exact two-parent merge and three-file
proof scope. It independently typechecks/builds the reviewed economic
source and runs the unmodified V7 deployment-receipt planner in inert
`--plan` mode against the V5 accepted lock under a synthetic **CI-only**
local `main` branch at the exact test HEAD. Temporary receipts live
outside the checkout and **must not exist afterward**.

Historical V3/V5 checks are still expected to refuse newer source
generations. Those failures are not silently made green, skipped or
altered. The V5 lock source gate remains separately reviewed in draft
PR #3398. If canonical `main` advances, its additional file delta
and this composition must be independently reassessed rather than
blindly treating an earlier head as current.

## Authority

Even if green, the combined source remains:
`deployed_artifact_generation_verified=false`,
`runtime_mount_authority=false`,
`production_source_finality_authority_ready=false`,
`public_presale_activation=false`, and
`funds_movement=false`.

No runtime/service/network action on Precision/Nimo/Xiphos; no payment
acceptance, signer/key/wallet access, treasury/liquidity transaction, WC
pool or public presale activation. **KEEP DRAFT. PROTECT THE CORE.**
