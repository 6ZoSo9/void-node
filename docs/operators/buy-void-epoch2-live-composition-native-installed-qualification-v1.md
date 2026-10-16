# Buy VOID Epoch-2 native installed qualification v1

Marker:

`VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1`.

Status: **read-only installed-state qualification source; live run remains
separately authorized**.

## Purpose

This is the read-only successor to the create-only native protected installer.

It does not run the V2 live-composition runner and does not touch credentials.
It proves only that the installed privileged first-entry generation still
matches its accepted V3 lock, policy, Node generation and selected clean
`main` checkout.

## Live read-only sequence

A separately authorized root run requires an exact expected 40-hex main head.

It:

1. loads the exact reviewed protected installer source;
2. verifies the accepted V3 lock;
3. verifies fixed checkout/head/blob set;
4. measures fixed Git, setpriv and Node;
5. rebuilds the exact expected six-line policy in memory;
6. requires protected state
   `EPOCH2_LIVE_COMPOSITION_PROTECTED_INSTALL_GREEN`;
7. snapshots root/native/runner/policy plus host tool/check-out generations;
8. executes only the installed native binary's inert `--self-test`;
9. repeats the full installed/host snapshot;
10. executes the same inert self-test a second time;
11. repeats the full snapshot again;
12. requires all three snapshots and both complete self-test transcripts to be
    identical.

## No live composition

The native `--self-test` exits before the native root/live path.

The qualifier does not:
- execute the V2 runner;
- execute the sealed credential signer;
- read credential contents;
- access private-key material;
- sign anything;
- construct/submit/broadcast a transaction;
- contact RPC;
- mutate files, services or systemd;
- accept payment;
- activate presale/WC;
- move funds.

A GREEN receipt remains
`production_host_evidence_authority=false`.

## Next gate

After a GREEN separately authorized read-only qualification:

`SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_LIVE_COMPOSITION_V2`.

That later operation is sensitive because it reaches the sealed credential
child and performs one non-transaction signature. This source does not grant
that authority.

PROTECT THE CORE.
