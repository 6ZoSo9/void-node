# VOID USDC/VOID Buy Pool Funding Route Wrapper Repair v1

Marker: `VOID_BUY_POOL_LINK_FUNDING_ROUTE_WRAPPER_REPAIR_V1`

This is a narrow repair for the public buy-pool link integration lane.

Cross-box live checks showed that `/public-node/funding` was reachable but did not expose the fixed-price buy-pool link, while the other surfaces did.

The funding route is not registered as a simple literal `app.get("/public-node/funding")` in source. This repair therefore wraps the existing `/public-node/funding` route response in the Express route stack and injects the buy-pool link into the HTML response when missing.

Destination:

- `/public-node/buy-pool/usdc-void-v1`
- `/public-node/buy-pool/usdc-void-v1.json`

Safety boundary:

- No new route.
- No route-count increase.
- No public mutation route.
- No wallet send route.
- No automatic fulfillment.
- No silent credit mutation.
- Existing funding page remains the served page; this only adds public discoverability for the already-sealed buy-pool page.
