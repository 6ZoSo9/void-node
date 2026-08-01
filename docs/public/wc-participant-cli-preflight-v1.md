# WC Participant CLI Preflight V1

Marker: `WC_PARTICIPANT_CLI_PREFLIGHT_V1`

This tool gives a participant one read-only readiness check before deciding
whether to execute a WC public-earning ticket. It validates the deterministic
release pack, the private ticket contract, the local executor identity, the
trusted coordinator identity, and the current canonical redeemable balance.

The preflight sends exactly five HTTP `GET` requests. It never calls the
`execute-local` route and cannot issue or consume a ticket, execute work, write
WC, settle WC to VOID, access a wallet or signer, deploy software, mutate a
runtime, or move funds.

## Inputs

- an extracted `void-wc-public-earning-participant-cli-v1.zip` directory;
- one fresh mode-`0600` ticket file;
- the trusted coordinator base URL;
- the exact trusted coordinator 32-hex node ID;
- the local participant node HTTP port, normally `4100`.

The extracted release directory must contain `SOURCE.json`, `LICENSE`,
`README.txt`, and `wc-public-earning-participant-v1.sh`. The preflight verifies
the source manifest and pins the reviewed V1 bytes before making any network
request:

- participant CLI SHA-256: `382bdf28f7ad39e7cc86b3e3e0852fa00c6c8071e93719128d6a4ee47833cd63`;
- VOID Community License SHA-256: `0d777083a94876e2c28e81b4b66cf99e9bc93887726d53e45ee71725fdc8ffe0`.

## Run

From a trusted checkout of `6ZoSo9/void-node`:

```bash
python3 scripts/wc_participant_cli_preflight_v1.py \
  --release-dir "$HOME/Downloads/void-wc-public-earning-participant-cli-v1" \
  --ticket-file "$HOME/Downloads/void-wc-ticket.json" \
  --trusted-coordinator-base "https://trusted-coordinator.example" \
  --trusted-coordinator-node-id "0123456789abcdef0123456789abcdef" \
  --participant-http-port 4100
```

Successful output is one canonical JSON line with:

```json
{"marker":"WC_PARTICIPANT_CLI_PREFLIGHT_V1","status":"GREEN"}
```

The full line also records the non-secret account, ticket ID, dataset,
executor and coordinator identities, release source commit, current redeemable
balance, and exact read-only checks. It never prints the capability token or
the ticket token hash.

A failed check returns status `HOLD`, a stable error code, and a plain-language
message. `HOLD` means do not run the earning CLI until the named condition is
corrected or a new trusted ticket is issued.

## Read-only requests

The preflight performs only:

- local `GET /health`;
- local `GET /wc/public-earning-pilot-v1/status?account=...`;
- coordinator `GET /health`;
- coordinator `GET /wc/public-earning-pilot-v1/status?account=...`;
- coordinator `GET /wc/redeemable?account=...`.

Redirects are rejected. Plain HTTP is accepted only for loopback or Tailscale
addresses; other coordinator endpoints must use HTTPS. Responses are bounded
to one MiB and must be JSON objects.

## Proof

```bash
python3 scripts/prove_wc_participant_cli_preflight_v1.py
```

The proof uses local fixture servers, confirms the exact GREEN contract,
exercises mode, checksum, identity, and expiry HOLD paths, proves every request
was `GET`, and proves the ticket bytes and mode remain unchanged.

## Authority boundary

This is a readiness check, not an execution command. A GREEN result does not
earn WC, consume the ticket, reserve work, guarantee coordinator acceptance,
or authorize any later action. The participant remains responsible for making
the separate explicit decision to run the reviewed earning CLI.
