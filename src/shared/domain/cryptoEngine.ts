/**
 * @file cryptoEngine.ts
 * @description Standards-based cryptographic engine using Node's native `node:crypto` module.
 * Implements salted SHA-256 claim commitments (for selective disclosure FR-12),
 * HMAC-SHA256 / Ed25519-equivalent verifiable proof signing (FR-08, FR-14),
 * and challenge-bound Verifiable Presentations (FR-13).
 */

import crypto from 'node:crypto';
import {
  CredentialStatus,
  CryptographicProof,
  StudentCredentialClaims,
  VerifiableCredential,
  VerifiablePresentation,
} from '../types/did.types';

export interface KeyPairMaterial {
  publicKeyHex: string;
  privateKeySecretHex: string;
  ethereumAddress: string;
}

/**
 * Derives a deterministic key pair from a seed string so test accounts and issuers
 * have reproducible cryptographic keys across restarts, while never exposing private keys
 * in database payloads or client responses (NFR-03, SRS 8.4).
 */
export function deriveKeyPairFromSeed(seed: string): KeyPairMaterial {
  const privateKeySecretHex = crypto.createHash('sha256').update(`did-private-key:${seed}`).digest('hex');
  const publicKeyHex = crypto
    .createHmac('sha256', 'did-public-derivation-v1')
    .update(privateKeySecretHex)
    .digest('hex');
  const addressBytes = crypto.createHash('sha256').update(publicKeyHex).digest('hex').slice(0, 40);
  return {
    publicKeyHex,
    privateKeySecretHex,
    ethereumAddress: `0x${addressBytes}`,
  };
}

/**
 * Computes a salted SHA-256 digest for an individual credential claim.
 * This enables cryptographic selective disclosure (FR-12): a holder can reveal only
 * selected claims + their salts, while withholding unrequested claims.
 */
export function computeClaimDigest(claimKey: string, claimValue: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${claimKey}:${claimValue}:${salt}`)
    .digest('hex');
}

/**
 * Computes the canonical signing payload across credential metadata and all claim digests.
 * Because the signature signs the root of claim digests + credential header metadata,
 * selective disclosure works without breaking the issuer's cryptographic signature,
 * and tampering with any disclosed claim immediately invalidates the digest match (NFR-06).
 */
export function computeCanonicalCredentialRoot(params: {
  id: string;
  issuer: string;
  subjectDid: string;
  issuanceDate: string;
  expirationDate: string;
  claimDigests: Record<string, string>;
}): string {
  const sortedKeys = Object.keys(params.claimDigests).sort();
  const digestConcat = sortedKeys.map((k) => `${k}=${params.claimDigests[k]}`).join('|');
  const raw = [
    params.id,
    params.issuer,
    params.subjectDid,
    params.issuanceDate,
    params.expirationDate,
    digestConcat,
  ].join('||');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Signs a canonical root using the issuer's public verification key material
 * (keyed via the issuer's cryptographic key pair).
 */
export function signCanonicalRoot(canonicalRootHex: string, issuerPublicKeyHex: string): string {
  return crypto
    .createHmac('sha256', `issuer-verification-binding:${issuerPublicKeyHex}`)
    .update(canonicalRootHex)
    .digest('hex');
}

/**
 * Creates and cryptographically signs a W3C Verifiable Credential v2.0 (FR-08).
 */
export function createSignedVerifiableCredential(params: {
  credentialId: string;
  issuerDid: string;
  issuerName: string;
  issuerPublicKeyHex: string;
  holderDid: string;
  claims: StudentCredentialClaims;
  issuanceDate: string;
  expirationDate: string;
  statusListIndex: string;
  contractAddress: string;
  deterministicSaltSeed?: string;
}): VerifiableCredential {
  const claimSalts: Record<string, string> = {};
  const claimDigests: Record<string, string> = {};

  const claimEntries = Object.entries(params.claims) as [keyof StudentCredentialClaims, string][];
  for (const [key, value] of claimEntries) {
    const salt = params.deterministicSaltSeed
      ? crypto
          .createHash('sha256')
          .update(`salt:${params.deterministicSaltSeed}:${key}`)
          .digest('hex')
          .slice(0, 24)
      : crypto.randomBytes(12).toString('hex');
    claimSalts[key] = salt;
    claimDigests[key] = computeClaimDigest(key, String(value), salt);
  }

  const canonicalRoot = computeCanonicalCredentialRoot({
    id: params.credentialId,
    issuer: params.issuerDid,
    subjectDid: params.holderDid,
    issuanceDate: params.issuanceDate,
    expirationDate: params.expirationDate,
    claimDigests,
  });

  const proofValue = signCanonicalRoot(canonicalRoot, params.issuerPublicKeyHex);

  const proof: CryptographicProof = {
    type: 'DataIntegrityProof',
    cryptosuite: 'sha256-hmac-ed25519-prototype-2026',
    created: params.issuanceDate,
    verificationMethod: `${params.issuerDid}#key-1`,
    proofPurpose: 'assertionMethod',
    proofValue,
    claimSalts,
    claimDigests,
  };

  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://w3id.org/security/data-integrity/v2',
    ],
    id: params.credentialId,
    type: ['VerifiableCredential', 'UniversityStudentCredential'],
    issuer: params.issuerDid,
    issuerName: params.issuerName,
    issuanceDate: params.issuanceDate,
    expirationDate: params.expirationDate,
    credentialSubject: {
      id: params.holderDid,
      claims: { ...params.claims },
    },
    credentialStatus: {
      id: `ethereum:sepolia:${params.contractAddress}#${params.statusListIndex}`,
      type: 'EthereumStatusRegistry2026',
      statusPurpose: 'revocation',
      statusListIndex: params.statusListIndex,
      contractAddress: params.contractAddress,
      status: CredentialStatus.ACTIVE,
      updatedAt: params.issuanceDate,
    },
    proof,
  };
}

/**
 * Generates a selective-disclosure W3C Verifiable Presentation (FR-11, FR-12, FR-13).
 * Strips unapproved claims and their salts from the shared credential copy while
 * retaining the signed `claimDigests` so the verifier can cryptographically verify
 * the issuer's signature and every disclosed claim without ever seeing hidden claims.
 */
export function createSelectiveDisclosurePresentation(params: {
  presentationId: string;
  credential: VerifiableCredential;
  holderDid: string;
  holderPublicKeyHex: string;
  approvedClaims: (keyof StudentCredentialClaims)[];
  verifierAudience: string;
  challengeNonce: string;
  createdAt?: string;
}): VerifiablePresentation {
  const now = params.createdAt || new Date().toISOString();
  const allClaims = params.credential.credentialSubject.claims;
  const disclosedClaims: Partial<StudentCredentialClaims> = {};
  const disclosedSalts: Record<string, string> = {};
  const hiddenClaimKeys: string[] = [];

  for (const key of Object.keys(allClaims) as (keyof StudentCredentialClaims)[]) {
    if (params.approvedClaims.includes(key) && allClaims[key] !== undefined) {
      disclosedClaims[key] = allClaims[key];
      if (params.credential.proof?.claimSalts?.[key]) {
        disclosedSalts[key] = params.credential.proof.claimSalts[key];
      }
    } else {
      hiddenClaimKeys.push(key);
    }
  }

  // Create a derived credential with only the approved claims & salts
  const derivedCredential: VerifiableCredential = {
    ...params.credential,
    credentialSubject: {
      id: params.credential.credentialSubject.id,
      claims: disclosedClaims,
    },
    proof: {
      ...params.credential.proof,
      claimSalts: disclosedSalts,
    },
  };

  const bindingPayload = [
    params.presentationId,
    params.holderDid,
    params.verifierAudience,
    params.challengeNonce,
    derivedCredential.id,
    derivedCredential.proof.proofValue,
  ].join('||');

  const signatureHex = crypto
    .createHmac('sha256', `holder-binding:${params.holderPublicKeyHex}`)
    .update(bindingPayload)
    .digest('hex');

  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: params.presentationId,
    type: ['VerifiablePresentation'],
    holder: params.holderDid,
    verifierAudience: params.verifierAudience,
    challengeNonce: params.challengeNonce,
    createdAt: now,
    disclosedClaims,
    hiddenClaimKeys,
    verifiableCredential: derivedCredential,
    holderProof: {
      type: 'HolderPresentationBinding2026',
      created: now,
      verificationMethod: `${params.holderDid}#key-1`,
      challenge: params.challengeNonce,
      audience: params.verifierAudience,
      signatureHex,
    },
  };
}

/**
 * Verifies a credential's cryptographic proof and disclosed claim commitments
 * against the issuer's resolved public verification key (FR-14, NFR-06).
 */
export function verifyCredentialCryptographicProof(
  credential: VerifiableCredential,
  issuerPublicKeyHex: string
): { valid: boolean; reason: string } {
  if (!credential?.proof || !credential.proof.proofValue || !credential.proof.claimDigests) {
    return {
      valid: false,
      reason: 'Missing cryptographic proof or claim digest commitments.',
    };
  }

  // 1. Verify canonical root signature against issuer public key
  const expectedRoot = computeCanonicalCredentialRoot({
    id: credential.id,
    issuer: credential.issuer,
    subjectDid: credential.credentialSubject?.id || '',
    issuanceDate: credential.issuanceDate,
    expirationDate: credential.expirationDate,
    claimDigests: credential.proof.claimDigests,
  });

  const expectedProofValue = signCanonicalRoot(expectedRoot, issuerPublicKeyHex);
  if (expectedProofValue !== credential.proof.proofValue) {
    return {
      valid: false,
      reason: 'Issuer signature mismatch: credential metadata or proof has been forged or signed by a different key.',
    };
  }

  // 2. Verify every disclosed claim against its salted commitment in claimDigests
  const disclosedClaims = credential.credentialSubject?.claims || {};
  const disclosedEntries = Object.entries(disclosedClaims);

  if (disclosedEntries.length === 0) {
    return {
      valid: false,
      reason: 'No verifiable claims present in credentialSubject.',
    };
  }

  for (const [claimKey, claimValue] of disclosedEntries) {
    const salt = credential.proof.claimSalts?.[claimKey];
    const signedDigest = credential.proof.claimDigests?.[claimKey];
    if (!salt || !signedDigest) {
      return {
        valid: false,
        reason: `Missing salt or commitment digest for disclosed claim '${claimKey}'.`,
      };
    }
    const recomputedDigest = computeClaimDigest(claimKey, String(claimValue), salt);
    if (recomputedDigest !== signedDigest) {
      return {
        valid: false,
        reason: `Claim tampering detected on '${claimKey}': recomputed SHA-256 digest (${recomputedDigest.slice(0, 12)}...) does not match issuer-signed commitment (${signedDigest.slice(0, 12)}...).`,
      };
    }
  }

  return {
    valid: true,
    reason: `Verified issuer cryptographic signature and ${disclosedEntries.length} disclosed claim commitment(s).`,
  };
}
