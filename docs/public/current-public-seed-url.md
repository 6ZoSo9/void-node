# VOID current public seed URL

Current public HTTPS seed surface:

- https://zoso-alienware-aurora-r7.taila47fd.ts.net

Current role:

- public-safe VOID seed adapter
- participant page entrypoint
- public bootstrap entrypoint
- public readiness entrypoint

Current safety posture:

- /__void/adapter.json is public
- /__void/ready.json is public
- /__void/public-bootstrap.json is public
- /__void/public-seed-adapter/status.json is public
- /participant is public
- /rpc is blocked
- sensitive surfaces are blocked
- 8545 remains private on 127.0.0.1

Cost posture:

- no Google Cloud hosting
- no Google Cloud load balancer
- no paid VPS required
- current public URL uses Tailscale Funnel
- custom domain mapping is deferred until it can be done without adding Google Cloud spend

Domain note:

Tailscale Funnel uses the tailnet *.ts.net name as the public HTTPS name. A clean custom domain should be handled later with free DNS plus a free tunnel/proxy path, not by adding paid Google Cloud infrastructure.
