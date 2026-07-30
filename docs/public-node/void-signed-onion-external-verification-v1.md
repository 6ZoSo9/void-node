# VOID signed onion external verification v1

## Result

Nimo independently reached the live VOID onion service using a temporary
isolated Tor client. It did not read the repository, connect directly to
Precision, use Tailscale for verification, or access a private key.

The verifier checked the Tor v3 address checksum, Ed25519 signature, both
binding aliases, both descriptor aliases, exact hashes, HTTP method
boundaries, canonical VOID node ID, onion hostname, and read-only authority.

## Endpoint

- Onion URI: `http://r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion`
- VOID node ID: `9d89483769e469e0473b489dc50dba96`
- Binding SHA-256: `f625a192b3f97a29513603b2a433e4acc86f15fb81f9fa536cc44541e5873521`
- Descriptor SHA-256: `e470a0f378cfb8d918909d540491d58b6e2e429c69f4ced2fa5feb13d28b460b`
- Public-key fingerprint SHA-256: `2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b`
- Binding expiry: `2027-01-26T08:39:09.089Z`

## Evidence provenance

- Independent receipt SHA-256: `1f58a1d08870d36f2c83dc22d7cb5e902133b427b70e2cdcc62478d4feaacfd7`
- Independent receipt bundle SHA-256: `06af51cac1982d020610407e8cb2d4412d9d74b2401cc56b9198c7a5d26faf78`
- Nimo public-node index snapshot SHA-256: `c7d1034808026a86cb61e5e09c3bdbc4e15b04c57e79cec0f23146e2b65f2367`

The original receipt bundle is not committed. It remains a separate
hash-addressed evidence artifact. The repository publishes a sanitized
record and immutable copies of the already-public binding and descriptor.

## Privacy boundary

The public record excludes the Nimo machine-ID commitment, local paths,
temporary Tor log, SOCKS details, service history, and private-key details.

## Authority boundary

This evidence is read-only and enables no transaction, P2P, MCP, wallet,
signer, Work Credit, settlement, validator, runtime-mutation, or operator
authority.
