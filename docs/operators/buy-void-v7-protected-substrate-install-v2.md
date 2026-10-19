# Buy VOID V7 protected substrate install V2

Marker: `VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V2`.

Status: **source-reviewed create-only installer successor; host apply remains separately authorized**.

V2 consumes the immutable V1 acceptance generation merged at `44f7cf576cdc4460397677a27af2f587a33d424d` / tree `24208ee96995ca784234ac8281eb40abaec5735d`.
It does not rewrite the V1 candidate lock. The accepted lock continues to state `protected_substrate_install_authorized=false` and all runtime/payment/signing authority false.

The installer adds the later operational boundary used only after a separately reviewed plan and explicit create-only confirmation.

## Fixed components

V2 manages exactly three top-level protected components beneath `/opt`:

- `/opt/void-buy-void-v7-reviewed-v1` — a physical protected copy of the active accepted source release `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- `/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1` — accepted ELF SHA-256 `8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851`;
- `/opt/void-buy-void-v7-selector-v1/void_buy_void_source_finality_live_process_v2_selector_guard_v1` — accepted ELF SHA-256 `048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232`.

Each top-level component is create-only and published with Linux `renameat2(..., RENAME_NOREPLACE)` from a fixed root-owned staging directory.

## Resume and mismatch policy

The plan classifies each component independently:

- exact existing component: retained;
- absent component: eligible for a separately authorized create-only apply;
- present but non-exact component: HOLD;
- pre-existing staging root: HOLD.

This makes an interrupted multi-component installation resumable without treating partial publication as rollback-safe.

`partial_publication_possible=true` and `no_rollback_after_publication=true` are explicit contract fields. Once a component has been atomically published, V2 never deletes it automatically. Later qualification must establish the complete three-component generation.

## Protected source copy

The source copy is derived from the already protected active release, not a mutable developer checkout. V2 requires the exact clean symbolic `main` generation and recursively requires root ownership, non-group/world-writable regular files/directories, internal-only symlinks, bounded node/file/total size, stable source descriptors and exact post-copy tree digest equality.

The later merged installed qualifier remains the authority for canonical source-custody and full installed-generation evidence.

## Apply boundary

A host apply requires all of:

- root execution;
- exact clean current `main` descended from merge `44f7cf576cdc4460397677a27af2f587a33d424d`;
- exact immutable V1 lock/materializer/V1-installer/installed-qualifier blobs;
- exact native and selector candidate bytes;
- a freshly recomputed operation-bound `voidv7substrateinstallplan2_<sha256>` plan ID;
- explicit confirmation token `INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V2_CREATE_ONLY`.

Source review, self-test and CI do not invoke `--plan` or `--apply` on a real host.

## Always outside this installer

`service_mutation=false`, `systemd_mutation=false`, `credential_access=false`, `private_key_access=false`, `wallet_or_signer_access=false`, `signing=false`, `transaction=false`, `payment_acceptance=false`, `public_presale_activation=false`, `wc_void_market_activation=false`, and `funds_movement=false`.

After an authorized install, the next gate is the already merged `void_buy_void_v7_protected_substrate_installed_qualification_v2.py`.

PROTECT THE CORE.

## V2R review hardening

Before staging V2, source review found a publication-accounting edge case: Linux `renameat2(..., RENAME_NOREPLACE)` can succeed and the following parent-directory `fsync()` can fail. V2R records a component as published immediately after successful rename and before parent `fsync` or close, so a later HOLD truthfully reports partial publication.

V2R also independently binds merge `44f7cf576cdc4460397677a27af2f587a33d424d` to tree `24208ee96995ca784234ac8281eb40abaec5735d`, requires internal symlink targets to resolve strictly inside the protected tree, and gives the dedicated workflow an exact four-file source-scope check against the accepted parent.

V2R2 changes proof text only: it retires the stale requirement for the removed inline `tree_symlink_escapes_root:` literal and instead binds the actual strict helper implementation, including `path.resolve(strict=True)`. Installer behavior is unchanged from V2R.
