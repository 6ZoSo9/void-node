# Apollyon authorization custody launcher v3

Marker: `VOID_APOLLYON_AUTHORIZATION_CUSTODY_LAUNCHER_V3`

Status: **source-only graceful-shutdown successor candidate; not installed and not live**.

## Purpose

Preserve the accepted v2 launcher security boundary while repairing a live
shutdown defect observed during Xiphos custody qualification.

The installed v2 launcher registered SIGTERM/SIGINT handlers, began
`service.stop()`, and then waited for an unref'd polling timer to notice the
shutdown flag. Once the custody listener closed, Node could have no referenced
event-loop handles while the top-level `await main()` was still unresolved.
On Xiphos that produced Node exit status 13 with an unsettled top-level-await
warning during an otherwise intentional target stop.

## v3 shutdown contract

v3 removes the polling timer entirely. A dedicated shutdown promise:

- installs one persistent SIGTERM handler and one persistent SIGINT handler for
  the shutdown window;
- allows only the first signal to initiate `service.stop()`;
- keeps both handlers installed while `service.stop()` is pending so repeated
  SIGTERM/SIGINT delivery cannot fall through to Node's default termination
  behavior;
- resolves only after `service.stop()` completes;
- propagates a stop failure to the existing launcher HOLD path;
- removes both signal listeners on either success or failure;
- keeps the existing dependency-blob, root-custody, loader-environment,
  public-key-only and negative authority checks unchanged.

The launcher is import-safe for focused source testing: direct runtime
execution occurs only when the module is the process entrypoint.

## Executable proof

The focused proof imports only the v3 launcher candidate and uses a disposable
`EventEmitter` signal source plus synthetic service objects. It proves:

- SIGTERM completes exactly one stop;
- SIGINT completes exactly one stop;
- duplicate same-signal and cross-signal delivery cannot trigger a second stop;
- both signal listeners remain present while stop is pending and are removed
  only after completion/failure;
- rejected `service.stop()` propagates as a failure;
- invalid service/signal-source objects fail closed;
- the old `setInterval(...).unref()` pattern is absent.

## Authority

This PR does not update the installed Xiphos launcher, systemd service, target,
custody state, socket, authorization record, durable claim, training runtime,
private keys, signing, transactions, wallets or funds.

The next gate after source acceptance is a separately reviewed rebind of the
custody service and live-custody qualifier to the exact v3 launcher blob,
followed by a dormant host upgrade and a fresh two-cycle qualification.

PROTECT THE CORE.
