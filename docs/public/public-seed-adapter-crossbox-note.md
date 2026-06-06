# VOID public seed adapter cross-box note

Public seed adapter v1 is proven on both Precision and Alienware.

Precision proof used Alienware over Tailscale as upstream:
http://100.122.79.39:4100

Alienware proof used local node upstream:
http://127.0.0.1:4100

In both proofs, the adapter allowed /__void/ready.json and blocked /rpc with 404 not_public.

This proves the first adapter layer for separating VOID node truth from public reachability.
