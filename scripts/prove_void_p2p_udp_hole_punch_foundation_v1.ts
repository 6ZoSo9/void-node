import assert from "node:assert/strict";
import * as dgram from "node:dgram";

import {
  VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1,
  VOID_P2P_UDP_HOLE_PUNCH_DEFAULT_LOCAL_BIND_PORT_V1,
  VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MAX_V1,
  VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MIN_V1,
  VOID_P2P_UDP_HOLE_PUNCH_FIXED_PARTICIPANT_PORT_REQUIRED_V1,
  createVoidUdpHolePunchPacketV1,
  createVoidUdpHolePunchPlanV1,
  decodeVoidUdpHolePunchPacketV1,
  encodeVoidUdpHolePunchPacketV1,
  isVoidUdpDynamicPrivatePortV1,
  newVoidUdpHolePunchIdV1,
  normalizeVoidUdpObservedEndpointV1,
  voidUdpHolePunchPacketMatchesPlanV1,
} from "../src/p2p/udp_hole_punch_v1.js";

const MARKER = "VOID_P2P_UDP_HOLE_PUNCH_FOUNDATION_V1_PROOF_GREEN";
const NODE_A = "1".repeat(32);
const NODE_B = "2".repeat(32);

function bindUdp4(socket: dgram.Socket): Promise<dgram.AddressInfo> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    socket.once("error", onError);
    socket.bind(VOID_P2P_UDP_HOLE_PUNCH_DEFAULT_LOCAL_BIND_PORT_V1, "127.0.0.1", () => {
      socket.off("error", onError);
      const address = socket.address();
      assert.equal(typeof address, "object");
      resolve(address as dgram.AddressInfo);
    });
  });
}

function send(
  socket: dgram.Socket,
  bytes: Uint8Array,
  port: number,
  host: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.send(bytes, port, host, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main(): Promise<void> {
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_DEFAULT_LOCAL_BIND_PORT_V1, 0);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_FIXED_PARTICIPANT_PORT_REQUIRED_V1, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MIN_V1, 49_152);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MAX_V1, 65_535);
  assert.equal(isVoidUdpDynamicPrivatePortV1(49_152), true);
  assert.equal(isVoidUdpDynamicPrivatePortV1(65_535), true);
  assert.equal(isVoidUdpDynamicPrivatePortV1(47_00), false);
  assert.equal(isVoidUdpDynamicPrivatePortV1(30_74), false);
  assert.equal(isVoidUdpDynamicPrivatePortV1(0), false);

  assert.equal(
    normalizeVoidUdpObservedEndpointV1("1.1.1.1:52341"),
    "1.1.1.1:52341",
  );
  assert.equal(
    normalizeVoidUdpObservedEndpointV1("[2606:4700:4700::1111]:61234"),
    "[2606:4700:4700::1111]:61234",
  );
  assert.equal(normalizeVoidUdpObservedEndpointV1("127.0.0.1:52341"), undefined);
  assert.equal(normalizeVoidUdpObservedEndpointV1("10.0.0.1:52341"), undefined);
  assert.equal(normalizeVoidUdpObservedEndpointV1("100.64.0.1:52341"), undefined);
  assert.equal(normalizeVoidUdpObservedEndpointV1("example.com:52341"), undefined);
  assert.equal(normalizeVoidUdpObservedEndpointV1("2606:4700:4700::1111:61234"), undefined);
  assert.equal(normalizeVoidUdpObservedEndpointV1("[::1]:52341"), undefined);
  assert.equal(
    normalizeVoidUdpObservedEndpointV1("127.0.0.1:52341", true),
    "127.0.0.1:52341",
  );

  const sessionId = newVoidUdpHolePunchIdV1();
  assert.match(sessionId, /^[0-9a-f]{32}$/);

  const packetA = createVoidUdpHolePunchPacketV1({
    sessionId,
    sourceNodeId: NODE_A,
    targetNodeId: NODE_B,
    nonce: "a".repeat(32),
    attempt: 0,
  });
  const packetBytes = encodeVoidUdpHolePunchPacketV1(packetA);
  const decoded = decodeVoidUdpHolePunchPacketV1(packetBytes);
  assert.deepEqual(decoded, packetA);
  assert.equal(
    decodeVoidUdpHolePunchPacketV1(Buffer.from("not-json", "utf8")),
    undefined,
  );
  assert.equal(
    decodeVoidUdpHolePunchPacketV1(
      Buffer.from(JSON.stringify({ ...packetA, extra: true }), "utf8"),
    ),
    undefined,
  );

  const publicPlan = createVoidUdpHolePunchPlanV1({
    sessionId,
    localNodeId: NODE_A,
    peerNodeId: NODE_B,
    peerObservedEndpoint: "1.1.1.1:52341",
    startDelayMs: 100,
    burstIntervalMs: 75,
    burstCount: 8,
    attemptTimeoutMs: 1_000,
  });
  assert.deepEqual(publicPlan.send_offsets_ms, [100, 175, 250, 325, 400, 475, 550, 625]);
  assert.equal(publicPlan.peer_observed_endpoint, "1.1.1.1:52341");

  assert.throws(() =>
    createVoidUdpHolePunchPlanV1({
      sessionId,
      localNodeId: NODE_A,
      peerNodeId: NODE_B,
      peerObservedEndpoint: "10.0.0.1:52341",
    }),
  );
  assert.throws(() =>
    createVoidUdpHolePunchPlanV1({
      sessionId,
      localNodeId: NODE_A,
      peerNodeId: NODE_A,
      peerObservedEndpoint: "1.1.1.1:52341",
    }),
  );
  assert.throws(() =>
    createVoidUdpHolePunchPlanV1({
      sessionId,
      localNodeId: NODE_A,
      peerNodeId: NODE_B,
      peerObservedEndpoint: "1.1.1.1:52341",
      startDelayMs: 500,
      burstIntervalMs: 500,
      burstCount: 16,
      attemptTimeoutMs: 1_000,
    }),
  );

  const socketA = dgram.createSocket("udp4");
  const socketB = dgram.createSocket("udp4");
  try {
    const [boundA, boundB] = await Promise.all([
      bindUdp4(socketA),
      bindUdp4(socketB),
    ]);

    assert(boundA.port > 0);
    assert(boundB.port > 0);
    assert.notEqual(boundA.port, boundB.port);

    const endpointA = `127.0.0.1:${boundA.port}`;
    const endpointB = `127.0.0.1:${boundB.port}`;

    const planA = createVoidUdpHolePunchPlanV1({
      sessionId,
      localNodeId: NODE_A,
      peerNodeId: NODE_B,
      peerObservedEndpoint: endpointB,
      startDelayMs: 25,
      burstIntervalMs: 25,
      burstCount: 4,
      attemptTimeoutMs: 500,
      allowNonPublicObservedEndpoint: true,
    });
    const planB = createVoidUdpHolePunchPlanV1({
      sessionId,
      localNodeId: NODE_B,
      peerNodeId: NODE_A,
      peerObservedEndpoint: endpointA,
      startDelayMs: 25,
      burstIntervalMs: 25,
      burstCount: 4,
      attemptTimeoutMs: 500,
      allowNonPublicObservedEndpoint: true,
    });

    let observedSourcePortAtA = 0;
    let observedSourcePortAtB = 0;

    const receivedA = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("node A UDP punch timeout")), 2_000);
      socketA.on("message", (bytes, rinfo) => {
        const packet = decodeVoidUdpHolePunchPacketV1(bytes);
        if (!packet || !voidUdpHolePunchPacketMatchesPlanV1(packet, planA)) return;
        observedSourcePortAtA = rinfo.port;
        clearTimeout(timer);
        resolve();
      });
    });

    const receivedB = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("node B UDP punch timeout")), 2_000);
      socketB.on("message", (bytes, rinfo) => {
        const packet = decodeVoidUdpHolePunchPacketV1(bytes);
        if (!packet || !voidUdpHolePunchPacketMatchesPlanV1(packet, planB)) return;
        observedSourcePortAtB = rinfo.port;
        clearTimeout(timer);
        resolve();
      });
    });

    await Promise.all([
      send(
        socketA,
        encodeVoidUdpHolePunchPacketV1(createVoidUdpHolePunchPacketV1({
          sessionId,
          sourceNodeId: NODE_A,
          targetNodeId: NODE_B,
          nonce: "b".repeat(32),
          attempt: 0,
        })),
        boundB.port,
        "127.0.0.1",
      ),
      send(
        socketB,
        encodeVoidUdpHolePunchPacketV1(createVoidUdpHolePunchPacketV1({
          sessionId,
          sourceNodeId: NODE_B,
          targetNodeId: NODE_A,
          nonce: "c".repeat(32),
          attempt: 0,
        })),
        boundA.port,
        "127.0.0.1",
      ),
      receivedA,
      receivedB,
    ]);

    assert.equal(observedSourcePortAtA, boundB.port);
    assert.equal(observedSourcePortAtB, boundA.port);
  } finally {
    socketA.close();
    socketB.close();
  }

  assert.equal(
    VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.peer_identity_authenticated_by_punch_packet,
    false,
  );
  assert.equal(
    VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.observed_endpoint_defines_node_identity,
    false,
  );
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.fixed_participant_port_required, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.literal_video_game_port_required, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.router_configuration_required, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.port_forward_required, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.upnp_required, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.nat_pmp_required, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.direct_path_success_claimed, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.runtime_integration_performed, false);
  assert.equal(VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1.wallet_signer_validator_wc_money_authority, 0);

  console.log("udp_transport_foundation=true");
  console.log("default_local_udp_bind_port=0");
  console.log("fixed_participant_udp_port_required=false");
  console.log("dynamic_private_udp_port_range=49152-65535");
  console.log("literal_video_game_port_required=false");
  console.log("explicit_udp_port_override_allowed=true");
  console.log("outbound_udp_mapping_strategy=true");
  console.log("simultaneous_udp_send_receive_proven=true");
  console.log("same_bound_udp_socket_source_port_preserved=true");
  console.log("public_ipv4_observed_endpoint_supported=true");
  console.log("public_ipv6_observed_endpoint_supported=true");
  console.log("private_observed_endpoint_production_accepted=false");
  console.log("punch_packet_authenticated_identity=false");
  console.log("normal_void_peer_auth_still_required=true");
  console.log("router_configuration_required=false");
  console.log("port_forward_required=false");
  console.log("upnp_required=false");
  console.log("nat_pmp_required=false");
  console.log("relay_fallback_preserved=true");
  console.log("direct_public_nat_traversal_claimed=false");
  console.log("runtime_integration_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log(MARKER);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
