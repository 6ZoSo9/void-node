# Paid DataNet Public Pilot Quote Bridge CLI V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1`

This local CLI converts one `READY_FOR_QUOTE` public-pilot triage packet plus
explicit operator pricing into canonical draft input for the merged Paid
DataNet quote-packet tooling.

It removes manual re-entry of the customer service, project, requester
reference, object count, byte count, request ID, and requester ID. Those values
remain bound to the triage packet and its original public issue hashes.

## Input

The CLI accepts:

- One local triage-packet JSON file.
- An operator issuer display name.
- An operator cost basis in USD cents.
- An explicit `requested-at-ms` timestamp.

Operator cost basis and quote time are mandatory. The bridge never guesses or
invents either value.

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_quote_bridge_cli_v1.ts \
  --triage-json /path/to/triage-packet.json \
  --issuer-name "VOID Network" \
  --operator-cost-basis-cents 500 \
  --requested-at-ms 1780000000000 \
  --format pretty
```

## Output

The CLI writes one deterministic JSON packet to stdout.

`DRAFT_QUOTE_INPUT` means the triage packet is internally consistent,
`READY_FOR_QUOTE`, within the merged service catalog bounds, and paired with
valid explicit operator pricing. The output includes the exact
`PaidDatanetQuotePacketRequestV1` structure and a deterministic argument array
for `scripts/paid_datanet_quote_packet_v1.ts`.

`HOLD_FOR_OPERATOR_REVIEW` means no draft input was produced. The packet lists
stable hold reasons such as an invalid triage binding, a scope mismatch, or
invalid operator pricing.

## Operator sequence

1. Export and triage the public pilot issue.
2. Review the `READY_FOR_QUOTE` triage packet.
3. Determine the real operator cost basis.
4. Select the quote timestamp deliberately.
5. Run this bridge and inspect `DRAFT_QUOTE_INPUT`.
6. Feed the draft into the merged quote-packet tooling only after operator
   review.

## Boundaries

- Local triage-packet input only.
- stdout output only.
- No GitHub API access.
- No network access.
- No filesystem writes.
- No inferred operator pricing.
- The CLI does not issue or approve a quote.
- No payment collection.
- No execution authorization or execution.
- No Work Credit mutation.
- No treasury access.

A generated draft remains operator-review material. Customer payment evidence
and explicit admission are still required before any work can execute.
