import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export const SCHEMA = "void_public_seed_wireguard_continuity_packet_v1";
export const NETWORK = "VOID Network";
export const CHAIN_ID = 2050;
export const WIREGUARD_INTERFACE = "voidwg0";
export const VPS_ADDRESS = "10.205.0.1/32";
export const PRECISION_ADDRESS = "10.205.0.2/32";
export const VPS_ALLOWED_IP = "10.205.0.2/32";
export const PRECISION_ALLOWED_IP = "10.205.0.1/32";
export const PUBLIC_UDP_PORT = 443;
export const PERSISTENT_KEEPALIVE_SECONDS = 25;
export const CONTINUITY_PORT = 4199;
export const PRECISION_GATEWAY_PORT = 4111;
export const PROXY_CONNECTIONS_MAX = 16;

const SOURCE_BINDING_PATHS = Object.freeze([
  "scripts/lib/void_public_seed_client_transport_v1.mjs",
  "scripts/lib/void_public_seed_ip_vps_packet_v1.mjs",
  "src/http/follower_routes.ts",
  "tools/void-public-seed-gateway-v1.mjs",
]);

const NON_PUBLIC_V4 = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]) {
  NON_PUBLIC_V4.addSubnet(network, prefix, "ipv4");
}

export function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(repoRoot, args) {
  const result = childProcess.spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr || "").trim()}`);
  }
  return String(result.stdout || "").trim();
}

export function requireAbsolutePath(value, label) {
  const candidate = String(value || "");
  if (
    !candidate ||
    !path.isAbsolute(candidate) ||
    path.normalize(candidate) !== candidate ||
    /[\0\r\n]/.test(candidate)
  ) {
    throw new Error(`${label} must be one normalized absolute path`);
  }
  return candidate;
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

export function normalizePublicIpv4(value) {
  const address = String(value || "").trim();
  if (net.isIP(address) !== 4 || NON_PUBLIC_V4.check(address, "ipv4")) {
    throw new Error("continuity VPS address must be one globally routable IPv4 literal");
  }
  return address;
}

export function normalizeWireGuardPublicKey(value, label) {
  const raw = String(value || "").trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) {
    throw new Error(`${label} must be one canonical WireGuard public key`);
  }
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32 || bytes.toString("base64") !== raw) {
    throw new Error(`${label} must decode to exactly 32 bytes`);
  }
  if (bytes.every((byte) => byte === 0)) {
    throw new Error(`${label} must not be the all-zero key`);
  }
  return raw;
}

function inspectExactSource(repoRoot, expectedHead) {
  const root = fs.realpathSync(requireAbsolutePath(repoRoot, "repository root"));
  if (!fs.statSync(root).isDirectory()) throw new Error("repository root is not a directory");
  const expected = String(expectedHead || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expected)) {
    throw new Error("expected source head must be 40 lowercase hexadecimal characters");
  }
  const actual = git(root, ["rev-parse", "HEAD"]);
  if (actual !== expected) {
    throw new Error(`repository head mismatch: expected ${expected}, got ${actual}`);
  }
  const status = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new Error("repository checkout must be completely clean");

  const bindings = {};
  for (const relative of SOURCE_BINDING_PATHS) {
    const file = path.join(root, relative);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`source binding must be one regular non-symlink file: ${relative}`);
    }
    bindings[relative] = sha256(fs.readFileSync(file));
  }
  return Object.freeze({ root, head: actual, bindings: Object.freeze(bindings) });
}

function shellQuote(value) {
  const text = String(value);
  if (/[\0\r\n]/.test(text)) throw new Error("shell value contains a control character");
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

function renderInterfaceScript({
  role,
  interfaceName,
  privateKeyPath,
  peerPublicKey,
  address,
  peerAllowedIp,
  endpoint,
  listenPort,
  persistentKeepalive,
}) {
  const setParts = [
    `wg set "$INTERFACE"`,
    listenPort ? `listen-port ${listenPort}` : "",
    `private-key "$PRIVATE_KEY_PATH"`,
    `peer "$PEER_PUBLIC_KEY"`,
    endpoint ? `endpoint ${shellQuote(endpoint)}` : "",
    `allowed-ips "$PEER_ALLOWED_IP"`,
    persistentKeepalive
      ? `persistent-keepalive ${persistentKeepalive}`
      : "",
  ].filter(Boolean);

  return `#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROLE=${shellQuote(role)}
INTERFACE=${shellQuote(interfaceName)}
PRIVATE_KEY_PATH=${shellQuote(privateKeyPath)}
PEER_PUBLIC_KEY=${shellQuote(peerPublicKey)}
ADDRESS=${shellQuote(address)}
PEER_ALLOWED_IP=${shellQuote(peerAllowedIp)}
PEER_ROUTE="$PEER_ALLOWED_IP"
ACTION="\${1:-up}"

hold() {
  printf 'HOLD: %s\n' "$*" >&2
  exit 1
}

test "$(id -u)" = 0 || hold "$ROLE WireGuard interface control requires root"
for command in ip wg stat; do
  command -v "$command" >/dev/null 2>&1 || hold "required command missing: $command"
done

validate_private_key_path() {
  test -f "$PRIVATE_KEY_PATH" && test ! -L "$PRIVATE_KEY_PATH" ||
    hold "private key must be one regular non-symlink file"
  test "$(stat -c '%a' -- "$PRIVATE_KEY_PATH")" = 600 ||
    hold "private key must have mode 0600"
}

delete_interface() {
  if ip link show dev "$INTERFACE" >/dev/null 2>&1; then
    ip -details link show dev "$INTERFACE" | grep -q 'wireguard' ||
      hold "existing interface is not WireGuard: $INTERFACE"
    ip link delete dev "$INTERFACE"
  fi
}

case "$ACTION" in
  up)
    validate_private_key_path
    delete_interface
    ip link add dev "$INTERFACE" type wireguard
    trap 'ip link delete dev "$INTERFACE" 2>/dev/null || true' ERR
    ip address add "$ADDRESS" dev "$INTERFACE"
    ${setParts.join(" \\\n      ")}
    ip link set up dev "$INTERFACE"
    ip route replace "$PEER_ROUTE" dev "$INTERFACE"
    trap - ERR
    wg show "$INTERFACE" public-key >/dev/null
    ;;
  down)
    delete_interface
    ;;
  *)
    hold "action must be up or down"
    ;;
esac

printf 'VOID_PUBLIC_SEED_WIREGUARD_INTERFACE_V1_GREEN\n'
printf 'role=%s\ninterface=%s\naction=%s\n' "$ROLE" "$INTERFACE" "$ACTION"
printf 'private_key_contents_printed=false\nwallet_signer_validator_wc_money_authority=0\n'
`;
}

function renderInterfaceService(role, scriptTarget) {
  const title = role === "vps" ? "VPS" : "Precision";
  return `[Unit]
Description=VOID public seed ${title} WireGuard continuity interface v1
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=${scriptTarget} up
ExecStop=${scriptTarget} down
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
LockPersonality=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
`;
}

function renderProxySocket({ description, listen, interfaceService }) {
  return `[Unit]
Description=${description}
Requires=${interfaceService}
After=${interfaceService}

[Socket]
ListenStream=${listen}
Accept=no
NoDelay=true
Backlog=32

[Install]
WantedBy=sockets.target
`;
}

function renderProxyService({
  description,
  socketUnit,
  interfaceService,
  socketProxydPath,
  target,
}) {
  return `[Unit]
Description=${description}
Requires=${socketUnit} ${interfaceService}
After=${socketUnit} ${interfaceService}

[Service]
Type=notify
ExecStart=${socketProxydPath} --connections-max=${PROXY_CONNECTIONS_MAX} ${target}
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
LockPersonality=true
RestrictSUIDSGID=true
`;
}

function generatedPacketFiles(input) {
  const vpsScriptName = "void-public-seed-continuity-vps-wireguard-v1.sh";
  const precisionScriptName = "void-public-seed-continuity-precision-wireguard-v1.sh";
  const vpsInterfaceService = "void-public-seed-continuity-vps-wireguard-v1.service";
  const precisionInterfaceService =
    "void-public-seed-continuity-precision-wireguard-v1.service";
  const vpsProxySocket = "void-public-seed-continuity-vps-proxy-v1.socket";
  const precisionProxySocket =
    "void-public-seed-continuity-precision-proxy-v1.socket";

  const vpsScriptTarget = `/usr/local/libexec/void/${vpsScriptName}`;
  const precisionScriptTarget = `/usr/local/libexec/void/${precisionScriptName}`;

  const files = new Map([
    [
      vpsScriptName,
      {
        mode: 0o700,
        content: renderInterfaceScript({
          role: "vps",
          interfaceName: WIREGUARD_INTERFACE,
          privateKeyPath: input.vps_private_key_path,
          peerPublicKey: input.precision_public_key,
          address: VPS_ADDRESS,
          peerAllowedIp: VPS_ALLOWED_IP,
          endpoint: "",
          listenPort: PUBLIC_UDP_PORT,
          persistentKeepalive: 0,
        }),
      },
    ],
    [
      precisionScriptName,
      {
        mode: 0o700,
        content: renderInterfaceScript({
          role: "precision",
          interfaceName: WIREGUARD_INTERFACE,
          privateKeyPath: input.precision_private_key_path,
          peerPublicKey: input.vps_public_key,
          address: PRECISION_ADDRESS,
          peerAllowedIp: PRECISION_ALLOWED_IP,
          endpoint: `${input.public_vps_ip}:${PUBLIC_UDP_PORT}`,
          listenPort: 0,
          persistentKeepalive: PERSISTENT_KEEPALIVE_SECONDS,
        }),
      },
    ],
    [
      vpsInterfaceService,
      { mode: 0o600, content: renderInterfaceService("vps", vpsScriptTarget) },
    ],
    [
      precisionInterfaceService,
      {
        mode: 0o600,
        content: renderInterfaceService("precision", precisionScriptTarget),
      },
    ],
    [
      vpsProxySocket,
      {
        mode: 0o600,
        content: renderProxySocket({
          description: "VOID public seed VPS loopback continuity socket v1",
          listen: `127.0.0.1:${CONTINUITY_PORT}`,
          interfaceService: vpsInterfaceService,
        }),
      },
    ],
    [
      "void-public-seed-continuity-vps-proxy-v1.service",
      {
        mode: 0o600,
        content: renderProxyService({
          description: "VOID public seed VPS continuity proxy v1",
          socketUnit: vpsProxySocket,
          interfaceService: vpsInterfaceService,
          socketProxydPath: input.socket_proxyd_path,
          target: `10.205.0.2:${CONTINUITY_PORT}`,
        }),
      },
    ],
    [
      precisionProxySocket,
      {
        mode: 0o600,
        content: renderProxySocket({
          description: "VOID public seed Precision WireGuard continuity socket v1",
          listen: `10.205.0.2:${CONTINUITY_PORT}`,
          interfaceService: precisionInterfaceService,
        }),
      },
    ],
    [
      "void-public-seed-continuity-precision-proxy-v1.service",
      {
        mode: 0o600,
        content: renderProxyService({
          description: "VOID public seed Precision restricted-gateway proxy v1",
          socketUnit: precisionProxySocket,
          interfaceService: precisionInterfaceService,
          socketProxydPath: input.socket_proxyd_path,
          target: `127.0.0.1:${PRECISION_GATEWAY_PORT}`,
        }),
      },
    ],
    [
      "INSTALL.txt",
      {
        mode: 0o600,
        content: `VOID PUBLIC SEED WIREGUARD CONTINUITY PACKET V1

source_head=${input.source_head}
public_vps_ip=${input.public_vps_ip}
vps_public_key=${input.vps_public_key}
precision_public_key=${input.precision_public_key}

This packet contains public keys only. It does not contain, copy, hash, or print
either private key.

Private key paths:
- VPS: ${input.vps_private_key_path}
- Precision: ${input.precision_private_key_path}

Network contract:
- public VPS ingress: UDP ${PUBLIC_UDP_PORT}
- additional public TCP ports: none
- VPS WireGuard address: ${VPS_ADDRESS}
- Precision WireGuard address: ${PRECISION_ADDRESS}
- VPS peer allowed IP and route: ${VPS_ALLOWED_IP}
- Precision peer allowed IP and route: ${PRECISION_ALLOWED_IP}
- Precision endpoint: ${input.public_vps_ip}:${PUBLIC_UDP_PORT}
- persistent keepalive: ${PERSISTENT_KEEPALIVE_SECONDS} seconds
- VPS continuity origin: http://127.0.0.1:${CONTINUITY_PORT}
- Precision restricted gateway: http://127.0.0.1:${PRECISION_GATEWAY_PORT}

Review packet.json and every generated file before any installation.

Separate explicit authorization is required to:
1. install WireGuard or generated files;
2. generate private keys with mode 0600 outside the repository;
3. open VPS UDP ${PUBLIC_UDP_PORT};
4. start either interface or proxy;
5. access the VPS;
6. run a live continuity proof;
7. issue a certificate;
8. publish a manifest; or
9. deploy.

Activation order after those separate approvals:
1. install scripts in /usr/local/libexec/void with mode 0700;
2. install service/socket units in /etc/systemd/system with mode 0600;
3. daemon-reload without starting services;
4. start Precision and VPS WireGuard interface services;
5. verify exact peer public keys, /32 routes, and fresh handshake;
6. start the Precision proxy socket;
7. start the VPS proxy socket;
8. from the VPS, verify:
   curl -fsS http://127.0.0.1:${CONTINUITY_PORT}/__void/ready.json
9. prove repeated non-regressing follower pulls before qualification.

No IP forwarding, NAT, default route, DNS, Tailnet, wallet, signer, validator,
treasury, Work Credit, or money-moving authority is included.
`,
      },
    ],
  ]);
  return files;
}

function fileRecord(name, content, mode) {
  const bytes = Buffer.from(content, "utf8");
  return Object.freeze({
    name,
    sha256: sha256(bytes),
    bytes: bytes.length,
    mode: mode.toString(8).padStart(4, "0"),
  });
}

function createPacketBody(input, records) {
  return {
    schema: SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    generated_at: new Date().toISOString(),
    source_head: input.source_head,
    source_bindings: input.source_bindings,
    public_vps_ip: input.public_vps_ip,
    transport: {
      protocol: "wireguard",
      interface: WIREGUARD_INTERFACE,
      public_udp_port: PUBLIC_UDP_PORT,
      additional_public_tcp_ports: [],
      vps_address: VPS_ADDRESS,
      precision_address: PRECISION_ADDRESS,
      vps_allowed_ip: VPS_ALLOWED_IP,
      precision_allowed_ip: PRECISION_ALLOWED_IP,
      precision_endpoint: `${input.public_vps_ip}:${PUBLIC_UDP_PORT}`,
      persistent_keepalive_seconds: PERSISTENT_KEEPALIVE_SECONDS,
      ip_forwarding_required: false,
      nat_required: false,
      default_route_installed: false,
    },
    continuity: {
      vps_origin: `http://127.0.0.1:${CONTINUITY_PORT}`,
      vps_proxy_listen: `127.0.0.1:${CONTINUITY_PORT}`,
      vps_proxy_target: `10.205.0.2:${CONTINUITY_PORT}`,
      precision_proxy_listen: `10.205.0.2:${CONTINUITY_PORT}`,
      precision_proxy_target: `127.0.0.1:${PRECISION_GATEWAY_PORT}`,
      public_listener: false,
      connections_max: PROXY_CONNECTIONS_MAX,
    },
    keys: {
      vps_public_key: input.vps_public_key,
      precision_public_key: input.precision_public_key,
      vps_private_key_path: input.vps_private_key_path,
      precision_private_key_path: input.precision_private_key_path,
      private_keys_embedded: false,
      private_keys_generated: false,
      private_keys_read: false,
    },
    socket_proxyd_path: input.socket_proxyd_path,
    files: records,
    authority: {
      infrastructure_purchase: false,
      credential_generation: false,
      credential_access: false,
      firewall_mutation: false,
      interface_mutation: false,
      service_mutation: false,
      certificate_issuance: false,
      manifest_publication: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
    activation: {
      vps_accessed: false,
      packages_installed: false,
      udp_port_opened: false,
      interfaces_created: false,
      services_started: false,
      continuity_proved: false,
      deployment_performed: false,
    },
  };
}

export function packetId(packetLike) {
  const copy = structuredClone(packetLike);
  delete copy.packet_id;
  return `voidwgcp1_${sha256(canonicalJson(copy))}`;
}

export function buildPacket({
  publicIp,
  vpsPublicKey,
  precisionPublicKey,
  repoRoot,
  expectedHead,
  output,
  vpsPrivateKeyPath = "/var/lib/void-public-seed-continuity/vps-wireguard.key",
  precisionPrivateKeyPath =
    "/var/lib/void-public-seed-continuity/precision-wireguard.key",
  socketProxydPath = "/usr/lib/systemd/systemd-socket-proxyd",
}) {
  const source = inspectExactSource(repoRoot, expectedHead);
  const outputPath = requireAbsolutePath(output, "output directory");
  if (isPathInside(source.root, outputPath)) {
    throw new Error("packet output must remain outside the repository");
  }
  if (!fs.existsSync(path.dirname(outputPath))) {
    throw new Error("packet output parent must already exist");
  }
  if (fs.existsSync(outputPath)) throw new Error("packet output already exists");

  const vpsKey = normalizeWireGuardPublicKey(vpsPublicKey, "VPS public key");
  const precisionKey = normalizeWireGuardPublicKey(
    precisionPublicKey,
    "Precision public key",
  );
  if (vpsKey === precisionKey) throw new Error("WireGuard public keys must be distinct");

  const vpsPrivate = requireAbsolutePath(vpsPrivateKeyPath, "VPS private-key path");
  const precisionPrivate = requireAbsolutePath(
    precisionPrivateKeyPath,
    "Precision private-key path",
  );
  if (vpsPrivate === precisionPrivate) {
    throw new Error("VPS and Precision private-key paths must be distinct");
  }
  if (
    isPathInside(source.root, vpsPrivate) ||
    isPathInside(source.root, precisionPrivate)
  ) {
    throw new Error("private-key paths must remain outside the repository");
  }

  const input = {
    source_head: source.head,
    source_bindings: source.bindings,
    public_vps_ip: normalizePublicIpv4(publicIp),
    vps_public_key: vpsKey,
    precision_public_key: precisionKey,
    vps_private_key_path: vpsPrivate,
    precision_private_key_path: precisionPrivate,
    socket_proxyd_path: requireAbsolutePath(
      socketProxydPath,
      "systemd-socket-proxyd path",
    ),
  };

  const generated = generatedPacketFiles(input);
  const temporary = `${outputPath}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.mkdirSync(temporary, { mode: 0o700 });
  try {
    const records = [];
    for (const [name, entry] of generated) {
      fs.writeFileSync(path.join(temporary, name), entry.content, {
        encoding: "utf8",
        flag: "wx",
        mode: entry.mode,
      });
      records.push(fileRecord(name, entry.content, entry.mode));
    }
    records.sort((left, right) => left.name.localeCompare(right.name));
    const body = createPacketBody(input, records);
    const packet = { ...body, packet_id: packetId(body) };
    fs.writeFileSync(
      path.join(temporary, "packet.json"),
      `${JSON.stringify(packet, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    fs.renameSync(temporary, outputPath);
    return packet;
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

export function verifyPacket(packetDir) {
  const root = fs.realpathSync(requireAbsolutePath(packetDir, "packet directory"));
  if (!fs.statSync(root).isDirectory()) throw new Error("packet path is not a directory");
  const packetPath = path.join(root, "packet.json");
  const packetStat = fs.lstatSync(packetPath);
  if (!packetStat.isFile() || packetStat.isSymbolicLink()) {
    throw new Error("packet.json must be one regular non-symlink file");
  }
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new Error("packet must be one object");
  }

  const topLevel = [
    "schema",
    "network",
    "chain_id",
    "generated_at",
    "source_head",
    "source_bindings",
    "public_vps_ip",
    "transport",
    "continuity",
    "keys",
    "socket_proxyd_path",
    "files",
    "authority",
    "activation",
    "packet_id",
  ].sort();
  if (canonicalJson(Object.keys(packet).sort()) !== canonicalJson(topLevel)) {
    throw new Error("packet top-level field set mismatch");
  }
  if (
    packet.schema !== SCHEMA ||
    packet.network !== NETWORK ||
    Number(packet.chain_id) !== CHAIN_ID
  ) {
    throw new Error("packet schema or network mismatch");
  }
  if (packet.packet_id !== packetId(packet)) {
    throw new Error("packet ID does not match content");
  }
  if (
    typeof packet.generated_at !== "string" ||
    Number.isNaN(Date.parse(packet.generated_at)) ||
    new Date(packet.generated_at).toISOString() !== packet.generated_at
  ) {
    throw new Error("packet generated_at is invalid");
  }
  if (!/^[0-9a-f]{40}$/.test(packet.source_head)) {
    throw new Error("packet source head is invalid");
  }

  const bindingKeys = Object.keys(packet.source_bindings || {}).sort();
  if (canonicalJson(bindingKeys) !== canonicalJson([...SOURCE_BINDING_PATHS].sort())) {
    throw new Error("packet source binding set mismatch");
  }
  for (const [name, digest] of Object.entries(packet.source_bindings)) {
    if (!/^[0-9a-f]{64}$/.test(String(digest))) {
      throw new Error(`packet source binding hash is invalid: ${name}`);
    }
  }

  const publicIp = normalizePublicIpv4(packet.public_vps_ip);
  const vpsKey = normalizeWireGuardPublicKey(
    packet.keys?.vps_public_key,
    "VPS public key",
  );
  const precisionKey = normalizeWireGuardPublicKey(
    packet.keys?.precision_public_key,
    "Precision public key",
  );
  if (vpsKey === precisionKey) throw new Error("WireGuard public keys must be distinct");

  const vpsPrivate = requireAbsolutePath(
    packet.keys?.vps_private_key_path,
    "VPS private-key path",
  );
  const precisionPrivate = requireAbsolutePath(
    packet.keys?.precision_private_key_path,
    "Precision private-key path",
  );
  if (vpsPrivate === precisionPrivate) {
    throw new Error("VPS and Precision private-key paths must be distinct");
  }
  const socketProxydPath = requireAbsolutePath(
    packet.socket_proxyd_path,
    "systemd-socket-proxyd path",
  );

  const expectedTransport = {
    protocol: "wireguard",
    interface: WIREGUARD_INTERFACE,
    public_udp_port: PUBLIC_UDP_PORT,
    additional_public_tcp_ports: [],
    vps_address: VPS_ADDRESS,
    precision_address: PRECISION_ADDRESS,
    vps_allowed_ip: VPS_ALLOWED_IP,
    precision_allowed_ip: PRECISION_ALLOWED_IP,
    precision_endpoint: `${publicIp}:${PUBLIC_UDP_PORT}`,
    persistent_keepalive_seconds: PERSISTENT_KEEPALIVE_SECONDS,
    ip_forwarding_required: false,
    nat_required: false,
    default_route_installed: false,
  };
  if (canonicalJson(packet.transport) !== canonicalJson(expectedTransport)) {
    throw new Error("packet transport contract mismatch");
  }

  const expectedContinuity = {
    vps_origin: `http://127.0.0.1:${CONTINUITY_PORT}`,
    vps_proxy_listen: `127.0.0.1:${CONTINUITY_PORT}`,
    vps_proxy_target: `10.205.0.2:${CONTINUITY_PORT}`,
    precision_proxy_listen: `10.205.0.2:${CONTINUITY_PORT}`,
    precision_proxy_target: `127.0.0.1:${PRECISION_GATEWAY_PORT}`,
    public_listener: false,
    connections_max: PROXY_CONNECTIONS_MAX,
  };
  if (canonicalJson(packet.continuity) !== canonicalJson(expectedContinuity)) {
    throw new Error("packet continuity contract mismatch");
  }

  const expectedKeys = {
    vps_public_key: vpsKey,
    precision_public_key: precisionKey,
    vps_private_key_path: vpsPrivate,
    precision_private_key_path: precisionPrivate,
    private_keys_embedded: false,
    private_keys_generated: false,
    private_keys_read: false,
  };
  if (canonicalJson(packet.keys) !== canonicalJson(expectedKeys)) {
    throw new Error("packet key boundary mismatch");
  }

  const expectedAuthority = {
    infrastructure_purchase: false,
    credential_generation: false,
    credential_access: false,
    firewall_mutation: false,
    interface_mutation: false,
    service_mutation: false,
    certificate_issuance: false,
    manifest_publication: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
  if (canonicalJson(packet.authority) !== canonicalJson(expectedAuthority)) {
    throw new Error("packet authority contract mismatch");
  }

  const expectedActivation = {
    vps_accessed: false,
    packages_installed: false,
    udp_port_opened: false,
    interfaces_created: false,
    services_started: false,
    continuity_proved: false,
    deployment_performed: false,
  };
  if (canonicalJson(packet.activation) !== canonicalJson(expectedActivation)) {
    throw new Error("packet activation contract mismatch");
  }

  const generatedInput = {
    source_head: packet.source_head,
    source_bindings: packet.source_bindings,
    public_vps_ip: publicIp,
    vps_public_key: vpsKey,
    precision_public_key: precisionKey,
    vps_private_key_path: vpsPrivate,
    precision_private_key_path: precisionPrivate,
    socket_proxyd_path: socketProxydPath,
  };
  const expectedGenerated = generatedPacketFiles(generatedInput);
  if (!Array.isArray(packet.files) || packet.files.length !== expectedGenerated.size) {
    throw new Error("packet generated file count mismatch");
  }

  const records = new Map();
  const contents = new Map();
  const recordFields = ["name", "sha256", "bytes", "mode"].sort();
  for (const record of packet.files) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("packet file record must be one object");
    }
    if (canonicalJson(Object.keys(record).sort()) !== canonicalJson(recordFields)) {
      throw new Error("packet file record field set mismatch");
    }
    if (
      typeof record.name !== "string" ||
      record.name.includes("/") ||
      record.name.includes("\\")
    ) {
      throw new Error("packet file name is invalid");
    }
    if (records.has(record.name)) {
      throw new Error(`packet file record is duplicated: ${record.name}`);
    }
    if (!/^[0-9a-f]{64}$/.test(record.sha256)) {
      throw new Error(`packet file SHA-256 is invalid: ${record.name}`);
    }
    if (!Number.isSafeInteger(record.bytes) || record.bytes < 0) {
      throw new Error(`packet file byte count is invalid: ${record.name}`);
    }
    if (!/^[0-7]{4}$/.test(record.mode)) {
      throw new Error(`packet file mode is invalid: ${record.name}`);
    }

    const target = path.join(root, record.name);
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`packet file is unsafe: ${record.name}`);
    }
    const bytes = fs.readFileSync(target);
    if (sha256(bytes) !== record.sha256 || bytes.length !== record.bytes) {
      throw new Error(`packet file hash or size mismatch: ${record.name}`);
    }
    const actualMode = (stat.mode & 0o777).toString(8).padStart(4, "0");
    if (actualMode !== record.mode) {
      throw new Error(`packet file mode mismatch: ${record.name}`);
    }
    records.set(record.name, record);
    contents.set(record.name, bytes.toString("utf8"));
  }

  const expectedNames = [...expectedGenerated.keys()].sort();
  const actualNames = [...records.keys()].sort();
  if (canonicalJson(actualNames) !== canonicalJson(expectedNames)) {
    throw new Error("packet generated file set mismatch");
  }
  const directoryNames = fs.readdirSync(root).sort();
  if (
    canonicalJson(directoryNames) !==
    canonicalJson(["packet.json", ...expectedNames].sort())
  ) {
    throw new Error("packet directory file set mismatch");
  }

  for (const [name, expected] of expectedGenerated) {
    const record = records.get(name);
    const expectedMode = expected.mode.toString(8).padStart(4, "0");
    if (record.mode !== expectedMode) {
      throw new Error(`generated file mode contract mismatch: ${name}`);
    }
    if (contents.get(name) !== expected.content) {
      throw new Error(`generated content mismatch: ${name}`);
    }
  }

  const combined = [...contents.values()].join("\n");
  for (const forbidden of [
    "PrivateKey=",
    "PresharedKey=",
    "BEGIN PRIVATE KEY",
    "mnemonic",
    "tailscale",
    "cloudflared",
    "0.0.0.0:4199",
    "0.0.0.0:4111",
    "AllowedIPs=0.0.0.0/0",
    "AllowedIPs = 0.0.0.0/0",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
  ]) {
    if (combined.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`packet contains forbidden dependency or authority marker: ${forbidden}`);
    }
  }

  return Object.freeze(packet);
}
