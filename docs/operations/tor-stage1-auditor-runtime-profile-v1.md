# Tor Stage 1 auditor runtime profile v1

## Purpose

This lane adds an exact verified-runtime profile for the Stage 1
signature-bound MCP onion backend without weakening generic process
screening or changing any live service.

## Runtime identity

The Stage 1 profile is bound to:

- source head `eaaa2855af6c70c51f671bb6aaba25602fca7797`;
- backend `tools/void-tor-onion-public-node-v1.mjs`;
- backend SHA-256 `f517562df0453c6c784df1c072d5de212317cd7503dbcbbe671305c48790ddba`;
- service `void-public-node-tor-backend-v1.service`;
- the existing loopback-only Tor backend arguments;
- the exact five MCP option/value pairs used by the immutable Stage 1
  release.

The profile marker is `void_public_node_tor_backend_mcp_stage1_v1`.

## Compatibility and age policy

The legacy 12-argument profile
`void_public_node_tor_backend_v1` remains accepted and retains the existing
`MIN_RUNTIME_AGE_SECONDS` stabilization requirement.

The exact Stage 1 profile may be recognized immediately after its
backend restart because its service unit, clean Git deployment, source
head, script path, complete argv, profile files, process state, child
count, and Git descriptor boundary are independently verified.

Generic runtime fallback logic retains its original minimum-age check.
No generic runtime path, prefix, wildcard, or caller-supplied allowance
is added.

## Authority boundary

This change modifies source and proof files only. It does not restart
the backend, MCP, or Tor services; alter the onion hostname, keys, or
torrc; create the Stage 1 release; move money; write Work Credits; or
activate paid work.
