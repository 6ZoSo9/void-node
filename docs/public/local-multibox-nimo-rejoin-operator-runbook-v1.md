# Local Multibox Nimo Rejoin Operator Runbook v1

Marker: `VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1`

Purpose: public-safe operator recovery path for asking a Precision node you administer to rejoin Nimo after a Precision runtime restart.

Precision:
- node id: `9d89483769e469e0473b489dc50dba96`
- HTTP: `127.0.0.1:4100`
- P2P: `192.168.1.88:4700`

Nimo:
- node id: `042c8b22f14cf343139e9bc806937bf3`
- P2P: `192.168.1.99:4701`
- HTTP from Precision: not observed
- SSH from Precision: not observed

After restarting `void-node-live.service`, Nimo may not appear immediately in `/health` or `/p2p/peers`. That is expected because this runbook does not enable automatic peer dialing.

Manual rejoin command from Precision:

    curl --fail-with-body --silent --show-error -X POST -H 'content-type: application/json' --data '{"addr":"192.168.1.99:4701"}' http://127.0.0.1:4100/p2p/dial | jq .

Run this only against a local node you administer. The POST asks that node to hand the address to its outgoing connection path and may update local peer state.

- `{"ok":true,"dialing":"..."}` means the HTTP handler accepted the address for handoff. It does not prove that canonical address parsing succeeded, a socket was opened, or Nimo connected.
- `{"ok":false,"error":"..."}` reports an immediate request rejection. Keep the response body, correct the address or local-node problem, and do not retry blindly.

Verify local health, then confirm Nimo appears in the P2P peer snapshot:

    curl -fsS http://127.0.0.1:4100/health | jq .
    curl -fsS http://127.0.0.1:4100/p2p/peers | jq .

Expected peer id:

    042c8b22f14cf343139e9bc806937bf3

Expected known address:

    192.168.1.99:4701

Boundary: public-safe operator guidance only. The manual `/p2p/dial` POST uses an existing local peer-state mutation route; this runbook does not enable automatic peer dialing. It does not enable wallet send, money movement, buy VOID fulfillment, WC settlement, validator mutation/admission, public WC self-serve earning, or a public internet mesh claim.

Expected green marker: `VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1_GREEN`
