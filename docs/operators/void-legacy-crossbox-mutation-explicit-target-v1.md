# Legacy cross-box mutation explicit target v2

Marker: `VOID_LEGACY_CROSSBOX_MUTATION_EXPLICIT_TARGET_V1`

Status: corrective source-only hardening after the v1 retired-host wall. This
lane does not execute SSH, write systemd configuration, restart a service,
publish validator state, create/push a tag, access credentials, sign, submit a
transaction, or move funds.

## Why v2 is required

Removing retired Alienware defaults was necessary but not sufficient for
mutation-capable cross-box scripts.

An explicit string passed to `ssh` is not automatically a destination: values
beginning with `-` are parsed as OpenSSH options. Likewise, a nonempty peer URL
or drop-in name is not automatically safe to persist into systemd or interpolate
into a remote shell command.

The v2 boundary validates all operator-controlled mutation inputs before the
first durable write, service restart, remote mutation, or validator staging
action.

## Destination-only SSH targets

The site-bundle parent, both composed child proofs, and validator closeout accept
only a bounded destination grammar:

```text
[user@]host
```

where user/host characters are limited to ASCII letters, digits, dot,
underscore, and hyphen, and the host must begin with an alphanumeric
character.

This excludes:

- leading SSH options such as `-o...`;
- whitespace/control characters;
- shell metacharacters; and
- user-supplied command fragments.

The existing retired-host wall remains in force for:

- `100.122.79.39`;
- `zoso-alienware-aurora-r7.taila47fd.ts.net`; and
- the token `alienware`.

## Site-bundle peer persistence

`ops/security/void-site-bundle-peer-env-persistence-proof.sh` requires:

- explicit `ALIEN` remote SSH destination;
- explicit `LOCAL_PEER`;
- explicit `REMOTE_PEER`; and
- exact confirmation:
  `CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE=applyVoidSiteBundlePeerEnvPersistenceV1`.

Both peer URLs must match the bounded v1 service shape:

```text
http://HOST:4100
https://HOST:4100
```

No path, userinfo, query, fragment, whitespace, quotes, or shell control
characters are accepted.

`DROPIN_NAME` must be a direct basename of at most 128 characters using only
letters, digits, dot, underscore, and hyphen. `.`, `..`, separators, and
shell/whitespace characters are rejected.

All of those checks happen before the confirmation boundary and before any
systemd write.

## Exact source parity before mutation

After the confirmation token but before the first local drop-in write, the
site-bundle parent performs a read-only cross-box source preflight:

- local repository must be clean;
- remote repository must be clean;
- both must report full 40-hex Git HEAD identities;
- local and remote HEAD must match exactly; and
- the remote hostname must be distinct from the local hostname.

The remote probe is bounded to:

```text
ssh -o BatchMode=yes -o ConnectTimeout=6 <explicit-destination>
```

and only reads hostname / Git state. No service or runtime mutation occurs
during this parity check.

Only after that proof may the local/remote durable peer drop-ins be written and
the services restarted.

The parent propagates the same reviewed SSH destination into:

- `ops/security/void-public-site-bundle-auto-materialize-proof.sh`; and
- `ops/security/void-public-site-bundle-peer-readiness-proof.sh`.

Both child scripts independently enforce the same destination-only grammar and
retired-host wall before output creation or SSH.

## Validator cross-box closeout

`ops/mainnet/validator-crossbox-closeout.sh` requires:

- explicit destination through `CROSSBOX_SSH_TARGET` (legacy `ALIEN` is only
  an explicit compatibility alias);
- destination-only SSH grammar;
- canonical positive decimal `EPOCH` with at most six digits;
- bounded safe `VAULT` name using letters, digits, dot, underscore, and
  hyphen; and
- exact confirmation:
  `CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT=publishValidatorCrossboxCloseoutV1`.

The epoch/vault validation occurs before their use in glob/path construction.

Before `LIVE_STAGE` is created, the validator closeout also requires the same
clean, distinct-host, exact-HEAD cross-box source parity described above.

Only after that read-only parity proof may the script:

- stage/publish local validator truth;
- copy/link validator truth on the remote host;
- restart the remote VOID service; or
- create/push a checkpoint tag.

## Focused CI

The focused workflow performs no valid remote invocation. It exercises only
fail-closed inputs that must terminate before parity/network/mutation:

- missing SSH target;
- leading-option SSH target;
- retired target;
- unsafe local/remote peer URL;
- unsafe drop-in basename;
- missing confirmation;
- noncanonical validator epoch; and
- unsafe validator vault name.

Static ordering assertions additionally require source parity to occur before
the first site-bundle mutation and before validator `LIVE_STAGE` creation.

Expected marker:

```text
VOID_LEGACY_CROSSBOX_MUTATION_EXPLICIT_TARGET_V1_GREEN
```

The historical marker remains v1 for compatibility; this document defines the
corrective v2 input/parity contract.
