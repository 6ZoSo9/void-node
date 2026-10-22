# Canonical V5 create-only source + receipt stage builders V1

## Purpose

Implement the two **hidden staging** primitives planned by #3711 without
authorizing their privileged use.

The fixed production V4 pair remains untouched:

- source: `/opt/void-buy-void-v7-reviewed-v1`;
- receipt:
  `/var/lib/void-source-finality-v7/deployment-receipt.json`.

The builders target only:

- source stage:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5`;
- receipt stage:
  `/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`.

They do not create predecessor names, exchange fixed paths, create a transition
journal, mutate the consumer fence, restart a service, or grant runtime
source-finality/presale authority.

## Source-stage builder

`ops/precision/void_v7_v5_source_stage_install_v1.py` is a narrow successor
of reviewed protected-replica installer V1
(`a4d5762fe0e1c41b0919b8abb827123e556552ca`).

Retained machinery includes:

- built-in Git pack/index parser and object-closure verification;
- exact index/worktree verification;
- descriptor-relative, bounded iterative copy;
- root-owned private staging before semantic verification;
- temporary named runtime-UID read/search ACL;
- runtime child UID/GID drop, no-new-privileges and capability clearing;
- terminal removal of temporary ACLs;
- immutable root-owned `0555` publication;
- `renameat2(RENAME_NOREPLACE)` create-only publication;
- retained-parent custody and fsync;
- plan rebinding before and after publication;
- termination/publication reconciliation.

V5 bindings:

- source commit
  `be2fbe41aaba291d3f874b9de52bcb87336307f5`;
- tree `749877d2320ecee9d659720b32e4726a0c42d697`;
- parent `79081038cf4f03c2971bdcb32c54daf6a87fbabf`;
- reachable commits `18,357`;
- reseal builder blob
  `bb78c7d9f468baa20b580d052d934d9b97c05134`;
- staging plan blob
  `37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d`.

The obsolete V1 same-generation shallow-live check is intentionally removed.
Before and after staging, the builder instead authenticates the current fixed V4
protected source:

- commit `75927cae2c7ed0b4273e6218937dedf69824f64c`;
- tree `51fcfacd0303ae6e1c5aa8f4505fbff24ded3371`;
- root-owned `0555`;
- exact content digest rebound through the plan.

The user-owned V5 reseal candidate remains untrusted input. Privileged apply
still requires a separately root-custodied source/launcher.

## Receipt-stage builder

`ops/precision/void_v7_v5_receipt_stage_install_v1.py` embeds and
self-authenticates the exact hosted V5 deployment receipt:

- receipt ID
  `voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37`;
- SHA-256
  `12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001`;
- bytes `1136`.

Its create-or-exact-match publication mirrors the reviewed production receipt
writer:

- canonical absolute target;
- root-owned non-writable ancestors;
- direct regular single-link target;
- temporary `O_EXCL|O_NOFOLLOW` file;
- write + fsync;
- root:root + `0444`;
- hard-link create-only publication;
- parent fsync;
- terminal exact-byte/custody verification.

It authenticates the current V4 fixed receipt before and after staging and
requires the reserved V4 predecessor path to remain absent.

## Trusted admission remains separate

Both implementations contain an `--apply` path, but that is not equivalent to
authorization.

Apply requires:

1. UID/EUID 0;
2. a root-custodied non-group/world-writable source tree;
3. an exact content-addressed plan;
4. an explicit operation-specific confirmation token.

The ordinary user-owned Git checkout cannot satisfy the root-custody condition.
This PR does not create the separately reviewed trusted launcher/admission
package needed for Precision.

No command in CI invokes `--apply`.

## Authority

```text
implementation_candidate=true
trusted_root_launcher_included=false
root_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
transition_journal_mutation=false
consumer_fence_mutation=false
service_mutation=false
systemd_mutation=false
provider_rpc_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Next gate after exact-head CI:

`DESIGN_TRUSTED_ROOT_ADMISSION_AND_STAGE_PAIR_QUALIFICATION`

PROTECT THE CORE.
