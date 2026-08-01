# Authenticated paid-work activation prerequisite evidence composition v1

This lane closes the evidence-composition gap between the activation-prerequisite plan from PR #899 and the independent local-Git observer introduced by PR #905. It does not activate the paid-work runtime.

The tool consumes three private JSON files:

1. the v1 activation-prerequisite plan;
2. its v1 hold decision; and
3. a v1 independent Git/checkpoint observer receipt.

It validates each artifact with exact keys and cross-binds the plan’s configured commits and checkpoint tags to the observer’s resolved commits, tag targets, ancestry edges, origin-main observation, configuration digest, and complete read-only Git command transcript. It then prints a canonical composition receipt to standard output.

## Provenance rule

The prerequisite plan remains explicitly caller-asserted. This lane never rewrites that historical fact as independently observed. Only the Git/checkpoint evidence is independently observed, and the composition receipt states both facts separately.

## Production bindings

The CLI is fail-closed against the exact production evidence chain:

- runtime source: `3b298bc1e31365aec7a20d03c3f425e22fd2f949`
- packet: `eaa41fdf76044c88eb9c078046bd370acb3ee457`
- PR #894 merge / install-mechanism checkpoint target: `3074bd4f253082841630312a8353946321b5a97e`
- prerequisite main / install checkpoint target: `b9b8189347a12bfe0528f980f4edb7dffd3e6e1a`
- PR #899 prerequisite merge: `25db3a0b0ff802914ef40bacabcbbda3779866cd`
- PR #902 repair merge and repair checkpoint target: `e46619b4eba306dd0727e93ef87f52b68f724852`
- observer configuration SHA-256: `0e42f5872ed119e67cd3ce7a3afca4442c52f15ca09bbd7229867a5ba14050dc`

The observed main commit may advance, but the observer must contain a successful ancestry edge proving that the repair merge is retained by the observed main.

## Private input contract

Every input must be a regular, non-symlink file owned by the executing user with mode `0600`. The tool reads but never changes these files. It executes no Git command and performs no network request; it validates the already captured observer transcript against a strict read-only allowlist.

```bash
node tools/void-authenticated-paid-work-runtime-disabled-production-activation-prerequisite-evidence-composition-v1.mjs \
  --plan /private/path/activation-prerequisite-plan.json \
  --decision /private/path/activation-prerequisite-decision.json \
  --git-observer /private/path/git-observer-receipt.json
```

The only success status is:

`independent_git_evidence_composed_activation_forbidden_separate_execution_lane_required`

## Non-authority boundary

Success does not authorize or perform configuration enablement, credential access, service creation or restart, listener creation, work dispatch, payment execution, work-credit writes, wallet or signer access, settlement, or fund movement. It does not write Git refs or invoke Git. A separate activation execution lane remains required.

## Proof

Run:

```bash
node scripts/prove_authenticated_paid_work_runtime_disabled_production_activation_prerequisite_evidence_composition_v1.mjs
```

The proof covers canonical plan/decision hashing, production binding, provenance preservation, command allowlisting, checkpoint and ancestry cross-binding, fail-closed mutation cases, private file-mode enforcement, input immutability, and the activation-forbidden boundary.
