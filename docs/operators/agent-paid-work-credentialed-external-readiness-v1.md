# Credentialed external paid-work readiness census v1

Marker: `VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1`

Issue: #2382
Parent cohort blocker: #2376
Policy context: #2370 / #2364

## Purpose

Re-observe the current repository source for the exact credentialed paid-work
lineage required by the existing WC/VOID opening eligibility policy.

The census captures one repository HEAD/tree generation, reads every component
from the exact `HEAD:<path>` Git object, emits each component Git blob identity
plus SHA-256, and requires the corresponding direct worktree file bytes to match
that Git blob. Hidden `assume-unchanged` / `skip-worktree` drift therefore
cannot be reported as if it belonged to the recorded repository HEAD.

This census deliberately does **not** change that policy and does not claim that
an external agent can currently complete the live credentialed path.

The opening policy still requires:

- identity source
  `active_paid_work_credential_wc_account_binding_v1`;
- earning source
  `agent_paid_work_wc_earning_adapter_receipt_v1`;
- an active, unexpired `agent_paid_work_submit` credential and WC-account
  binding; and
- the canonical earning-adapter receipt lineage.

## Source components re-observed

The census binds current source for:

1. credential request gateway;
2. credential request review queue;
3. credential lifecycle CLI;
4. credential-to-WC-account binding lifecycle;
5. credential registry and canonical `agent_paid_work_submit` scope;
6. authenticated paid-work submission receiver and scope import/authentication;
7. exact public submission proxy support;
8. WC earning adapter; and
9. WC/VOID opening participant eligibility.

These components exist in current source. That is not the same thing as a live
public external execution path.

Readiness is not inferred from independent source-token presence. The credential
request gateway contract binds its exported request path, loopback config check,
reachable request-route guard/intake call, and all issuance/registry/restart
authority fields together. The public submission contract binds the route to the
default-off loopback upstream and the actual proxy handler/fetch target. The
opening policy is read from the single `POLICY_PAYLOAD` object and requires the
exact credential identity source, earning source, and active-credential flag.

## Current fail-closed result

The expected v1 result is:

```text
decision=HOLD_CREDENTIALED_EXTERNAL_PAID_WORK_RUNTIME_REQUALIFICATION_REQUIRED
ready_for_external_opening_eligible_canary=false
```

The canonical AI-agent public gateway contains the authenticated paid-work
submission proxy integration, but does not currently contain the credential
request route. The historical credential-request packet points to a
Tailnet-specific Precision endpoint and cannot establish current Internet
availability.

The repository discovery snapshot also intentionally states:

```text
external_agent_runtime_onboarding_available=false
external_agent_paid_work_execution_available=false
```

and is bound to an older source commit. Those values must not be flipped merely
because source components exist.

## Required next evidence

Before #2376 recruits the independent opening-eligible participant, separately
prove:

1. exact public HTTPS credential-request ingress with no generic proxy;
2. fresh operator-reviewed credential issuance for the external participant;
3. active credential-to-WC-account binding;
4. loaded authenticated submission receiver configuration;
5. bounded external paid-work execution and independent completion
   verification;
6. WC earning-adapter finalization and canonical +3 WC acceptance; and
7. refreshed public discovery/runtime truth.

A ZoSo-controlled second account or host is not independence evidence.

## Authority

This census performs exact HEAD Git-object reads plus descriptor-bound
worktree equality checks only. It does not accept mutable worktree bytes as
repository-head source authority.

It performs no network request, credential/token read, private-key access,
credential issuance, registry/binding write, runtime/service mutation, paid-work
dispatch, WC mutation, Chain-2050 write, transaction action, market/presale
activation, liquidity/treasury action, token movement, or funds movement.

## Adversarial proof

The focused proof preserves the old token surface while independently:

- flipping `credential_issuance_authorized` to true;
- disconnecting the credential-request route;
- disconnecting the public submission route;
- flipping the opening policy's `active_credential_required`; and
- hiding a tracked credential-gateway worktree edit with
  `git update-index --assume-unchanged`.

Each semantic substitution must fail closed, and the hidden worktree change must
fail the exact HEAD Git blob comparison.

This still does **not** prove the full #2382 issuance/controller/execution/
completion-finalization lineage. That remains a separate current-generation
composition/runtime requalification.

Run:

```bash
node tools/void-agent-paid-work-credentialed-external-readiness-v1.mjs
```
