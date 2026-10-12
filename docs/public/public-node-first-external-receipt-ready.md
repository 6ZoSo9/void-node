# VOID Public Node First External Receipt Ready v1

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_READY_V1`

This records that the VOID public node is ready to request the first real outside-human tester receipt.

This checkpoint does not claim that a new external tester receipt has been received. It proves the campaign is ready:

- user-systemd `void-node-live.service` is active
- public base URL runtime configuration is active
- tester share page emits public links
- first tester request copy pack is live
- tester result receipt schema is live
- tester result intake status route is live
- tester receipts remain operator-local import only
- no public POST endpoint is exposed
- no wallet, swap, fulfillment, validator, or money movement is involved

Receipt boundary:

A `tester-receipt.json` from an outside tester is external evidence, not consensus/network truth. It may be imported locally by the operator and surfaced through the public read-only intake status route.
