# Buy VOID Epoch-2 live-composition native protected install v1

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1`.

Status: **source/CI-only protected-install contract; no Precision install or live
execution is authorized by this PR**.

## Purpose

This is the installation gate named by accepted native V3 lock:

`voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659`.

It installs the accepted native preentry and V2 runner under the exact paths
already hard-coded by the native source:

- `/opt/void-buy-void-epoch2-live-composition-v2/void_buy_void_epoch2_live_composition_native_preentry_v1`;
- `/opt/void-buy-void-epoch2-live-composition-v2/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs`;
- `/opt/void-buy-void-epoch2-live-composition-v2/policy-v1.conf`.

No extra file is permitted in the protected root.

## Accepted V3 identities

Candidate ID:

`voidbuye2nativecand3_0132a4cc390000f28fb2d2ed8071a1593d184f754d5e9700a2ff8f1cb620ab27`.

Native ELF:
- 726,976 bytes;
- SHA-256 `78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589`;
- installed mode `0555`.

V2 runner:
- 30,103 bytes;
- SHA-256 `2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73`;
- Git blob `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
- installed mode `0444`.

Policy:
- root-owned mode `0444`;
- exact six-line schema consumed by the native preentry.

## Host-bound policy

The candidate lock intentionally does not pre-accept a Precision Node binary.

Plan/apply therefore measure the fixed direct file:

`/usr/bin/node`.

The selected Node must be:
- root-owned/root-group;
- direct regular file, not a symlink;
- single-link;
- executable;
- free of setuid/setgid bits;
- non-group/world-writable;
- at most 512 MiB;
- descriptor/path generation-stable while hashed.

The policy binds its exact SHA-256 and byte length.

Plan/apply also bind fixed `/usr/bin/git` and `/usr/bin/setpriv` generations.
When apply runs as root, checkout inspection is performed after dropping to
UID/GID 1000 with `setpriv --no-new-privs --clear-groups`; root does not
silently become the checkout authority.

## Checkout binding

Plan/apply require the fixed checkout:

`/home/zoso/dev/void-node`.

It must be:
- exact branch `main`;
- clean including untracked files;
- exact caller-supplied 40-hex HEAD.

That HEAD must contain the accepted:
- V3 lock;
- native source;
- V2 runner;
- sealed-V2 signer;
- installed credential/V6 qualifier.

The exact head is written into policy and included in the content-addressed
plan ID.

## Read-only plan

Plan mode consumes:
- exact accepted native ELF candidate path;
- exact accepted runner candidate path;
- exact expected `main` head.

It emits:
- accepted lock/candidate IDs;
- exact native/runner verification;
- Node/Git/setpriv identities;
- policy SHA-256/bytes;
- protected root state;
- content-addressed `plan_id`.

It performs no filesystem mutation or native/runner execution.

## Apply

Apply is separately gated by:
- root;
- Python isolated mode;
- absence of dangerous loader/Python environment variables;
- exact native/runner candidates;
- exact expected head;
- exact expected plan ID;
- fixed confirmation token
  `INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V3_CREATE_ONLY`.

Immediately before publication it revalidates:
- Git;
- setpriv;
- Node;
- selected checkout/head/blob set;
- staged native/runner/policy bytes.

Publication is create-only:
1. create root-owned mode-0755 stage under `/opt`;
2. create native mode 0555, runner/policy mode 0444 with O_EXCL/O_NOFOLLOW;
3. fsync each file and stage directory;
4. `renameat2(..., RENAME_NOREPLACE)` stage to final root;
5. fsync `/opt`;
6. verify final installed bytes/modes plus Node and checkout generation.

No overwrite/update path exists.

## Failure truth

If failure occurs before publication, any recognized stage is best-effort
cleaned and receipt truth remains `protected_install_performed=false`.

If rename publication succeeds but later parent-fsync, final verification or
install-parent close fails, the error is classified as a published installation
that requires inspection. The receipt must not report a false non-install.

## Authority boundary

Even after successful installation:

- live execution remains false;
- credential/private-key access remains false;
- signing remains false;
- transaction remains false;
- payment acceptance remains false;
- public presale activation remains false;
- WC/VOID market activation remains false;
- funds movement remains false;
- production host evidence authority remains false.

Next gate after a successful separately authorized install:

`EPOCH2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION`.

PROTECT THE CORE.
