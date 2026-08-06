#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import {
  normalizePublicSeedBase,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_RAW_IP_TLS_PACKET_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}
function exec(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stderr || result.stdout || result.status}`,
    );
  }
  return String(result.stdout || "").trim();
}
function sha256File(target) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(target));
  return hash.digest("hex");
}
function assertRegularFile(target, label) {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  return fs.realpathSync(target);
}
function assertRegularExecutable(target, label) {
  const real = assertRegularFile(target, label);
  if ((fs.lstatSync(real).mode & 0o111) === 0) {
    throw new Error(`${label} must be executable`);
  }
  return real;
}
function assertSystemdSafePath(target, label) {
  if (/[\s"\\]/.test(target)) {
    throw new Error(`${label} path contains unsupported systemd whitespace or quoting`);
  }
  if (
    target === "/root" ||
    target.startsWith("/root/") ||
    target.startsWith("/home/") ||
    target.startsWith("/run/user/")
  ) {
    throw new Error(`${label} must remain outside ProtectHome paths`);
  }
  return target;
}
function within(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function writeFile(target, content, mode = 0o600) {
  fs.writeFileSync(target, content, { encoding: "utf8", flag: "wx", mode });
  fs.chmodSync(target, mode);
}
function parseArgs(argv) {
  const values = {
    publicIp: "",
    repoRoot: process.cwd(),
    expectedHead: "",
    nodeBin: process.execPath,
    certbot: "",
    sshPort: 22,
    output: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--public-ip") values.publicIp = next();
    else if (argument === "--repo-root") values.repoRoot = next();
    else if (argument === "--expected-head") values.expectedHead = next();
    else if (argument === "--node") values.nodeBin = next();
    else if (argument === "--certbot") values.certbot = next();
    else if (argument === "--ssh-port") values.sshPort = Number(next());
    else if (argument === "--output") values.output = next();
    else fail(`unknown argument ${argument}`);
  }
  return values;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (net.isIP(options.publicIp) !== 4) throw new Error("--public-ip must be one IPv4 literal");
  const normalized = normalizePublicSeedBase(`https://${options.publicIp}`);
  if (normalized.address_source !== "ip_literal") {
    throw new Error("parent qualifier did not select IP-literal mode");
  }
  if (!/^[0-9a-f]{40}$/.test(options.expectedHead)) {
    throw new Error("--expected-head must be a 40-character lowercase SHA");
  }
  if (!Number.isInteger(options.sshPort) || options.sshPort < 1 || options.sshPort > 65535) {
    throw new Error("--ssh-port is invalid");
  }

  const repoRoot = fs.realpathSync(options.repoRoot);
  const output = path.resolve(options.output);
  if (!options.output) throw new Error("--output is required");
  if (within(output, repoRoot)) throw new Error("packet output must remain outside repository");
  if (fs.existsSync(output)) throw new Error("packet output already exists");

  const observedHead = exec("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
  if (observedHead !== options.expectedHead) throw new Error("repository head mismatch");
  if (exec("git", ["status", "--porcelain=v1"], { cwd: repoRoot }) !== "") {
    throw new Error("repository must be completely clean");
  }

  const nodeBin = assertSystemdSafePath(
    assertRegularExecutable(options.nodeBin, "Node.js"),
    "Node.js",
  );
  const nodeMajor = Number(exec(nodeBin, ["-p", "process.versions.node.split('.')[0]"]));
  if (![22, 24, 26].includes(nodeMajor)) {
    throw new Error(`Node.js 22, 24, or 26 required; found ${nodeMajor}`);
  }

  const certbot = assertSystemdSafePath(
    assertRegularExecutable(options.certbot, "Certbot"),
    "Certbot",
  );
  const certbotVersionText = exec(certbot, ["--version"]);
  const certbotMatch = certbotVersionText.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!certbotMatch) throw new Error("could not parse Certbot version");
  const certbotVersion = certbotMatch.slice(1, 4).map((value) => Number(value || 0));
  if (
    certbotVersion[0] < 5 ||
    (certbotVersion[0] === 5 && certbotVersion[1] < 4)
  ) {
    throw new Error("Certbot 5.4 or newer is required for IP webroot issuance");
  }

  const proxySource = assertRegularExecutable(
    path.join(repoRoot, "tools/void-public-seed-ip-tls-proxy-v1.mjs"),
    "IP TLS proxy source",
  );
  const gatewaySource = assertRegularFile(
    path.join(repoRoot, "tools/void-public-seed-gateway-v1.mjs"),
    "restricted gateway source",
  );
  exec(nodeBin, ["--check", proxySource]);
  exec(nodeBin, ["--check", gatewaySource]);

  fs.mkdirSync(output, { recursive: false, mode: 0o700 });
  const files = new Map();

  const proxyName = "void-public-seed-ip-tls-proxy-v1.mjs";
  fs.copyFileSync(proxySource, path.join(output, proxyName), fs.constants.COPYFILE_EXCL);
  fs.chmodSync(path.join(output, proxyName), 0o755);
  files.set(proxyName, 0o755);

  const gatewayName = "void-public-seed-gateway-v1.mjs";
  fs.copyFileSync(gatewaySource, path.join(output, gatewayName), fs.constants.COPYFILE_EXCL);
  fs.chmodSync(path.join(output, gatewayName), 0o644);
  files.set(gatewayName, 0o644);

  const proxyUnit = `[Unit]
Description=VOID public seed raw-IP ACME and TLS ingress v1
After=network-online.target void-public-seed-gateway-v1.service
Wants=network-online.target
Requires=void-public-seed-gateway-v1.service

[Service]
Type=simple
User=voidseed
Group=voidseed
Environment=VOID_PUBLIC_SEED_PUBLIC_IP=${options.publicIp}
Environment=VOID_PUBLIC_SEED_ACME_ROOT=/var/lib/void-public-seed/acme-webroot
Environment=VOID_PUBLIC_SEED_TLS_CERT_FILE=/var/lib/void-public-seed/tls/current/fullchain.pem
Environment=VOID_PUBLIC_SEED_TLS_KEY_FILE=/var/lib/void-public-seed/tls/current/privkey.pem
Environment=VOID_PUBLIC_SEED_TLS_UPSTREAM=http://127.0.0.1:4111
ExecStart=${nodeBin} /usr/local/libexec/void-public-seed-ip-tls-proxy-v1.mjs
Restart=on-failure
RestartSec=5
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyPaths=/usr/local/libexec
ReadWritePaths=/var/lib/void-public-seed
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
`;
  writeFile(path.join(output, "void-public-seed-ip-tls-proxy-v1.service"), proxyUnit, 0o644);
  files.set("void-public-seed-ip-tls-proxy-v1.service", 0o644);

  const gatewayUnit = `[Unit]
Description=VOID restricted public seed gateway v1
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=voidseed
Group=voidseed
Environment=VOID_PUBLIC_SEED_BIND=127.0.0.1
Environment=VOID_PUBLIC_SEED_PORT=4111
Environment=VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100
ExecStart=${nodeBin} /usr/local/libexec/void-public-seed-gateway-v1.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
`;
  writeFile(path.join(output, "void-public-seed-gateway-v1.service"), gatewayUnit, 0o644);
  files.set("void-public-seed-gateway-v1.service", 0o644);

  const hook = `#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PUBLIC_IP=${JSON.stringify(options.publicIp)}
LINEAGE="/etc/letsencrypt/live/$PUBLIC_IP"
DEST="/var/lib/void-public-seed/tls/current"
test "$(id -u)" = 0
FULLCHAIN_SOURCE="$(readlink -f -- "$LINEAGE/fullchain.pem")"
KEY_SOURCE="$(readlink -f -- "$LINEAGE/privkey.pem")"
for source in "$FULLCHAIN_SOURCE" "$KEY_SOURCE"; do
  test -n "$source" && test -f "$source" && test ! -L "$source"
  case "$source" in
    "/etc/letsencrypt/archive/$PUBLIC_IP/"*) ;;
    *) echo "certificate lineage escaped expected archive" >&2; exit 1 ;;
  esac
  test "$(stat -c '%u' "$source")" = 0
  MODE="$(stat -c '%a' "$source")"
  test $((8#$MODE & 0022)) -eq 0
done
openssl x509 -in "$FULLCHAIN_SOURCE" -noout -checkip "$PUBLIC_IP"
CERT_PUB="$(openssl x509 -in "$FULLCHAIN_SOURCE" -pubkey -noout | sha256sum | awk '{print $1}')"
KEY_PUB="$(openssl pkey -in "$KEY_SOURCE" -pubout | sha256sum | awk '{print $1}')"
test "$CERT_PUB" = "$KEY_PUB"
install -d -o voidseed -g voidseed -m 0700 "$DEST"
install -o voidseed -g voidseed -m 0444 "$FULLCHAIN_SOURCE" "$DEST/.fullchain.pem.new"
install -o voidseed -g voidseed -m 0400 "$KEY_SOURCE" "$DEST/.privkey.pem.new"
mv -f "$DEST/.fullchain.pem.new" "$DEST/fullchain.pem"
mv -f "$DEST/.privkey.pem.new" "$DEST/privkey.pem"
systemctl try-restart void-public-seed-ip-tls-proxy-v1.service
echo VOID_PUBLIC_SEED_IP_CERT_DEPLOY_HOOK_V1_GREEN
`;
  writeFile(path.join(output, "void-public-seed-ip-cert-deploy-hook-v1.sh"), hook, 0o755);
  files.set("void-public-seed-ip-cert-deploy-hook-v1.sh", 0o755);

  const renewService = `[Unit]
Description=Renew VOID public seed IP certificate

[Service]
Type=oneshot
ExecStart=${certbot} renew --quiet --no-random-sleep-on-renew --deploy-hook /usr/local/libexec/void-public-seed-ip-cert-deploy-hook-v1.sh
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=/etc/letsencrypt /var/lib/letsencrypt /var/log/letsencrypt /var/lib/void-public-seed
NoNewPrivileges=true
`;
  writeFile(path.join(output, "void-public-seed-ip-cert-renew-v1.service"), renewService, 0o644);
  files.set("void-public-seed-ip-cert-renew-v1.service", 0o644);

  const renewTimer = `[Unit]
Description=Frequent renewal check for short-lived VOID public seed IP certificate

[Timer]
OnCalendar=*-*-* 00/6:17:00
RandomizedDelaySec=30m
Persistent=true
Unit=void-public-seed-ip-cert-renew-v1.service

[Install]
WantedBy=timers.target
`;
  writeFile(path.join(output, "void-public-seed-ip-cert-renew-v1.timer"), renewTimer, 0o644);
  files.set("void-public-seed-ip-cert-renew-v1.timer", 0o644);

  const firewall = `table inet void_public_seed_v1 {
  chain input {
    type filter hook input priority -5; policy drop;
    ct state established,related accept
    iifname "lo" accept
    tcp dport ${options.sshPort} accept
    tcp dport { 80, 443, 4700 } accept
    tcp dport { 4100, 4111 } drop
    ip protocol icmp accept
    ip6 nexthdr ipv6-icmp accept
  }
  chain output {
    type filter hook output priority -5; policy accept;
  }
}
`;
  writeFile(path.join(output, "nftables-void-public-seed-v1.conf"), firewall, 0o600);
  files.set("nftables-void-public-seed-v1.conf", 0o600);

  const nodeEnv = `# Review before installing as /etc/void-node/seed.env
VOID_DATA_DIR=/var/lib/void-node/data
VOID_HTTP_HOST=127.0.0.1
VOID_HTTP_PORT=4100
VOID_P2P_HOST=0.0.0.0
VOID_P2P_PORT=4700
BOOTSTRAP_ADDRS=
`;
  writeFile(path.join(output, "void-node-seed.env.example"), nodeEnv, 0o600);
  files.set("void-node-seed.env.example", 0o600);

  const installText = `VOID raw-IP VPS TLS ingress packet v1

Public endpoint: https://${options.publicIp}
Exact source: ${options.expectedHead}

Public ports:
  ${options.sshPort}/tcp operator SSH
  80/tcp ACME HTTP-01 challenge only
  443/tcp restricted HTTPS synchronization
  4700/tcp native VOID P2P

Loopback only:
  4100/tcp VOID node HTTP
  4111/tcp restricted public-seed gateway

Installation is explicit and does not issue a certificate automatically.

1. Verify and install without starting:
   sudo VOID_PUBLIC_SEED_INSTALL_CONFIRM=install-raw-ip-tls-ingress-v1 \\
     bash ops/public/install_void_public_seed_raw_ip_tls_packet_v1.sh ${output}

2. Start the HTTP challenge ingress:
   sudo systemctl start void-public-seed-ip-tls-proxy-v1.service

3. Request the first short-lived IP certificate:
   sudo ${certbot} certonly \\
     --preferred-profile shortlived \\
     --webroot \\
     --webroot-path /var/lib/void-public-seed/acme-webroot \\
     --ip-address ${options.publicIp} \\
     --deploy-hook /usr/local/libexec/void-public-seed-ip-cert-deploy-hook-v1.sh

4. Enable renewal only after successful staging and production issuance:
   sudo systemctl enable --now void-public-seed-ip-cert-renew-v1.timer

5. Qualify through the existing manual workflow using:
   endpoint=https://${options.publicIp}
   expected_source_sha=${options.expectedHead}

Do not publish a manifest until qualification and outside-machine acceptance are separately green.
`;
  writeFile(path.join(output, "INSTALL.txt"), installText, 0o600);
  files.set("INSTALL.txt", 0o600);

  const fileRecords = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, mode]) => ({
      name,
      mode: mode.toString(8).padStart(4, "0"),
      sha256: sha256File(path.join(output, name)),
    }));

  const packetBody = {
    schema: "void_public_seed_raw_ip_tls_packet_v1",
    source_sha: options.expectedHead,
    public_ip: options.publicIp,
    endpoint: normalized.base,
    ssh_port: options.sshPort,
    node_bin: nodeBin,
    node_sha256: sha256File(nodeBin),
    node_version: exec(nodeBin, ["--version"]),
    certbot_bin: certbot,
    certbot_sha256: sha256File(certbot),
    certbot_version: certbotVersionText,
    ports: {
      public_tcp: [options.sshPort, 80, 443, 4700],
      loopback_tcp: [4100, 4111],
    },
    files: fileRecords,
    authority: {
      manifest_published: false,
      services_started: false,
      firewall_applied: false,
      credentials_read: false,
      wallet_signer_validator_wc_money_authority: 0,
    },
  };
  const packet = objectWithId("voidpsit1_", packetBody, "packet_id");
  writeFile(path.join(output, "packet.json"), `${JSON.stringify(packet, null, 2)}\n`, 0o600);

  console.log(`${MARKER}_GREEN`);
  console.log(`packet=${output}`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`endpoint=${normalized.base}`);
  console.log("public_tcp=80,443,4700");
  console.log("node_http_loopback_only=true");
  console.log("restricted_gateway_loopback_only=true");
  console.log("manifest_published=false");
  console.log("services_started=false");
  console.log("firewall_applied=false");
  console.log("credentials_read=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} catch (error) {
  fail(error?.stack || String(error));
}
