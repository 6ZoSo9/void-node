# WC public opportunity handoff v1

<!-- VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1 -->

WC public opportunity handoff converts an `available` directory selection into exact commands for the canonical no-node public earn client, but does not treat the caller-supplied directory JSON as independent proof of trust.

The handoff is read-only. It does not execute the client.

## Usage

Create a directory result:

```bash
node tools/wc-public-opportunity-directory-v1.mjs \
  --base https://node-one.example \
  --base https://node-two.example \
  > directory.json
```

Create the handoff:

```bash
node tools/wc-public-opportunity-handoff-v1.mjs \
  --directory-json directory.json \
  --account outside-user-1
```

When multiple candidate opportunities are available, select one explicitly:

```bash
node tools/wc-public-opportunity-handoff-v1.mjs \
  --directory-json directory.json \
  --account outside-user-1 \
  --select-base https://node-one.example
```

Use `--directory-json -` to read JSON from standard input. Stdin input has an independent total read deadline: `--directory-stdin-timeout-ms` defaults to 5000 ms and accepts reviewed values from 250 through 30000 ms. The deadline covers the wait for EOF or the overflow-detection byte; a producer that sends a bounded payload and then leaves the pipe open cannot stall the handoff indefinitely.

Directory JSON is bounded to 256 KiB before full retention or `JSON.parse`. Regular-file input is opened through a stable descriptor, must be a regular non-symlink file, and is rejected before reading when its observed size is already above the bound; a concurrent growth race is still capped by reading at most the limit plus one overflow-detection byte. Standard input uses the same limit-plus-one rule and the total read deadline above. Oversized or timed-out stdin input produces `hold` before any participant-status or health request and before any ready command can be emitted.

## Strict selection and independent trust revalidation

The supplied directory is a selection hint. A candidate is initially eligible only when the directory result reports:

- `state=available`
- `trusted=true`
- Coordinator enabled
- Fixed award matches
- Public claim configured and enabled
- Read-only and GET-only child result
- Public award boundary explicitly confirmed
- No mutation attempt

Those self-described fields are not sufficient to emit participant commands. After choosing one origin, the handoff independently performs the same canonical read-only participant-status contract consumed by `void_public_earn_no_node_client_v1.mjs`:

```text
GET /wc/public-earning-pilot-v1/status
```

That fresh response must prove the exact reviewed participant boundary: canonical pilot and claim markers, coordinator enabled, executor disabled, fixed award exactly 3 WC, claim enabled/available, server-selected work, executor-key-possession proof required, outbound-bundle transport, participant-selected dataset/input-hash/award all false, and `money_movement=false`.

Only after that independent status contract passes does the handoff accept the origin as a selected coordinator. The output's selected source path and fixed-award evidence come from this fresh canonical status verification, not from the caller-supplied directory child.

A fabricated directory JSON that merely self-asserts `trusted=true`, `child_results_safety_validated=true`, or `state=available` therefore cannot become a ready handoff when the selected origin does not independently satisfy the canonical participant status contract.

No initially eligible candidate produces `hold`. Multiple initially eligible candidates also produce `hold` until `--select-base` is supplied.

Coordinator-origin admission intentionally matches the canonical no-node client: public coordinators require HTTPS; HTTP is allowed only for exact `localhost`, loopback IPs including bracketed IPv6 loopback `[::1]`, RFC1918/private IPv4, CGNAT `100.64.0.0/10`, and `.ts.net` hostnames. Aliases such as `worker.localhost`, adjacent public IPv4 ranges, and non-loopback IPv6 over HTTP remain rejected unless the canonical client contract is separately changed and reviewed.

## Coordinator identity binding

After canonical participant-status revalidation, the handoff performs the independent identity request:

```text
GET /health
```

The response must contain `ok=true` and a 32-character lowercase hexadecimal `nodeId`. That value becomes the exact `--coordinator-node-id` passed to the no-node client. The client independently checks the same health/status binding before its own status or execution path.

Both the status and health responses are consumed as streams under hard 64 KiB ceilings. A declared or accumulated body above the ceiling, a non-stream-readable body, invalid UTF-8, interrupted body, timeout, malformed JSON, or invalid contract produces `hold`. The configured deadline remains active through complete body consumption; receiving HTTP headers does not end the deadline.

## Generated commands

The output contains argv and shell-safe forms of:

```text
node tools/void_public_earn_no_node_client_v1.mjs status ...
node tools/void_public_earn_no_node_client_v1.mjs run ...
```

The executable script in every production-ready command is fixed to the canonical sibling `tools/void_public_earn_no_node_client_v1.mjs`. The handoff has no production `--client-tool` override. A caller-supplied arbitrary script path is rejected before coordinator evidence is fetched and can never produce `handoff_state=ready`.

Optional values include `--state-dir` and an HTTPS `--dataset-url-template` containing `{dataset_id}`.

The focused handoff workflow is dependency-bound to the canonical no-node client source, because that client defines the pilot marker, claim marker, status route, fixed 3-WC award, participant status contract, and generated executable identity. A client-only contract change therefore schedules this handoff proof.

It does not execute the full client, create participant identity state, claim a ticket, or submit work.

## Safety boundary

The handoff uses the supplied directory only to select a candidate origin, independently revalidates that origin against the canonical read-only participant status, then binds it to `GET /health`. It emits commands only for the canonical no-node client and never executes the client, creates an identity, claims a ticket, fetches work, submits a result, awards or settles WC, accesses a wallet, restarts a service, or mutates runtime data.

## Focused proof

```bash
node scripts/prove_wc_public_opportunity_handoff_v1.mjs
node scripts/prove_wc_public_opportunity_handoff_cancel_liveness_v1.mjs
node scripts/prove_wc_public_opportunity_handoff_provenance_v1.mjs
node scripts/prove_wc_public_opportunity_handoff_directory_input_bound_v1.mjs
```

The existing proof exercises successful identity-bound handoff, canonical generated-client identity, rejection of arbitrary `--client-tool` input before network evidence is fetched, generated-command compatibility, origin-policy parity, and response-bound HOLD behavior. The cancellation proof owns hostile rejected-response teardown to an explicit bounded terminal. The provenance proof adds the decisive adversarial boundary: attacker-controlled directory JSON can self-assert every currently accepted trust/readiness field and return a valid-looking `/health`, but the handoff must HOLD after the canonical participant-status check and before health binding when the actual coordinator contract is unsafe. The directory-input proof verifies exact 262144-byte acceptance, exact 262145-byte rejection, UTF-8 byte accounting, symlink rejection, and deterministic timeout HOLDs when either an exact-cap or partial stdin producer leaves the writer open. Those stdin timeout cases must terminate before any status/health fetch or ready command. A coordinator exposing the canonical status contract must still reach ready state and retain the final health identity binding.

Expected markers include:

```text
VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1_PROOF_GREEN
VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_PROVENANCE_V1_PROOF_GREEN
VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_DIRECTORY_INPUT_BOUND_V1_PROOF_GREEN
```
