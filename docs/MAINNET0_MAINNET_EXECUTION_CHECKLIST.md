# MAINNET-0 Mainnet Execution Checklist

## Operator identity / repo
- [ ] On expected branch
- [ ] Expected git head recorded
- [ ] Working tree status reviewed

## Validator / runtime
- [ ] Validator status is candidate
- [ ] last_known_head present
- [ ] abs(last_known_drift) <= 2
- [ ] checkpoint awareness recorded
- [ ] incident response readiness is policy-stack-sanity-green
- [ ] local ready.json is green
- [ ] peer-main-status head gap is 0

## Live JSON / bootstrap
- [ ] live JSON guard passes
- [ ] chainId is 2050
- [ ] mode is appropriate for the intended step
- [ ] status is appropriate for the intended step
- [ ] premine model is segmented_offline_vaults
- [ ] premine vault count is 30
- [ ] pool seeding source is premine allocations
- [ ] exactly one premine vault selected for the step
- [ ] active hot wallet is explicit and bounded

## Key discipline
- [ ] mainnet keys are fresh
- [ ] dev keys are not reused
- [ ] keys source path/custody confirmed
- [ ] operator knows which key is used for this exact step

## Roles / admins
- [ ] required role addresses are not TBD
- [ ] required admin/controller addresses are not TBD
- [ ] chosen step does not depend on unresolved addresses

## Operator packet
- [ ] launch-readiness output dir captured
- [ ] go/no-go bundle dir captured
- [ ] execution preflight output dir captured
- [ ] validator artifact copied
- [ ] live JSON hash recorded
- [ ] git head recorded

## Broadcast gate
- [ ] no blockers remain
- [ ] step purpose is explicit
- [ ] one-vault-at-a-time rule preserved
- [ ] bounded hot-wallet rule preserved
- [ ] go/no-go decision recorded
