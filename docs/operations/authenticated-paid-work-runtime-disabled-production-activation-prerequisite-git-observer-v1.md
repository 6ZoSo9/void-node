# Authenticated paid-work disabled production activation prerequisite Git observer v1

This lane supplies the independently observed Git/checkpoint provenance required by the activation-prerequisite contract merged in PR #899 and repaired through PR #902.

It does not activate the runtime. A green observation still ends at `git_checkpoint_lineage_observed_exact_activation_forbidden` and requires a separate activation-execution lane.

## Observed evidence

The observer invokes local `git` directly with argv arrays and no shell. It records every command, exit code, stdout, and stderr in its result. It independently resolves:

- the repository top level, `HEAD`, and `refs/remotes/origin/main`;
- the disabled-production install checkpoint and its peeled commit target;
- the install-mechanism checkpoint and its peeled commit target;
- the PR #899/#902 repair-chain checkpoint and its peeled commit target;
- every configured historical commit as a commit object;
- ancestry from runtime source to packet, PR #894, the prerequisite main binding, PR #899, PR #902, and the observed origin main.

The configured identities are expectations. The `observations` and `observation_provenance.commands` fields are the local Git observations used to decide whether those expectations hold.

## Ref preparation boundary

The observer never fetches. Its GitHub Actions workflow checks out full history and prepares `refs/remotes/origin/main` before invocation. Operators must likewise fetch the expected main and tags before running the observer. Ref preparation is outside the observer receipt and must not be described as an observer capability.

## Authority boundary

The observer does not write Git refs, read credentials or token bytes, make network requests, write activation configuration, create or restart services, create listeners, dispatch work, execute payment, write Work Credits, access wallets or signers, or move funds.

Run from a prepared repository:

```bash
node tools/void-authenticated-paid-work-runtime-disabled-production-activation-prerequisite-git-observer-v1.mjs \
  --config examples/authenticated-paid-work-runtime-disabled-production-activation-prerequisite-git-observer-v1.example.json \
  --repository-root .
```
