# Apollyon Trials Provider-Neutral v1

marker=VOID_APOLLYON_TRIALS_PROVIDER_NEUTRAL_V1

## Purpose

Apollyon is an office, not a model or vendor binding. Any contestant may compete for that office through the same VOID-facing trial interface regardless of whether the contestant is powered by Ollama/Qwen, DeepSeek, OpenAI, another hosted model, or future software.

## Core security model

VOID does not grant contestants direct access to Precision, the VOID source tree, SSH, shell, environment variables, private keys, wallet seeds, validator keys, service managers, private operator channels, treasury/liquidity controls, or unrestricted network authority.

Contestants receive only a bounded trial packet and may return only a bounded trial result. VOID-owned verification decides whether the result qualifies. A contestant response is always a proposal/evidence object, never execution authority.

contestant_direct_repo_access=false
contestant_direct_shell_access=false
contestant_secret_access=false
contestant_wallet_access=false
contestant_validator_key_access=false
contestant_service_restart_access=false
contestant_live_mutation_access=false
contestant_money_movement_access=false
contestant_wc_ledger_write_access=false
contestant_private_apollyon_prompt_access=false

## Provider neutrality

provider_identity_is_not_apollyon_identity=true
provider_cost_is_contestant_responsibility=true
void_requires_paid_cloud_provider=false
void_requires_specific_model=false
void_requires_specific_agent_harness=false
void_may_admit_local_or_remote_contestants=true

A contestant may choose its own compute stack. VOID does not promise to pay a contestant's cloud/API bill. Qualifying useful work may be rewarded through separately authorized Work Credit mechanisms already defined by VOID.

## Trial packet

Each trial packet must be content-addressed and must identify:

- trial ID and version;
- challenge/task statement;
- allowed public/context references;
- forbidden data classes;
- expected output labels/schema;
- verification criteria;
- maximum response size;
- created/expiry timestamps;
- nonce;
- whether WC eligibility is possible;
- explicit statement that the packet grants no execution or mutation authority.

The same logical challenge and scoring criteria must apply to all contestants in a trial round. Provider-specific transport wrappers may differ, but they must not change the logical task or authority boundary.

## Trial result

A result must identify the contestant-selected provider/model label, trial ID, output, evidence references, self-reported latency/cost metadata if available, and a content digest. Provider/model labels are descriptive claims until independently verified; they do not affect authorization.

## Scoring

Provider/model contestants may be scored on:

- correctness against deterministic or reviewer-verifiable truth;
- evidence quality and reproducibility;
- hallucination/error rate;
- obedience to forbidden-capability/security instructions;
- tool-selection quality when a separately sandboxed tool simulation is part of the trial;
- latency;
- resource/cost efficiency when credibly reported;
- consistency across repeated challenges.

A contestant that violates the security contract cannot win a round solely because its task answer is otherwise strong.

## Work Credit boundary

Trial participation itself does not mint or write WC. Any WC award must use existing authenticated submission, verification, participant-ticket, verified-receipt, and append-once accounting paths. The trial contract does not create a generic credit route and does not weaken existing WC authority boundaries.

## Office boundary

Winning a trial or leaderboard position does not itself grant runtime authority. Occupying the Apollyon office requires a separately reviewed activation instrument that binds an exact contestant/runtime identity to an explicit scope and term.

apollyon_office_model_independent=true
trial_win_is_not_runtime_activation=true
trial_win_is_not_operator_authority=true
trial_win_is_not_validator_authority=true
operator_final_authority=true

## V1 status

status=source_contract_only
public_endpoint_created=false
runtime_worker_created=false
provider_api_credentials_required=false
provider_api_calls_performed=false
ollama_required=false
paid_api_required=false
live_mutation=false
