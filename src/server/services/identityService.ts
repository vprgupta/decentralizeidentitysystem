/**
 * @file identityService.ts
 * @description Application Service Layer implementing business logic for User Onboarding,
 * DID Lifecycle, Credential Issuance & Revocation, Consent-Based Selective Disclosure,
 * and Fail-Closed Verification per SRS CS47001-DID-SRS-001.
 */

import crypto from 'node:crypto';
import {
  AuditEvent,
  CredentialStatus,
  DIDReferenceRecord,
  PresentationRequest,
  SharingRequestStatus,
  StudentCredentialClaims,
  UserAccount,
  UserRole,
  VerifiableCredential,
  VerifiablePresentation,
  VerificationResult,
} from '../../shared/types/did.types';
import {
  createSelectiveDisclosurePresentation,
  createSignedVerifiableCredential,
  deriveKeyPairFromSeed,
} from '../../shared/domain/cryptoEngine';
import {
  buildDidRecordFromSeed,
  isValidSupportedDid,
  SEPOLIA_REGISTRY_CONTRACT,
  verifyZeroPiiOnChain,
} from '../../shared/domain/didResolver';
import { runVerificationPipeline } from '../../shared/domain/verificationPipeline';
import { identityRepository } from '../repositories/identityRepository';

export class IdentityService {
  /**
   * FR-01: Register a new student holder account with duplicate identifier protection.
   */
  public registerStudent(params: {
    fullName: string;
    studentId: string;
    email: string;
    program: string;
    password?: string;
  }): UserAccount {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanStudentId = params.studentId.trim();

    if (!params.fullName.trim() || !cleanStudentId || !cleanEmail || !params.program.trim()) {
      throw new Error('All registration fields (Full Name, Student ID, Email, Program) are required.');
    }

    const duplicate = identityRepository.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (u.studentId && u.studentId.toLowerCase() === cleanStudentId.toLowerCase())
    );
    if (duplicate) {
      throw new Error(
        `Duplicate account identifier: a user with Student ID '${cleanStudentId}' or email '${cleanEmail}' already exists.`
      );
    }

    const newUser: UserAccount = {
      id: `usr-student-${Date.now()}`,
      studentId: cleanStudentId,
      fullName: params.fullName.trim(),
      email: cleanEmail,
      role: UserRole.STUDENT_HOLDER,
      program: params.program.trim(),
      enrollmentStatus: 'Active',
      createdAt: new Date().toISOString(),
    };

    identityRepository.users.push(newUser);
    identityRepository.passwordHashes[newUser.id] = identityRepository.hashPassword(
      params.password || 'student123'
    );

    this.recordAudit({
      actorRole: UserRole.STUDENT_HOLDER,
      actorId: newUser.id,
      actionType: 'USER_REGISTERED',
      outcome: 'SUCCESS',
      targetReference: newUser.id,
      privacyMinimizedSummary: `Registered new Student Holder account (${newUser.id}).`,
    });

    return newUser;
  }

  /**
   * FR-04: Create or associate a supported `did:ethr:sepolia` DID for a student holder.
   * Fails closed if the Ethereum RPC / key service is offline (UC-01 Alternative Flow).
   */
  public createOrAssociateDidForUser(userId: string, customSeed?: string): DIDReferenceRecord {
    if (!identityRepository.ethereumRpcOnline) {
      this.recordAudit({
        actorRole: UserRole.STUDENT_HOLDER,
        actorId: userId,
        actionType: 'DID_CREATED',
        outcome: 'FAILURE',
        targetReference: userId,
        privacyMinimizedSummary:
          'DID creation aborted: Ethereum Sepolia RPC / Resolver service is unavailable.',
      });
      throw new Error(
        'Cannot create or anchor DID on-chain: Ethereum Sepolia test-network RPC is currently offline.'
      );
    }

    const user = identityRepository.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('User account not found.');
    }

    const seed = customSeed || `holder-did-${user.id}-${user.studentId || Date.now()}`;
    const now = new Date().toISOString();
    const { didRecord, onChainTx } = buildDidRecordFromSeed({
      ownerUserId: user.id,
      seed,
      createdAt: now,
      blockNumber: ++identityRepository.currentBlockNumber,
    });

    user.did = didRecord.did;
    identityRepository.didRecords.set(didRecord.did, didRecord);
    identityRepository.onChainTransactions.unshift(onChainTx);

    this.recordAudit({
      actorRole: user.role,
      actorId: user.id,
      actionType: 'DID_CREATED',
      outcome: 'SUCCESS',
      targetReference: didRecord.did,
      privacyMinimizedSummary: `Created and anchored DID ${didRecord.did.slice(0, 28)}... on Sepolia.`,
    });

    return didRecord;
  }

  /**
   * FR-05: Resolve a supported DID and return its W3C DID Document.
   */
  public resolveDid(did: string, actorId = 'system', actorRole = UserRole.VERIFIER): DIDReferenceRecord {
    if (!identityRepository.ethereumRpcOnline) {
      throw new Error('DID Resolution failed: Ethereum Sepolia RPC / DID Resolver is unreachable.');
    }

    const cleanDid = did.trim();
    if (!isValidSupportedDid(cleanDid)) {
      throw new Error(
        `Unsupported or malformed DID '${cleanDid}'. Must conform to did:ethr:sepolia:0x<40-hex-chars>.`
      );
    }

    const existing = identityRepository.didRecords.get(cleanDid);
    if (existing) {
      this.recordAudit({
        actorRole,
        actorId,
        actionType: 'DID_RESOLVED',
        outcome: 'SUCCESS',
        targetReference: cleanDid,
        privacyMinimizedSummary: `Resolved W3C DID Document for ${cleanDid.slice(0, 28)}...`,
      });
      return existing;
    }

    // Check if it is a trusted issuer DID
    const issuer = identityRepository.trustedIssuers.find((iss) => iss.did === cleanDid);
    if (issuer) {
      const synthesized: DIDReferenceRecord = {
        did: issuer.did,
        method: 'did:ethr:sepolia',
        ownerUserId: 'usr-issuer-1',
        publicKeyHex: issuer.publicKeyHex,
        ethereumAddress: issuer.ethereumAddress,
        onChainTxHash: issuer.onChainRegistryTxHash,
        blockNumber: 7184901,
        createdAt: issuer.registeredAt,
        didDocument: {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: issuer.did,
          controller: issuer.did,
          verificationMethod: [
            {
              id: `${issuer.did}#key-1`,
              type: 'Ed25519VerificationKey2020',
              controller: issuer.did,
              publicKeyHex: issuer.publicKeyHex,
              ethereumAddress: issuer.ethereumAddress,
            },
          ],
          authentication: [`${issuer.did}#key-1`],
          assertionMethod: [`${issuer.did}#key-1`],
          created: issuer.registeredAt,
          updated: issuer.registeredAt,
          onChainTxHash: issuer.onChainRegistryTxHash,
          network: 'ethereum-sepolia-testnet',
        },
      };
      return synthesized;
    }

    throw new Error(`DID '${cleanDid}' is not registered in the Sepolia DID Registry.`);
  }

  /**
   * FR-07, FR-08, FR-09: University Issuer signs and issues a student Verifiable Credential.
   */
  public issueStudentCredential(params: {
    issuerUserId: string;
    holderUserId: string;
    program: string;
    enrollmentStatus: string;
    academicYear: string;
    universityName?: string;
    expirationDate?: string;
  }): VerifiableCredential {
    const issuerUser = identityRepository.users.find((u) => u.id === params.issuerUserId);
    if (!issuerUser || issuerUser.role !== UserRole.UNIVERSITY_ISSUER) {
      throw new Error('Unauthorized: only an authenticated University Issuer can issue credentials (FR-07).');
    }

    if (!identityRepository.ethereumRpcOnline) {
      throw new Error(
        'Credential issuance requires anchoring status metadata on Sepolia, which is currently offline.'
      );
    }

    const holder = identityRepository.users.find((u) => u.id === params.holderUserId);
    if (!holder || holder.role !== UserRole.STUDENT_HOLDER) {
      throw new Error('Target student holder account not found.');
    }

    if (!holder.did) {
      // Automatically provision a DID if the student hasn't created one yet, or require it
      this.createOrAssociateDidForUser(holder.id);
    }

    if (!params.program.trim() || !params.enrollmentStatus.trim() || !params.academicYear.trim()) {
      throw new Error('Program, Enrollment Status, and Academic Year are required claims.');
    }

    const issuerEntity = identityRepository.trustedIssuers[0];
    const now = new Date().toISOString();
    const expiry =
      params.expirationDate ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const statusIndex = String(1000 + identityRepository.credentials.length + 1);
    const credentialId = `VC-2026-CS47001-${String(identityRepository.credentials.length + 1).padStart(3, '0')}`;

    const claims: StudentCredentialClaims = {
      studentName: holder.fullName,
      studentNumber: holder.studentId || '23050000',
      program: params.program.trim(),
      enrollmentStatus: params.enrollmentStatus.trim(),
      academicYear: params.academicYear.trim(),
      universityName:
        params.universityName?.trim() ||
        'School of Computer Engineering (Project-I Prototype)',
    };

    const vc = createSignedVerifiableCredential({
      credentialId,
      issuerDid: issuerEntity.did,
      issuerName: issuerEntity.displayName,
      issuerPublicKeyHex: issuerEntity.publicKeyHex,
      holderDid: holder.did!,
      claims,
      issuanceDate: now,
      expirationDate: expiry,
      statusListIndex: statusIndex,
      contractAddress: SEPOLIA_REGISTRY_CONTRACT,
    });

    identityRepository.credentials.unshift(vc);
    identityRepository.onChainStatusRegistry[statusIndex] = CredentialStatus.ACTIVE;

    const txHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(`issue-status:${vc.id}:${now}`)
        .digest('hex');

    identityRepository.onChainTransactions.unshift({
      txHash,
      blockNumber: ++identityRepository.currentBlockNumber,
      timestamp: now,
      operationType: 'CREDENTIAL_STATUS_ANCHOR',
      contractAddress: SEPOLIA_REGISTRY_CONTRACT,
      callerAddress: issuerEntity.ethereumAddress,
      publicReferenceHash:
        '0x' +
        crypto.createHash('sha256').update(`status:${statusIndex}:ACTIVE`).digest('hex'),
      containsPersonalData: false,
      summary: `Anchored status index #${statusIndex} = ACTIVE for newly issued credential (Zero PII on-chain)`,
    });

    this.recordAudit({
      actorRole: UserRole.UNIVERSITY_ISSUER,
      actorId: issuerUser.id,
      actionType: 'CREDENTIAL_ISSUED',
      outcome: 'SUCCESS',
      targetReference: vc.id,
      privacyMinimizedSummary: `Issued signed credential ${vc.id} (status index #${statusIndex}).`,
    });

    return vc;
  }

  /**
   * FR-17 & FR-24: Revoke or reinstate an issued credential on the status registry.
   */
  public updateCredentialStatus(params: {
    issuerUserId: string;
    credentialId: string;
    newStatus: CredentialStatus;
    reason?: string;
  }): VerifiableCredential {
    const issuerUser = identityRepository.users.find((u) => u.id === params.issuerUserId);
    if (!issuerUser || issuerUser.role !== UserRole.UNIVERSITY_ISSUER) {
      throw new Error('Unauthorized: only an authorized University Issuer can modify credential status (FR-24).');
    }

    if (!identityRepository.ethereumRpcOnline) {
      throw new Error('Cannot update on-chain credential status: Ethereum Sepolia RPC is offline.');
    }

    const cred = identityRepository.credentials.find((c) => c.id === params.credentialId);
    if (!cred) {
      throw new Error(`Credential '${params.credentialId}' not found.`);
    }

    const now = new Date().toISOString();
    cred.credentialStatus.status = params.newStatus;
    cred.credentialStatus.revocationReason =
      params.newStatus === CredentialStatus.REVOKED
        ? params.reason || 'Revoked by University Registrar'
        : undefined;
    cred.credentialStatus.updatedAt = now;

    const idx = cred.credentialStatus.statusListIndex;
    identityRepository.onChainStatusRegistry[idx] = params.newStatus;

    const issuerEntity = identityRepository.trustedIssuers[0];
    const txHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(`status-change:${cred.id}:${params.newStatus}:${now}`)
        .digest('hex');

    identityRepository.onChainTransactions.unshift({
      txHash,
      blockNumber: ++identityRepository.currentBlockNumber,
      timestamp: now,
      operationType: 'CREDENTIAL_REVOKE',
      contractAddress: SEPOLIA_REGISTRY_CONTRACT,
      callerAddress: issuerEntity.ethereumAddress,
      publicReferenceHash:
        '0x' +
        crypto.createHash('sha256').update(`status:${idx}:${params.newStatus}`).digest('hex'),
      containsPersonalData: false,
      summary: `Updated on-chain status index #${idx} to ${params.newStatus}`,
    });

    this.recordAudit({
      actorRole: UserRole.UNIVERSITY_ISSUER,
      actorId: issuerUser.id,
      actionType:
        params.newStatus === CredentialStatus.REVOKED
          ? 'CREDENTIAL_REVOKED'
          : 'CREDENTIAL_REINSTATED',
      outcome: 'SUCCESS',
      targetReference: cred.id,
      privacyMinimizedSummary: `Changed status of ${cred.id} (index #${idx}) to ${params.newStatus}.`,
    });

    return cred;
  }

  /**
   * FR-22: Remove a credential from the holder's local wallet view (does not erase blockchain status).
   */
  public removeCredentialFromWallet(holderUserId: string, credentialId: string): void {
    const cred = identityRepository.credentials.find((c) => c.id === credentialId);
    const holder = identityRepository.users.find((u) => u.id === holderUserId);
    if (!cred || !holder || cred.credentialSubject.id !== holder.did) {
      throw new Error('Credential not found in holder wallet.');
    }

    identityRepository.removedFromWalletIds.add(credentialId);
    this.recordAudit({
      actorRole: UserRole.STUDENT_HOLDER,
      actorId: holderUserId,
      actionType: 'CREDENTIAL_REMOVED_FROM_WALLET',
      outcome: 'SUCCESS',
      targetReference: credentialId,
      privacyMinimizedSummary: `Removed credential ${credentialId} from off-chain wallet view (on-chain anchor unaffected per FR-22).`,
    });
  }

  /**
   * Verifier creates a new presentation sharing request for a student holder.
   */
  public createPresentationRequest(params: {
    verifierId: string;
    verifierName: string;
    holderUserId: string;
    requestedClaims: (keyof StudentCredentialClaims)[];
    purpose: string;
  }): PresentationRequest {
    const holder = identityRepository.users.find((u) => u.id === params.holderUserId);
    if (!holder || !holder.did) {
      throw new Error('Selected student holder does not have an active DID yet.');
    }

    if (!params.requestedClaims || params.requestedClaims.length === 0) {
      throw new Error('At least one claim must be requested.');
    }

    if (!params.purpose.trim()) {
      throw new Error('A clear purpose for the sharing request is required (SRS 5.1).');
    }

    const req: PresentationRequest = {
      id: `REQ-2026-${String(identityRepository.presentationRequests.length + 1).padStart(3, '0')}`,
      verifierId: params.verifierId,
      verifierName: params.verifierName.trim(),
      holderUserId: holder.id,
      holderDid: holder.did,
      requestedClaims: params.requestedClaims,
      purpose: params.purpose.trim(),
      challengeNonce: `nonce-${crypto.randomBytes(5).toString('hex')}`,
      status: SharingRequestStatus.PENDING,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    identityRepository.presentationRequests.unshift(req);

    this.recordAudit({
      actorRole: UserRole.VERIFIER,
      actorId: params.verifierId,
      actionType: 'PRESENTATION_REQUESTED',
      outcome: 'SUCCESS',
      targetReference: req.id,
      privacyMinimizedSummary: `Requested ${req.requestedClaims.length} claim(s) from holder (${req.id}).`,
    });

    return req;
  }

  /**
   * FR-11, FR-12, FR-13, FR-20: Holder responds to a presentation request (Approve with Selective Disclosure, Deny, or Cancel).
   */
  public respondToPresentationRequest(params: {
    holderUserId: string;
    requestId: string;
    decision: 'APPROVE' | 'DENY' | 'CANCEL';
    credentialId?: string;
    approvedClaims?: (keyof StudentCredentialClaims)[];
  }): { request: PresentationRequest; presentation?: VerifiablePresentation } {
    const req = identityRepository.presentationRequests.find((r) => r.id === params.requestId);
    if (!req) {
      throw new Error(`Presentation request '${params.requestId}' not found.`);
    }

    if (req.holderUserId !== params.holderUserId) {
      throw new Error('Unauthorized: only the target student holder can respond to this request (FR-11).');
    }

    if (req.status !== SharingRequestStatus.PENDING) {
      throw new Error(`Request '${req.id}' is already ${req.status}.`);
    }

    const now = new Date().toISOString();

    if (params.decision === 'DENY' || params.decision === 'CANCEL') {
      req.status =
        params.decision === 'DENY'
          ? SharingRequestStatus.DENIED
          : SharingRequestStatus.CANCELLED;
      req.respondedAt = now;

      this.recordAudit({
        actorRole: UserRole.STUDENT_HOLDER,
        actorId: params.holderUserId,
        actionType: params.decision === 'DENY' ? 'CONSENT_DENIED' : 'CONSENT_CANCELLED',
        outcome: 'SUCCESS',
        targetReference: req.id,
        privacyMinimizedSummary: `Holder ${req.status.toLowerCase()} sharing request ${req.id}; no presentation generated.`,
      });

      return { request: req };
    }

    // APPROVE flow: require explicit claim selection and valid credential
    const approvedClaims = params.approvedClaims || req.requestedClaims;
    if (approvedClaims.length === 0) {
      throw new Error('At least one claim must be approved to generate a Verifiable Presentation.');
    }

    const holder = identityRepository.users.find((u) => u.id === params.holderUserId)!;
    const cred = identityRepository.credentials.find(
      (c) =>
        (params.credentialId ? c.id === params.credentialId : true) &&
        c.credentialSubject.id === holder.did &&
        !identityRepository.removedFromWalletIds.has(c.id)
    );

    if (!cred) {
      throw new Error('No eligible Verifiable Credential found in holder wallet.');
    }

    const didRecord = identityRepository.didRecords.get(holder.did!);
    const holderPubKey =
      didRecord?.publicKeyHex ||
      deriveKeyPairFromSeed(`student-seed-${holder.studentId}`).publicKeyHex;

    const vpId = `VP-2026-${String(identityRepository.presentations.length + 1).padStart(3, '0')}`;
    const vp = createSelectiveDisclosurePresentation({
      presentationId: vpId,
      credential: cred,
      holderDid: holder.did!,
      holderPublicKeyHex: holderPubKey,
      approvedClaims,
      verifierAudience: req.verifierId,
      challengeNonce: req.challengeNonce,
      createdAt: now,
    });

    req.status = SharingRequestStatus.APPROVED;
    req.respondedAt = now;
    req.presentationId = vp.id;
    req.approvedClaims = approvedClaims;

    identityRepository.presentations.unshift(vp);

    this.recordAudit({
      actorRole: UserRole.STUDENT_HOLDER,
      actorId: params.holderUserId,
      actionType: 'CONSENT_APPROVED',
      outcome: 'SUCCESS',
      targetReference: vp.id,
      privacyMinimizedSummary: `Holder consented to share ${approvedClaims.length} claim(s) (${
        vp.hiddenClaimKeys.length
      } withheld via selective disclosure) in ${vp.id}.`,
    });

    return { request: req, presentation: vp };
  }

  /**
   * FR-14 to FR-19: Execute cryptographic verification on a credential, presentation, or SRS test case.
   */
  public verifyPayload(params: {
    actorId: string;
    actorRole: UserRole;
    payload: unknown;
    forceRpcOutage?: boolean;
  }): VerificationResult {
    const rpcOnline = params.forceRpcOutage ? false : identityRepository.ethereumRpcOnline;

    const result = runVerificationPipeline(params.payload, {
      trustedIssuers: identityRepository.trustedIssuers,
      onChainStatusRegistry: identityRepository.onChainStatusRegistry,
      ethereumRpcOnline: rpcOnline,
    });

    identityRepository.verificationHistory.unshift(result);

    this.recordAudit({
      actorRole: params.actorRole,
      actorId: params.actorId,
      actionType: 'CREDENTIAL_VERIFIED',
      outcome:
        result.outcome === 'UNABLE_TO_VERIFY'
          ? 'UNABLE_TO_VERIFY'
          : result.isValid
          ? 'SUCCESS'
          : 'FAILURE',
      targetReference: result.targetId,
      privacyMinimizedSummary: `Verification result for ${result.targetId}: ${result.outcome}.`,
    });

    return result;
  }

  /**
   * Toggle Ethereum Sepolia RPC / Resolver online status to demonstrate NFR-07 & NFR-15 fail-closed behavior.
   */
  public setEthereumRpcStatus(online: boolean, actorId = 'usr-admin-1'): boolean {
    identityRepository.ethereumRpcOnline = online;
    this.recordAudit({
      actorRole: UserRole.ADMIN,
      actorId,
      actionType: 'RPC_STATUS_CHANGED',
      outcome: 'SUCCESS',
      targetReference: 'ethereum-sepolia-rpc',
      privacyMinimizedSummary: `Ethereum Sepolia RPC / Resolver status set to ${
        online ? 'ONLINE' : 'OFFLINE (Simulating Outage)'
      }.`,
    });
    return identityRepository.ethereumRpcOnline;
  }

  /**
   * AC-12 & NFR-04: Run an automated privacy audit verifying no PII exists in on-chain records.
   */
  public runOnChainPrivacyAudit() {
    const sensitiveStrings: string[] = [];
    for (const u of identityRepository.users) {
      if (u.role === UserRole.STUDENT_HOLDER) {
        sensitiveStrings.push(u.fullName);
        if (u.studentId) sensitiveStrings.push(u.studentId);
      }
    }
    return verifyZeroPiiOnChain(identityRepository.onChainTransactions, sensitiveStrings);
  }

  private recordAudit(params: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    identityRepository.auditEvents.unshift({
      id: `AUD-${1000 + identityRepository.auditEvents.length + 1}`,
      timestamp: new Date().toISOString(),
      ...params,
    });
  }
}

export const identityService = new IdentityService();
