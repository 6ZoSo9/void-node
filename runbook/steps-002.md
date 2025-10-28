# STEP-002: Promote follower to proposer
1. Stop follower service.
2. Set `ALLOW_EMPTY_BLOCKS=1` (if you want it to seal without tx).
3. Swap ports or update DNS.
4. Start service and verify `/api/health` + `/blocks/head`.
