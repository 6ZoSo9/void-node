# Buy VOID V5 enforcement lock / canonical Epoch-2 source composition V1

**Status: source/test/CI-only integration. Not a production release or an activation gate.**

## Current source generations

This branch preserves the reviewed **combined range + receipt-custody V5
enforcement lock** while carrying forward the canonical Epoch-2 source that has
continued to land on `main`.

The original two-parent composition remains historical evidence and is not
rewritten. Two later merge-forward commits add only newer canonical-main
Epoch-2 paths.

| Generation | Exact identity |
| --- | --- |
| Common integration baseline | `adc5a87d0200aa354b03d9910cbfc1cb2d59bb38` |
| V5 proposed lock parent (#3398) | `c005ca30ab156427deb7731d596cde52d7a669ac` |
| Initial canonical Epoch-2 main | `206d3d61e5051704e9fd0c47068bcfe56a15c85f` |
| Initial two-parent composition | `38614797be01f2dd7d6d87503874182c5669c22d` |
| Initial composed tree | `01b460d46c703b619a43c8747b1dc5537a39019e` |
| Pre-first-forward composition head | `fd2fa4e0fbe412cdf31aad12b3f28d93761b013a` |
| Intermediate canonical main (#3400 + #3401) | `9cc49f39e643e6bba667f7cda9dd3ea299860ff4` |
| First merge-forward | `6a5e8afa27aa91b4f0b577809966eecb9a06e60a` |
| First merge-forward tree | `94388a64a4d5576630202d2b4a284f56771d785f` |
| Current canonical main (#3405 included) | `0ea097a3fa43dc95a1a0a5272c61afe570361fc7` |
| Current composition merge-forward | `7847428a943b328e1b5a130d2fa8009b07d9819e` |
| Current composition tree | `639c7d8564b8ab9b5e6cfdfd3700bb8bfa2157a3` |

The current merge-forward's first parent is the prior composed generation and
its second parent is exact canonical main. No force-push or history rewrite is
used.

## Exact source-scope preservation

Relative to the common baseline:

- V5 lock lineage: exactly **60 reviewed economic/source-CI paths**;
- current canonical main: exactly **26 ADD-only Epoch-2 paths**;
- economic/Epoch-2 intersection: **zero**;
- canonical Epoch-2 paths added after the initial 15-path composition:
  exactly **11**;
- current composition retains all 60 economic files byte/mode-identical to the
  V5 lock parent;
- current composition retains all 26 Epoch-2 files byte/mode-identical to
  `main@0ea097a3...`;
- this review modifies only its three composition proof/doc/workflow files after
  the current merge-forward.

The 11 post-initial canonical paths are the native materializer, protected
bootstrap source/proof/doc/workflow, and canonical protected-bootstrap candidate
proof/doc/workflow added through #3400, #3401, and #3405.

## Enforcement authority preserved, not expanded

The selected full enforcement candidate remains #3396:

- candidate head:
  `a884c8b69d19523e99da02899ff5fa8ab18e7100`;
- enforcement set:
  `1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf`;
- protected inventory:
  `e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3`.

The V5 lock source blob remains
`61a9d85d285f9c9d249adf401580822c44c6dac6`, and its tracked bounded candidate
projection remains blob
`dd849928bc945478a1a8fcf687f374cfca59f4e4`.

The composition proof requires the exact 49-row protected inventory and all
planner-consumed acceptance fields while preserving every production authority
flag as false.

## Canonical Epoch-2 additions

The composition now includes the canonical source generations for:

- accepted first-entry launcher candidate/lock/materializer/protected installer;
- accepted dormant-binder native materializer;
- authenticated protected-installer bootstrap;
- reproducible protected-bootstrap candidate source gate from #3405.

These are preserved as source identities only. Their presence in the composed
tree does not imply installation on Precision or authorize protected installer
apply.

## Hosted qualification

The focused workflow must:

1. prove the initial composition and both merge-forward parent/tree identities;
2. prove the exact 60 + 26 disjoint source closure;
3. verify every protected V5 source row against the composed checkout;
4. independently typecheck/build the reviewed economic closure;
5. invoke the unmodified V7 deployment-receipt installer **only in `--plan`
   mode** against the V5 accepted lock;
6. require `PLAN_GREEN` and no receipt creation or repository mutation.

Historical generation-specific workflows may continue to reject this combined
source tree. Those refusals remain evidence and are not weakened, skipped, or
repinned merely to make the full wall green.

## Authority

Even when the focused composition proof is green:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

No Precision/Nimo/Xiphos runtime or service mutation, no credential/key/wallet
access, no signing or transaction, no customer payment acceptance, no public
presale/WC activation, and no treasury/liquidity action is authorized.

**KEEP DRAFT. PROTECT THE CORE.**
