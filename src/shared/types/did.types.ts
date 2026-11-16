/**
 * @file did.types.ts
 * @description Domain entities, W3C DID v1.0 & Verifiable Credentials v2.0 data models,
 * Role-Based Access Control (RBAC) types, and verification outcomes per SRS CS47001-DID-SRS-001.
 */

export enum UserRole {
  STUDENT_HOLDER = 'STUDENT_HOLDER',
  UNIVERSITY_ISSUER = 'UNIVERSITY_ISSUER',
  VERIFIER = 'VERIFIER',
  ADMIN = 'ADMIN',
}

export enum CredentialStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED',
}

export enum VerificationOutcome {
  VALID = 'VALID',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED = 'EXPIRED',
  NOT_YET_VALID = 'NOT_YET_VALID',
  REVOKED = 'REVOKED',
  UNTRUSTED_ISSUER = 'UNTRUSTED_ISSUER',
  MALFORMED = 'MALFORMED',
  UNABLE_TO_VERIFY = 'UNABLE_TO_VERIFY',
}

export enum SharingRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  CANCELLED = 'CANCELLED',
}

export interface UserAccount {
  id: string;
  studentId?: string;
  fullName: string;
  email: string;
  role: UserRole;
  program?: string;
  enrollmentStatus?: 'Active' | 'Graduated' | 'Inactive';
  did?: string;
  createdAt: string;
}

export interface VerificationMethod {
  id: string;
  type: 'Ed25519VerificationKey2020' | 'EcdsaSecp256k1VerificationKey2019';
  controller: string;
  publicKeyHex: string;
  ethereumAddress?: string;
}

export interface DIDDocument {
  '@context': string[];
  id: string;
  controller: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  created: string;
  updated: string;
  onChainTxHash: string;
  network: 'ethereum-sepolia-testnet';
}

export interface DIDReferenceRecord {
  did: string;
  method: 'did:ethr:sepolia';
  ownerUserId: string;
  publicKeyHex: string;
  ethereumAddress: string;
  didDocument: DIDDocument;
  onChainTxHash: string;
  blockNumber: number;
  createdAt: string;
}

export interface TrustedIssuer {
  did: string;
  displayName: string;
  department: string;
  publicKeyHex: string;
  ethereumAddress: string;
  authorized: boolean;
  onChainRegistryTxHash: string;
  registeredAt: string;
}

export interface StudentCredentialClaims {
  studentName: string;
  studentNumber: string;
  program: string;
  enrollmentStatus: string;
  academicYear: string;
  universityName: string;
}

export interface ClaimHashEntry {
  claimKey: keyof StudentCredentialClaims;
  salt: string;
  digestHex: string;
}

export interface CryptographicProof {
  type: 'DataIntegrityProof';
  cryptosuite: 'sha256-hmac-ed25519-prototype-2026';
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod' | 'authentication';
  proofValue: string;
  claimSalts: Record<string, string>;
  claimDigests: Record<string, string>;
  nonce?: string;
  domain?: string;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: ['VerifiableCredential', 'UniversityStudentCredential'];
  issuer: string;
  issuerName: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string; // Holder DID
    claims: Partial<StudentCredentialClaims>;
  };
  credentialStatus: {
    id: string;
    type: 'EthereumStatusRegistry2026';
    statusPurpose: 'revocation';
    statusListIndex: string;
    contractAddress: string;
    status: CredentialStatus;
    revocationReason?: string;
    updatedAt: string;
  };
  proof: CryptographicProof;
}

export interface VerifiablePresentation {
  '@context': string[];
  id: string;
  type: ['VerifiablePresentation'];
  holder: string;
  verifierAudience: string;
  challengeNonce: string;
  createdAt: string;
  disclosedClaims: Partial<StudentCredentialClaims>;
  hiddenClaimKeys: string[];
  verifiableCredential: VerifiableCredential;
  holderProof: {
    type: 'HolderPresentationBinding2026';
    created: string;
    verificationMethod: string;
    challenge: string;
    audience: string;
    signatureHex: string;
  };
}

export interface PresentationRequest {
  id: string;
  verifierId: string;
  verifierName: string;
  holderUserId: string;
  holderDid: string;
  requestedClaims: (keyof StudentCredentialClaims)[];
  purpose: string;
  challengeNonce: string;
  status: SharingRequestStatus;
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
  presentationId?: string;
  approvedClaims?: (keyof StudentCredentialClaims)[];
}

export interface VerificationStepCheck {
  stepId: string;
  label: string;
  passed: boolean;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'UNAVAILABLE';
  detail: string;
}

export interface VerificationResult {
  id: string;
  targetId: string;
  targetType: 'CREDENTIAL' | 'PRESENTATION';
  outcome: VerificationOutcome;
  isValid: boolean;
  reasonSummary: string;
  issuerDid: string;
  subjectDid: string;
  disclosedClaims: Partial<StudentCredentialClaims>;
  checks: VerificationStepCheck[];
  ethereumNetworkStatus: 'ONLINE' | 'OFFLINE';
  verifiedAt: string;
}

export interface OnChainTransactionRecord {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  operationType: 'DID_REGISTER' | 'ISSUER_ANCHOR' | 'CREDENTIAL_STATUS_ANCHOR' | 'CREDENTIAL_REVOKE';
  contractAddress: string;
  callerAddress: string;
  publicReferenceHash: string;
  containsPersonalData: false; // Strictly enforced by NFR-04 & AC-12
  summary: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  actorId: string;
  actionType:
    | 'USER_REGISTERED'
    | 'USER_AUTHENTICATED'
    | 'DID_CREATED'
    | 'DID_RESOLVED'
    | 'CREDENTIAL_ISSUED'
    | 'CREDENTIAL_REVOKED'
    | 'CREDENTIAL_REINSTATED'
    | 'CREDENTIAL_REMOVED_FROM_WALLET'
    | 'PRESENTATION_REQUESTED'
    | 'CONSENT_APPROVED'
    | 'CONSENT_DENIED'
    | 'CONSENT_CANCELLED'
    | 'CREDENTIAL_VERIFIED'
    | 'RPC_STATUS_CHANGED';
  outcome: 'SUCCESS' | 'FAILURE' | 'UNABLE_TO_VERIFY';
  targetReference: string;
  privacyMinimizedSummary: string;
}

export interface TestDatasetCase {
  testCaseId: string;
  srsReference: string;
  title: string;
  description: string;
  expectedOutcome: VerificationOutcome;
  simulatesRpcOutage?: boolean;
  credential: VerifiableCredential;
}
