/**
 * @file apiClient.ts
 * @description Typed HTTP client for communicating with the Express backend (/api/v1/*).
 */

import {
  AuditEvent,
  CredentialStatus,
  DIDReferenceRecord,
  OnChainTransactionRecord,
  PresentationRequest,
  StudentCredentialClaims,
  TestDatasetCase,
  TrustedIssuer,
  UserAccount,
  VerifiableCredential,
  VerifiablePresentation,
  VerificationResult,
} from '../../shared/types/did.types';

export interface WorkspaceStateResponse {
  activeUser: UserAccount;
  users: UserAccount[];
  didRecords: DIDReferenceRecord[];
  trustedIssuers: TrustedIssuer[];
  credentials: VerifiableCredential[];
  allIssuedCredentials: VerifiableCredential[];
  presentationRequests: PresentationRequest[];
  presentations: VerifiablePresentation[];
  verificationHistory: VerificationResult[];
  onChainTransactions: OnChainTransactionRecord[];
  onChainStatusRegistry: Record<string, CredentialStatus>;
  auditEvents: AuditEvent[];
  testDatasetCases: TestDatasetCase[];
  ethereumRpcOnline: boolean;
  sepoliaContractAddress: string;
  currentBlockNumber: number;
  privacyAudit: {
    compliant: boolean;
    violations: string[];
  };
}

async function requestJson<T>(
  path: string,
  actorUserId: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-actor-user-id': actorUserId,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const apiClient = {
  fetchState(actorUserId: string): Promise<WorkspaceStateResponse> {
    return requestJson<WorkspaceStateResponse>('/api/v1/state', actorUserId);
  },

  registerStudent(
    actorUserId: string,
    payload: { fullName: string; studentId: string; email: string; program: string }
  ): Promise<{ user: UserAccount }> {
    return requestJson('/api/v1/auth/register', actorUserId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createDid(actorUserId: string, userId?: string): Promise<{ didRecord: DIDReferenceRecord }> {
    return requestJson('/api/v1/did/create', actorUserId, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  resolveDid(actorUserId: string, did: string): Promise<{ resolved: DIDReferenceRecord }> {
    return requestJson(`/api/v1/did/resolve?did=${encodeURIComponent(did)}`, actorUserId);
  },

  issueCredential(
    actorUserId: string,
    payload: {
      holderUserId: string;
      program: string;
      enrollmentStatus: string;
      academicYear: string;
      universityName?: string;
      expirationDate?: string;
    }
  ): Promise<{ credential: VerifiableCredential }> {
    return requestJson('/api/v1/credentials/issue', actorUserId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCredentialStatus(
    actorUserId: string,
    payload: { credentialId: string; status: CredentialStatus; reason?: string }
  ): Promise<{ credential: VerifiableCredential }> {
    return requestJson('/api/v1/credentials/status', actorUserId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  removeCredentialFromWallet(actorUserId: string, credentialId: string): Promise<{ removed: boolean }> {
    return requestJson(
      `/api/v1/wallet/credentials/${encodeURIComponent(credentialId)}`,
      actorUserId,
      { method: 'DELETE' }
    );
  },

  createPresentationRequest(
    actorUserId: string,
    payload: {
      holderUserId: string;
      verifierName: string;
      requestedClaims: (keyof StudentCredentialClaims)[];
      purpose: string;
    }
  ): Promise<{ request: PresentationRequest }> {
    return requestJson('/api/v1/presentations/request', actorUserId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  respondToPresentationRequest(
    actorUserId: string,
    payload: {
      requestId: string;
      decision: 'APPROVE' | 'DENY' | 'CANCEL';
      credentialId?: string;
      approvedClaims?: (keyof StudentCredentialClaims)[];
    }
  ): Promise<{ request: PresentationRequest; presentation?: VerifiablePresentation }> {
    return requestJson('/api/v1/presentations/respond', actorUserId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyPayload(
    actorUserId: string,
    payload: { payload?: unknown; testCaseId?: string; forceRpcOutage?: boolean }
  ): Promise<{ result: VerificationResult }> {
    return requestJson('/api/v1/verify', actorUserId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  setEthereumRpcStatus(
    actorUserId: string,
    online: boolean
  ): Promise<{ ethereumRpcOnline: boolean }> {
    return requestJson('/api/v1/network/rpc-status', actorUserId, {
      method: 'POST',
      body: JSON.stringify({ online }),
    });
  },

  resetSystem(actorUserId: string): Promise<{ reset: boolean }> {
    return requestJson('/api/v1/system/reset', actorUserId, {
      method: 'POST',
    });
  },
};
