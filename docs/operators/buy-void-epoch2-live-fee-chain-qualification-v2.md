# Epoch-2 live fee + Chain-2050 qualification v2

## Purpose

This is the protected-evidence successor to #3183.

The fee and chain semantics remain unchanged. The source change is the trust
chain: this runner is unprivileged and consumes #3191's protected V2
credential/signer-control composition rather than the stale V1 root-runner
chain.

## Privilege boundary

The V2 fee/chain runner must execute as UID 1000 and must not execute as root.

Its reviewed Git object may be streamed into an unprivileged Node process. It
invokes the exact V2 signer-control child as another unprivileged Git-object
Node process.

Only the nested V2 binder/native-preentry path in the descendant evidence chain
crosses into root.

The fee/chain runner itself performs only:

- user-systemd observation;
- rootless user Docker-socket observation;
- loopback listener observation;
- bounded read-only JSON-RPC calls to the fixed Epoch-2 RPC;
- exact Git-object reads.

## Exact protected child

Required child source:

```text
ops/precision/void_buy_void_epoch2_authenticated_credential_signer_control_binding_v2.mjs
Git blob 5ff0fe527c4e66fce446a26dabb8abaf9b1a01d5
```

Both the before and after child receipts must prove:

- protected first entry authenticated;
- native preentry policy bound;
- root Node descriptor execution bound;
- retained runner descriptor bound;
- stdin JavaScript forbidden;
- signer off-chain control proven;
- systemd credential identity proven;
- active non-transaction signing capability proven;
- exact runtime/private-manager generation bound;
- transaction signing and broadcast unproven;
- customer_safe_to_pay=false.

The stable child identity comparison spans the full fee/chain observation
window.

## Fee policy

The accepted dormant Epoch-2 policy remains:

- fixed RPC: `http://127.0.0.1:18553/`;
- gas-limit multiplier: 15,000 bps;
- accepted maximum gas limit: 320,000;
- fee multiplier: 20,000 bps;
- maximum fee per gas: 3 Gwei;
- configured priority fee: 0.

Two live `eth_gasPrice` observations are taken and the larger is used.

Zero gas is accepted only under the exact Epoch-2 presale policy. For nonzero
gas the computed 200% maximum fee must remain at or below 3 Gwei, and the
fulfiller native balance must cover the bounded maximum gas cost.

## Exact Chain-2050 receipt

Read-only observations bind:

- chain ID 2050;
- reviewed historical block 3854/hash;
- progression across the observation window;
- peer quorum;
- exact three-validator QBFT roster;
- exact presale and VoidToken runtime bytecode hashes;
- fee observations and conservative fee result;
- fulfiller native fee balance;
- fresh user-systemd service generation;
- fresh rootless Docker container generation;
- fixed loopback RPC listener.

The previously accepted RPC-host observation is used only as the expected
generation contract. Fresh host revalidation is required before and after the
fee window.

## Authority

The outer V2 receipt remains observation-only:

- transaction calldata constructed = false;
- nonce reserved = false;
- transaction signing proven = false;
- transaction constructed/submitted/broadcast = false;
- customer payment record access = false;
- customer_safe_to_pay=false;
- payment acceptance = false;
- public presale activation = false;
- WC/VOID market activation = false;
- Chain-2050 mutation = false;
- funds movement = false.

The next gate is the bounded current Chain-2050 one-payment/one-fulfillment
canary. That canary remains separately authorized.

PROTECT THE CORE.
