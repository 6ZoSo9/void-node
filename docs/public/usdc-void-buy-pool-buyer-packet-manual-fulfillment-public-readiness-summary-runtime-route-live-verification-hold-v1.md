# USDC/VOID Buy Pool Buyer Packet Manual Fulfillment Public Readiness Summary Runtime Route Live Verification Hold v1

Marker: VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_LIVE_VERIFICATION_HOLD_V1

Purpose: define a live-route verification hold for the buyer-safe manual fulfillment public readiness summary runtime routes.

Routes verified:

- /public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json
- /public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1

Live verification target:

- local node origin: http://127.0.0.1:4100
- public node origin: https://zoso-alienware-aurora-r7.taila47fd.ts.net
- service: void-node-live.service

This hold verifies only read-only GET visibility.

It does not perform:

- buyer fulfillment
- manual fulfillment record write
- manual fulfillment record apply
- allocation claim creation
- VOID transfer
- wallet signing
- treasury movement
- automatic fulfillment
- authority activation
- public mutation
- lane reopen

The proof defaults to static mode. Live service restart and curl checks require explicit environment variable:

- VOID_RUNTIME_LIVE_VERIFY=1
