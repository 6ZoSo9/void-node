# Mainnet-0 Validator Live Admission Operator Readiness

status=operator_readiness_green_no_live_admission
mutation=false
live_admission_executed=false
buy_void_claim_send_executed=false
money_step=last
dry_run_without_confirm_http=400
dry_run_without_confirm_body={"ok":false,"error":"confirmation_required","hint":"POST {\"confirm\":true} to execute live onboarding"}

## Precision
git_head=bd66bebd
ready=True head=766911 gap=0 txroot_live=1
selectedCandidateName=vault123 currentEpoch=124 targetEpoch=125 currentValidatorCount=123 expectedValidatorCount=124 command_present=True

## Alienware
git_head=bd66bebd
ready=True head=766912 gap=0 txroot_live=1
selectedCandidateName=vault123 currentEpoch=124 targetEpoch=125 currentValidatorCount=123 expectedValidatorCount=124 command_present=True

## Conclusion
Precision and Alienware agree on vault123 for epoch 124 -> 125 and validator count 123 -> 124.
The command is present but still gated by explicit confirmation.
No live admission was executed.
