# WC/VOID coupled launch policy bundle v1

Marker: `VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1`

Status: source-only launch-policy compiler. It does not choose production policy
values, read a wall clock, mutate runtime state, enable Buy VOID, activate
WC/VOID or the presale, access a wallet/signer/key, submit a transaction, or move
funds.

## Purpose

Several coupled economic policies are already source-ready but deliberately do
not hardcode their production values.

A real launch still needs one reviewed, immutable policy object that commits the
exact values before opening.

This bundle composes five existing policy families without replacing them:

1. absolute WC/VOID opening window;
2. participant and related-identity concentration caps;
3. minimum real production-earned WC depth;
4. economic-intent TTL and outstanding-count caps; and
5. sponsored execution gas budgets.

The result is one content-addressed launch-policy bundle.

The bundle is bound to the canonical coupled-launch identity currently recorded
by `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`:

```text
sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

A policy bundle for any other launch ID fails closed. The canonical candidate
is read from the exact captured Git commit object, not from mutable worktree
bytes, and its Git blob/SHA-256 plus repository HEAD/tree are embedded in the
source binding.

The policy compiler itself no longer imports policy modules from the parent
worktree. A dedicated reviewed semantic core and its complete 10-module relative
closure are read from the same captured HEAD, materialized into a private
temporary source tree, and executed by a permission-fenced Node child. The
closure is fail-closed against bare packages, dynamic imports, child-process,
worker, and network-module surfaces.

The reviewed core is deliberately **semantic-only**: it cannot emit the
production bundle marker, authority object, canonical-source claim, or
`bundle_id`. Only the parent compiler, after source/canonical-main provenance
checks, can assemble and content-address the production-shaped bundle. The
reviewed module Git-blob manifest is embedded in `canonical_launch_source`.

This deliberately binds the bundle to one reviewed source generation without
hard-pinning unrelated candidate gate fields. Reviewed gate promotions may
change the candidate blob while keeping the same coupled-launch identity, but a
new bundle must then be compiled from the new reviewed generation.

## No source-selected defaults

The compiler has no default launch values.

The caller must explicitly supply every production value.

The source proof uses synthetic fixture values only to exercise the verifier.
Those numbers are not recommendations, launch settings, or policy authority.

The compiled artifact records:

```text
exact_values_supplied_explicitly=true
values_selected_by_source=false
runtime_enforcement_verified=false
launch_authority=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

## Opening window

The supplied opening window must use the canonical
`VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1`.

It binds:

- one exact coupled launch ID;
- policy commitment time;
- absolute open time;
- absolute exclusive close time; and
- deterministic content-addressed window ID.

Required ordering:

```text
window policy committed < opens < closes
```

The compiler reads no wall clock.

## Concentration and Sybil caps

The supplied concentration policy must:

- bind the same coupled launch ID;
- bind the exact opening-window ID;
- be committed after the window policy and before opening;
- use positive basis-point caps strictly below 10000;
- require related-identity cap >= individual participant cap;
- use the canonical fail-closed action; and
- reproduce the canonical policy ID exactly.

The compiler does not select either cap.

## Minimum real-WC depth

The minimum-depth policy must:

- bind the same launch and opening window;
- be committed before opening;
- use a positive whole-WC minimum;
- use the canonical hold-opening-price failure action; and
- reproduce its canonical policy ID.

The compiler does not select the WC threshold.

## TTL and outstanding caps

The economic-intent policy must:

- bind the same coupled launch;
- be committed before opening;
- use a positive TTL no greater than the existing 300-second signed-submission
  ceiling;
- use positive per-identity and global outstanding limits;
- require global >= per-identity;
- stay inside the existing one-million tracked-intent technical ceiling;
- preserve `reconcile_without_automatic_execution` for late payments; and
- reproduce the canonical policy ID.

The compiler does not select the TTL or either cap.

## Sponsored execution budgets

The sponsored-execution policy must:

- bind the same coupled launch;
- bind the exact TTL/caps policy ID;
- be committed after the TTL policy and before opening;
- use a positive per-intent gas limit no greater than the existing 3,000,000
  signed-intent ceiling;
- satisfy:

```text
per-intent <= per-identity <= global
```

- preserve
  `deny_sponsorship_without_hidden_trade_minimum`; and
- reproduce the canonical policy ID.

Budget exhaustion therefore denies sponsorship rather than silently creating a
purchase/trade-size minimum.

The compiler does not select any gas budget.

## Bundle commitment ordering

The bundle itself is committed only after every dependency policy exists and
still before opening:

```text
latest dependency policy commitment
  <= bundle commitment
  < opening time
```

All five policy objects and their content-addressed IDs are embedded in the
bundle, together with the four canonical source policy-contract IDs.

The resulting bundle ID is:

```text
sha256:<canonical bundle body>
```

## Private artifact custody

CLI input and output must be outside the repository.

The input must be:

- an absolute direct regular file;
- owner-controlled;
- private against group/other access; and
- no larger than 1 MiB.

The output parent must be a direct, non-symlink, owner-controlled directory that
is not group/other writable.

Private input is descriptor-bound with `O_NOFOLLOW` and stable
device/inode/size/time checks so a validated pathname is not reopened later.
The operator must also supply an independently reviewed SHA-256 for the exact
input bytes; a pathname alone is never launch-policy authority.

Canonical Git source binding runs with system/global Git configuration disabled,
replace refs disabled, hooks disabled, fsmonitor/untracked-cache/preload disabled,
and a fixed minimal environment. The parent compiler also requires its own
executing worktree bytes to match the captured HEAD blob before compilation.

For a production CLI artifact, the repository branch must be exactly `main`,
the origin must identify exactly `6ZoSo9/void-node`, and a fixed-HTTPS
`git ls-remote --heads ... refs/heads/main` executed outside repository
discovery with TLS verification forced must equal local HEAD. This fixed
canonical-main provenance query is an explicit external network read; it is not
an RPC/runtime/market action. After reviewed child execution, local
HEAD/tree/branch/origin/clean state and parent-tool blob are rechecked;
production mode also repeats the remote-main read and requires it to remain the
same canonical HEAD before the bundle is minted. Feature-branch CI does not
fabricate that condition and test-only compilation performs no canonical-remote
read.

The output is create-only, mode `0600`, fsynced, and never overwritten. Its
parent directory is opened once and owner/mode/device/inode bound. The actual
`O_CREAT|O_EXCL|O_NOFOLLOW` create is performed through the retained directory
descriptor via Linux `/proc/self/fd/<dirfd>/<basename>`, not through the parent
pathname. The parent is fsynced through that same descriptor after creation and
revalidated against the pathname before success. The persisted output
device/inode is also rechecked. A same-owner rename/replacement of the parent
therefore cannot redirect the create into a replacement directory before the
post-check notices; failure remains fail-closed.

## CLI

After the operator has independently reviewed every explicit value, production
artifact generation is:

```bash
node tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs \
  --input /absolute/private/launch-policy-input.json \
  --expected-input-sha256 <64hex-reviewed-input-sha256> \
  --output /absolute/private/launch-policy-bundle.json
```

That command succeeds only on exact canonical remote `main`.

Hosted PR proof uses the explicit `--test-only` mode. Test-only output has marker
`VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_TEST_ONLY_V1`, sets
`production_artifact_authorized=false`, and deliberately contains no production
`bundle_id`. It exists only to prove reviewed semantics and private-file custody
on a feature branch.

A green production bundle is still policy preparation only. Runtime enforcement,
final opening-cohort observations, final coupled source promotion, Buy VOID
process gates, and the launch ceremony remain separate gates.

## Authority boundary

The bundle does not perform or authorize:

- wall-clock observation;
- runtime or service mutation;
- WC-ledger writes;
- wallet/signer/private-key access;
- transaction construction/signing/submission/broadcast;
- Chain-2050 writes;
- inventory funding or liquidity movement;
- market activation;
- public presale activation; or
- funds movement.

## Verification

```bash
node scripts/prove_void_wc_void_coupled_launch_policy_bundle_v1.mjs
```

The proof also hides a malicious worktree edit to one imported policy module
behind Git's assume-unchanged bit. Compilation must still use the exact Git-object
module closure and the malicious sentinel must never execute. The feature-branch
production CLI path must HOLD before creating an output, while `--test-only`
continues to exercise descriptor-bound input and create-only durable output
custody.
