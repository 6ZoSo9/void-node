# MAINNET-0 Mainnet Execution Runbook

## Purpose
This runbook is the hard preflight for any real Mainnet-0 execution step. It sits above launch-readiness and go/no-go bundle generation. Its job is to block obvious operator mistakes before any live broadcast or value movement.

## Hard invariants
- Chain ID must remain **2050**.
- Live JSON must remain the source of truth for execution inputs.
- Mainnet keys must be **fresh** and never reused from devnet or rehearsal.
- Keys source must remain **LUKS flash drives** (or stricter).
- Premine model must remain **segmented_offline_vaults** with **30** vaults.
- Pool seeding source must remain **premine allocations**.
- Only **one premine vault** may be selected for the next live action.
- Hot wallet must remain **bounded_operational_buffer** only.
- No live execution if validator artifact is not currently candidate/healthy.
- No live execution if drift is non-zero or readiness is not green.
- No live execution if roles/admins needed for the chosen step are still TBD.

## Execution phases
### Phase A — Stub / planning only
Allowed:
- docs
- plan generation
- go/no-go bundles
- sanity scripts
- live JSON guard
Not allowed:
- any broadcast
- selecting real vault/hot wallet values without explicit operator decision

### Phase B — Live-prep
Allowed:
- fill real live JSON values
- select exactly one premine vault for the next step
- assign bounded hot wallet
- verify fresh keys and custody path
- rerun execution preflight
Not allowed:
- broadcast if execution preflight still reports blockers

### Phase C — Live execution
Allowed only when execution preflight says ready:
- single scoped step
- single selected premine vault
- bounded hot wallet
- operator bundle archived before execution
- post-step artifact refresh immediately after execution

## Minimum operator packet
- current git branch/head/tag truth
- current validator-status.current.yaml
- current void-mainnet.live.json hash
- current launch-readiness output dir
- current go/no-go bundle dir
- current execution preflight output dir
- explicit list of blockers or explicit ready=true

## One-vault-at-a-time discipline
- Select one vault ID only.
- State its purpose explicitly.
- Do not pre-select future vaults.
- Do not stage multi-vault movement in one step.
- After each live step, restamp state and rebuild the operator packet.

## Hot wallet discipline
- Hot wallet exists for bounded operational use only.
- Keep hot wallet address explicit.
- Keep refill amount explicit.
- Keep refill justification explicit.
- Never treat the hot wallet as a treasury.

## Automatic no-go conditions
- mode still says stub / plan only
- status still says stub_only_not_live
- selected premine vault still TBD
- active hot wallet still TBD
- fresh-key policy not confirmed
- required roles/admins still TBD
- validator status not candidate
- last known drift not zero
- readiness / policy stack not green
- repo/operator packet missing critical artifacts

## Definition of done
Execution preflight is done when:
- it runs from one command
- it emits a machine-readable summary
- it states ready or not-ready
- it lists concrete blockers
- it is strict enough that a live broadcast cannot happen casually
