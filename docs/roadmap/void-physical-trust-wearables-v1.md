# VOID Physical Trust Wearables v1 — Long-Horizon Roadmap

status: long_horizon_concept
implementation_priority: deferred
runtime_authority: none

## Purpose

VOID should eventually extend cryptographic network identity into the physical world through voluntary wearable trust devices, initially envisioned as VOID headbands. The goal is to let VOID-aware physical systems recognize an authorized participant quickly and grant bounded privileges without turning the wearable into a surveillance device.

This is a long-horizon direction only. It does not authorize present hardware development, deployment, physical access changes, robot/drone behavior, credential issuance, or runtime mutation.

## Core outcome

A VOID headband should be able to prove that its wearer holds a valid VOID physical credential class to compatible real-world systems such as doors, terminals, equipment, robots, drones, vehicles, and event/facility access controls.

Recognition should answer only the question required for the interaction, for example:

- is this wearer authorized to enter this VOID-controlled space;
- is this wearer a protected validator;
- is this wearer an authorized operator;
- does this wearer hold the constitutional/Sovereign credential class;
- is this device permitted to grant the requested bounded privilege.

The system should avoid exposing legal identity, location history, or a permanent trackable identifier when those facts are not necessary.

## Credential hierarchy

The long-term design should support cryptographically distinct privilege classes rather than one universal credential.

At minimum:

- **Sovereign / constitutional authority** — highest VOID physical trust class, bound to the network's constitutional authority and protected with the strongest hardware and challenge requirements;
- **validator** — protected validator credential class for validator-only facilities, systems, equipment, and network functions;
- **operator** — bounded operational access where required;
- **participant / member** — lower-privilege admission and ecosystem access;
- future narrowly scoped capability credentials as needed.

Higher classes may inherit selected lower-class privileges, but systems should apply least privilege and should never infer unrelated authority merely from membership in the VOID ecosystem.

## Non-surveillance requirements

Physical recognition must not become a default tracking system.

The design direction is:

- no continuous location reporting by default;
- no permanent public radio identifier that allows passive tracking;
- rotating or unlinkable identifiers where technically practical;
- cryptographic challenge/response instead of trusting a visible badge or static identifier;
- disclose only the minimum credential claim required by the requesting system;
- no requirement to expose a wearer's legal identity for ordinary privilege checks;
- no central location-history database as a prerequisite for authentication;
- immediate credential revocation and replacement for lost, stolen, or compromised hardware;
- auditable authorization decisions without unnecessarily retaining a person's movement history.

The wearable should prove authorization, not function as a surveillance beacon.

## Hardware direction

A future implementation should investigate:

- tamper-resistant secure elements for private-key custody;
- hardware-backed non-exportable credential keys;
- NFC for deliberate close-range access;
- BLE and/or UWB for rapid nearby recognition where privacy controls remain enforceable;
- local user-presence or stronger challenge requirements for high-authority actions;
- revocable and renewable credentials;
- offline-verifiable bounded credentials where useful;
- durable, repairable construction appropriate for daily wear.

The physical device should fail closed if its trust material cannot be validated.

## VOID visual signature

The canonical headband concept should emit a **faint, diffuse white light** while active.

The light should be:

- clearly visible to nearby observers under ordinary conditions;
- low-intensity and non-blinding;
- aesthetically integrated into the headband rather than functioning like a flashlight;
- visually recognizable as part of the VOID physical identity language;
- treated only as a human-visible design/status characteristic, never as cryptographic proof of authority.

A forged white light must provide zero machine privilege without a valid cryptographic credential.

## Machine recognition

VOID-aware robots, drones, doors, terminals, and other physical systems may eventually recognize these credentials and adapt behavior according to an explicit authorization policy.

Machine recognition should:

- authenticate the wearable cryptographically before granting privilege;
- distinguish credential classes and bounded capabilities;
- avoid facial recognition when the wearable credential is sufficient;
- avoid persistent tracking merely because a credential was observed;
- reject revoked, expired, malformed, replayed, or unauthorized credentials;
- record security-relevant authorization decisions without building unnecessary movement histories;
- require additional safeguards before any safety-critical or high-consequence physical action.

Possession of a VOID credential must never silently expand a machine's authority beyond the action explicitly permitted by policy.

## Examples of eventual privileges

Potential uses include:

- admission to VOID-controlled facilities or events;
- validator-only rooms and infrastructure areas;
- access to authorized terminals and equipment;
- recognition by VOID-compatible robots or drones;
- expedited ecosystem services available to credentialed participants;
- protected operator or Sovereign control surfaces;
- future physical/digital experiences that distinguish authenticated VOID roles.

These are roadmap examples, not present entitlements or deployment commitments.

## Security principles

Any implementation should preserve:

1. voluntary use;
2. no default surveillance;
3. no location tracking as an authentication requirement;
4. strong protection for Sovereign and validator credentials;
5. cryptographic proof over visual appearance;
6. revocation and recovery;
7. least privilege;
8. replay resistance;
9. privacy-preserving machine recognition;
10. auditable but data-minimized authorization.

## Roadmap placement

This belongs in VOID's long-term physical-world integration direction, after the network's core connectivity, purchasing/fulfillment, validator protection, agent connectivity, and operating infrastructure are mature enough to justify dedicated hardware work.

No current critical-path work should be delayed for this concept.
