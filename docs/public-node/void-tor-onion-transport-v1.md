# VOID Tor Onion Transport V1

`VOID_TOR_ONION_TRANSPORT_V1` adds an optional Tor v3 transport for the existing
public-node evidence tree. It is a transport and deployment lane, not a new VOID
identity, consensus role, validator capability, or mutation authority.

## Exact scope

V1 serves the repository's `public/` tree through a dedicated Node.js process
that:

- binds only to `127.0.0.1` or `::1`;
- accepts only `GET` and `HEAD`;
- exposes the current public-node files;
- exposes an operator-local Tor descriptor at both
  `/.well-known/void-tor-onion-transport-v1.json` and
  `/public-node/transports/tor-v1.json`;
- rejects path traversal and symlink escape attempts;
- reports all write and operator authorities as false.

Tor maps virtual port 80 of one v3 Onion Service to the loopback server on port
18088. A separate loopback SOCKS port on 19050 is used only for the bounded
end-to-end self-probe.

V1 does not expose the node HTTP listener on port 4100. V1 does not expose the P2P listener on port 4700. V1 does not expose MCP, transaction submission, wallets, signers, Work Credit writes, VOID settlement, validator controls, or any operator mutation route.

## Identity boundary

The generated `.onion` address authenticates the Tor Onion Service. It is not the canonical VOID node identity. The descriptor therefore states:

- `canonical_void_node_identity: false`;
- `signed_void_node_binding: false`;
- `binding_status: operator-local-unbound-v1`.

A signed VOID-node binding is optional and fail-closed through `VOID_NODE_ONION_BINDING_V1` until the transport has a
clean live canary and the canonical discovery-signature format is selected.
Until then, do not claim that possession of the onion key proves possession of
a VOID node key.

## Files and state

The installer does not edit `/etc/tor/torrc`. It renders a dedicated user-scoped
Tor configuration and two user services:

- `void-public-node-tor-backend-v1.service`;
- `void-tor-onion-transport-v1.service`.

Default operator state is kept under:

```text
~/.config/void/tor-onion-v1/
~/.local/share/void/tor-onion-v1/
~/.local/state/void/tor-onion-v1/
~/.config/systemd/user/
```

The Onion Service identity and hostname are under
`~/.local/share/void/tor-onion-v1/hidden-service/`. Tor's secret-key files must
never be copied into the repository, attached to an issue, pasted into chat, or
included in a proof bundle.

## Inspect without deployment

```bash
bash ops/tor/void-tor-onion-transport-v1.sh plan
bash ops/tor/void-tor-onion-transport-v1.sh render /tmp/void-tor-onion-v1-render
node scripts/prove_void_tor_onion_transport_v1.mjs
```

`plan` mutates nothing. `render` writes only to the explicitly selected output
directory and does not start Tor or systemd services.

## Install one bounded canary

Run from the repository worktree containing this lane:

```bash
bash ops/tor/void-tor-onion-transport-v1.sh install
```

The installer requires a current `tor` daemon. It does not silently install the
Ubuntu universe package because the Tor Project recommends its maintained
repository for Debian and Ubuntu. If an operator explicitly accepts the distro
package, `VOID_TOR_ALLOW_DISTRO_PACKAGE=1` authorizes the installer to use
`sudo apt-get`; otherwise a missing daemon is a hard stop.

The installer then:

1. creates user-owned configuration, data, identity, and state directories with
   restrictive modes;
2. renders and verifies a dedicated `torrc`;
3. installs and enables the two user services;
4. confirms the loopback public-node path;
5. waits for Tor to create a valid v3 hostname;
6. writes the public transport descriptor without reading any private key;
7. fetches the public-node index and descriptor through Tor using remote SOCKS
   hostname resolution.

The final output includes the `http://<56-character-address>.onion` URI and the
local descriptor path. When an operator explicitly selects a non-default virtual
port, the URI and end-to-end self-probe include that port.

## Operate

```bash
bash ops/tor/void-tor-onion-transport-v1.sh status
bash ops/tor/void-tor-onion-transport-v1.sh verify
```

A standalone `verify` requires the sentinel-bound Tor data root created by
installation. It also creates or reuses a sentinel-bound state root before
writing the local descriptor, so a failed probe cannot leave an unowned cleanup
root behind.

User services normally depend on the user's systemd manager. Operators who need
service continuity after logout must manage user lingering according to their
host policy. This lane reports the current linger state but does not silently
change it.

## Remove while preserving the address

```bash
bash ops/tor/void-tor-onion-transport-v1.sh uninstall
```

The default uninstall removes the user units, rendered configuration, and
runtime descriptor while preserving the Onion Service identity. A later
reinstall therefore retains the same address.

Permanent identity deletion is separate and irreversible:

```bash
bash ops/tor/void-tor-onion-transport-v1.sh \
  purge-identity PURGE_VOID_TOR_ONION_IDENTITY_V1
```

After a purge, the previous onion address cannot be recovered without a backup
of its secret identity files.

## Environment overrides

The bounded defaults can be changed before installation:

```text
VOID_REPO
VOID_TOR_PUBLIC_NODE_PORT
VOID_TOR_SOCKS_PORT
VOID_TOR_VIRTUAL_PORT
VOID_TOR_CONFIG_ROOT
VOID_TOR_DATA_ROOT
VOID_TOR_STATE_ROOT
VOID_TOR_BIN
VOID_TOR_ALLOW_DISTRO_PACKAGE
```

All runtime roots are canonicalized with `realpath`, must physically resolve
beneath the operator's home directory, and must end in `/tor-onion-v1`. The
configuration, data, and state roots must not overlap each other, the repository,
or the user-systemd unit directory. Each managed root receives a path-bound,
user-owned sentinel before use. `uninstall` and `purge-identity` refuse recursive
deletion when that sentinel is absent or mismatched, so an override cannot turn a
Tor cleanup into removal of an unrelated home subtree. Lexical `..` escapes and
existing symlink escapes fail closed before rendering, installation, removal, or
identity purge. `VOID_TOR_BIN`, when supplied, must be an absolute executable path
and is honored by installation. The public server remains loopback-only even when
environment variables are supplied.

## Follow-on lanes

A later lane may bind the Tor endpoint into signed public discovery after a
live canary proves address persistence, restore behavior, and clean failure
modes. A separate review is required before mapping P2P or an authenticated MCP
listener. Mutation routes must never be inherited merely because traffic
arrives through Tor.


## Signed node-to-onion binding

When `node-onion-binding-v1.json` is present under the managed Tor data root, the public server verifies the Ed25519 signature, the exact canonical VOID node ID attested by that signature, onion hostname, validity interval, and read-only authority on every request. A valid document is published at both binding aliases and upgrades the transport descriptor to `signed-node-to-onion-v1`. An invalid, expired, mismatched, or tampered binding fails closed with HTTP 503. Removing the binding reverts the descriptor to the honest unbound state without restarting Tor or deleting the onion identity.
