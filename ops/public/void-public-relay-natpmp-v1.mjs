#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import dgram from "node:dgram";
import net from "node:net";
import process from "node:process";

const MARKER = "VOID_PUBLIC_RELAY_NATPMP_LEASE_V1";
const EXPECTED_WAN = process.env.VOID_PUBLIC_RELAY_EXPECTED_WAN_IPV4 || "";
const EXPECTED_GATEWAY = process.env.VOID_PUBLIC_RELAY_EXPECTED_GATEWAY || "";
const EXPECTED_IFACE = process.env.VOID_PUBLIC_RELAY_EXPECTED_IFACE || "";
const TCP_PORT = Number(process.env.VOID_PUBLIC_RELAY_TCP_PORT || "4700");
const UDP_PORT = Number(process.env.VOID_PUBLIC_RELAY_UDP_PORT || "4711");
const LIFETIME = Number(process.env.VOID_PUBLIC_RELAY_NATPMP_LIFETIME_SECONDS || "600");
const RENEW = Number(process.env.VOID_PUBLIC_RELAY_NATPMP_RENEW_SECONDS || "240");

function fail(message) {
  throw new Error(`${MARKER}: ${message}`);
}

function parsePositiveInt(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${label} is outside ${min}..${max}`);
  }
  return value;
}

parsePositiveInt(TCP_PORT, "TCP port", 1, 65535);
parsePositiveInt(UDP_PORT, "UDP port", 1, 65535);
parsePositiveInt(LIFETIME, "NAT-PMP lease seconds", 120, 3600);
parsePositiveInt(RENEW, "NAT-PMP renewal seconds", 30, LIFETIME - 30);
if (TCP_PORT === UDP_PORT) fail("TCP and UDP ports must differ");
if (net.isIP(EXPECTED_WAN) !== 4) fail("expected WAN IPv4 is invalid");
if (net.isIP(EXPECTED_GATEWAY) !== 4) fail("expected gateway IPv4 is invalid");
if (!/^[A-Za-z0-9_.:-]{1,32}$/.test(EXPECTED_IFACE)) fail("expected interface is invalid");

function currentRoute() {
  const line = execFileSync("ip", ["-4", "route", "show", "default"], {
    encoding: "utf8",
    timeout: 3000,
  }).split("\n").map((x) => x.trim()).find(Boolean) || "";
  const tokens = line.split(/\s+/);
  const at = (name) => {
    const i = tokens.indexOf(name);
    return i >= 0 && i + 1 < tokens.length ? tokens[i + 1] : "";
  };
  const gateway = at("via");
  const iface = at("dev");
  const source = at("src");
  if (gateway !== EXPECTED_GATEWAY) {
    fail(`default gateway changed: ${gateway || "(none)"}`);
  }
  if (iface !== EXPECTED_IFACE) {
    fail(`default interface changed: ${iface || "(none)"}`);
  }
  if (net.isIP(source) !== 4) {
    fail(`default-route source IPv4 is unavailable: ${source || "(none)"}`);
  }
  return { gateway, iface, source };
}

function requestNatPmp({ opcode, internalPort = 0, externalPort = 0, lifetime = 0, source }) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    let timer;
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      try { socket.close(); } catch {}
      fn(value);
    };

    socket.once("error", (error) => finish(reject, error));
    socket.bind(0, source, () => {
      const payload = opcode === 0 ? Buffer.from([0, 0]) : Buffer.alloc(12);
      if (opcode !== 0) {
        payload[0] = 0;
        payload[1] = opcode;
        payload.writeUInt16BE(0, 2);
        payload.writeUInt16BE(internalPort, 4);
        payload.writeUInt16BE(externalPort, 6);
        payload.writeUInt32BE(lifetime >>> 0, 8);
      }

      socket.on("message", (msg, rinfo) => {
        if (rinfo.address !== EXPECTED_GATEWAY) return;
        if (opcode === 0) {
          if (msg.length < 12 || msg[0] !== 0 || msg[1] !== 128) return;
          const resultCode = msg.readUInt16BE(2);
          if (resultCode !== 0) return finish(reject, new Error(`external-address result=${resultCode}`));
          const ip = [...msg.subarray(8, 12)].join(".");
          return finish(resolve, { ip });
        }
        if (msg.length < 16 || msg[0] !== 0 || msg[1] !== 128 + opcode) return;
        const resultCode = msg.readUInt16BE(2);
        if (resultCode !== 0) return finish(reject, new Error(`mapping result=${resultCode}`));
        return finish(resolve, {
          internalPort: msg.readUInt16BE(8),
          externalPort: msg.readUInt16BE(10),
          lifetime: msg.readUInt32BE(12),
        });
      });

      timer = setTimeout(
        () => finish(reject, new Error(`NAT-PMP opcode ${opcode} timed out`)),
        3000,
      );
      socket.send(payload, 5351, EXPECTED_GATEWAY, (error) => {
        if (error) finish(reject, error);
      });
    });
  });
}

async function verifyWan(source) {
  const result = await requestNatPmp({ opcode: 0, source });
  if (result.ip !== EXPECTED_WAN) {
    fail(`gateway WAN IPv4 changed: ${result.ip}`);
  }
  return result.ip;
}

async function mapOne(opcode, port, lifetime, source) {
  const result = await requestNatPmp({
    opcode,
    internalPort: port,
    externalPort: lifetime === 0 ? 0 : port,
    lifetime,
    source,
  });
  if (result.internalPort !== port) fail(`mapping internal port mismatch for ${port}`);
  if (lifetime > 0) {
    if (result.externalPort !== port) fail(`mapping external port mismatch for ${port}: ${result.externalPort}`);
    if (result.lifetime <= 0) fail(`mapping lease not granted for ${port}`);
  }
  return result;
}

async function renew() {
  const route = currentRoute();
  const wan = await verifyWan(route.source);
  const tcp = await mapOne(2, TCP_PORT, LIFETIME, route.source);
  const udp = await mapOne(1, UDP_PORT, LIFETIME, route.source);
  console.log(`${MARKER}_RENEW_GREEN`);
  console.log(`wan_ipv4=${wan}`);
  console.log(`local_ipv4=${route.source}`);
  console.log(`tcp_mapping=${TCP_PORT}->${tcp.externalPort} lifetime=${tcp.lifetime}`);
  console.log(`udp_mapping=${UDP_PORT}->${udp.externalPort} lifetime=${udp.lifetime}`);
}

async function remove() {
  let route;
  try {
    route = currentRoute();
  } catch (error) {
    console.error(`${MARKER}_DELETE_ROUTE_HOLD`, error instanceof Error ? error.message : String(error));
    return;
  }
  for (const [opcode, port, label] of [[2, TCP_PORT, "tcp"], [1, UDP_PORT, "udp"]]) {
    try {
      await mapOne(opcode, port, 0, route.source);
      console.log(`${label}_mapping_deleted=true`);
    } catch (error) {
      console.error(`${label}_mapping_delete_error=${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const mode = process.argv[2] || "--serve";
if (mode === "--probe") {
  const route = currentRoute();
  const wan = await verifyWan(route.source);
  console.log(`${MARKER}_PROBE_GREEN`);
  console.log(`wan_ipv4=${wan}`);
  console.log(`gateway=${route.gateway}`);
  console.log(`interface=${route.iface}`);
  console.log(`local_ipv4=${route.source}`);
  process.exit(0);
}
if (mode !== "--serve") fail(`unknown mode: ${mode}`);

let stopping = false;
const stop = async (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`${MARKER}_STOP signal=${signal}`);
  await remove();
  process.exit(0);
};
process.on("SIGTERM", () => void stop("SIGTERM"));
process.on("SIGINT", () => void stop("SIGINT"));

console.log(MARKER);
console.log("router_mutation=bounded_nat_pmp_lease_only");
console.log("wallet_signer_validator_wc_money_authority=0");
console.log(`renew_seconds=${RENEW}`);
console.log(`lease_seconds=${LIFETIME}`);

while (!stopping) {
  try {
    await renew();
  } catch (error) {
    console.error(`${MARKER}_RENEW_HOLD`, error instanceof Error ? error.message : String(error));
  }
  await new Promise((resolve) => setTimeout(resolve, RENEW * 1000));
}
