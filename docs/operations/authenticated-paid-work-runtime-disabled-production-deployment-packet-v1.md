# Authenticated paid-work runtime disabled production deployment packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DISABLED_PRODUCTION_DEPLOYMENT_PACKET_V1`

## Purpose

This packet converts the exact read-only mechanism survey into a deterministic,
non-executable deployment decision artifact for the authenticated paid-work
activation/persistence runtime.

The runtime remains a standalone operator CLI. It is not imported by
`src/index.ts`, is not referenced by a public server tool or live process, and
has no HTTP route, listener, service unit, production private root, or enable
configuration.

## Exact source

```text
source_commit=3b298bc1e31365aec7a20d03c3f425e22fd2f949
pr889_head=555745a19625e4772e1b847dc60215ad0618fb32
checkpoint_tag=ckpt-authenticated-paid-work-activation-persistence-runtime-binding-v1-cli-no-read-postmerge-exact-green-20260731T154115Z
survey_receipt_sha256=7abcbe1e5e20041646411ba9bf3f98bdde5a7099417527ad4d851b80f033a0f7
```

Bound source files:

- `docs/operations/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.md` — `6478d3d43896eff5eb7f096abb4afe6722ac93929a1a8d02d1427e3956dd42a3`
- `examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.example.json` — `f4e017c32a49e8681ea174481e01f26284eb266ebbcf266cdbd114aac9688928`
- `scripts/prove_authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts` — `54d8d6d18abdd60c9864d70dcb9ef4e2ad16059b8606cda18a1d64fc6ad329c6`
- `scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts` — `3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7`
- `schemas/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.schema.json` — `23e6a070b201f26a1f856e5fc11942d60617ef77782a6d6a832d65701cc79de5`
- `.github/workflows/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.yml` — `7ea8a710cbfd87734adb20843fb221783884fbcdd20ad94756779953227a173d`

## Disabled deployment meaning

`ready_for_disabled_production_deployment=true` means the packet has enough
evidence to support a later, separately reviewed disabled-only deployment
mechanism.

It does **not** mean that this pull request installs or runs anything. The
packet requires no enable configuration, production root, route, listener,
service unit, restart, or activation. It does not create quote acceptance or
payment authority.

## Activation remains blocked

The packet fixes `ready_for_activation=false` and preserves these blockers:

- `explicit_enable_configuration_not_authorized`
- `production_private_root_not_created`
- `trusted_live_context_provider_not_bound`
- `production_command_source_not_authorized`
- `confirmed_apply_not_authorized`
- `separate_payment_execution_gate_absent`
- `separate_work_execution_gate_absent`

Payment execution and work execution remain separate future authority gates.

## Authority boundary

The evaluator may read the survey receipt and materialize the deterministic
packet on standard output. It cannot write configuration, create a production
root, register a route, create a listener or service, restart anything, deploy,
activate, accept a quote, create payment authority, execute payment, construct
or broadcast a transaction, access a wallet or signer, dispatch work, write
Work Credits, settle VOID, or move funds.

## Exact pull-request scope

- `.github/workflows/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.yml`
- `docs/operations/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.md`
- `examples/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.example.json`
- `schemas/authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.schema.json`
- `scripts/prove_authenticated_paid_work_runtime_disabled_production_deployment_packet_v1.mjs`
- `tools/void-authenticated-paid-work-runtime-disabled-production-deployment-packet-v1.mjs`
