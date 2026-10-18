# Buy VOID presale Epoch-2 installed-generation host evidence V2

Marker:
`VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V2`.

Status: **source/CI-only repair; no Precision host collection is authorized or performed by this gate**.

## Purpose

V2 repairs the V1 checkout observation after the separately authorized Precision
collection demonstrated that V1's untracked-file enumeration is not compatible
with the production checkout.

V1 invokes:

```text
git ls-files --others --full-name -z
```

and requires empty output. That is not merely a source-integrity check: it walks
all untracked host data, including large runtime and evidence trees that are not
execution authority. Increasing V1's 16 MiB Git-output limit would not repair the
contract; it would only move the same host to the later
`checkout_untracked_files` HOLD.

V2 does not raise the output limit and does not add an ignore-pattern bypass.
It removes untracked-path enumeration from this lane entirely.

## Exact parent

V2 is stacked on the exact V1 generation:

- parent head: `a5ab4b3ce14bdb2135cda811cdc822c2efa05f40`;
- V1 source:
  `ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py`;
- V1 source Git blob:
  `6b2bf387bff5e5cd6ada048fd5c8fe4d28d66577`;
- V1 proof Git blob:
  `4981ccf99c029a0b90042747f9023107826202ef`.

The V1 source is descriptor-read from the exact materialized source generation,
required to match that blob, compiled in memory under isolated Python, and then
patched only at its checkout-verification boundary.

## Tracked-source contract

V2 retains all source facts that can affect the delegated qualification:

1. exact lowercase expected commit;
2. exact branch `main` through V1's retained-HEAD generation checks;
3. `git ls-tree -r -l -z --full-tree <expected-head>`;
4. `git ls-files --stage --full-name -z`;
5. exact tree/index path, mode, blob and stage-zero equality;
6. bounded descriptor reads of every tracked regular file;
7. exact raw Git-blob equality and executable-mode equality;
8. reobservation of head, branch and index after all tracked-file reads.

Changed tracked bytes, executable-mode drift, staged changes, removed index
entries, unmerged index entries, unsupported tracked types, path traversal,
symlink/FIFO substitution, and generation drift remain HOLD.

## Untracked data boundary

V2 deliberately does not run any Git `--others` query and does not read
`.gitignore`, `.git/info/exclude`, `core.excludesFile`, or an exclude-standard
chain for this decision.

Its receipt states:

```text
tracked_source_checkout_exact=true
untracked_paths_enumerated=false
untracked_paths_source_authority=false
checkout_clean_claimed=false
```

This is not an assertion that the checkout has no untracked paths. It is the
opposite: unrelated production data may exist, but it is not accepted as source
or execution authority.

Untracked checkout files cannot enter this lane through Python import search:

- V2 enforces isolated/safe-path Python before any shadowable import;
- active `sys.path` entries may not resolve inside the materialized source root;
- the exact V1 source is compiled from descriptor-authenticated bytes;
- V1 loads the exact qualifier and installer from authenticated Git objects and
  descriptor-matched tracked files;
- the delegated native self-tests execute installed protected binaries, not
  checkout-local untracked code.

The focused proof places untracked `hashlib.py`, `argparse.py`,
`sitecustomize.py`, `__future__.py`, `data_a/...`, and `node_modules/...` files
beside an exact tracked fixture and requires GREEN without issuing an untracked
Git query. It separately proves that tracked byte/index drift still fails.

## Inherited host execution

After the V2 tracked-source check passes, the exact V1 collector remains the
execution engine. Its reviewed contract is unchanged:

- root and isolated Python required;
- exact V5 installed qualifier and proof;
- exact delegated protected installer and accepted lock;
- before/middle/after installed-generation snapshots;
- two descriptor-bound inert native self-tests;
- identical self-test outputs and stable visible/retained generations;
- no authenticated JS runner or live-composition execution.

## Authority

Even a future GREEN V2 host receipt keeps:

```text
filesystem_write_performed=false
runner_execution=false
live_composition_execution=false
service_mutation=false
network_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

This PR does not run Precision, retry the host collection, mutate the checkout,
change a service, execute a rollback challenge, accept payment, activate the
presale/WC market, or move funds.

The later host retry remains separately operation-bound.

**PROTECT THE CORE.**
