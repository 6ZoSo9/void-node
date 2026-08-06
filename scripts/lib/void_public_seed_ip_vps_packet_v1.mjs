import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export const SCHEMA = "void_public_seed_ip_vps_packet_v1";
export const NETWORK = "VOID Network";
export const CHAIN_ID = 2050;
export const REQUIRED_CERTBOT_MAJOR = 5;
export const REQUIRED_CERTBOT_MINOR = 4;

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
  ["192.88.99.0", 24],
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
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
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

export function isPublicIpv4(value) {
  return net.isIP(value) === 4 && !NON_PUBLIC_V4.check(value, "ipv4");
}

export function normalizePublicIpv4(value) {
  const address = String(value || "").trim();
  if (!isPublicIpv4(address)) {
    throw new Error("public seed VPS address must be one globally routable IPv4 literal");
  }
  return address;
}

export function requireAbsolutePath(value, label) {
  const candidate = String(value || "");
  if (!candidate || !path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) {
    throw new Error(`${label} must be one normalized absolute path`);
  }
  if (candidate.includes("\n") || candidate.includes("\r") || candidate.includes("\0")) {
    throw new Error(`${label} contains control characters`);
  }
  return candidate;
}

export function requireServiceUser(value) {
  const user = String(value || "");
  if (!/^[a-z_][a-z0-9_-]{0,30}$/.test(user)) {
    throw new Error("service user is invalid");
  }
  return user;
}

function pathContains(parentPath, childPath) {
  const relative = path.relative(parentPath, childPath);
  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    )
  );
}

function assertRuntimeWritablePathDisjoint(targetRepoRoot, dataParent) {
  if (
    pathContains(targetRepoRoot, dataParent) ||
    pathContains(dataParent, targetRepoRoot)
  ) {
    throw new Error("runtime writable data parent must not overlap target repository root");
  }
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

export function inspectExactSource(repoRoot, expectedHead) {
  const root = fs.realpathSync(requireAbsolutePath(repoRoot, "repository root"));
  if (!fs.statSync(root).isDirectory()) throw new Error("repository root is not a directory");
  if (!/^[0-9a-f]{40}$/.test(expectedHead)) throw new Error("expected head must be 40 lowercase hex characters");
  const actualHead = git(root, ["rev-parse", "HEAD"]);
  if (actualHead !== expectedHead) {
    throw new Error(`repository head mismatch: expected ${expectedHead}, got ${actualHead}`);
  }
  const status = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new Error("repository checkout must be completely clean");

  const gateway = path.join(root, "tools", "void-public-seed-gateway-v1.mjs");
  const gatewayLstat = fs.lstatSync(gateway);
  if (!gatewayLstat.isFile() || gatewayLstat.isSymbolicLink()) {
    throw new Error("restricted gateway source must be one regular non-symlink file");
  }
  return Object.freeze({
    repo_root: root,
    source_head: actualHead,
    gateway_path: gateway,
    gateway_sha256: sha256(fs.readFileSync(gateway)),
  });
}

function renderNodeEnv(input) {
  return [
    `DATA_DIR=${input.data_dir}`,
    `VOID_DATA_DIR=${input.data_dir}`,
    "HTTP_HOST=127.0.0.1",
    "HTTP_PORT=4100",
    "PUBLIC_HTTP_BASE=https://" + input.public_ip,
    "P2P_BIND_HOST=0.0.0.0",
    "VOID_P2P_BIND_HOST=0.0.0.0",
    "P2P_PORT=4700",
    `P2P_ADVERTISE_HOST=${input.public_ip}`,
    `VOID_P2P_ADVERTISE_HOST=${input.public_ip}`,
    "BOOTSTRAP_ADDRS=",
    `NODE_PRIVKEY_PATH=${input.node_identity_path}`,
    "VOID_PUBLIC_BOOTSTRAP_DISABLE=1",
    "",
  ].join("\n");
}

function renderNodeUnit(input) {
  return `[Unit]
Description=VOID public seed full node v1
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${input.service_user}
Group=${input.service_user}
WorkingDirectory=${input.target_repo_root}
EnvironmentFile=/etc/void/public-seed-node-v1.env
ExecStart=${input.node_path} ${input.target_repo_root}/dist/index.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadOnlyPaths=${input.target_repo_root}
ReadWritePaths=${input.data_parent}
LockPersonality=true
RestrictSUIDSGID=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
`;
}

function renderGatewayUnit(input) {
  return `[Unit]
Description=VOID restricted public seed gateway v1
After=void-public-seed-node-v1.service
Requires=void-public-seed-node-v1.service

[Service]
Type=simple
User=${input.service_user}
Group=${input.service_user}
WorkingDirectory=${input.target_repo_root}
Environment=VOID_PUBLIC_SEED_BIND=127.0.0.1
Environment=VOID_PUBLIC_SEED_PORT=4111
Environment=VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100
ExecStart=${input.node_path} ${input.target_repo_root}/tools/void-public-seed-gateway-v1.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
LockPersonality=true
RestrictSUIDSGID=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
`;
}

function renderNginxBootstrap(input) {
  return `server {
    listen ${input.public_ip}:80 default_server;
    server_name ${input.public_ip};

    location ^~ /.well-known/acme-challenge/ {
        root ${input.acme_webroot};
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 404;
    }
}
`;
}

function renderNginxTls(input) {
  return `server {
    listen ${input.public_ip}:80 default_server;
    server_name ${input.public_ip};

    location ^~ /.well-known/acme-challenge/ {
        root ${input.acme_webroot};
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 404;
    }
}

server {
    listen ${input.public_ip}:443 ssl default_server;
    server_name ${input.public_ip};

    ssl_certificate /etc/letsencrypt/live/${input.public_ip}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${input.public_ip}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_tickets off;

    client_max_body_size 0;
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_intercept_errors off;

    location / {
        proxy_pass http://127.0.0.1:4111;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection "";
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For "";
    }
}
`;
}

function renderDeployHook() {
  return `#!/usr/bin/env bash
set -Eeuo pipefail
/usr/sbin/nginx -t
/bin/systemctl reload nginx.service
`;
}

function renderRenewService() {
  return `[Unit]
Description=Renew VOID public seed IP-address TLS certificate

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet
`;
}

function renderRenewTimer() {
  return `[Unit]
Description=Check VOID public seed certificate renewal every six hours

[Timer]
OnBootSec=15min
OnUnitActiveSec=6h
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
`;
}

function renderInstall(input) {
  return `VOID PUBLIC SEED IP VPS PACKET V1

This packet is non-secret and source-bound. Review packet.json and verify every
SHA-256 before using any root command.

Prerequisites:
- Ubuntu 24.04 server with one stable public IPv4: ${input.public_ip}
- at least 2 vCPU, 4 GiB RAM, and 80 GiB storage
- inbound TCP 80, 443, and 4700 only
- exact repository source ${input.source_head} installed at ${input.target_repo_root}
- Node.js 22, 24, or 26 at ${input.node_path}
- nginx
- Certbot 5.4 or newer
- a verified non-wallet VOID node identity generated on the VPS
- an exact validated chain snapshot imported to ${input.data_dir}

Source-bound packet verification before any installation:
node ${input.target_repo_root}/scripts/verify_void_public_seed_ip_vps_packet_v1.mjs PACKET_DIR --repo-root ${input.target_repo_root} --expected-head ${input.source_head}

Required source and data preparation:
1. Create service user ${input.service_user}.
2. Install exact source ${input.source_head} at ${input.target_repo_root}.
3. Run ./run-void-node.sh prepare exactly once as ${input.service_user} before
   service installation. This is an installation-time build step, not a runtime
   entrypoint.
4. Confirm ${input.target_repo_root}/dist/index.js exists and the Git checkout
   still resolves to ${input.source_head} before activation.
5. Import a validated chain snapshot to ${input.data_dir}.
6. Do not import wallet, signer, validator, treasury, Work Credit, Buy VOID,
   payment, or operator authority material.

Runtime immutability contract:
- the node service executes ${input.node_path} ${input.target_repo_root}/dist/index.js directly;
- service start and restart never invoke run-void-node.sh, npm, or a build step;
- ${input.target_repo_root} is explicitly read-only inside the node service;
- only ${input.data_parent} is writable by the node service; and
- source or build changes require an explicit stop, prepare, verify, and restart
  workflow outside the running service.

Generated installation targets:
- void-public-seed-node-v1.env -> /etc/void/public-seed-node-v1.env (0600)
- void-public-seed-node-v1.service -> /etc/systemd/system/
- void-public-seed-gateway-v1.service -> /etc/systemd/system/
- nginx-void-public-seed-bootstrap-v1.conf -> /etc/nginx/sites-enabled/void-public-seed.conf
- certbot-renew-deploy-hook-v1.sh -> /etc/letsencrypt/renewal-hooks/deploy/ (0700)
- void-public-seed-cert-renew-v1.service -> /etc/systemd/system/
- void-public-seed-cert-renew-v1.timer -> /etc/systemd/system/

Certificate staging command:
sudo certbot certonly --staging --preferred-profile shortlived --webroot \\
  --webroot-path ${input.acme_webroot} --ip-address ${input.public_ip} \\
  --email OPERATOR_EMAIL --agree-tos --non-interactive

Production command after staging succeeds:
sudo certbot certonly --preferred-profile shortlived --webroot \\
  --webroot-path ${input.acme_webroot} --ip-address ${input.public_ip} \\
  --email OPERATOR_EMAIL --agree-tos --non-interactive

Certbot currently obtains but does not install IP-address certificates. After
issuance, replace the bootstrap nginx configuration with
nginx-void-public-seed-tls-v1.conf, run nginx -t, and reload nginx.

Activation order:
1. Start and prove the full node on loopback HTTP 4100 and public P2P 4700.
2. Start and prove the restricted gateway on loopback 4111.
3. Start nginx with the HTTP-only bootstrap configuration.
4. Complete staging issuance, then production issuance.
5. Install the TLS nginx configuration and reload nginx.
6. Enable the six-hour renewal timer and deploy hook.
7. Qualify https://${input.public_ip} using the merged IP-literal qualifier.
8. Build a candidate bootstrap manifest from fresh qualification evidence.
9. Publish that manifest only through a separate reviewed GitHub change.
10. Run the outside-machine clone/run acceptance workflow.

Never expose node HTTP 4100 or gateway HTTP 4111 publicly. Never publish a
manifest before live multi-sample qualification succeeds.
`;
}

function fileRecord(name, bytes, mode) {
  return Object.freeze({
    name,
    sha256: sha256(bytes),
    bytes: bytes.length,
    mode,
  });
}

function createPacketBody(input, records) {
  return {
    schema: SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    generated_at: new Date().toISOString(),
    source_head: input.source_head,
    gateway_source_sha256: input.gateway_sha256,
    public_ip: input.public_ip,
    public_https: `https://${input.public_ip}`,
    public_p2p: `${input.public_ip}:4700`,
    service_user: input.service_user,
    target_repo_root: input.target_repo_root,
    data_dir: input.data_dir,
    node_identity_path: input.node_identity_path,
    acme_webroot: input.acme_webroot,
    node_path: input.node_path,
    required_inbound_tcp_ports: [80, 443, 4700],
    forbidden_public_tcp_ports: [4100, 4111],
    certbot: {
      minimum_version: `${REQUIRED_CERTBOT_MAJOR}.${REQUIRED_CERTBOT_MINOR}`,
      certificate_profile: "shortlived",
      challenge: "http-01 via webroot",
      automatic_renewal_required: true,
      install_plugin_assumed: false,
    },
    snapshot: {
      required_before_activation: true,
      wallet_material_allowed: false,
      authority_material_allowed: false,
    },
    files: records,
    authority: {
      private_mutation_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      buy_void_authority: false,
      money_movement_authority: false,
    },
    activation: {
      services_started: false,
      certificate_issued: false,
      manifest_published: false,
      vps_access_performed: false,
    },
  };
}

export function packetId(body) {
  const copy = structuredClone(body);
  delete copy.packet_id;
  return `voidipvsp1_${sha256(canonicalJson(copy))}`;
}

function generatedPacketFiles(input) {
  return new Map([
    ["void-public-seed-node-v1.env", { content: renderNodeEnv(input), mode: 0o600 }],
    ["void-public-seed-node-v1.service", { content: renderNodeUnit(input), mode: 0o600 }],
    ["void-public-seed-gateway-v1.service", { content: renderGatewayUnit(input), mode: 0o600 }],
    ["nginx-void-public-seed-bootstrap-v1.conf", { content: renderNginxBootstrap(input), mode: 0o600 }],
    ["nginx-void-public-seed-tls-v1.conf", { content: renderNginxTls(input), mode: 0o600 }],
    ["certbot-renew-deploy-hook-v1.sh", { content: renderDeployHook(), mode: 0o700 }],
    ["void-public-seed-cert-renew-v1.service", { content: renderRenewService(), mode: 0o600 }],
    ["void-public-seed-cert-renew-v1.timer", { content: renderRenewTimer(), mode: 0o600 }],
    ["INSTALL.txt", { content: renderInstall(input), mode: 0o600 }],
  ]);
}

export function buildPacket({
  publicIp,
  repoRoot,
  expectedHead,
  output,
  serviceUser = "voidseed",
  targetRepoRoot = "/opt/void/void-node",
  dataDir = "/var/lib/void-node/data_a",
  nodeIdentityPath = "/var/lib/void-node/.nodekey",
  acmeWebroot = "/var/lib/void-public-seed/acme",
  nodePath = "/usr/bin/node",
}) {
  const source = inspectExactSource(repoRoot, expectedHead);
  const public_ip = normalizePublicIpv4(publicIp);
  const outputPath = requireAbsolutePath(output, "output directory");
  const outputParent = fs.realpathSync(path.dirname(outputPath));
  const relative = path.relative(source.repo_root, outputPath);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("packet output must remain outside the repository");
  }
  if (fs.existsSync(outputPath)) throw new Error("packet output already exists");

  const input = {
    ...source,
    public_ip,
    service_user: requireServiceUser(serviceUser),
    target_repo_root: requireAbsolutePath(targetRepoRoot, "target repository root"),
    data_dir: requireAbsolutePath(dataDir, "data directory"),
    node_identity_path: requireAbsolutePath(nodeIdentityPath, "node identity path"),
    acme_webroot: requireAbsolutePath(acmeWebroot, "ACME webroot"),
    node_path: requireAbsolutePath(nodePath, "Node.js path"),
  };
  input.data_parent = path.dirname(input.data_dir);
  assertRuntimeWritablePathDisjoint(input.target_repo_root, input.data_parent);

  const generated = generatedPacketFiles(input);

  const temporary = `${outputPath}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.mkdirSync(temporary, { recursive: false, mode: 0o700 });
  try {
    const records = [];
    for (const [name, entry] of generated) {
      const bytes = Buffer.from(entry.content, "utf8");
      fs.writeFileSync(path.join(temporary, name), bytes, {
        flag: "wx",
        mode: entry.mode,
      });
      records.push(fileRecord(name, bytes, entry.mode.toString(8).padStart(4, "0")));
    }
    records.sort((a, b) => a.name.localeCompare(b.name));
    const body = createPacketBody(input, records);
    const packet = { ...body, packet_id: packetId(body) };
    fs.writeFileSync(path.join(temporary, "packet.json"), `${JSON.stringify(packet, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    fs.renameSync(temporary, outputPath);
    return packet;
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

export function verifyPacket(packetDir, { repoRoot, expectedHead } = {}) {
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

  const requiredTopLevelFields = [
    "schema",
    "network",
    "chain_id",
    "generated_at",
    "source_head",
    "gateway_source_sha256",
    "public_ip",
    "public_https",
    "public_p2p",
    "service_user",
    "target_repo_root",
    "data_dir",
    "node_identity_path",
    "acme_webroot",
    "node_path",
    "required_inbound_tcp_ports",
    "forbidden_public_tcp_ports",
    "certbot",
    "snapshot",
    "files",
    "authority",
    "activation",
    "packet_id",
  ].sort();
  if (
    canonicalJson(Object.keys(packet).sort()) !==
    canonicalJson(requiredTopLevelFields)
  ) {
    throw new Error("packet top-level field set mismatch");
  }

  if (packet.schema !== SCHEMA || packet.network !== NETWORK || Number(packet.chain_id) !== CHAIN_ID) {
    throw new Error("packet schema or network mismatch");
  }
  if (packet.packet_id !== packetId(packet)) throw new Error("packet ID does not match content");
  normalizePublicIpv4(packet.public_ip);
  if (!/^[0-9a-f]{40}$/.test(packet.source_head)) throw new Error("packet source head is invalid");
  if (!/^[0-9a-f]{64}$/.test(packet.gateway_source_sha256)) {
    throw new Error("gateway source SHA-256 is invalid");
  }
  if (
    typeof packet.generated_at !== "string" ||
    Number.isNaN(Date.parse(packet.generated_at)) ||
    new Date(packet.generated_at).toISOString() !== packet.generated_at
  ) {
    throw new Error("packet generated_at is invalid");
  }

  if (!repoRoot) throw new Error("source repository root is required");
  if (!expectedHead) throw new Error("expected source head is required");
  const source = inspectExactSource(repoRoot, String(expectedHead));
  if (packet.source_head !== source.source_head) {
    throw new Error("packet source head does not match verified source checkout");
  }
  if (packet.gateway_source_sha256 !== source.gateway_sha256) {
    throw new Error("packet gateway source SHA-256 does not match verified source checkout");
  }

  const metadataInput = {
    source_head: packet.source_head,
    public_ip: packet.public_ip,
    service_user: requireServiceUser(packet.service_user),
    target_repo_root: requireAbsolutePath(packet.target_repo_root, "target repository root"),
    data_dir: requireAbsolutePath(packet.data_dir, "data directory"),
    node_identity_path: requireAbsolutePath(packet.node_identity_path, "node identity path"),
    acme_webroot: requireAbsolutePath(packet.acme_webroot, "ACME webroot"),
    node_path: requireAbsolutePath(packet.node_path, "Node.js path"),
  };
  metadataInput.data_parent = path.dirname(metadataInput.data_dir);
  assertRuntimeWritablePathDisjoint(
    metadataInput.target_repo_root,
    metadataInput.data_parent,
  );

  if (packet.public_https !== `https://${packet.public_ip}`) throw new Error("public HTTPS binding mismatch");
  if (packet.public_p2p !== `${packet.public_ip}:4700`) throw new Error("public P2P binding mismatch");
  if (canonicalJson(packet.required_inbound_tcp_ports) !== canonicalJson([80, 443, 4700])) {
    throw new Error("required inbound port contract mismatch");
  }
  if (canonicalJson(packet.forbidden_public_tcp_ports) !== canonicalJson([4100, 4111])) {
    throw new Error("forbidden public port contract mismatch");
  }

  const expectedCertbot = {
    minimum_version: `${REQUIRED_CERTBOT_MAJOR}.${REQUIRED_CERTBOT_MINOR}`,
    certificate_profile: "shortlived",
    challenge: "http-01 via webroot",
    automatic_renewal_required: true,
    install_plugin_assumed: false,
  };
  if (canonicalJson(packet.certbot) !== canonicalJson(expectedCertbot)) {
    throw new Error("packet certbot contract mismatch");
  }

  const expectedSnapshot = {
    required_before_activation: true,
    wallet_material_allowed: false,
    authority_material_allowed: false,
  };
  if (canonicalJson(packet.snapshot) !== canonicalJson(expectedSnapshot)) {
    throw new Error("packet snapshot contract mismatch");
  }

  const expectedAuthority = {
    private_mutation_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    buy_void_authority: false,
    money_movement_authority: false,
  };
  if (canonicalJson(packet.authority) !== canonicalJson(expectedAuthority)) {
    throw new Error("packet authority contract mismatch");
  }

  const expectedActivation = {
    services_started: false,
    certificate_issued: false,
    manifest_published: false,
    vps_access_performed: false,
  };
  if (canonicalJson(packet.activation) !== canonicalJson(expectedActivation)) {
    throw new Error("packet activation contract mismatch");
  }

  if (!Array.isArray(packet.files) || packet.files.length !== 9) {
    throw new Error("packet must contain exactly nine generated files");
  }
  const contents = new Map();
  const recordsByName = new Map();
  const requiredRecordFields = ["name", "sha256", "bytes", "mode"].sort();
  for (const record of packet.files) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("packet file record must be one object");
    }
    if (
      canonicalJson(Object.keys(record).sort()) !==
      canonicalJson(requiredRecordFields)
    ) {
      throw new Error("packet file record field set mismatch");
    }
    if (typeof record.name !== "string" || record.name.includes("/") || record.name.includes("\\")) {
      throw new Error("packet file name is invalid");
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
    if (recordsByName.has(record.name)) {
      throw new Error(`packet file record is duplicated: ${record.name}`);
    }
    recordsByName.set(record.name, record);
    const target = path.join(root, record.name);
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`packet file is unsafe: ${record.name}`);
    const bytes = fs.readFileSync(target);
    if (sha256(bytes) !== record.sha256 || bytes.length !== Number(record.bytes)) {
      throw new Error(`packet file hash or size mismatch: ${record.name}`);
    }
    const actualMode = (stat.mode & 0o777).toString(8).padStart(4, "0");
    if (actualMode !== record.mode) throw new Error(`packet file mode mismatch: ${record.name}`);
    contents.set(record.name, bytes.toString("utf8"));
  }

  const requiredNames = [
    "INSTALL.txt",
    "certbot-renew-deploy-hook-v1.sh",
    "nginx-void-public-seed-bootstrap-v1.conf",
    "nginx-void-public-seed-tls-v1.conf",
    "void-public-seed-cert-renew-v1.service",
    "void-public-seed-cert-renew-v1.timer",
    "void-public-seed-gateway-v1.service",
    "void-public-seed-node-v1.env",
    "void-public-seed-node-v1.service",
  ].sort();
  const actualNames = [...contents.keys()].sort();
  if (canonicalJson(actualNames) !== canonicalJson(requiredNames)) {
    throw new Error("packet file set mismatch");
  }

  const expectedDirectoryNames = ["packet.json", ...requiredNames].sort();
  const actualDirectoryNames = fs.readdirSync(root).sort();
  if (
    canonicalJson(actualDirectoryNames) !==
    canonicalJson(expectedDirectoryNames)
  ) {
    throw new Error("packet directory file set mismatch");
  }

  const expectedGenerated = generatedPacketFiles(metadataInput);
  for (const [name, expected] of expectedGenerated) {
    const record = recordsByName.get(name);
    const expectedMode = expected.mode.toString(8).padStart(4, "0");
    if (record.mode !== expectedMode) {
      throw new Error(`packet generated file mode contract mismatch: ${name}`);
    }
    if (contents.get(name) !== expected.content) {
      throw new Error(`packet generated content mismatch: ${name}`);
    }
  }

  const combined = [...contents.values()].join("\n");
  for (const forbidden of [
    "voidchain.io",
    "nullfeed.io",
    "trycloudflare.com",
    "cloudflared",
    "tailscale",
    "100.64.",
    "BEGIN PRIVATE KEY",
    "mnemonic",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
  ]) {
    if (combined.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`packet contains forbidden dependency or authority marker: ${forbidden}`);
    }
  }

  const env = contents.get("void-public-seed-node-v1.env");
  for (const marker of [
    "HTTP_HOST=127.0.0.1",
    "P2P_BIND_HOST=0.0.0.0",
    `P2P_ADVERTISE_HOST=${packet.public_ip}`,
    `PUBLIC_HTTP_BASE=https://${packet.public_ip}`,
    "VOID_PUBLIC_BOOTSTRAP_DISABLE=1",
  ]) {
    if (!env.includes(marker)) throw new Error(`node environment marker missing: ${marker}`);
  }

  const nodeUnit = contents.get("void-public-seed-node-v1.service");
  const expectedNodeExec =
    `ExecStart=${packet.node_path} ${packet.target_repo_root}/dist/index.js`;
  if (!nodeUnit.includes(expectedNodeExec)) {
    throw new Error("node service does not execute the built runtime directly");
  }
  if (nodeUnit.includes("run-void-node.sh") || nodeUnit.includes("npm ")) {
    throw new Error("node service runtime must not invoke preparation or build tooling");
  }
  if (!nodeUnit.includes(`ReadOnlyPaths=${packet.target_repo_root}`)) {
    throw new Error("node service source checkout is not explicitly read-only");
  }
  const writableLines = nodeUnit
    .split("\n")
    .filter((line) => line.startsWith("ReadWritePaths="));
  const expectedWritableLines = [`ReadWritePaths=${path.dirname(packet.data_dir)}`];
  if (canonicalJson(writableLines) !== canonicalJson(expectedWritableLines)) {
    throw new Error("node service writable-path contract mismatch");
  }

  const tls = contents.get("nginx-void-public-seed-tls-v1.conf");
  if (!tls.includes("proxy_pass http://127.0.0.1:4111")) {
    throw new Error("TLS proxy does not target restricted gateway");
  }
  if (tls.includes("127.0.0.1:4100")) throw new Error("TLS proxy bypasses restricted gateway");
  if (!tls.includes(`/etc/letsencrypt/live/${packet.public_ip}/fullchain.pem`)) {
    throw new Error("TLS certificate path mismatch");
  }

  const install = contents.get("INSTALL.txt");
  for (const marker of [
    "--preferred-profile shortlived",
    `--ip-address ${packet.public_ip}`,
    "Certbot 5.4 or newer",
    "Never expose node HTTP 4100 or gateway HTTP 4111 publicly",
  ]) {
    if (!install.includes(marker)) throw new Error(`installation marker missing: ${marker}`);
  }

  return Object.freeze(packet);
}
