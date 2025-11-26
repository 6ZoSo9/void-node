# VOID Devnet - Echo Agent (echo.v1) Spec

This doc defines the devnet echo job format and the smoke path that proves
JobQueue + ReceiptRegistry + coverage gauges are wired correctly.

The echo agent is intentionally simple: it posts a job with a small JSON
payload and relies on the existing devnet coverage/healer pipeline to
keep coverage at 1.0.

============================================================
1. Contracts and chain (devnet)
============================================================

From docs/VOID-DEVNET-PROTOCOL-STATE.json:

- JobQueue.address
- ReceiptRegistry.address

Example (current devnet snapshot when this was written):

- JobQueue         = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
- ReceiptRegistry  = 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853

Chain:

- chainId = 2050
- RPC_URL = http://127.0.0.1:8545

============================================================
2. JobQueue ABI (canonical)
============================================================

We only care about this function:

    function postJob(
        string  kind,
        bytes32 payloadHash,
        string  payload
    ) external payable returns (bytes32 jobId);

There is also a JobPosted event, but scripts do not depend on the exact
field list. The stable ABI we care about is:

    postJob(string,bytes32,string)

============================================================
3. Echo job payload format (echo.v1)
============================================================

The echo job payload is JSON with this shape:

    {
      "kind": "echo.v1",
      "message": "hello-from-echo-smoke",
      "ts": 1764144098
    }

Rules:

- kind must be "echo.v1".
- message is arbitrary user text.
- ts is a UNIX timestamp (integer seconds).

The payload string is built via jq:

    ECHO_KIND="echo.v1"
    ECHO_MESSAGE="hello-from-echo-smoke"
    TS="$(date +%s)"

    PAYLOAD="$(jq -n --arg kind "$ECHO_KIND" --arg msg "$ECHO_MESSAGE" --arg ts "$TS" \
      '{kind:$kind,message:$msg,ts:($ts|tonumber)}')"

We then compute:

    PAYLOAD_HASH="$(cast keccak "$PAYLOAD")"

PAYLOAD_HASH is passed as the bytes32 argument to postJob.

============================================================
4. Canonical smoke script (echo-smoke-v2)
============================================================

The canonical smoke script is:

    ops/void-devnet-agent-echo-smoke-v2.sh

High-level behavior:

1) Load the devnet caller key from:
   .secrets/devnet-caller.key

   Current from address when this was written:
   0x3022E757dC810E133019aC0780aB3363043fC871

2) Read JobQueue and ReceiptRegistry from:
   docs/VOID-DEVNET-PROTOCOL-STATE.json

3) Build the payload JSON and PAYLOAD_HASH.

4) Send the job:

    cast send "$JOBQUEUE_ADDR" \
      'postJob(string,bytes32,string)' \
      "$ECHO_KIND" "$PAYLOAD_HASH" "$PAYLOAD" \
      --rpc-url "$RPC_URL" \
      --private-key "$DEVNET_CALLER_KEY"

5) Sleep ~15 seconds to let the devnet jobs/receipts coverage pipeline run.

6) Check totals:

- totalJobs increased by 1.
- totalReceipts stayed the same or increased.

7) Check devnet coverage gauges in Prometheus:

- void_devnet_coverage
- void_devnet_coverage_health
- void_devnet_receipts_coverage_v2
- void_devnet_receipts_health_v2

At the time of writing, a successful run looked like:

- Before: totalJobs = 8, totalReceipts = 78
- After : totalJobs = 9, totalReceipts = 78

Gauges (example values):

- void_devnet_coverage              = 1
- void_devnet_coverage_health       = 1
- void_devnet_receipts_coverage_v2  = 13 (or approx 8.666667)
- void_devnet_receipts_health_v2    = 1

Important: the exact ratio can change as jobs and receipts move. The
critical invariants are:

- void_devnet_coverage_health       = 1
- void_devnet_receipts_health_v2    = 1

============================================================
5. How this ties into devnet coverage
============================================================

The devnet coverage pipeline:

- Scans JobQueue for all jobIds.
- Scans ReceiptRegistry for receipts keyed by jobId.
- Emits a node_exporter textfile with:

    void_devnet_coverage
    void_devnet_coverage_health
    void_devnet_receipts_coverage_v2
    void_devnet_receipts_health_v2

Interpretation:

- void_devnet_coverage == 1.0
    Every JobQueue job has at least one receipt.

- void_devnet_coverage_health == 1
    Coverage is perfect (no uncovered jobs).

- void_devnet_receipts_coverage_v2 > 1
    Multiple receipts per job (expected on devnet).

- void_devnet_receipts_health_v2 == 1
    receipts_total >= jobs_total.

The echo smoke must not break these invariants. Adding an echo job
must keep:

- void_devnet_coverage_health == 1
- void_devnet_receipts_health_v2 == 1

If either goes 0, devnet is considered unhealthy.

============================================================
6. Manual re-run of echo-smoke-v2
============================================================

To re-run the echo smoke:

    cd ~/dev/void-node
    export DEVNET_CALLER_KEY="$(cat .secrets/devnet-caller.key)"
    ./ops/void-devnet-agent-echo-smoke-v2.sh

A PASS looks like:

- totalJobs increased by 1.
- totalReceipts stayed the same or increased.
- All coverage health gauges remain 1:

    void_devnet_coverage              == 1
    void_devnet_coverage_health       == 1
    void_devnet_receipts_coverage_v2  >  0
    void_devnet_receipts_health_v2    == 1

This document is the canonical spec for the echo.v1 devnet agent job
format and smoke path.
