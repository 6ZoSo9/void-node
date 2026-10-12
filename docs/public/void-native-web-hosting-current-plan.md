# VOID Native Web Hosting Current Plan

Status: plan-only / proof-only  
Mutation: false  
Runtime route changes: none in this checkpoint  
Launch posture: preserve current public Mainnet-0 posture

## Purpose

VOID native web hosting should use VOID/DataNet as the canonical content layer where possible, while keeping the public web surface simple for early users.

The goal is not to rebuild the route stack from an old branch. The old web-hosting branch is intentionally abandoned because it drifted behind current `main` and would delete or regress current public-route, Buy VOID, participant UI, and proof files.

This checkpoint records the current safe plan only.

## Current route posture

Expected public-facing route families:

- `/site/voidchain`
- `/site/nullfeed`
- `/download`
- `/voidchain`
- `/participant`
- `/participant-file`
- `/version`

The DataNet-first site routes should remain the preferred long-term path for VOID-hosted pages. Human-facing aliases may redirect into those canonical routes, but they must not bypass safety checks.

## Safety policy

Any future web-hosting patch must obey these rules:

1. Do not resurrect stale branches.
2. Do not delete current public launch, Buy VOID, participant, wallet, DataNet, or security proof files.
3. Do not patch `src/index.ts` with a large blind replacement.
4. Prefer small anchored patches.
5. Add proof coverage before commit.
6. Keep Buy VOID fulfillment fail-closed.
7. Keep public validator admission candidate/waiting-only unless a separate launch approval explicitly changes it.
8. Preserve current Mainnet-0 public status docs.
9. Preserve current node readiness requirements: ready true, gap zero, txroot live.
10. Keep money movement last and explicit.

## Future implementation direction

A future implementation patch may add or refresh:

- DataNet site bundle manifest
- DataNet-backed route manifest
- public route alias proof
- website route smoke proof
- docs index linking the canonical VOID-hosted routes
- no-regression guard for public docs and participant UI

That future patch should be built fresh from current `main`, not cherry-picked from the abandoned old branch.

## Required markers

VOID_NATIVE_WEB_HOSTING_CURRENT_PLAN_V1  
VOID_WEB_HOSTING_NO_STALE_BRANCH_RESURRECTION_V1  
VOID_WEB_HOSTING_DATANET_FIRST_POLICY_V1  
VOID_WEB_HOSTING_NO_RUNTIME_MUTATION_THIS_CHECKPOINT_V1
