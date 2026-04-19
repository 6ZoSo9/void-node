# VALIDATOR RUNTIME ADAPTER PLAN

## Purpose
Define the runtime-facing adapter boundary so future validator selection reads from upgraded validator truth rather than frozen Mainnet-0 ValidatorSet state.

## Decision
Runtime/selection should depend on a read-only selection source interface, not directly on old ValidatorSet and not directly on participant UI assumptions.

## Source of truth
Preferred long-term source:
- ValidatorStakingV2 via IValidatorTruthSource

Runtime-facing source:
- IValidatorSelectionSource

## Why a runtime adapter exists
This keeps:
- staking state evolution
- runtime selection logic
- future consensus integration

decoupled from one another.

## Minimum runtime needs
Runtime should be able to ask:
- how many validators are selectable
- which validator is at an index
- what is the effective power
- what consensus key should be used
- whether validator is selectable right now

## Immediate next coding lane
- make a thin adapter contract or module that wraps IValidatorTruthSource
- expose selection-friendly reads only
- add tests proving active validators appear/disappear correctly after activate/exit
