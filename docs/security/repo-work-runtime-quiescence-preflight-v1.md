# repo work runtime quiescence preflight v1

This preflight protects repo work from interference by live runtime processes.

## Boundary

This proof does not stop, start, or mutate services. It only checks that repo-work blockers are quiet.

Repo work blockers:

- `void-node-live.service` active/running
- stale `node_modules/tsx ... src/index.ts` runtime process
- stale `tools/public-node-safe-serve-v1.mjs` test server processes

Allowed non-blockers:

- `void-wc-relayer.service`
- `void-workcredits-devnet-http.service`

## Proof

Run:

```bash
npx tsx scripts/prove_repo_work_runtime_quiescence_preflight.ts

Expected marker:

VOID_REPO_WORK_RUNTIME_QUIESCENCE_PREFLIGHT_V1_GREEN
