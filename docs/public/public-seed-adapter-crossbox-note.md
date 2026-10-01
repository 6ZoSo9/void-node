# VOID public seed adapter cross-box note

Status: historical cross-box adapter evidence.

Public seed adapter v1 was proven on Precision and Alienware during this observation window.

Precision proof used Alienware over Tailscale as upstream:

`http://100.122.79.39:4100`

Alienware proof used its local node upstream:

`http://127.0.0.1:4100`

In both historical proofs, the adapter allowed `/__void/ready.json` and blocked `/rpc` with `404 not_public`.

This established the first adapter layer for separating VOID node truth from public reachability.

Current topology note (2026-09-30): Alienware is permanently retired and these coordinates are historical evidence only. The active operator fleet is Precision, Nimo, and Xiphos. Current public-seed routing uses the reviewed configured origin rather than either recorded Alienware coordinate.
