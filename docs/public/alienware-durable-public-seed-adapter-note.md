# VOID Alienware durable public seed adapter note

Alienware now runs the VOID public seed adapter v1 as a durable user systemd service.

Service:

- void-public-seed-adapter.service
- enabled
- active running
- host: 100.122.79.39
- port: 4111
- upstream: http://127.0.0.1:4100

Precision verified the adapter over Tailscale:

- /__void/adapter.json returns valid adapter manifest
- /__void/ready.json returns ready true, gap 0, txroot_live 1
- /rpc returns 404 not_public

This proves Alienware as a durable internal/operator-mesh public seed adapter.
