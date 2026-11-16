/**
 * @file apiRoutes.ts
 * @description Express REST API routes (/api/v1/*) implementing all SRS Functional Requirements
 * (FR-01 through FR-24) and Non-Functional Requirements (NFR-01 through NFR-16).
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  attachCurrentUser,
  requireRoles,
} from '../middleware/authMiddleware';
import { identityRepository } from '../repositories/identityRepository';
import { identityService } from '../services/identityService';
import {
  CredentialStatus,
  StudentCredentialClaims,
  UserRole,
} from '../../shared/types/did.types';
import { SEPOLIA_REGISTRY_CONTRACT } from '../../shared/domain/didResolver';

export const apiRouter = Router();

apiRouter.use(attachCurrentUser);

/**
 * GET /api/v1/state
 * Returns the complete workspace state scoped appropriately for the active role & demonstration.
 */
apiRouter.get('/state', (req: AuthenticatedRequest, res: Response) => {
  const activeUser = req.currentUser || identityRepository.users[0];
  const privacyAudit = identityService.runOnChainPrivacyAudit();

  // Filter wallet credentials for the active holder (excluding credentials removed from wallet per FR-22)
  const visibleCredentials = identityRepository.credentials.filter(
    (c) => !identityRepository.removedFromWalletIds.has(c.id)
  );

  const didRecordsList = Array.from(identityRepository.didRecords.values());

  res.json({
    activeUser,
    users: identityRepository.users,
    didRecords: didRecordsList,
    trustedIssuers: identityRepository.trustedIssuers,
    credentials: visibleCredentials,
    allIssuedCredentials: identityRepository.credentials,
    presentationRequests: identityRepository.presentationRequests,
    presentations: identityRepository.presentations,
    verificationHistory: identityRepository.verificationHistory,
    onChainTransactions: identityRepository.onChainTransactions,
    onChainStatusRegistry: identityRepository.onChainStatusRegistry,
    auditEvents: identityRepository.auditEvents,
    testDatasetCases: identityRepository.testDatasetCases,
    ethereumRpcOnline: identityRepository.ethereumRpcOnline,
    sepoliaContractAddress: SEPOLIA_REGISTRY_CONTRACT,
    currentBlockNumber: identityRepository.currentBlockNumber,
    privacyAudit,
  });
});

/**
 * POST /api/v1/auth/register
 * FR-01: Register a new Student / Holder account.
 */
apiRouter.post('/auth/register', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, studentId, email, program, password } = req.body || {};
    const newUser = identityService.registerStudent({
      fullName: String(fullName || ''),
      studentId: String(studentId || ''),
      email: String(email || ''),
      program: String(program || ''),
      password: password ? String(password) : undefined,
    });
    res.status(201).json({ user: newUser });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/v1/did/create
 * FR-04: Create or associate a DID for a student holder.
 */
apiRouter.post(
  '/did/create',
  requireRoles([UserRole.STUDENT_HOLDER, UserRole.ADMIN]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = req.body?.userId || req.currentUser!.id;
      const didRecord = identityService.createOrAssociateDidForUser(
        String(targetUserId),
        req.body?.customSeed ? String(req.body.customSeed) : undefined
      );
      res.status(201).json({ didRecord });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/v1/did/resolve
 * FR-05: Resolve a supported DID and return its W3C DID Document.
 */
apiRouter.get('/did/resolve', (req: AuthenticatedRequest, res: Response) => {
  try {
    const did = String(req.query.did || '');
    const resolved = identityService.resolveDid(
      did,
      req.currentUser?.id || 'anonymous',
      req.currentUser?.role || UserRole.VERIFIER
    );
    res.json({ resolved });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/v1/credentials/issue
 * FR-07, FR-08, FR-09: University Issuer signs and delivers a student credential.
 */
apiRouter.post(
  '/credentials/issue',
  requireRoles([UserRole.UNIVERSITY_ISSUER]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { holderUserId, program, enrollmentStatus, academicYear, universityName, expirationDate } =
        req.body || {};
      const credential = identityService.issueStudentCredential({
        issuerUserId: req.currentUser!.id,
        holderUserId: String(holderUserId || ''),
        program: String(program || ''),
        enrollmentStatus: String(enrollmentStatus || 'Active'),
        academicYear: String(academicYear || '2026-2027'),
        universityName: universityName ? String(universityName) : undefined,
        expirationDate: expirationDate ? String(expirationDate) : undefined,
      });
      res.status(201).json({ credential });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/credentials/status
 * FR-17 & FR-24: Authorized University Issuer revokes or reinstates an issued credential.
 */
apiRouter.post(
  '/credentials/status',
  requireRoles([UserRole.UNIVERSITY_ISSUER]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { credentialId, status, reason } = req.body || {};
      const updated = identityService.updateCredentialStatus({
        issuerUserId: req.currentUser!.id,
        credentialId: String(credentialId || ''),
        newStatus: status as CredentialStatus,
        reason: reason ? String(reason) : undefined,
      });
      res.json({ credential: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * DELETE /api/v1/wallet/credentials/:credentialId
 * FR-22: Remove a credential from the holder's local wallet interface (does not erase blockchain record).
 */
apiRouter.delete(
  '/wallet/credentials/:credentialId',
  requireRoles([UserRole.STUDENT_HOLDER]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      identityService.removeCredentialFromWallet(
        req.currentUser!.id,
        String(req.params.credentialId)
      );
      res.json({ removed: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/presentations/request
 * Verifier requests specific student claims from a holder.
 */
apiRouter.post(
  '/presentations/request',
  requireRoles([UserRole.VERIFIER, UserRole.ADMIN]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { holderUserId, verifierName, requestedClaims, purpose } = req.body || {};
      const request = identityService.createPresentationRequest({
        verifierId: req.currentUser!.id,
        verifierName: String(verifierName || req.currentUser!.fullName),
        holderUserId: String(holderUserId || ''),
        requestedClaims: (requestedClaims || []) as (keyof StudentCredentialClaims)[],
        purpose: String(purpose || ''),
      });
      res.status(201).json({ request });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/presentations/respond
 * FR-11, FR-12, FR-13, FR-20: Student Holder approves (with selective disclosure), denies, or cancels a sharing request.
 */
apiRouter.post(
  '/presentations/respond',
  requireRoles([UserRole.STUDENT_HOLDER]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { requestId, decision, credentialId, approvedClaims } = req.body || {};
      const outcome = identityService.respondToPresentationRequest({
        holderUserId: req.currentUser!.id,
        requestId: String(requestId || ''),
        decision: decision as 'APPROVE' | 'DENY' | 'CANCEL',
        credentialId: credentialId ? String(credentialId) : undefined,
        approvedClaims: approvedClaims as (keyof StudentCredentialClaims)[] | undefined,
      });
      res.json(outcome);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/v1/verify
 * FR-14 to FR-19: Run 6-stage fail-closed verification on a credential, presentation, or SRS test case.
 */
apiRouter.post('/verify', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { payload, testCaseId, forceRpcOutage } = req.body || {};
    let targetPayload = payload;
    let simulateOutage = Boolean(forceRpcOutage);

    if (testCaseId) {
      const tc = identityRepository.testDatasetCases.find((c) => c.testCaseId === testCaseId);
      if (!tc) {
        res.status(404).json({ error: `Test case '${testCaseId}' not found.` });
        return;
      }
      targetPayload = tc.credential;
      if (tc.simulatesRpcOutage) {
        simulateOutage = true;
      }
    }

    const result = identityService.verifyPayload({
      actorId: req.currentUser?.id || 'usr-verifier-1',
      actorRole: req.currentUser?.role || UserRole.VERIFIER,
      payload: targetPayload,
      forceRpcOutage: simulateOutage,
    });

    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/v1/network/rpc-status
 * NFR-07 & NFR-15: Toggle Ethereum Sepolia RPC / Resolver online status to demonstrate fail-closed behavior.
 */
apiRouter.post('/network/rpc-status', (req: AuthenticatedRequest, res: Response) => {
  const online = Boolean(req.body?.online);
  const status = identityService.setEthereumRpcStatus(online, req.currentUser?.id || 'usr-admin-1');
  res.json({ ethereumRpcOnline: status });
});

/**
 * POST /api/v1/system/reset
 * Resets demo repository state back to the deterministic baseline.
 */
apiRouter.post('/system/reset', (_req: AuthenticatedRequest, res: Response) => {
  identityRepository.resetToSeed();
  res.json({ reset: true });
});
