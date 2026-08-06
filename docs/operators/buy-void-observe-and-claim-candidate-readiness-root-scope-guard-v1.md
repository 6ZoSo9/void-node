# Buy VOID observe-and-claim candidate readiness root-scope guard v1

Marker: `VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_ROOT_SCOPE_GUARD_V1`

## Problem

The maintained observe-and-claim candidate-readiness CLI recursively enumerates
JSON files beneath `.runtime/public-buy-void-requests-v1`. PR #990 correctly
stopped an operator-event-only file from becoming a candidate by requiring a
canonical `<request_id>.json` basename, but a nested backup or untrusted
subdirectory can still contain that basename and be counted as a canonical
request.

The existing proof prints `canonical_base_files_only=1` without exercising a
nested canonical-looking request. That leaves the claimed root-directory
boundary unproven.

## Guarded entry point

The root-scope guard creates a private temporary mirror containing only direct,
regular `.json` children of the canonical request directory. It then runs the
maintained readiness CLI against that mirror.

Candidate discovery is therefore fixed to:

```text
candidate_source_scope=direct_regular_json_files_only
```

The guard:

- does not recurse when selecting candidate source files;
- ignores nested JSON entries regardless of their basename or contents;
- ignores direct JSON symlinks and other non-regular entries;
- preserves direct canonical request and operator-event behavior;
- reports counts for direct regular, direct special, and nested JSON entries;
- does not disclose the private temporary mirror path; and
- removes the temporary mirror after producing the report.

The maintained inner report remains authoritative for server-derived snapshot,
dry-run orchestrator, activation-plan, and all-false money authority semantics.
The guard additionally checks that the inner CLI saw exactly the copied direct
regular JSON set.

## Usage

After a separate merge and operator decision, the read-only guard can be run as:

```bash
node tools/buy-void-observe-and-claim-candidate-readiness-root-scope-guard-v1.mjs \
  --repo-root "$HOME/dev/void-node" \
  --output "$HOME/void-diagnostics/buy-void-candidate-readiness-root-scope-v1.json"
```

To preserve the maintained exact-one exit convention:

```bash
node tools/buy-void-observe-and-claim-candidate-readiness-root-scope-guard-v1.mjs \
  --repo-root "$HOME/dev/void-node" \
  --output "$HOME/void-diagnostics/buy-void-candidate-readiness-root-scope-v1.json" \
  --require-exact-one
```

Exit code `3` means no eligible candidate. Exit code `4` means multiple eligible
candidates. Neither result authorizes activation.

## Regression

The focused proof constructs:

- one direct rejected operator event;
- one nested canonical-looking `payment_verified` request; and
- one direct JSON symlink.

It proves that only the direct regular operator-event file reaches the maintained
CLI, the nested request produces no record, the symlink is ignored, the orphan
event remains visible, and the exact-one `none` state still exits with code `3`.

Expected marker:

```text
VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_ROOT_SCOPE_GUARD_V1_PROOF_GREEN
```

## Authority boundary

This source lane does not run against a live operator repository. A future run
may read request records and write only a private temporary mirror plus an
operator-selected report. It does not modify runtime request state, reconstruct
a request, claim payment, reserve inventory or an execution attempt, access a
wallet or signer, sign, broadcast a transaction, execute payment, deploy,
restart a service, or move funds.

An `exact_one` readiness result remains a dry-run planning observation. Every
confirmation, claim, inventory, signing, broadcast, fulfillment, receipt, and
money-moving step remains a separate explicit gate.
