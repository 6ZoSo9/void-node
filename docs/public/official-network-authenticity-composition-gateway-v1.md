# VOID Official Network Authenticity Composition Gateway V1

Exposes four exact `.well-known` JSON routes through the established port 8082 composition gateway by proxying only to `VOID_NODE_UPSTREAM`.

Boundaries: GET/HEAD only; query strings rejected; POST/PUT/PATCH/DELETE return 405; no fallback to port 8080; redirects are not followed; sealed bytes and headers are preserved; private key absent; no runtime, wallet, validator, Work Credit, Buy VOID, treasury, economic, or third-party network-control authority. This source lane does not modify Funnel, systemd, or the active frozen release.
