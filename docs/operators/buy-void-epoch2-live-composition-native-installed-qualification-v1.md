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
8. opens the exact installed native with `O_NOFOLLOW`, rebinds it to the verified snapshot, hashes that retained descriptor, and executes `/proc/self/fd/<fd> --self-test` with only that FD passed to the child;
9. revalidates the retained inode and visible native pathname after execution;
10. repeats the full installed/host snapshot;
11. executes the same descriptor-bound inert self-test a second time;
12. repeats the full snapshot again;
13. requires all three snapshots and both complete self-test transcripts to be identical.

## No live composition

The native `--self-test` exits before the native root/live path. The qualifier never executes the mutable pathname after verification: execution is bound to the already-open verified inode via `/proc/self/fd/<fd>` and any visible-path rebinding during the child run causes HOLD.

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
