# Local Multibox Nimo Rejoin Operator Runbook v1

Marker: `VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1`

Purpose: public-safe operator recovery path for rejoining Precision to Nimo after a Precision runtime restart.

Precision:
- node id: `9d89483769e469e0473b489dc50dba96`
- HTTP: `127.0.0.1:4100`
- P2P: `192.168.1.88:4700`

Nimo:
- node id: `042c8b22f14cf343139e9bc806937bf3`
- P2P: `192.168.1.99:4701`
- HTTP from Precision: not observed
- SSH from Precision: not observed

After restarting `void-node-live.service`, Nimo may not appear immediately in `/health` or `/peers`. That is expected because the peer rejoin card does not enable automatic peer dialing.

Manual rejoin command from Precision:

    curl -fsS -X POST -H 'content-type: application/json' --data '{"addr":"192.168.1.99:4701"}' http://127.0.0.1:4100/p2p/dial | jq .

Verify:

    curl -fsS http://127.0.0.1:4100/health | jq .
    curl -fsS http://127.0.0.1:4100/peers | jq .

Expected peer id:

    042c8b22f14cf343139e9bc806937bf3

Expected known address:

    192.168.1.99:4701

Boundary: public-safe operator guidance only. Does not enable automatic peer dialing, mutation routes, wallet send, money movement, buy VOID fulfillment, WC settlement, validator mutation/admission, public WC self-serve earning, or a public internet mesh claim.

Expected green marker: `VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1_GREEN`
