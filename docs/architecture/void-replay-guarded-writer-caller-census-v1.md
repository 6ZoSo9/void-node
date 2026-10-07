# VOID replay guarded-writer caller source census v1

Marker: `VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1`.

**Status: source-only import regression guard; no runtime enforcement or production authority.**

## Security question

The independent, pinned Nimo compare-only transport passed the operator-provided
read-only sequence-2 match/negative read/negative append tests on October 7, 2026.
That does not prove the running replay writer must use it. The canonical replay
writer still exports its earlier `persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1`
and `persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1` APIs, both
of which deliberately omit the `compare_live` check. Additive `GuardedIssueV1`
and `GuardedTerminalV1` APIs perform compare within the two writer locks, but
can receive a synthetic callback from an untrusted caller unless bound to a
trusted host-owned executor and the pinned SSH adapter.

This census prevents accidental **direct runtime imports** of that writer
module from being introduced in Git-tracked TS/JS source without explicit
review. It is an extra regression tripwire, **not** the exclusive guarded
executor. It doesn't invoke either writer and doesn't inspect protected
host storage or invoke SSH. A future executor must be separately designed,
reviewed, and prove exactly one entrypoint with only the trusted adapter,
immutable executable closure and no bypass route.

## Source policy

- Enumerate Git-tracked TS/JS files using `git ls-files -z` at the repo root,
  including `src/`, `tools/`, `scripts/`, and other checked-in code. Never
  inspect `.git` internals as executable authority.
- Parse only files containing the writer module basename with the TypeScript
  compiler AST. Reject malformed source, symlinks or non-regular tracked code.
- Accept type-only imports (`import type` and `import { type T }`) since they
  compile away. Accept direct **named imports of two exact authority marker
  exports** in non-test source. No default/namespace import, side-effect
  import, runtime re-export, dynamic `import()`, CommonJS `require()` or
  TS import-equals of the writer is permitted in a non-test module.
- Permit runtime imports **only** inside the three exact existing synthetic
  proof files for writer, composition and guarded-compare writer. Introducing
  a new proof file does not automatically allow it to run the unsafe writer.
- Treat all other writer-module references, including aliases of legacy
  mutators, as `HOLD_UNREVIEWED_WRITER_CALLER` and fail the source scan.
- Require the writer itself still exports both legacy entrypoints so an
  intentional future retirement/rename cannot silently inherit this census.
  Its presence is a recorded **remaining risk**, not a GREEN runtime claim.

Source records and classifications are content-addressed. This hash isn't a
trusted Git attestation, a signed receipt or monotonic high-water custody.
The tool does not enumerate live processes, compiled `dist`, C/C++ extensions,
indirect dynamically computed imports without a literal writer basename,
executable packaging or the process's actual import graph. A privileged actor
can still bypass these source checks. Runtime exclusivity remains false.

## Trigger scope and CI cost boundary

The existing `VOID_CI_COST_BOUNDARY_V1` repository policy rejects a newly
introduced repository-wide `pull_request` trigger. The original candidate
used `**/*.ts` and related root-wide globs; its dedicated Node 22/24/26
census jobs passed, but the CI cost gate correctly HOLDed.

The automatic PR trigger is now deliberately limited to the reviewed replay
economic source subtree, the public runtime entrypoint, the directly relevant
replay tool/proof filenames, this census tool/proof, and its doc/workflow.
**This is not automatic coverage of every Git-tracked source edit.** A new
writer import in another directory will not necessarily trigger this workflow.
Use `workflow_dispatch` or run `--scan` manually on a reviewed checkout
when auditing other code areas or before independently admitting an executable
closure. The scan itself still examines **all** Git-tracked TS/JS files each
time it runs.

The reduced trigger is intentional CI-cost containment, not a new security
guarantee. Runtime exclusivity, build closure and protected deployment all
remain **HOLD**.

## Running the census

After `npm ci --ignore-scripts --no-audit --no-fund` (TypeScript is used for its
syntax tree parser), run on a reviewed checkout:

```bash
node --check tools/void-replay-guarded-writer-caller-census-v1.mjs
node scripts/prove_void_replay_guarded_writer_caller_census_v1.mjs
node tools/void-replay-guarded-writer-caller-census-v1.mjs --scan
```

`--scan` reads only tracked source and prints a source census and digest. It
never writes to the repo, host services, key stores, replay or witness state.
`--install`, `--apply` and other modes return a HOLD/exit code 2.

## Next guarded executor gate

1. Bind the exact immutable, root-controlled Node/module/package execution
   closure; do not execute from a writable checkout or accept caller paths.
2. Admit one host-owned process/IPC interface with strict schema, fixed
   journal/high-water paths and no caller-supplied `compare_live` function.
3. Create the trusted callback from the pinned SSH adapter under UID 994.
   Verify the Nimo host key and compare-only credential at use.
4. Inside both replay locks, reject pending intent, compare exact local bytes
   with Nimo, require `matched`, then and only then allow reviewed guarded
   issue or terminal transition. After publication require independently
   verified forward-only external witness catch-up.
5. Prove the legacy unguarded entrypoints are **not reachable** from the
   admitted execution graph. This source census is only a supporting negative
   regression guard and does **not** close that gate.
6. Test crash recovery, snapshot/restore domain separation, stale/mismatched
   compare responses, storage substitution and privilege bypass separately.

The existing public Buy allocation custody service is separate from this replay
writer. Merged #2606 now HOLDs both unverified `reserve` and `recover` IPC
methods. This census neither reopens them nor authorizes a presale obligation.

### Authority boundary

`runtime_guard_exclusivity_proven=false`
`executable_import_closure_proven=false`
`independent_custody_proven=false`
`production_gate_ready=false`

No keys, funds, transactions, Chain-2050 or WC/VOID activation are in scope.
PROTECT THE CORE.
