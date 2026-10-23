# V7 V5 static staging launcher + pair qualifier V2

## Purpose

Implement the production-disabled trusted admission surfaces defined by Draft
#3717 for the exact canonical staging installers proven in #3715.

This successor reuses the reviewed #3714 closed-tree/static-launcher design but
binds the canonical installer generation and canonical stage custody:

- installer source commit:
  `ea2193709dab86ea3eb3c2235d08e8a6858a23c6`;
- installer source tree:
  `07c2dd960c047d56d0c017825e4e389bcdc99342`;
- source installer blob:
  `e1fa010d5128b9846aafc8d353c874da96dfa48d`;
- receipt installer blob:
  `3ff41612a8a7aed926995e0892383e75fad99c7a`;
- source stage mode:
  `0755`;
- source internal build path:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1`.

## Launcher V2

Source:

`ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v2.c`

Future fixed closed-tree root:

`/opt/void-v7-v5-source-receipt-stage-closed-tree-v2`

The launcher binds:

- V2 trusted-admission plan ID
  `voidv7v5stageadmissionplan2_b85c582a6da03b80396ac58734d6634961df70d0ec76a0bafc52931dbb13fdbf`;
- V2 plan blob
  `5669b393a87c2bfd584375e5cff2ef3f3ffdf5d9`;
- source installer: 127,721 bytes,
  SHA-256 `88452c8d3e6cb46f47e7f499e5f6742ed1da3fa26a06e3f9e9370d0e76c1a8d4`;
- receipt installer: 12,327 bytes,
  SHA-256 `9db6f2b414f17f453cdb94f0e7d55760cb91cd0272d62176881a8b0ee1fa4e2c`;
- exact implementation commit/tree above.

Its four operations remain:

- `source-stage-plan`;
- `source-stage-apply`;
- `receipt-stage-plan`;
- `receipt-stage-apply`.

The caller cannot supply paths, receipt bytes, candidate paths, or source
generation. The selected installer is authenticated and inherited into static
Python through a retained file descriptor; it is not reopened by pathname after
the final validation.

## Production-disabled boundary

The launcher source intentionally compiles with an **unaccepted** V2 manifest
lock by default.

A normal staging operation must HOLD until a future separately reviewed V2
closed-tree manifest and V2 acceptance ID are compiled into the launcher.

The V2 acceptance prefix is distinct:

`voidv7v5stageaccept2_`

This prevents a V1 closed-tree acceptance identity from authorizing the V2
closed tree.

This Draft does not create a manifest candidate, accept a manifest, install a
closed tree, run as root, or apply either stage.

## Pair qualifier V2

Source:

`ops/precision/void_v7_v5_source_receipt_stage_pair_qualifier_v2.py`

It is read-only and refuses sudo.

The V5 source stage must be exact root:root mode `0755`, full-history,
non-shallow, clean `main`, with exact V5 head/tree/parent and 18,390 reachable
commits.

The qualifier separately treats the fixed V4 source as root-owned and
group/world non-writable rather than incorrectly inheriting V5's exact stage
mode. This keeps fixed-V4 custody validation compatible with the already
installed generation while making V5's future production-root shape exact.

It also requires:

- source internal build path `.stage-v5.build-v1` absent;
- exact V5 receipt stage identity;
- exact fixed V4 source/receipt identities;
- reserved V4 predecessor paths absent;
- source and receipt stages on the same respective filesystems as the fixed
  V4 objects.

A GREEN qualifier result remains staging evidence only:

```text
exchange_preconditions_complete=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
runtime_cutover_authority=false
service_mutation=false
public_presale_activation=false
funds_movement=false
```

## CI proof

The V2 proof inherits the green #3714 adversarial suite and rebinds it to V2.
It must:

- compile launcher V2 with `-std=c11 -O2 -Wall -Wextra -Werror`;
- run launcher self-test;
- prove normal operations fail closed while the production manifest is
  unaccepted;
- prove selected installer execution remains descriptor-bound through
  `/proc/self/fd/<fd>` even after pathname replacement;
- syntax/self-test qualifier V2;
- assert the canonical `0755/.build-v1` semantics;
- reject reuse of predecessor `0555/.tmp-v1` assumptions.

## Authority

Source/test/CI only:

```text
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
transition_journal_mutation=false
consumer_fence_mutation=false
service_mutation=false
systemd_mutation=false
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

PROTECT THE CORE.
