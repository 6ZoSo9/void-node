import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { objectWithId } from "./void_public_seed_common_v1.mjs";
import {
  PUBLICATION_PACKET_PREFIX,
  assertOutsideRepository,
  fileSha256,
} from "./void_public_bootstrap_manifest_publication_contract_v1.mjs";
import {
  jsonBytes,
  packetWithoutId,
  preparePublicationState,
  reviewText,
  topLevelSums,
  writeExclusive,
} from "./void_public_bootstrap_manifest_publication_state_v1.mjs";

export function buildPublicationPacket({
  repoRoot,
  artifactDir,
  expectedSourceSha,
  expectedPredecessorBlob,
  outputDir,
}) {
  const state = preparePublicationState({
    repoRoot,
    artifactDir,
    expectedSourceSha,
    expectedPredecessorBlob,
  });
  const output = assertOutsideRepository(state.repository.root, outputDir, "packet output");
  if (fs.existsSync(output)) throw new Error("packet output already exists");
  const temporary = `${output}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  if (fs.existsSync(temporary)) throw new Error("packet temporary output already exists");
  fs.mkdirSync(temporary, { recursive: false, mode: 0o700 });

  try {
    const candidateBytes = state.artifact.files["public-bootstrap-v1.json"].bytes;
    const rollbackBytes = jsonBytes(state.rollback);
    const evidence = {
      "evidence/qualification.json": state.artifact.files["qualification.json"].bytes,
      "evidence/public-bootstrap-v1.json": candidateBytes,
      "evidence/source.txt": state.artifact.files["source.txt"].bytes,
      "evidence/SHA256SUMS": state.artifact.sumsBytes,
      "candidate/public/bootstrap/v1.json": candidateBytes,
      "rollback/public/bootstrap/v1.json": rollbackBytes,
    };
    const hashes = Object.fromEntries(
      Object.entries(evidence).map(([name, bytes]) => [name, fileSha256(bytes)]),
    );
    const placeholder = packetWithoutId({
      sourceSha: state.repository.sourceSha,
      predecessor: state.predecessor,
      artifact: state.artifact,
      candidateState: state.candidateState,
      rollback: state.rollback,
      fileHashes: { ...hashes, "REVIEW.txt": "0".repeat(64) },
    });
    const placeholderWithId = objectWithId(
      PUBLICATION_PACKET_PREFIX,
      placeholder,
      "packet_id",
    );
    const reviewBytes = Buffer.from(reviewText(placeholderWithId));
    hashes["REVIEW.txt"] = fileSha256(reviewBytes);
    const packetBody = packetWithoutId({
      sourceSha: state.repository.sourceSha,
      predecessor: state.predecessor,
      artifact: state.artifact,
      candidateState: state.candidateState,
      rollback: state.rollback,
      fileHashes: hashes,
    });
    const packet = objectWithId(PUBLICATION_PACKET_PREFIX, packetBody, "packet_id");
    const finalReviewBytes = Buffer.from(reviewText(packet));
    hashes["REVIEW.txt"] = fileSha256(finalReviewBytes);
    const finalPacket = objectWithId(
      PUBLICATION_PACKET_PREFIX,
      packetWithoutId({
        sourceSha: state.repository.sourceSha,
        predecessor: state.predecessor,
        artifact: state.artifact,
        candidateState: state.candidateState,
        rollback: state.rollback,
        fileHashes: hashes,
      }),
      "packet_id",
    );
    const finalReview = Buffer.from(reviewText(finalPacket));
    if (fileSha256(finalReview) !== hashes["REVIEW.txt"]) {
      throw new Error("review text did not stabilize against packet identity");
    }

    for (const [name, bytes] of Object.entries(evidence)) {
      writeExclusive(path.join(temporary, name), bytes);
    }
    writeExclusive(path.join(temporary, "REVIEW.txt"), finalReview);
    const packetBytes = jsonBytes(finalPacket);
    writeExclusive(path.join(temporary, "packet.json"), packetBytes);
    const allHashes = {
      ...hashes,
      "packet.json": fileSha256(packetBytes),
    };
    writeExclusive(path.join(temporary, "SHA256SUMS"), topLevelSums(allHashes));
    fs.renameSync(temporary, output);
    return Object.freeze({ packet: finalPacket, output });
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}
