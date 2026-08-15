# VOID node fleet runtime pin status v1

Marker: `VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1`

## Purpose

Report whether checked-in source and the actually running VOID process are aligned with current canonical `main`, intentionally pinned to an explicitly approved runtime commit, unexpectedly drifted, or not provable from fresh evidence.

This surface is read-only with respect to repository/runtime state. It does not converge source, restart a service, deploy source, fetch Git objects, edit Git configuration, or mutate fleet state. An optional status receipt may be created only outside the selected coordinator worktree and Git administrative directories.

## Evidence model

The classifier consumes two independent receipts for the same configured nodes:

1. `VOID_NODE_FLEET_DRIFT_AUDIT_V1` for checked-out source state; and
2. `VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1` for immutable process-source commit/tree plus systemd invocation identity.

Checked-out Git `HEAD` is **not** runtime identity. A node may have source at newer `main` while its live process remains intentionally bound to an older approved commit. Runtime classification therefore uses `process_source_commit` and requires coherent node names, transports, source snapshots, process identity, health/readiness, and fresh observations across both receipts.

## Canonical operator path

Use the checked-in operator evaluator with an explicitly reviewed absolute Git executable:

```bash
node ops/run_void_node_fleet_runtime_pin_status_v1.mjs \
  --drift-audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --process-freshness-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --approved-runtime-sha '<exact approved 40-hex commit>' \
  --git-executable /usr/bin/git \
  --max-evidence-age-seconds 300 \
  --output "$HOME/.config/void/node-fleet-runtime-pin-status-v1.json"
```

`--git-executable` is required. It must resolve to an executable regular file whose canonical basename is `git`. The evaluator hashes that exact executable before evaluation, uses only its canonical directory as the Git lookup `PATH`, rechecks path/SHA-256/size/device/inode afterward, and publishes the canonical path plus SHA-256 as `canonical_git_executable`. `operator_evidence_id_sha256` binds the underlying `status_id_sha256` to that Git executable identity.

The earlier live-canonical evaluator remains in `ops/void-node-fleet-runtime-pin-status-core-v1.mjs` only as an imported compatibility library for the focused proof surfaces. **Direct execution of that core module is disabled and fails closed before evidence classification or publication.** It emits only a `HOLD` with `reason=legacy_core_cli_disabled`; it cannot emit `CURRENT_WITH_MAIN`, `HEALTHY_INTENTIONAL_PIN`, `canonical_main_sha`, node classifications, or reviewed operator evidence. `ops/run_void_node_fleet_runtime_pin_status_v1.mjs` is the sole operator CLI for current-main/runtime-pin claims.

## Canonical Git identity and helper boundary

The evaluator treats `https://github.com/6ZoSo9/void-node.git` as the reviewed canonical repository identity. Before classification it:

- proves the selected coordinator path is the exact Git worktree root;
- requires the explicitly reviewed absolute Git executable and prevents ambient `PATH` from replacing it;
- reads `remote.<name>.url` from local repository config with includes disabled and requires the exact reviewed canonical URL;
- resolves the named remote through ordinary Git configuration and HOLDs if ambient `url.*.insteadOf` behavior changes that effective URL;
- rejects Git repository/configuration selectors such as `GIT_DIR`, `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_SYSTEM`, `GIT_CONFIG_PARAMETERS`, and indexed `GIT_CONFIG_KEY_*` / `GIT_CONFIG_VALUE_*` injection;
- rejects helper/program-selection overrides including `GIT_EXEC_PATH`, `GIT_SSH`, `GIT_SSH_COMMAND`, `GIT_SSH_VARIANT`, `GIT_PROXY_COMMAND`, askpass overrides, and dynamic-loader injection variables such as `LD_PRELOAD`/`LD_LIBRARY_PATH`;
- rejects Git trace/curl-debug overrides that could create caller-selected side-effect files during a read-only evaluation;
- rejects caller-controlled HTTPS trust-policy overrides including `GIT_SSL_NO_VERIFY`, `GIT_SSL_CAINFO`, `GIT_SSL_CAPATH`, `CURL_CA_BUNDLE`, `SSL_CERT_FILE`, and `SSL_CERT_DIR`; and
- queries exact `refs/heads/main` with `git ls-remote` only, using the reviewed Git executable and explicit reviewed repository URL.

The live canonical query is repeated after classification. Canonical SHA, stored/effective remote identity, and reviewed Git executable identity must remain stable across the bracket. A copied/touched stale drift receipt, ambient URL rewrite, fake `git-remote-https`, fake top-level `git` in `PATH`, or invocation-specific TLS trust replacement cannot become current-main authority.

## Status contract

Each non-HOLD node is classified from three separate identities:

- `approved_runtime_sha` — the exact runtime commit explicitly approved for this evaluation;
- `canonical_main_sha` — canonical source `main`, accepted only after the live bracket proves it current; and
- `process_source_commit` — the immutable running-process commit proven by the process-freshness audit.

Per-node status is one of:

- `HEALTHY_INTENTIONAL_PIN` — process identity equals the approved runtime while canonical `main` is newer;
- `CURRENT_WITH_MAIN` — approved runtime, live canonical `main`, and process identity all agree;
- `UNEXPECTED_RUNTIME_DRIFT` — the healthy process identity does not equal the approved runtime; or
- `HOLD` — evidence is stale, contradictory, incoherent, or canonical identity/freshness cannot be proven.

A process-freshness receipt may say `RESTART_REQUIRED` because source advanced after process start while this packet says `HEALTHY_INTENTIONAL_PIN` because the older process is the exact approved pin. Neither result authorizes a restart.

## Evidence freshness and output

Both receipt inputs must be regular non-symlink files between 2 bytes and 4 MiB. Reads are descriptor-checked and bounded; changing size/mtime/ctime during the read is rejected. Process observations must also be fresh and non-future. Default maximum evidence age is 300 seconds.

Optional output is create-only, mode `0600`, and must resolve outside the coordinator worktree, Git directory, and Git common directory. The destination is reserved before canonical evaluation; failed evaluation removes an unpublished reservation when possible. A successful packet reports `evidence_output_created=true` only for an actually created external destination.

Healthy intentional-pin and exact-current results exit 0. Packet `HOLD` and `UNEXPECTED_RUNTIME_DRIFT` exit 2. Invalid/stale/canonical-unproven inputs exit 1 before packet publication.

## Adversarial acceptance boundary

The focused proofs require at least these cases:

- source `HEAD=B`, running process `A`, approved runtime `A` => `HEALTHY_INTENTIONAL_PIN`;
- running process `B`, source/canonical `B`, approved runtime `A` => `UNEXPECTED_RUNTIME_DRIFT`;
- stale/incoherent process evidence => `HOLD`;
- copied/touched drift evidence for canonical `A` after live main becomes `B` is rejected;
- global and XDG `url.*.insteadOf` redirects are rejected;
- caller-controlled TLS trust overrides are rejected;
- caller-controlled `GIT_EXEC_PATH` cannot invoke a fake `git-remote-https`;
- a fake top-level `git` earlier in ambient `PATH` is not invoked;
- operator evidence binds the reviewed Git executable canonical path/SHA-256 to the status ID;
- direct execution of the legacy core module fails closed without success-class runtime-pin evidence;
- repository-internal/symlink-redirected output paths are rejected;
- valid external evidence is create-only mode `0600`; and
- no fetch, service action, runtime mutation, or network mutation occurs.

Falsification: the lane is incomplete if runtime identity comes from source `HEAD`, incoherent source/process evidence can become healthy, stale drift can become current-main truth, ambient Git configuration/TLS/helper/program selection can replace the reviewed canonical query, the legacy core can emit operator-usable success evidence, or optional evidence output can mutate the selected repository.

## Proofs

```bash
node scripts/prove_void_node_fleet_runtime_pin_status_v1.mjs
node scripts/prove_void_node_fleet_runtime_pin_live_canonical_v1.mjs
node scripts/prove_void_node_fleet_runtime_pin_reviewed_git_v1.mjs
```

The focused workflow runs these proofs plus source-drift and process-freshness producer regressions on Node.js 22, 24, and 26.

## Authority boundary

The evaluator may read two local evidence files, inspect the selected local Git worktree, hash and invoke an explicitly reviewed local Git executable for bounded read-only canonical queries, and optionally create one external local JSON receipt. It does not invoke fleet collection, run `git fetch`/pull/checkout/reset/merge, alter Git configuration or refs, install/build source, deploy, start/stop/restart services, change networking, access credentials/keys/wallets/signers, mutate Buy VOID/Work Credits/validators/consensus/treasury/liquidity, construct/sign/broadcast transactions, or move funds.

Source merge remains separate from deployment. A healthy pin does not authorize indefinite retention, and newer `main` does not authorize convergence. Runtime decisions remain explicit operator gates.
