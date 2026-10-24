# Buy VOID V7 protected substrate install V5

Status: **source/test/CI only**. This generation does not authorize or perform a protected host apply.

## Purpose

V5 composes the two source-security repairs already landed on canonical `main`:

1. V4's direct repository authority: no dynamically linked Git child can establish privileged repository truth. The trusted launcher supplies an exact HEAD/tree pair, V5 reads the physical main ref directly and derives the worktree Git tree OID itself.
2. The protected full-history replica lane: the active runtime release remains a genuine one-commit shallow repository, while a separate create-only protected replica can carry the complete 17,931-commit history and built-in object-closure proof.

V5 deliberately does **not** mutate or repair the active runtime release in place.

## Three source roles

### 1. Live runtime release — cross-binding only

Fixed path:

`/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`

It must remain exact root:root `0555`, physically canonical and runtime-UID nonwritable. V5 requires:

- symbolic `main`;
- direct loose main ref = `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- exact worktree tree OID = `de12c9d2d5e475d435d21da3b047d7b63b69e2b7`;
- exact `.git/shallow` bytes equal to the accepted source HEAD plus LF;
- terminal generation revalidation.

The live release is never a copy source and has `mutation_authorized=false`.

### 2. Protected full-history replica — provenance/copy authority

Fixed path:

`/opt/void-v7-source-release-full-history-v1`

This is the create-only target defined by merged full-history replica installer V1, source blob
`a4d5762fe0e1c41b0919b8abb827123e556552ca`.

The replica installer performs built-in pack/index/object/history/worktree verification before publication. V5 does not duplicate that large parser. Instead the trusted first-entry policy must supply the exact
`expected_full_history_content_sha256` emitted by the reviewed full-history installation plan/receipt.

V5 recomputes **the identical content-digest algorithm** over the protected replica and requires an exact match. That digest covers every descendant directory name and every regular file's relative path, size and SHA-256, with exact root ownership/mode and stable descriptor/generation checks. Symlinks and group/world-writable nodes HOLD.

V5 additionally requires the full-history replica itself to be non-shallow, symbolic `main`, exact HEAD/tree, and exact worktree tree OID.

The digest is a **trusted launcher-policy input**, not caller discretion. A future final launcher generation must bind it in the root-custodied policy and forward it unchanged in both plan and apply.

### 3. Installed reviewed source

Fixed path:

`/opt/void-buy-void-v7-reviewed-v1`

V5 copies this create-only protected source from the **full-history replica**, never from the shallow live runtime release.

The existing V4 tree digest, create-only publication, `RENAME_NOREPLACE`, partial-publication truthfulness, exact native/selector identities, ACL-aware nonwritability checks and terminal generation checks remain.

## Trusted operation inputs

Plan/apply require all of:

- `--expected-head <40 lowercase hex>`;
- `--expected-tree <40 lowercase hex>`;
- `--expected-full-history-content-sha256 <64 lowercase hex>`;
- exact native/selector candidate identities.

The operation-bound plan body includes all three trusted values. Apply recomputes the plan and requires the same plan ID, so a changed full-history digest cannot replay an earlier authorization.

V5 has a new schema/prefix/confirmation namespace:

- schema: `void_buy_void_v7_protected_substrate_install_plan_v5`;
- plan prefix: `voidv7substrateinstallplan5_`;
- confirmation: `INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY`.

## Reviewed source dependencies

V5 explicitly binds:

- historical V3 installer blob `4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38`;
- historical qualifier V3 blob `ea3c31180810ea4efe4341683742827dcf6ac5ac`;
- landed direct-authority V4 installer blob `4448acb51cbc15d845550a55cd11c38f4185a7b3`;
- landed full-history replica installer blob `a4d5762fe0e1c41b0919b8abb827123e556552ca`;
- installed qualifier V4 from this source generation;
- the existing V7 lock, materializer, native preentry and selector identities.

## Installed qualification V4

Qualifier V4 is deliberately external-observer-free.

Under exact runtime UID/GID `1000:1000` with empty supplementary groups it independently requires:

- live shallow release exact HEAD/tree/worktree and exact shallow marker;
- full-history replica exact non-shallow HEAD/tree/worktree;
- protected reviewed source exact non-shallow HEAD/tree/worktree;
- full-history replica content digest = trusted expected digest;
- protected reviewed source content digest = the same trusted expected digest;
- exact native preentry and selector file identities;
- terminal digest/generation stability.

It does not invoke Git, Node or another repository observer and it grants no privileged execution, signing, payment, activation or funds authority.

## Host sequencing

Source merge alone is insufficient.

Before any V5 protected apply:

1. the protected full-history replica must be installed under its own separately reviewed/authorized create-only host gate;
2. its exact GREEN `content_sha256` must be reviewed;
3. the final trusted-root launcher policy must bind that exact digest together with the final V5 installer identity and HEAD/tree contract;
4. launcher-mediated V5 `--plan` must be reviewed;
5. protected V5 apply remains a separate explicit authorization gate;
6. installed qualifier V4 must run through its reviewed exact launch context.

The final launcher must also be rebound to V5's new `--expected-tree` and `--expected-full-history-content-sha256` closed argument surface.

## Authority

This source lane performs none of the following:

- protected `/opt` mutation;
- live runtime release mutation;
- service/systemd mutation;
- credential/private-key/signer access;
- signing or transaction submission;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
