/**
 * @file verificationPipeline.test.ts
 * @description Automated unit test suite (node:test) verifying all SRS Functional Requirements,
 * Cryptographic Selective Disclosure, On-Chain Privacy Boundaries, and the 7 Minimum Test Dataset Cases (SRS 12.1).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSelectiveDisclosurePresentation,
  createSignedVerifiableCredential,
  deriveKeyPairFromSeed,
} from './cryptoEngine';
import {
  buildDidRecordFromSeed,
  isValidSupportedDid,
  SEPOLIA_REGISTRY_CONTRACT,
  verifyZeroPiiOnChain,
} from './didResolver';
import { runVerificationPipeline } from './verificationPipeline';
import {
  CredentialStatus,
  TrustedIssuer,
  VerificationOutcome,
} from '../types/did.types';
import {
  buildPresentationQrUri,
  generateQrMatrix,
  parsePresentationQrUri,
} from './qrPresentationUri';

const EVAL_TIME = '2026-11-11T08:00:00.000Z';

const issuerKey = deriveKeyPairFromSeed('university-issuer-cs47001-key');
const issuerDid = `did:ethr:sepolia:${issuerKey.ethereumAddress}`;

const untrustedKey = deriveKeyPairFromSeed('untrusted-rogue-issuer-key');
const untrustedDid = `did:ethr:sepolia:${untrustedKey.ethereumAddress}`;

const holderKey = deriveKeyPairFromSeed('student-bishal-gupta-23053694');
const holderDid = `did:ethr:sepolia:${holderKey.ethereumAddress}`;

const trustedIssuers: TrustedIssuer[] = [
  {
    did: issuerDid,
    displayName: 'KIIT University Academic Registrar (Test Issuer)',
    department: 'Office of the Controller of Examinations & Registrar',
    publicKeyHex: issuerKey.publicKeyHex,
    ethereumAddress: issuerKey.ethereumAddress,
    authorized: true,
    onChainRegistryTxHash: '0x99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
    registeredAt: '2026-10-01T00:00:00.000Z',
  },
];

function createBaselineCredential(id = 'urn:uuid:vc-test-001', statusIndex = '101') {
  return createSignedVerifiableCredential({
    credentialId: id,
    issuerDid,
    issuerName: 'KIIT University Academic Registrar (Test Issuer)',
    issuerPublicKeyHex: issuerKey.publicKeyHex,
    holderDid,
    claims: {
      studentName: 'Bishal Gupta',
      studentNumber: '23053694',
      program: 'B.Tech Computer Science & Engineering (CS47001)',
      enrollmentStatus: 'Active',
      academicYear: '2026-2027',
      universityName: 'School of Computer Engineering (Academic Prototype)',
    },
    issuanceDate: '2026-11-01T00:00:00.000Z',
    expirationDate: '2027-11-01T00:00:00.000Z',
    statusListIndex: statusIndex,
    contractAddress: SEPOLIA_REGISTRY_CONTRACT,
    deterministicSaltSeed: id,
  });
}

test('SRS FR-04 & AC-12: DID creation produces valid did:ethr:sepolia identifier and leaks zero PII on-chain', () => {
  const { didRecord, onChainTx } = buildDidRecordFromSeed({
    ownerUserId: 'usr-student-1',
    seed: 'student-bishal-gupta-23053694',
    createdAt: '2026-11-10T09:00:00.000Z',
    blockNumber: 7184920,
  });

  assert.equal(isValidSupportedDid(didRecord.did), true);
  assert.equal(didRecord.didDocument.id, didRecord.did);
  assert.equal(onChainTx.containsPersonalData, false);

  const piiAudit = verifyZeroPiiOnChain(
    [onChainTx],
    ['Bishal Gupta', '23053694', 'Computer Science']
  );
  assert.equal(piiAudit.compliant, true);
  assert.equal(piiAudit.violations.length, 0);
});

test('SRS TC-01 (AC-07): Valid unmodified test student credential from trusted university issuer passes verification', () => {
  const vc = createBaselineCredential();
  const result = runVerificationPipeline(vc, {
    trustedIssuers,
    onChainStatusRegistry: { '101': CredentialStatus.ACTIVE },
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.outcome, VerificationOutcome.VALID);
  assert.equal(result.checks.every((c) => c.passed), true);
});

test('SRS TC-02 (AC-08 & NFR-06): Credential with modified claim but unchanged proof fails cryptographic verification', () => {
  const vc = createBaselineCredential('urn:uuid:vc-test-tampered', '102');
  // Tamper with a claim after signing
  vc.credentialSubject.claims.enrollmentStatus = 'Graduated With Honors (Tampered)';

  const result = runVerificationPipeline(vc, {
    trustedIssuers,
    onChainStatusRegistry: { '102': CredentialStatus.ACTIVE },
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.outcome, VerificationOutcome.INVALID_SIGNATURE);
});

test('SRS TC-03 (AC-09 & FR-16): Expired credential is rejected as EXPIRED', () => {
  const vc = createSignedVerifiableCredential({
    credentialId: 'urn:uuid:vc-test-expired',
    issuerDid,
    issuerName: 'KIIT University Academic Registrar (Test Issuer)',
    issuerPublicKeyHex: issuerKey.publicKeyHex,
    holderDid,
    claims: {
      studentName: 'Bhabesh Shahi',
      studentNumber: '23053725',
      program: 'B.Tech Computer Science & Engineering',
      enrollmentStatus: 'Active',
      academicYear: '2024-2025',
      universityName: 'School of Computer Engineering',
    },
    issuanceDate: '2024-09-01T00:00:00.000Z',
    expirationDate: '2025-09-01T00:00:00.000Z',
    statusListIndex: '103',
    contractAddress: SEPOLIA_REGISTRY_CONTRACT,
    deterministicSaltSeed: 'expired-seed',
  });

  const result = runVerificationPipeline(vc, {
    trustedIssuers,
    onChainStatusRegistry: { '103': CredentialStatus.ACTIVE },
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.outcome, VerificationOutcome.EXPIRED);
});

test('SRS TC-04 (AC-09 & FR-15): Credential signed by an untrusted issuer is rejected as UNTRUSTED_ISSUER', () => {
  const vc = createSignedVerifiableCredential({
    credentialId: 'urn:uuid:vc-test-untrusted',
    issuerDid: untrustedDid,
    issuerName: 'Unverified External Academy',
    issuerPublicKeyHex: untrustedKey.publicKeyHex,
    holderDid,
    claims: {
      studentName: 'Aashutosh Narayan Singh',
      studentNumber: '23053825',
      program: 'B.Tech Computer Science & Engineering',
      enrollmentStatus: 'Active',
      academicYear: '2026-2027',
      universityName: 'Unverified External Academy',
    },
    issuanceDate: '2026-11-01T00:00:00.000Z',
    expirationDate: '2027-11-01T00:00:00.000Z',
    statusListIndex: '104',
    contractAddress: SEPOLIA_REGISTRY_CONTRACT,
    deterministicSaltSeed: 'untrusted-seed',
  });

  const result = runVerificationPipeline(vc, {
    trustedIssuers,
    onChainStatusRegistry: { '104': CredentialStatus.ACTIVE },
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.outcome, VerificationOutcome.UNTRUSTED_ISSUER);
});

test('SRS TC-05 (AC-09 & FR-17): Revoked credential is rejected as REVOKED when status registry marks it revoked', () => {
  const vc = createBaselineCredential('urn:uuid:vc-test-revoked', '105');

  const result = runVerificationPipeline(vc, {
    trustedIssuers,
    onChainStatusRegistry: { '105': CredentialStatus.REVOKED },
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.outcome, VerificationOutcome.REVOKED);
});

test('SRS TC-06 (FR-14 & FR-23): Malformed or unsupported credential structure produces controlled MALFORMED outcome', () => {
  const malformedPayload = {
    id: 'bad-credential',
    type: ['UnsupportedType'],
    issuer: 'did:unsupported:12345',
  };

  const result = runVerificationPipeline(malformedPayload, {
    trustedIssuers,
    onChainStatusRegistry: {},
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.outcome, VerificationOutcome.MALFORMED);
});

test('SRS TC-07 (AC-10, NFR-07, NFR-15): Ethereum RPC or resolver outage fails closed as UNABLE_TO_VERIFY', () => {
  const vc = createBaselineCredential('urn:uuid:vc-test-rpc-offline', '107');

  const result = runVerificationPipeline(vc, {
    trustedIssuers,
    onChainStatusRegistry: { '107': CredentialStatus.ACTIVE },
    ethereumRpcOnline: false, // Simulate RPC outage
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.outcome, VerificationOutcome.UNABLE_TO_VERIFY);
  assert.equal(result.ethereumNetworkStatus, 'OFFLINE');
});

test('SRS FR-12 & AC-06: Selective disclosure presentation hides unapproved claims while preserving cryptographic validity', () => {
  const vc = createBaselineCredential('urn:uuid:vc-selective-001', '108');
  const vp = createSelectiveDisclosurePresentation({
    presentationId: 'urn:uuid:vp-selective-001',
    credential: vc,
    holderDid,
    holderPublicKeyHex: holderKey.publicKeyHex,
    approvedClaims: ['enrollmentStatus', 'program', 'universityName'], // Withhold studentNumber & studentName!
    verifierAudience: 'did:ethr:sepolia:0x1111222233334444555566667777888899990000',
    challengeNonce: 'nonce-campus-library-2026',
    createdAt: EVAL_TIME,
  });

  // Verify studentNumber and studentName are omitted from disclosedClaims and credentialSubject
  assert.equal(vp.disclosedClaims.studentNumber, undefined);
  assert.equal(vp.disclosedClaims.studentName, undefined);
  assert.equal(vp.disclosedClaims.enrollmentStatus, 'Active');
  assert.equal(vp.hiddenClaimKeys.includes('studentNumber'), true);
  assert.equal(vp.hiddenClaimKeys.includes('studentName'), true);

  // Verify the presentation still passes full cryptographic verification
  const result = runVerificationPipeline(vp, {
    trustedIssuers,
    onChainStatusRegistry: { '108': CredentialStatus.ACTIVE },
    ethereumRpcOnline: true,
    evaluationTimeIso: EVAL_TIME,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.outcome, VerificationOutcome.VALID);

  // Verify OpenID4VP QR URI encoding, parsing, and 29x29 QR matrix generation
  const qrUri = buildPresentationQrUri(vp);
  assert.equal(qrUri.startsWith('openid4vp://present?'), true);

  const parsedUri = parsePresentationQrUri(qrUri);
  assert.notEqual(parsedUri, null);
  assert.equal(parsedUri?.vpId, 'urn:uuid:vp-selective-001');
  assert.equal(parsedUri?.vcId, 'urn:uuid:vc-selective-001');
  assert.equal(parsedUri?.holderDid, holderDid);
  assert.deepEqual(parsedUri?.disclosedClaimKeys, [
    'program',
    'enrollmentStatus',
    'universityName',
  ]);
  assert.equal(parsedUri?.hiddenClaimCount, 3);

  const matrix = generateQrMatrix(qrUri);
  assert.equal(matrix.length, 29);
  assert.equal(matrix[0].length, 29);
  // Finder pattern top-left corner (0,0) and center (3,3) must be true
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[3][3], true);
});
