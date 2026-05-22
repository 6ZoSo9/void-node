# VOID Mainnet-0 Final Go/No-Go Map

status: not_go_for_public_mainnet0
decision: NO_GO
launch_approval: false
mutation_allowed: false
money_step: last
operator_label: zoso

## Current canonical baseline

- current_baseline_pointer_commit: cc8a4f4a
- current_baseline_pointer_tag: ckpt-final-checklist-sections-closeout-doc-green-20260521-195012
- baseline_pointer_file: ops/mainnet/mainnet0-current-baseline.current.md
- cross_box_proven: true

## What is green

- Precision node readiness is green.
- Alienware node readiness is green.
- Cross-box status smoke is green.
- Mainnet-0 current baseline pointer proof is green.
- Current baseline pointer output is aligned with the latest Wallet doc refresh baseline.
- Current baseline pointer now records final checklist sections closeout doc as the canonical rolling baseline.
- Final checklist sections closeout doc preserves restored proof sections and supersedes fdfa1af5.
- Final path includes wallet-ui-cleanup-proof.
- Mainnet-0 status proof is green.
- Mainnet-0 blockers proof is green.
- Mainnet-0 final path proof is green.
- Mainnet-0 launch approval plan proof is green.
- Mainnet-0 final public launch checklist proof is green.
- Mainnet-0 public validator admission decision proof is green.
- Validator runtime truth is green through epoch127.
- Next guarded operator onboarding selector is vault126 / epoch128 / expectedValidatorCount=127.
- Public validator registration is candidate_or_waiting_only.
- Public validator registration does not mutate the active validator set.
- Buy VOID watcher config is present and active config uses the current receiver.
- Historical Buy VOID latest-watch artifacts are lineage only unless the active config changes.

## Why Mainnet-0 is still NO-GO

1. launch_approval is false.
2. mutation_allowed is false.
3. Public active validator admission is disabled.
4. Public validator admission remains candidate_only_for_mainnet0.
5. Public validator promotion/admission remains blocked.
6. Next guarded operator onboarding for vault126 has not been live-executed.
7. Any future operator live-admission step requires a fresh guarded proof, exact operator intent, and explicit live-execution enablement.
8. Public launch requires a separate explicit launch approval artifact.
9. Ready signals alone are not launch approval.
10. Money step remains last.

## Required before YES

Before this can become GO, all of the following must be true:

1. mainnet0-current-baseline-proof passes on the intended launch commit.
2. mainnet0-status-smoke passes on Precision and Alienware.
3. mainnet0-crossbox-status-smoke passes.
4. mainnet0-status-proof passes.
5. mainnet0-blockers-proof passes.
6. mainnet0-final-path-proof passes.
7. mainnet0-launch-approval-plan-proof passes.
8. mainnet0-final-public-launch-checklist-proof passes.
9. mainnet0-public-validator-admission-decision-proof passes.
10. Any validator live-admission action is separately proof-gated and explicitly approved.
11. Public validator active admission remains disabled unless intentionally launched.
12. Buy VOID claim/send remains blocked unless explicitly verified and recorded.
13. Final public release hygiene remains green.
14. Fresh mainnet key ceremony and secure backups are explicitly confirmed before public launch.
15. A separate explicit launch approval artifact is written and proved.

## Current decision

NO-GO.

VOID Mainnet-0 is healthy and close, but it is intentionally not approved for public launch yet.
