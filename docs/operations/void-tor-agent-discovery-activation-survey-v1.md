# VOID Tor agent-discovery activation survey v1

This lane adds a read-only survey between source merge and any live Tor
deployment. It is intentionally separate from activation.

The survey requires an exact, clean canonical repository head, an exact
`origin/main`, ancestry from the merged discovery-parity commit, and green
deterministic source proofs. It then inspects the systemd-owned Tor backend and
its clean deployment worktree.

Its result is either:

- `already_active` when the deployment head and every required byte match the
  expected canonical head; or
- `ready_for_guarded_activation` when the clean deployed head is an ancestor of
  expected main but has not yet advanced to the required bytes.

All ambiguous, dirty, divergent, stale, malformed, or internally inconsistent
states fail closed with `HOLD`.

Run on Precision only after fetching `origin/main` and replacing `<FULL_SHA>`
with the exact expected main commit:

```bash
python3 ops/mainnet0/survey_void_tor_agent_discovery_activation_v1.py survey \
  --repo-root "$HOME/dev/void-node" \
  --expected-head <FULL_SHA>
```

The survey performs no checkout, branch update, file copy, deployment, service
restart, Tor configuration change, hidden-service key read, wallet access,
Work Credit write, payment execution, or fund movement.
