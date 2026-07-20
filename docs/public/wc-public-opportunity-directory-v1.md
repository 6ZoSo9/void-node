# WC public opportunity directory v1

<!-- VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1 -->

WC public opportunity directory checks multiple public VOID nodes and reports which bounded Work Credit earning opportunities are available.

A participant does not need to install or run a VOID node.

The directory composes the merged single-node discovery command:

```text
tools/wc-public-opportunity-discovery-v1.mjs
```

It does not duplicate the public earning gateway parser.

## Usage

```bash
node tools/wc-public-opportunity-directory-v1.mjs \
  --base https://node-one.example \
  --base https://node-two.example
```

Require at least one available opportunity:

```bash
node tools/wc-public-opportunity-directory-v1.mjs \
  --base https://node-one.example \
  --base https://node-two.example \
  --require-available
```

Read origins from a file:

```bash
node tools/wc-public-opportunity-directory-v1.mjs \
  --input public-nodes.txt
```

The input file can contain one origin per line or a JSON array of origin strings. Blank lines and `#` comments are ignored in line-based files. Origins must not contain credentials, paths, queries, or fragments.

## Directory states

- `available`: at least one trusted child result reports an available opportunity.
- `hold`: compatible nodes exist, but no opportunity is currently available.
- `unavailable`: no compatible opportunity exists, or all results are unreachable, incompatible, or rejected.

## Strict child validation

Every child result must include:

- Marker `VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1`.
- State `available`, `hold`, or `unavailable`.
- Read-only status.
- HTTP method list containing only `GET`.
- No mutation, ticket issuance, receipt submission, WC award, wallet, or settlement attempt.

An `available` result must also prove:

- Coordinator enabled.
- Public claim configured and enabled.
- Fixed award matches the expected value.
- Public award boundary explicitly confirmed safe.

An unsafe child that claims availability is downgraded to an untrusted `unavailable` result.

## Award consistency

The directory lists fixed-award values observed in trusted results.

`award_policy_consistent` is true only when there is no conflicting value and every observed value equals the expected award. The current expected award is `3 WC`.

## Participant next step

The directory does not claim a ticket. When a trusted result is `available`, continue with:

- `ops/mainnet0/wc-public-ticket-claim-v1.sh`
- `docs/public/wc-public-ticket-claim-v1.md`

## Safety boundary

The directory never contacts claim, submit, award, settlement, wallet, validator, Buy VOID, or treasury routes directly. It never issues tickets, submits receipts, awards WC, restarts services, or mutates runtime data.

## Focused proof

```bash
node scripts/prove_wc_public_opportunity_directory_v1.mjs
```

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1_PROOF_GREEN
```
