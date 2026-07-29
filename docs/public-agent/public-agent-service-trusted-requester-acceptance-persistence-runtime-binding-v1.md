# Public Agent Service Trusted Requester Acceptance Persistence Runtime Binding V1

## Purpose

This source-only lane adds the disabled-by-default runtime gate above the
merged trusted-requester acceptance persistence composition. It does not mount
an HTTP route, edit `src/index.ts`, install a service configuration, restart a
node, deploy a release, or access a production persistence store.

The binding exists so a later operator-controlled runtime integration can use
one stable entry point without weakening the verification or persistence
boundaries already merged below it.

## Composition boundary

The runtime binding calls
`executePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionV1`
directly in the same process. It forwards the server-owned trusted replay-plan
input provider as the exact function object supplied to the runtime binding.

The client command cannot provide:

- a persistence root;
- replay state;
- expected revision;
- persistence limits;
- the lower adapter confirmation;
- a requester or provider identity override; or
- a persistence packet.

The operator-owned runtime configuration contains the persistence adapter
configuration. The trusted-requester composition inspects that store, injects
the current server replay state, verifies the complete trusted-requester chain,
and passes the verifier-returned lower replay packet to the sealed persistence
adapter.

## Disabled by default

`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED`
defaults to `0`.

When disabled, the binding returns `status=disabled` before validating the
command, invoking the trusted input provider, inspecting a store, or calling the
composition.

Enabling through the environment requires an absolute
`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ROOT`.
Loading configuration does not inspect or create that root.

This repository lane does not install either environment variable anywhere.

## Confirmation wall

An apply command requires the distinct runtime confirmation:

`persistTrustedRequesterAcceptanceRuntimeV1`

The runtime command never receives the lower composition confirmation. After
the runtime confirmation is validated, the binding internally constructs the
composition command and injects:

`persistTrustedRequesterAcceptanceReplayPlanV1`

The composition then internally injects the sealed adapter confirmation:

`persistVerifiedAcceptanceReplayTransitionV1`

A dry run requires `apply=false` and an empty confirmation. It may verify and
plan against a disposable proof root, but it must not call persistence or
change the root.

## Trusted input ownership

The trusted replay-plan input is supplied through a server-owned in-process
provider function. It is not part of the runtime command and is not parsed from
an HTTP request by this lane.

The runtime binding forwards the provider directly to the merged composition.
The proof verifies:

- disabled mode never invokes it;
- a wrong runtime confirmation never invokes it;
- client-selected persistence configuration is rejected before invocation;
- the example fixture remains example-only;
- a live dry run remains non-persistent;
- a confirmed apply reaches the exact merged composition;
- the lower persistence provider receives the exact verifier-returned replay
  packet;
- the sealed adapter confirmation is injected internally; and
- exact duplicate status is preserved.

## Proof persistence scope

The repository proof is derived from the merged persistence-composition proof.
It performs acceptance persistence and the atomic requester-authentication,
provider-authentication, and acceptance-ID replay writes only beneath newly
created disposable roots.

Every temporary root is removed before exit.

The proof reports production persistence, production replay writes, and
production-store access as false.

## Authority

A confirmed runtime call can exercise only the acceptance persistence authority
already bounded by the merged composition:

- persist the verified acceptance;
- record quote acceptance;
- consume the requester-authentication replay ID;
- consume the provider-authentication replay ID; and
- consume the acceptance replay ID.

It grants no payment authorization, payment execution, work authorization,
work dispatch, Work Credit write or settlement, wallet or signer access,
production signing, transaction broadcast, HTTP submission, credential
mutation, unrelated runtime mutation, deployment, service restart, or money
movement.

## Repository scope

The lane owns exactly six files:

1. workflow;
2. documentation;
3. committed example;
4. JSON schema;
5. proof; and
6. runtime-binding source.

It does not modify an existing runtime, listener, route registrar, service unit,
deployment manifest, or production configuration.
