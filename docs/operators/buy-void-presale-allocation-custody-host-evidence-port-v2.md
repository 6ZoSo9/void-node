# Buy VOID allocation-custody collector — current-main portability V2

**Status: source-only / fail-closed. This does not qualify a live host collector or authorize payment acceptance.**

## Why this exists
Historical Draft #3515 at commit `7299b726f30b2240ad199d36b30401ccfa7417a3` passed its exact-head 23/23 CI for a read-only allocation-custody evidence collector, including bound journal/high-water observations, the independent second-control schema, the three-way before/policy/after installation qualification ID checks, and negative authority fields. Its stacked ancestor #3513 is not current main and contains additional historical tools, plans, proofs and workflows that are absent from current main. Force rebasing that history, or silently rewriting accepted receipts and locks, is prohibited.

This separate **current-main implementation port** is stacked on reviewed Draft #3663 `4499b99a8a7fda883e1f55b11cf8b7ba2939f6b0` (itself based on `main@e99772502c80fefafef3b6a836a408b66ddded76`). The only copied missing runtime dependency is the exact immutable `tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs` blob `eef7c4e1db7401ba82fda96aa1e8da40c1981b7d`. Other collector runtime imports already reside on current main and were previously verified by exact Git blob.

## Reviewed source bindings
- Historical collector source: `30b8674e27816d74997844fa55269fc72e0bea6b` (never overwritten).
- New source `ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v2.ts`: derived by changing only the two imported observation implementation paths and adding a **first-instruction runtime HOLD** and clear self-test markers.
- Installation observer implementation V2: `fba97c9c9213048bd7e93e58fe1318f2fb572b10`.
- Rollback-policy observer implementation V2: `b6aa9cec490d44e44b3d255ada27edbf53cbd5f5`. Its transitive installation import is V2.
- Contract V1: `eef7c4e1db7401ba82fda96aa1e8da40c1981b7d`.

Both V2-named observers preserve **emitted V1 evidence schema/marker/version and qualification ID domain** while adding `O_NONBLOCK` to retained descriptor reads. The collector port also preserves its emitted V1 evidence schema/marker; this is an implementation-port version, not a new accepted receipt domain.

## Safety and testing
The exported collection function explicitly throws `allocation_custody_current_main_port_not_accepted` **before** testing root identity or reading any user/host path. CLI `--run` reaches the same HOLD. No flag, environment variable, user argument or root privilege enables collection in this generation.

Hosted Node.js 22/24/26 tests shall verify exact source and observer blob identities, the historical V1 receipt markers, a positive plus five negative three-way generation-binding fixtures, normal unprivileged self-test, and an actual `--run` CLI attempt using a nonexistent LF-injection path. The CLI must exit 2 with exactly one HOLD and a fixed single-line reason; no forged positive authority marker is permitted. CI must not run as root, access production receipts, call the live observer, or modify installed files.

Historical presale host-collection plans/approvals, frozen V7 source enforcement, independent custody/rollback challenge, Nimo external witness, current-main source lifecycle acceptance, and any real host `--run` remain independent **HOLD** gates.

No merge, runtime/host/file service mutation, payment acceptance, presale/WC market activation, transaction, signing, custody write or funds movement. PROTECT THE CORE.
