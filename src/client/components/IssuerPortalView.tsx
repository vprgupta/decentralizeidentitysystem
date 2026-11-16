/**
 * @file IssuerPortalView.tsx
 * @description University Issuer Dashboard implementing SRS Functional Requirements:
 * FR-07 (Issuer Authentication & Role Enforcement), FR-08 (Credential Issuance & Signing),
 * FR-09 (Credential Delivery to Intended Holder), FR-17 & FR-24 (Revocation & Status Management).
 */

import React, { useState } from 'react';
import {
  CredentialStatus,
  TrustedIssuer,
  UserAccount,
  UserRole,
  VerifiableCredential,
} from '../../shared/types/did.types';
import { apiClient } from '../services/apiClient';

interface IssuerPortalViewProps {
  activeUser: UserAccount;
  allUsers: UserAccount[];
  trustedIssuers: TrustedIssuer[];
  allIssuedCredentials: VerifiableCredential[];
  ethereumRpcOnline: boolean;
  onRefresh: () => Promise<void>;
}

export const IssuerPortalView: React.FC<IssuerPortalViewProps> = ({
  activeUser,
  allUsers,
  trustedIssuers,
  allIssuedCredentials,
  onRefresh,
}) => {
  const studentUsers = allUsers.filter(
    (u) => u.role === UserRole.STUDENT_HOLDER
  );
  const primaryIssuer = trustedIssuers[0];

  const [selectedHolderId, setSelectedHolderId] = useState<string>(
    studentUsers[3]?.id || studentUsers[0]?.id || ''
  );
  const [program, setProgram] = useState(
    'B.Tech Computer Science & Engineering (CS47001)'
  );
  const [enrollmentStatus, setEnrollmentStatus] = useState('Active');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [universityName, setUniversityName] = useState(
    'School of Computer Engineering'
  );
  const [expirationDate, setExpirationDate] = useState('2027-11-10');
  const [revocationReasonById, setRevocationReasonById] = useState<
    Record<string, string>
  >({});
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const isAuthorizedIssuerRole = activeUser.role === UserRole.UNIVERSITY_ISSUER;

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setFeedback(null);
    try {
      const res = await apiClient.issueCredential(activeUser.id, {
        holderUserId: selectedHolderId,
        program,
        enrollmentStatus,
        academicYear,
        universityName,
        expirationDate: new Date(expirationDate).toISOString(),
      });
      setFeedback({
        type: 'success',
        text: `Signed and delivered W3C Verifiable Credential (${res.credential.id}) to student wallet. Status index #${res.credential.credentialStatus.statusListIndex} anchored on Sepolia.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateCredentialStatus = async (
    credentialId: string,
    newStatus: CredentialStatus
  ) => {
    setIsBusy(true);
    setFeedback(null);
    try {
      const reason =
        revocationReasonById[credentialId] ||
        (newStatus === CredentialStatus.REVOKED
          ? 'Administrative revocation by University Registrar (FR-24)'
          : 'Reinstated to ACTIVE status');
      await apiClient.updateCredentialStatus(activeUser.id, {
        credentialId,
        status: newStatus,
        reason,
      });
      setFeedback({
        type: 'success',
        text: `Updated credential ${credentialId} status to ${newStatus} on Ethereum Sepolia.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Feedback Alert */}
      {feedback && (
        <div
          role="status"
          className={`animate-view-enter px-4 py-3.5 rounded-xl border text-[14px] flex items-center justify-between gap-4 ${
            feedback.type === 'success'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}
        >
          <span className="font-medium">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[13px] font-medium text-slate-600 hover:text-slate-950 underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Open Page Header & Institutional Authority Bar */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-[13px] font-medium text-slate-500">
              University Registrar · W3C Credential Authority
            </p>
            <h1 className="text-[26px] sm:text-[32px] font-bold text-slate-950 tracking-tight leading-tight">
              Academic Credential Issuance &amp; Registry
            </h1>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              Sign W3C Verifiable Credentials with per-claim salted SHA-256 commitments, deliver them to student wallets, and manage Sepolia revocation status indices.
            </p>
          </div>

          <div
            className={`px-4 py-3 rounded-xl border text-[13px] shrink-0 ${
              isAuthorizedIssuerRole
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/60 border-amber-200 text-amber-950'
            }`}
          >
            <span className="font-semibold block">
              RBAC Session Role: {activeUser.role}
            </span>
            <span className="text-[12px] text-slate-600">
              {isAuthorizedIssuerRole
                ? 'Authorized to sign credentials and update Sepolia status'
                : 'Read-only access — switch to Registrar profile to sign'}
            </span>
          </div>
        </div>

        {primaryIssuer && (
          <div className="surface-panel rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="block text-[12px] font-medium text-slate-500">
                Recognized Institution
              </span>
              <p className="mt-1 text-[15px] font-semibold text-slate-950">
                {primaryIssuer.displayName}
              </p>
              <p className="text-[13px] text-slate-600">
                {primaryIssuer.department}
              </p>
            </div>

            <div>
              <span className="block text-[12px] font-medium text-slate-500">
                Anchored Issuer DID
              </span>
              <code className="mt-1 block text-[13px] font-mono text-slate-900 break-all">
                {primaryIssuer.did}
              </code>
            </div>

            <div>
              <span className="block text-[12px] font-medium text-slate-500">
                Public Verification Key
              </span>
              <p className="mt-1 text-[13px] font-mono text-slate-700 truncate">
                {primaryIssuer.publicKeyHex.slice(0, 34)}...
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5 font-mono tabular-nums">
                Sepolia Registry Tx: {primaryIssuer.onChainRegistryTxHash.slice(0, 22)}...
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Main 2-Column Workspace: Issue Form & Issued Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start border-t border-slate-200 pt-8 sm:pt-10">
        {/* Left 5 Columns: Issuance Form */}
        <section className="lg:col-span-5 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              Issue &amp; Sign Credential
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Generates 6 salted SHA-256 commitments and signs with the University Registrar key
            </p>
          </div>

          <form
            onSubmit={handleIssueCredential}
            className="surface-panel rounded-xl p-6 space-y-4 text-[14px]"
          >
            <div>
              <label
                htmlFor="issuer-holder-select"
                className="block text-[13px] font-medium text-slate-700 mb-1.5"
              >
                Recipient Student Holder
              </label>
              <select
                id="issuer-holder-select"
                value={selectedHolderId}
                onChange={(e) => setSelectedHolderId(e.target.value)}
                className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {studentUsers.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.studentId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="issuer-program-input"
                className="block text-[13px] font-medium text-slate-700 mb-1.5"
              >
                Academic Program
              </label>
              <input
                id="issuer-program-input"
                type="text"
                required
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="issuer-enrollment-select"
                  className="block text-[13px] font-medium text-slate-700 mb-1.5"
                >
                  Enrollment Status
                </label>
                <select
                  id="issuer-enrollment-select"
                  value={enrollmentStatus}
                  onChange={(e) => setEnrollmentStatus(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Active">Active</option>
                  <option value="Enrolled - Final Year">
                    Enrolled - Final Year
                  </option>
                  <option value="Research Fellow">Research Fellow</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="issuer-year-input"
                  className="block text-[13px] font-medium text-slate-700 mb-1.5"
                >
                  Academic Year
                </label>
                <input
                  id="issuer-year-input"
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg font-mono text-[14px] text-slate-900 tabular-nums focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="issuer-school-input"
                  className="block text-[13px] font-medium text-slate-700 mb-1.5"
                >
                  Issuing Faculty / School
                </label>
                <input
                  id="issuer-school-input"
                  type="text"
                  required
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label
                  htmlFor="issuer-expiration-input"
                  className="block text-[13px] font-medium text-slate-700 mb-1.5"
                >
                  Expiration Date
                </label>
                <input
                  id="issuer-expiration-input"
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg font-mono text-[14px] text-slate-900 tabular-nums focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isBusy}
                data-testid="btn-issue-credential"
                className="w-full min-h-[44px] px-4 py-2 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Sign &amp; Anchor Credential
              </button>
            </div>
          </form>
        </section>

        {/* Right 7 Columns: Issued Credentials & Revocation Registry */}
        <section className="lg:col-span-7 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              Issued Credentials &amp; Revocation Registry ({allIssuedCredentials.length})
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Update Sepolia StatusList2021 indices in real time without exposing personal data on-chain
            </p>
          </div>

          <div className="space-y-4">
            {allIssuedCredentials.map((vc) => {
              const isRevoked =
                vc.credentialStatus.status === CredentialStatus.REVOKED;
              return (
                <article
                  key={vc.id}
                  data-testid={`issuer-vc-row-${vc.id}`}
                  className="surface-panel rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] font-mono text-slate-500 tabular-nums">
                        <span className="font-semibold text-slate-900">
                          {vc.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Sepolia Status Index #{vc.credentialStatus.statusListIndex}
                        </span>
                      </div>
                      <h3 className="text-[16px] font-semibold text-slate-950">
                        {vc.credentialSubject.claims.studentName} (
                        {vc.credentialSubject.claims.studentNumber})
                      </h3>
                      <p className="text-[14px] text-slate-600">
                        {vc.credentialSubject.claims.program}
                      </p>
                    </div>

                    <span
                      className={`text-[12px] font-mono font-semibold shrink-0 ${
                        isRevoked ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {vc.credentialStatus.status}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-slate-100">
                    <input
                      type="text"
                      aria-label={`Reason for status update on ${vc.id}`}
                      placeholder="Optional administrative reason for status change..."
                      value={revocationReasonById[vc.id] || ''}
                      onChange={(e) =>
                        setRevocationReasonById((prev) => ({
                          ...prev,
                          [vc.id]: e.target.value,
                        }))
                      }
                      className="flex-1 min-h-[40px] px-3 text-[13px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                    {isRevoked ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateCredentialStatus(
                            vc.id,
                            CredentialStatus.ACTIVE
                          )
                        }
                        className="min-h-[40px] px-4 py-2 text-[13px] font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Reinstate to ACTIVE
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        data-testid={`btn-revoke-${vc.id}`}
                        onClick={() =>
                          handleUpdateCredentialStatus(
                            vc.id,
                            CredentialStatus.REVOKED
                          )
                        }
                        className="min-h-[40px] px-4 py-2 text-[13px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Revoke on Sepolia
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
