/**
 * @file walkthroughTimeline.ts
 * @description Pure deterministic timeline specification and playback math for the
 * interactive full-workflow animated walkthrough player.
 */

export type WalkthroughTargetTab =
  | 'wallet'
  | 'issuer'
  | 'verifier'
  | 'blockchain'
  | 'audit';

export interface WalkthroughSceneSpec {
  id: string;
  index: number;
  stepNumber: string;
  title: string;
  actor: string;
  caption: string;
  startMs: number;
  endMs: number;
  targetTab: WalkthroughTargetTab;
  targetLabel: string;
  packetLabel: string;
}

export const SCENE_DURATION_MS = 6000;

export const WALKTHROUGH_SCENES: WalkthroughSceneSpec[] = [
  {
    id: 'scene-did',
    index: 0,
    stepNumber: '01',
    title: 'Student Creates Local DID',
    actor: 'Student Wallet · Local Device',
    caption:
      'Student generates an asymmetric keypair locally. Only the 32-byte public key hash anchors on Ethereum Sepolia—zero personal data leaves the device.',
    startMs: 0,
    endMs: 6000,
    targetTab: 'wallet',
    targetLabel: 'Try in Student Wallet',
    packetLabel: 'SHA-256(publicKey) -> Sepolia',
  },
  {
    id: 'scene-issue',
    index: 1,
    stepNumber: '02',
    title: 'University Signs & Anchors VC',
    actor: 'University Registrar · Trusted Issuer',
    caption:
      'The Registrar hashes each claim with a unique cryptographic salt, signs the W3C Verifiable Credential, and registers anonymous Status Index #1001 as ACTIVE.',
    startMs: 6000,
    endMs: 12000,
    targetTab: 'issuer',
    targetLabel: 'Try in University Issuer',
    packetLabel: 'Signed W3C VC + Status #1001',
  },
  {
    id: 'scene-request',
    index: 2,
    stepNumber: '03',
    title: 'Verifier Sends Nonce Challenge',
    actor: 'Campus Verifier · Research Portal',
    caption:
      'A verifier requests specific enrollment claims paired with a single-use cryptographic challenge nonce to prevent replay attacks.',
    startMs: 12000,
    endMs: 18000,
    targetTab: 'wallet',
    targetLabel: 'View Request in Wallet',
    packetLabel: 'REQ-2026-001 · nonce-lib-8841',
  },
  {
    id: 'scene-disclose',
    index: 3,
    stepNumber: '04',
    title: 'Selective Disclosure & QR Pass',
    actor: 'Student Wallet · Consent Engine',
    caption:
      'Student withholds sensitive Student ID Number (replaced by its salted SHA-256 digest) and generates a signed OpenID4VP QR pass for instant scanning.',
    startMs: 18000,
    endMs: 24000,
    targetTab: 'wallet',
    targetLabel: 'Inspect QR Pass',
    packetLabel: 'openid4vp://VP-2026-001',
  },
  {
    id: 'scene-verify',
    index: 4,
    stepNumber: '05',
    title: '6-Stage Instant Verification',
    actor: 'Verifier Console · Fail-Closed Engine',
    caption:
      'Scanning the QR pass executes all 6 deterministic checks—validating issuer trust, claim hashes, expiration, and live Sepolia revocation status in under 5 ms.',
    startMs: 24000,
    endMs: 30000,
    targetTab: 'verifier',
    targetLabel: 'Open Verifier Console',
    packetLabel: '6/6 Stages Pass · VALID',
  },
  {
    id: 'scene-revoke',
    index: 5,
    stepNumber: '06',
    title: 'Anonymous On-Chain Revocation',
    actor: 'Ethereum Sepolia · StatusList2021',
    caption:
      'If a credential is revoked, the Registrar flips integer index #1001 on Sepolia. Verifiers reject the credential immediately while student identity remains private.',
    startMs: 30000,
    endMs: 36000,
    targetTab: 'blockchain',
    targetLabel: 'Inspect Sepolia Ledger',
    packetLabel: 'Index #1001 = REVOKED (0B PII)',
  },
];

export const TOTAL_WALKTHROUGH_DURATION_MS =
  WALKTHROUGH_SCENES[WALKTHROUGH_SCENES.length - 1].endMs;

export function clampPlaybackTime(timeMs: number): number {
  if (!Number.isFinite(timeMs) || timeMs < 0) return 0;
  if (timeMs > TOTAL_WALKTHROUGH_DURATION_MS) {
    return TOTAL_WALKTHROUGH_DURATION_MS;
  }
  return timeMs;
}

export function getSceneAtTime(timeMs: number): WalkthroughSceneSpec {
  const clamped = clampPlaybackTime(timeMs);
  for (let i = 0; i < WALKTHROUGH_SCENES.length; i++) {
    const scene = WALKTHROUGH_SCENES[i];
    if (clamped < scene.endMs) {
      return scene;
    }
  }
  return WALKTHROUGH_SCENES[WALKTHROUGH_SCENES.length - 1];
}

export function getSceneLocalProgress(timeMs: number): number {
  const clamped = clampPlaybackTime(timeMs);
  const scene = getSceneAtTime(clamped);
  const span = scene.endMs - scene.startMs;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (clamped - scene.startMs) / span));
}

export function getOverallProgressPercent(timeMs: number): number {
  const clamped = clampPlaybackTime(timeMs);
  return (clamped / TOTAL_WALKTHROUGH_DURATION_MS) * 100;
}

export function formatTimecode(timeMs: number): string {
  const totalSeconds = Math.floor(clampPlaybackTime(timeMs) / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
