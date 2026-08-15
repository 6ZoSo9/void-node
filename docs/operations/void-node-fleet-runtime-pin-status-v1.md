# VOID node fleet runtime pin status v1

Marker: `VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1`

## Purpose

Report whether checked-in source and the actually running VOID process are aligned with current canonical `main`, intentionally pinned to an explicitly approved runtime commit, unexpectedly drifted, or not provable from fresh evidence.

This surface is read-only with respect to repository/runtime state. It does not converge source, restart a service, deploy source, fetch Git objects, edit Git configuration, or mutate fleet state. An optional status receipt may be created only outside the selected coordinator worktree and Git administrative directories.

## Evidence model

The classifier consumes two independent receipts for the same configured nodes:

1. `VOID_NODE_FLEET_DRIFT_AUDIT_V1` for checked-out source state; and
2. `VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1` for immutable process-source commit/tree plus systemd invocation identity.

Checked-out Git `HEAD` is **not** runtime identity. A node may have source at newer `main` while its live process remains intentionally bound to an older approved commit. The classifier therefore uses `process_source_commit` for runtime classification and requires coherent node names, transports, source snapshots, and fresh observations across both receipts.

## Live canonical-main evaluator

The canonical operator path requires an explicitly reviewed absolute Git executable instead of discovering Git through caller-controlled `PATH`:

```bash
node ops/run_void_node_fleet_runtime_pin_status_v1.mjs \
  --drift-audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --process-freshness-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --approved-runtime-sha '<exact approved 40-hex commit>' \
  --git-executable /usr/bin/git \
  --max-evidence-age-seconds 300 \
  --output "$HOME/.config/void/node-fleet-runtime-pin-status-v1.json"
```

`--git-executable` is required, must be an absolute path resolving to an executable regular file, and is used for every local Git inspection and canonical `ls-remote` query. The evaluator hashes that exact executable and returns its canonical path plus SHA-256 as `canonical_git_executable`; `operator_evidence_id_sha256` binds the underlying status ID to that Git executable identity. Ambient `PATH` therefore cannot silently replace the program producing canonical-main evidence.

The evaluator defaults `--coordinator-repo` to the checkout containing the script. A different exact worktree root may be supplied explicitly.

The evaluator treats `https://github.com/6ZoSo9/void-node.git` as the exact reviewed canonical repository identity. Before classification it:

- proves the selected coordinator path is the exact Git worktree root;
- binds the exact reviewed absolute Git executable and verifies its identity remains unchanged across evaluation;
- reads `remote.<name>.url` from local repository configuration with includes disabled and requires exactly the reviewed canonical URL;
- resolves the named remote through ordinary Git configuration and HOLDs if global, XDG, system, or other ambient `url.*.insteadOf` behavior changes that effective URL;
- rejects direct Git repository/configuration-selection overrides before inspection;
- rejects direct Git helper/program-selection overrides including `GIT_EXEC_PATH`, `GIT_SSH`, `GIT_SSH_COMMAND`, `GIT_SSH_VARIANT`, and `GIT_PROXY_COMMAND`;
- rejects caller-controlled HTTPS trust-policy overrides such as `GIT_SSL_NO_VERIFY`, `GIT_SSL_CAINFO`, `GIT_SSL_CAPATH`, `CURL_CA_BUNDLE`, `SSL_CERT_FILE`, and `SSL_CERT_DIR`; and
- queries exact `refs/heads/main` using the explicit reviewed canonical URL, outside the worktree, with Git global/system configuration sources disabled for that read-only query.

The live canonical query is repeated after classification. Canonical SHA, stored remote identity, effective remote identity, and reviewed Git executable identity must remain unchanged across the evaluation bracket. This prevents copied/touched stale drift evidence, ambient Git URL rewrite, helper substitution, top-level Git substitution through `PATH`, or invocation-specific TLS trust replacement from being converted into current-main authority.

Direct repository/configuration selector variables such as `GIT_DIR`, `GIT_WORK_TREE`, `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_SYSTEM`, `GIT_CONFIG_PARAMETERS`, and indexed `GIT_CONFIG_KEY_*` / `GIT_CONFIG_VALUE_*` injection are rejected before Git inspection. Ordinary Git configuration remains visible specifically so an ambient rewrite cannot be hidden from the preflight comparison.

The canonical query performs `git ls-remote` only. It does not fetch, update refs, alter the index/worktree, or change Git configuration.

`tools/void-node-fleet-runtime-pin-status-v1.mjs` remains the pure schema/classification/evidence library. Its direct CLI does not independently prove live canonical-main freshness and must not be used to claim `CURRENT_WITH_MAIN`.

## Status contract

Each non-HOLD node is classified from three separate identities:

- `approved_runtime_sha` — the exact runtime commit explicitly approved for this evaluation;
- `canonical_main_sha` — canonical source `main` from the drift audit, accepted only after the evaluator proves it equals live canonical `main`; and
- `process_source_commit` — the immutable running-process commit proven by the process-freshness audit.

The drift audit's `node.head` remains source context only.

Per-node status is one of:

- `HEALTHY_INTENTIONAL_PIN` — the process identity equals the approved runtime commit while canonical `main` is newer;
- `CURRENT_WITH_MAIN` — approved runtime, live-bracketed canonical `main`, and running process identity all agree;
- `UNEXPECTED_RUNTIME_DRIFT` — the healthy running process identity does not equal the approved runtime commit; or
- `HOLD` — upstream evidence is HOLD, source/process evidence cannot be coherently paired, or canonical-main freshness/identity cannot be proven.

Fleet priority is fail closed: any HOLD dominates; otherwise any unexpected runtime drift dominates; otherwise all nodes must agree on the same approved status.

A process-freshness receipt may say `RESTART_REQUIRED` because checked-out source advanced after process start while this packet simultaneously says `HEALTHY_INTENTIONAL_PIN` because that older running process is the exact operator-approved pin. Neither result authorizes a restart.

## Evidence coherence and freshness

The classifier validates both producer schemas and reproduces both normalized audit IDs. It additionally requires exact node-set identity, transport agreement, source-snapshot coherence, bound process-source commit/tree, stable systemd invocation identity, exact `src/index.ts` entrypoint, clean/stable source, active process, and green health/readiness.

Both receipt inputs must be regular non-symlink files between 2 bytes and 4 MiB. Each is opened once, descriptor-checked, bounded, and rejected if size/mtime/ctime moves during the read. The process receipt's embedded observations must also be fresh and non-future. Drift file mtime is not canonical-main authority; the live canonical bracket is.

The default maximum evidence age is 300 seconds.

## Adversarial acceptance boundary

The deterministic proofs require all of these cases:

- source `HEAD=B`, running process `A`, approved runtime `A` => `HEALTHY_INTENTIONAL_PIN`;
- running process `B`, source/canonical `B`, approved runtime `A` => `UNEXPECTED_RUNTIME_DRIFT`;
- process identity movement, node-set/transport/source mismatch, or stale observations => `HOLD`;
- a drift receipt for canonical `A` recreated with fresh filesystem timestamps after live canonical `main` advances to `B` is rejected before packet publication;
- genuinely fresh source/process evidence for approved runtime `A` remains classifiable when canonical main is `B`;
- global and XDG Git `url.*.insteadOf` rewrites are rejected before packet publication;
- caller-controlled HTTPS certificate-verification/trust-root overrides are rejected before canonical inspection;
- a caller-provided `git-remote-https` through `GIT_EXEC_PATH` is rejected before helper invocation or publication;
- a fake top-level `git` earlier in ambient `PATH` is never invoked because all evaluation uses the explicitly reviewed absolute Git executable;
- published operator evidence contains the reviewed Git executable canonical path and SHA-256 plus an operator evidence ID binding that identity to the status ID;
- output paths inside the coordinator worktree, Git directory, or Git common directory are rejected before evaluation/publication;
- a valid external receipt is create-only, mode `0600`, and does not alter coordinator Git state; and
- no fetch, service action, runtime mutation, or network mutation is performed.

Falsification: the lane is incomplete if it derives runtime identity from source `HEAD`, combines incoherent source/process evidence into a healthy result, publishes current-main truth from stale drift content, lets ambient Git configuration/TLS/helper/program selection replace the reviewed canonical query, or lets optional evidence output dirty/mutate the selected repository after the canonical bracket.

## Output and CLI behavior

`--drift-audit`, `--process-freshness-audit`, `--approved-runtime-sha`, and `--git-executable` are required. Options are strict and single-use. Integer arguments must be unpadded.

The optional output is create-only and mode `0600`. Its existing parent directory is canonicalized before use, and the resolved destination must be outside the selected coordinator worktree, absolute Git directory, and Git common directory. The destination is reserved create-only before canonical evaluation; failed evaluation cleans an unpublished reservation when possible. A successful packet reports `evidence_output_created=true` only when the external destination has actually been created for publication.

Healthy intentional-pin and exact-current results exit 0. Packet `HOLD` and `UNEXPECTED_RUNTIME_DRIFT` exit 2. Invalid, stale, contradictory, or canonical-identity/freshness-unproven inputs exit 1 before packet publication.

## Proofs

```bash
node scripts/prove_void_node_fleet_runtime_pin_status_v1.mjs
node scripts/prove_void_node_fleet_runtime_pin_live_canonical_v1.mjs
```

The focused workflow runs these proofs plus the source-drift and process-freshness producer regressions on Node.js 22, 24, and 26.

## Authority boundary

The evaluator may read two local evidence files, inspect the selected local Git worktree with an explicitly reviewed absolute Git executable, make bounded read-only queries to the reviewed public canonical Git repository, and optionally create one external local status JSON file. It does not invoke fleet collection, run `git fetch`/pull/checkout/reset/merge, alter Git configuration or refs, install/build source, deploy, start/stop/restart services, change networking, access credentials/keys/wallets/signers, mutate Buy VOID/Work Credits/validators/consensus/treasury/liquidity, construct/sign/broadcast transactions, or move funds.

Source merge remains separate from deployment. A healthy pin does not authorize indefinite retention, and newer `main` does not authorize convergence. Runtime decisions remain explicit operator gates.
