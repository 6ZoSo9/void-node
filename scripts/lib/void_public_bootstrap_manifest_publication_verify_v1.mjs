import fs from "node:fs";
import path from "node:path";
import { assertPlainObject, canonicalJson, objectWithId } from "./void_public_seed_common_v1.mjs";
import {
  CANDIDATE_KEYS,
  MAX_JSON_BYTES,
  MAX_TEXT_BYTES,
  PACKET_FILE_PATHS,
  PACKET_KEYS,
  PREDECESSOR_KEYS,
  PUBLICATION_DESTINATION,
  PUBLICATION_PACKET_PREFIX,
  PUBLICATION_PACKET_SCHEMA,
  QUALIFICATION_KEYS,
  ROLLBACK_KEYS,
  assertAuthorityFalse,
  assertCleanExactRepository,
  assertHex,
  assertOutsideRepository,
  exactKeys,
  fileSha256,
  readBytes,
  readJson,
} from "./void_public_bootstrap_manifest_publication_contract_v1.mjs";
import {
  packetWithoutId,
  preparePublicationState,
  reviewText,
} from "./void_public_bootstrap_manifest_publication_state_v1.mjs";

function parseTopLevelSums(bytes) {
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) throw new Error("packet SHA256SUMS must end with newline");
  const entries = new Map();
  for (const line of text.trimEnd().split("\n")) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9._/-]+)$/.exec(line);
    if (!match) throw new Error("packet SHA256SUMS contains a malformed entry");
    const [, sha, name] = match;
    if (name.startsWith("/") || name.includes("..") || entries.has(name)) {
      throw new Error("packet SHA256SUMS contains an unsafe or duplicate path");
    }
    entries.set(name, sha);
  }
  const expected = [...PACKET_FILE_PATHS, "packet.json"].sort();
  if (JSON.stringify([...entries.keys()].sort()) !== JSON.stringify(expected)) {
    throw new Error("packet SHA256SUMS file set is not exact");
  }
  return entries;
}

function validatePacketShape(rawPacket) {
  const packet = exactKeys(structuredClone(rawPacket), PACKET_KEYS, "publication packet");
  if (packet.schema !== PUBLICATION_PACKET_SCHEMA || Number(packet.version) !== 1) {
    throw new Error("publication packet schema or version mismatch");
  }
  if (!/^voidpbp1_[0-9a-f]{64}$/.test(String(packet.packet_id || ""))) {
    throw new Error("publication packet ID is malformed");
  }
  const expectedId = objectWithId(
    PUBLICATION_PACKET_PREFIX,
    packet,
    "packet_id",
  ).packet_id;
  if (packet.packet_id !== expectedId) throw new Error("publication packet ID mismatch");
  assertHex(packet.source_sha, 40, "publication packet source SHA");
  if (packet.destination !== PUBLICATION_DESTINATION) {
    throw new Error("publication packet destination mismatch");
  }
  exactKeys(packet.predecessor, PREDECESSOR_KEYS, "publication predecessor");
  exactKeys(packet.qualification, QUALIFICATION_KEYS, "publication qualification");
  exactKeys(packet.candidate, CANDIDATE_KEYS, "publication candidate");
  exactKeys(packet.rollback, ROLLBACK_KEYS, "publication rollback");
  assertAuthorityFalse(packet.authority, "publication authority");
  if (packet.publication_authorized !== false) {
    throw new Error("publication packet must not authorize publication");
  }
  const files = assertPlainObject(packet.files, "publication packet files");
  if (JSON.stringify(Object.keys(files).sort()) !== JSON.stringify([...PACKET_FILE_PATHS].sort())) {
    throw new Error("publication packet file set is not exact");
  }
  for (const [name, sha] of Object.entries(files)) {
    if (!PACKET_FILE_PATHS.includes(name)) throw new Error(`unexpected packet file ${name}`);
    assertHex(sha, 64, `packet file hash ${name}`);
  }
  return packet;
}

export function verifyPublicationPacket({
  repoRoot,
  packetDir,
  expectedSourceSha,
  expectedPredecessorBlob,
}) {
  const repository = assertCleanExactRepository(repoRoot, expectedSourceSha);
  const packetRoot = fs.realpathSync(String(packetDir));
  assertOutsideRepository(repository.root, packetRoot, "packet directory");
  const packetStat = fs.lstatSync(packetRoot);
  if (!packetStat.isDirectory() || packetStat.isSymbolicLink()) {
    throw new Error("packet directory must be one real directory");
  }

  const topSumsBytes = readBytes(path.join(packetRoot, "SHA256SUMS"), "packet SHA256SUMS", MAX_TEXT_BYTES);
  const topSums = parseTopLevelSums(topSumsBytes);
  for (const [name, expected] of topSums.entries()) {
    const bytes = readBytes(
      path.join(packetRoot, name),
      `packet file ${name}`,
      name.endsWith(".json") ? MAX_JSON_BYTES : MAX_TEXT_BYTES,
    );
    if (fileSha256(bytes) !== expected) throw new Error(`packet checksum mismatch for ${name}`);
  }

  const packetJson = readJson(path.join(packetRoot, "packet.json"), "packet.json");
  const packet = validatePacketShape(packetJson.value);
  for (const [name, expected] of Object.entries(packet.files)) {
    if (topSums.get(name) !== expected) {
      throw new Error(`packet.json and SHA256SUMS disagree for ${name}`);
    }
  }

  const state = preparePublicationState({
    repoRoot: repository.root,
    artifactDir: path.join(packetRoot, "evidence"),
    expectedSourceSha: repository.sourceSha,
    expectedPredecessorBlob,
  });
  const candidateBytes = readBytes(
    path.join(packetRoot, "candidate", PUBLICATION_DESTINATION),
    "packet candidate manifest",
    MAX_JSON_BYTES,
  );
  if (!candidateBytes.equals(state.artifact.files["public-bootstrap-v1.json"].bytes)) {
    throw new Error("packet candidate differs from qualification artifact candidate");
  }
  const rollbackJson = readJson(
    path.join(packetRoot, "rollback", PUBLICATION_DESTINATION),
    "packet rollback manifest",
  );
  if (canonicalJson(rollbackJson.value) !== canonicalJson(state.rollback)) {
    throw new Error("packet rollback manifest is not the deterministic hold successor");
  }

  const expectedPacketBody = packetWithoutId({
    sourceSha: state.repository.sourceSha,
    predecessor: state.predecessor,
    artifact: state.artifact,
    candidateState: state.candidateState,
    rollback: state.rollback,
    fileHashes: packet.files,
  });
  const expectedPacket = objectWithId(
    PUBLICATION_PACKET_PREFIX,
    expectedPacketBody,
    "packet_id",
  );
  if (canonicalJson(packet) !== canonicalJson(expectedPacket)) {
    throw new Error("packet metadata does not match current exact source and evidence");
  }
  const expectedReview = Buffer.from(reviewText(packet));
  const review = readBytes(path.join(packetRoot, "REVIEW.txt"), "packet review text", MAX_TEXT_BYTES);
  if (!review.equals(expectedReview)) throw new Error("packet review text mismatch");

  return Object.freeze({ packet, state });
}
