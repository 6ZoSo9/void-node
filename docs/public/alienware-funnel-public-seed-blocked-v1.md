# VOID Alienware Funnel public seed status

Status: resolved.

Historical blocker:

- tailscale funnel --bg 8080 originally failed because Funnel was not enabled for the tailnet and the user was not configured as the Tailscale operator on Alienware.
- The blocker was resolved by enabling Funnel in Tailscale and running sudo tailscale set --operator=$USER on Alienware.

Current public Funnel URL:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

Current green state:

- Alienware public-safe edge adapter is active on 0.0.0.0:8080
- Funnel proxies https://zoso-alienware-aurora-r7.taila47fd.ts.net/ to http://127.0.0.1:8080
- /__void/adapter.json returns void_public_seed_adapter
- /__void/ready.json returns ready true
- /__void/public-seed-adapter/status.json returns ok true
- /rpc is blocked with 404 not_public
- sensitive surfaces are blocked
- participant page is reachable
- 8545 remains private on 127.0.0.1

The prior tag ckpt-alienware-funnel-public-seed-v1-green-20260606-123500 was created before the proof passed and should be ignored in favor of the later resolved green checkpoint.
