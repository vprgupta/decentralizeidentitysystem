/**
 * @file StudentWalletView.tsx
 * @description Student Holder Wallet Interface implementing SRS Functional Requirements:
 * FR-01 (Student Registration), FR-04 (DID Creation), FR-05 (DID Resolution),
 * FR-06 & FR-10 (Wallet Dashboard & Credential Display), FR-11 & FR-12 (Consent & Selective Disclosure),
 * FR-13 (Presentation Generation & Scannable OpenID4VP QR Pass), FR-20 (Consent Withdrawal), and FR-22 (Credential Removal).
 */

import React, { useState } from 'react';
import {
  DIDReferenceRecord,
  PresentationRequest,
  SharingRequestStatus,
  StudentCredentialClaims,
  UserAccount,
  UserRole,
  VerifiableCredential,
  VerifiablePresentation,
} from '../../shared/types/did.types';
import {
  buildPresentationQrUri,
  generateQrMatrix,
} from '../../shared/domain/qrPresentationUri';
import { apiClient } from '../services/apiClient';

interface StudentWalletViewProps {
  activeUser: UserAccount;
  allUsers: UserAccount[];
  didRecords: DIDReferenceRecord[];
  credentials: VerifiableCredential[];
  presentationRequests: PresentationRequest[];
  presentations: VerifiablePresentation[];
  ethereumRpcOnline: boolean;
  onSelectUser: (userId: string) => void;
  onRefresh: () => Promise<void>;
  onNavigateToVerifierWithPresentation: (vp: VerifiablePresentation) => void;
}

const CLAIM_LABELS: Record<keyof StudentCredentialClaims, string> = {
  studentName: 'Student Full Name',
  studentNumber: 'University ID Number',
  program: 'Academic Program',
  enrollmentStatus: 'Enrollment Status',
  academicYear: 'Academic Year',
  universityName: 'Institution',
};

const ALL_CLAIM_KEYS: (keyof StudentCredentialClaims)[] = [
  'studentName',
  'studentNumber',
  'program',
  'enrollmentStatus',
  'academicYear',
  'universityName',
];

export const StudentWalletView: React.FC<StudentWalletViewProps> = ({
  activeUser,
  allUsers,
  didRecords,
  credentials,
  presentationRequests,
  presentations,
  onSelectUser,
  onRefresh,
  onNavigateToVerifierWithPresentation,
}) => {
  const studentUsers = allUsers.filter((u) => u.role === UserRole.STUDENT_HOLDER);
  const currentStudent =
    activeUser.role === UserRole.STUDENT_HOLDER
      ? activeUser
      : studentUsers[0] || activeUser;

  const studentDidRecord = didRecords.find(
    (d) => d.ownerUserId === currentStudent.id
  );
  const studentCredentials = credentials.filter(
    (c) => c.credentialSubject.id === currentStudent.did
  );
  const studentRequests = presentationRequests.filter(
    (r) => r.holderUserId === currentStudent.id
  );
  const studentPresentations = presentations.filter(
    (vp) => vp.holder === currentStudent.did
  );

  const [showDidDoc, setShowDidDoc] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);
  const [expandedVcId, setExpandedVcId] = useState<string | null>(null);

  const [selectedClaimsByReq, setSelectedClaimsByReq] = useState<
    Record<string, (keyof StudentCredentialClaims)[]>
  >(() => {
    const initial: Record<string, (keyof StudentCredentialClaims)[]> = {};
    for (const req of presentationRequests) {
      initial[req.id] = req.requestedClaims.filter((c) => c !== 'studentNumber');
    }
    return initial;
  });

  const [customDisclosedClaims, setCustomDisclosedClaims] = useState<
    (keyof StudentCredentialClaims)[]
  >(['enrollmentStatus', 'program', 'universityName']);
  const [customAudience, setCustomAudience] = useState(
    'Campus Library & Research Fellowship'
  );
  const [customNonce, setCustomNonce] = useState('nonce-student-pass-2026');
  const [showCustomPresentationBuilder, setShowCustomPresentationBuilder] =
    useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newDepartment, setNewDepartment] = useState(
    'B.Tech Computer Science & Engineering'
  );

  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [selectedQrVpId, setSelectedQrVpId] = useState<string>('');
  const [copiedQrUri, setCopiedQrUri] = useState<boolean>(false);

  const activeQrPresentation: VerifiablePresentation | undefined =
    studentPresentations.find((vp) => vp.id === selectedQrVpId) ||
    studentPresentations[studentPresentations.length - 1];

  const qrUriString = activeQrPresentation
    ? buildPresentationQrUri(activeQrPresentation)
    : '';
  const qrMatrix = qrUriString ? generateQrMatrix(qrUriString) : [];

  const initials = currentStudent.fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleCopyDid = async () => {
    if (!studentDidRecord?.did) return;
    try {
      await navigator.clipboard.writeText(studentDidRecord.did);
      setCopiedDid(true);
      setTimeout(() => setCopiedDid(false), 2000);
    } catch {
      // ignore clipboard fallback
    }
  };

  const handleCopyQrUri = async () => {
    if (!qrUriString) return;
    try {
      await navigator.clipboard.writeText(qrUriString);
      setCopiedQrUri(true);
      setTimeout(() => setCopiedQrUri(false), 2000);
    } catch {
      setStatusBanner({
        type: 'info',
        text: `Encoded URI: ${qrUriString}`,
      });
    }
  };

  const getSelectedClaimsForRequest = (
    req: PresentationRequest
  ): (keyof StudentCredentialClaims)[] => {
    if (selectedClaimsByReq[req.id]) {
      return selectedClaimsByReq[req.id];
    }
    return req.requestedClaims;
  };

  const toggleClaimForRequest = (
    req: PresentationRequest,
    claimKey: keyof StudentCredentialClaims
  ) => {
    const current = getSelectedClaimsForRequest(req);
    const updated = current.includes(claimKey)
      ? current.filter((c) => c !== claimKey)
      : [...current, claimKey];
    setSelectedClaimsByReq((prev) => ({
      ...prev,
      [req.id]: updated,
    }));
  };

  const handleCreateOrRotateDid = async () => {
    setIsBusy(true);
    setStatusBanner(null);
    try {
      const res = await apiClient.createDid(
        currentStudent.id,
        currentStudent.id
      );
      setStatusBanner({
        type: 'success',
        text: `Anchored student identity (${res.didRecord.did}) on Sepolia Block #${res.didRecord.blockNumber}. Zero personal data written on-chain.`,
      });
      await onRefresh();
    } catch (err) {
      setStatusBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    setIsBusy(true);
    setStatusBanner(null);
    try {
      await apiClient.removeCredentialFromWallet(
        currentStudent.id,
        credentialId
      );
      setStatusBanner({
        type: 'info',
        text: `Credential ${credentialId} removed from local wallet storage.`,
      });
      await onRefresh();
    } catch (err) {
      setStatusBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleApproveRequest = async (req: PresentationRequest) => {
    if (studentCredentials.length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'No active credential in wallet to generate a presentation.',
      });
      return;
    }
    const approvedClaims = getSelectedClaimsForRequest(req);
    if (approvedClaims.length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'Please select at least one claim to disclose in the presentation.',
      });
      return;
    }

    setIsBusy(true);
    setStatusBanner(null);
    try {
      const res = await apiClient.respondToPresentationRequest(
        currentStudent.id,
        {
          requestId: req.id,
          decision: 'APPROVE',
          credentialId: studentCredentials[0].id,
          approvedClaims,
        }
      );
      if (res.presentation) {
        setSelectedQrVpId(res.presentation.id);
      }
      setStatusBanner({
        type: 'success',
        text: `Verifiable presentation generated with ${approvedClaims.length} approved claims. QR Pass updated below.`,
      });
      await onRefresh();
    } catch (err) {
      setStatusBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDenyOrWithdrawRequest = async (
    req: PresentationRequest,
    action: 'DENY' | 'WITHDRAW'
  ) => {
    setIsBusy(true);
    setStatusBanner(null);
    try {
      await apiClient.respondToPresentationRequest(currentStudent.id, {
        requestId: req.id,
        decision: action === 'WITHDRAW' ? 'CANCEL' : 'DENY',
      });
      setStatusBanner({
        type: 'info',
        text:
          action === 'WITHDRAW'
            ? `Consent withdrawn for request ${req.id}.`
            : `Verification request ${req.id} declined.`,
      });
      await onRefresh();
    } catch (err) {
      setStatusBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateCustomPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentCredentials.length === 0) return;
    setIsBusy(true);
    setStatusBanner(null);
    try {
      const reqRes = await apiClient.createPresentationRequest(
        currentStudent.id,
        {
          holderUserId: currentStudent.id,
          verifierName: customAudience,
          purpose: `Student-initiated selective proof pass (${customNonce})`,
          requestedClaims: customDisclosedClaims,
        }
      );
      const res = await apiClient.respondToPresentationRequest(
        currentStudent.id,
        {
          requestId: reqRes.request.id,
          decision: 'APPROVE',
          credentialId: studentCredentials[0].id,
          approvedClaims: customDisclosedClaims,
        }
      );
      if (res.presentation) {
        setSelectedQrVpId(res.presentation.id);
      }
      setStatusBanner({
        type: 'success',
        text: `Created custom selective presentation (${res.presentation?.id}) and updated QR Pass.`,
      });
      setShowCustomPresentationBuilder(false);
      await onRefresh();
    } catch (err) {
      setStatusBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newStudentId.trim()) return;
    setIsBusy(true);
    setStatusBanner(null);
    try {
      const res = await apiClient.registerStudent(currentStudent.id, {
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        studentId: newStudentId.trim(),
        program: newDepartment.trim(),
      });
      setShowRegisterModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewStudentId('');
      await onRefresh();
      onSelectUser(res.user.id);
      setStatusBanner({
        type: 'success',
        text: `Registered student profile for ${res.user.fullName}. Click "Create Decentralized ID" to anchor keys on Sepolia.`,
      });
    } catch (err) {
      setStatusBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Status Notification Banner */}
      {statusBanner && (
        <div
          role="status"
          className={`animate-view-enter px-4 py-3.5 rounded-lg border text-[14px] flex items-center justify-between gap-4 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : statusBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-slate-100 border-slate-200 text-slate-900'
          }`}
        >
          <span className="font-medium leading-snug">{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[13px] font-semibold text-slate-700 hover:text-slate-950 underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION B: STUDENT IDENTITY & CREDENTIAL WALLET HEADER */}
      <section className="space-y-6">
        {/* Page Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-1.5 flex-1 min-w-0 max-w-2xl">
            <p className="text-[13px] font-medium text-blue-700">
              Holder Workspace · W3C Decentralized Identity
            </p>
            <h1 className="text-[26px] sm:text-[30px] font-bold text-slate-950 leading-tight">
              Student Identity &amp; Credential Wallet
            </h1>
            <p className="text-[14.5px] text-slate-600 leading-relaxed">
              Manage your self-sovereign university identity, inspect signed academic credentials, and control attribute-level disclosure when responding to verification requests.
            </p>
          </div>

          {/* Profile Switcher & New Student Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
              <label
                htmlFor="student-holder-select"
                className="text-[12.5px] font-medium text-slate-500 shrink-0"
              >
                Student
              </label>
              <select
                id="student-holder-select"
                aria-label="Select Active Student Holder"
                value={currentStudent.id}
                onChange={(e) => onSelectUser(e.target.value)}
                className="min-h-[40px] px-3 text-[13.5px] bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-600 cursor-pointer w-full sm:w-[250px] truncate"
              >
                {studentUsers.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.studentId}){' '}
                    {st.did ? '· Active' : '· Unregistered'}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowRegisterModal((v) => !v)}
              className="min-h-[40px] px-4 text-[13.5px] font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              {showRegisterModal ? 'Cancel' : '+ Add Profile'}
            </button>
          </div>
        </div>

        {/* Inline Student Registration Panel */}
        {showRegisterModal && (
          <form
            onSubmit={handleRegisterStudent}
            className="animate-view-enter surface-panel rounded-xl p-5 sm:p-6 space-y-5"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-[17px] font-semibold text-slate-950">
                Register New Student Holder Profile
              </h2>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Creates a local student wallet account ready for decentralized key generation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[14px]">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Verma"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  University Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="rohan@kiit.ac.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Student Roll Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="23059999"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg font-mono text-[14px] focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Academic Program
                </label>
                <input
                  type="text"
                  required
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="min-h-[40px] px-4 text-[14px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="min-h-[40px] px-5 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Create Profile
              </button>
            </div>
          </form>
        )}

        {/* Prominent Student Identity & DID Anchor Panel */}
        <div className="surface-panel rounded-xl overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-slate-900 text-white font-display font-semibold text-[15px] flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <h2 className="text-[20px] sm:text-[21px] font-bold text-slate-950">
                    {currentStudent.fullName}
                  </h2>
                  <div className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                    <span className="font-mono text-slate-500">
                      Roll {currentStudent.studentId}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span
                      className={`font-medium ${
                        studentDidRecord ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {studentDidRecord
                        ? 'Anchored on Sepolia'
                        : 'Pending DID Anchor'}
                    </span>
                  </div>
                </div>
                <p className="text-[14px] text-slate-600 leading-snug">
                  {currentStudent.program} · {currentStudent.email}
                </p>
              </div>
            </div>

            {/* Identity Actions */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
              {studentDidRecord && (
                <button
                  type="button"
                  onClick={() => setShowDidDoc((v) => !v)}
                  className="min-h-[40px] px-3.5 text-[13px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer text-center whitespace-nowrap"
                >
                  {showDidDoc ? 'Hide DID Document' : 'View DID Document'}
                </button>
              )}
              <button
                type="button"
                disabled={isBusy}
                onClick={handleCreateOrRotateDid}
                data-testid="btn-create-or-rotate-did"
                className="min-h-[40px] px-4 text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-center whitespace-nowrap"
              >
                {studentDidRecord ? 'Rotate Keys' : 'Create Decentralized ID'}
              </button>
            </div>
          </div>

          {/* Lower Cryptographic DID Row */}
          <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-t border-slate-200/80">
            {studentDidRecord ? (
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="font-medium text-slate-500">
                      W3C Decentralized Identifier
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDid}
                      className="font-medium text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      {copiedDid ? 'Copied' : 'Copy DID'}
                    </button>
                  </div>
                  <code
                    data-testid="active-student-did"
                    className="block font-mono text-[12.5px] sm:text-[13px] text-slate-900 break-all leading-relaxed"
                  >
                    {studentDidRecord.did}
                  </code>
                </div>
                <div className="text-[12px] text-slate-500 font-mono shrink-0 lg:text-right">
                  <span className="block text-slate-700 font-medium tabular-nums">
                    Sepolia Block #{studentDidRecord.blockNumber.toLocaleString()}
                  </span>
                  <span>32-Byte Public Key Commitment</span>
                </div>
              </div>
            ) : (
              <p className="text-[13.5px] text-amber-900">
                No Decentralized Identifier has been generated for this student profile yet. Click &ldquo;Create Decentralized ID&rdquo; above to generate a local key pair and anchor its public commitment on Ethereum Sepolia.
              </p>
            )}
          </div>

          {/* Collapsible W3C DID Document */}
          {showDidDoc && studentDidRecord && (
            <div className="animate-view-enter p-5 sm:p-6 bg-slate-950 text-slate-200 border-t border-slate-800 font-mono text-[12px] overflow-x-auto">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
                <span>W3C DID v1.0 Resolution Document</span>
                <span className="text-emerald-400">
                  Resolved via did:ethr:sepolia
                </span>
              </div>
              <pre className="leading-relaxed text-[11.5px] sm:text-[12px]">
                {JSON.stringify(studentDidRecord.didDocument, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* SECTIONS C & D: CREDENTIALS (LEFT) & VERIFICATION REQUESTS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start border-t border-slate-200 pt-10">
        {/* SECTION C: CREDENTIALS */}
        <section className="lg:col-span-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-[20px] font-bold text-slate-950">
                Credentials ({studentCredentials.length})
              </h2>
              <p className="text-[14px] text-slate-600 mt-0.5">
                Signed W3C Verifiable Credentials stored privately on your device
              </p>
            </div>
            {studentCredentials.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCustomPresentationBuilder((v) => !v)}
                className="min-h-[38px] px-3.5 text-[13px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                {showCustomPresentationBuilder
                  ? 'Close Proof Builder'
                  : '+ Generate Custom Proof'}
              </button>
            )}
          </div>

          {/* Custom Selective Disclosure Builder */}
          {showCustomPresentationBuilder && studentCredentials.length > 0 && (
            <form
              onSubmit={handleCreateCustomPresentation}
              className="animate-view-enter surface-panel rounded-xl p-5 sm:p-6 space-y-5"
            >
              <div>
                <h3 className="text-[16px] font-semibold text-slate-950">
                  Custom Selective Proof Builder
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Choose which attributes to reveal. Unchecked attributes are replaced with salted SHA-256 commitments.
                </p>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {ALL_CLAIM_KEYS.map((key) => {
                  const checked = customDisclosedClaims.includes(key);
                  const val =
                    studentCredentials[0]?.credentialSubject.claims[key] || '';
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/80 cursor-pointer text-[14px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCustomDisclosedClaims((prev) =>
                              prev.includes(key)
                                ? prev.filter((k) => k !== key)
                                : [...prev, key]
                            )
                          }
                          className="w-4 h-4 accent-blue-700 rounded cursor-pointer"
                        />
                        <span className="font-medium text-slate-900">
                          {CLAIM_LABELS[key]}
                        </span>
                      </div>
                      <span className="text-[13px] text-slate-500 font-mono truncate max-w-[160px]">
                        {val}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Target Audience / Verifier
                  </label>
                  <input
                    type="text"
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Challenge Nonce
                  </label>
                  <input
                    type="text"
                    value={customNonce}
                    onChange={(e) => setCustomNonce(e.target.value)}
                    className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isBusy || customDisclosedClaims.length === 0}
                  className="min-h-[40px] px-4 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Create Presentation &amp; Update QR Pass
                </button>
              </div>
            </form>
          )}

          {studentCredentials.length === 0 ? (
            <div className="surface-panel rounded-xl p-10 text-center space-y-2">
              <p className="text-[15px] font-semibold text-slate-900">
                No credentials in this wallet
              </p>
              <p className="text-[14px] text-slate-500 max-w-md mx-auto">
                Switch to the <strong>University Issuer</strong> workspace to issue and sign a W3C Verifiable Credential for {currentStudent.fullName}.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {studentCredentials.map((vc) => {
                const isExpanded = expandedVcId === vc.id;
                const isRevoked = vc.credentialStatus.status === 'REVOKED';
                return (
                  <article
                    key={vc.id}
                    data-testid={`wallet-vc-card-${vc.id}`}
                    className={`rounded-xl overflow-hidden ${
                      isRevoked
                        ? 'credential-document-revoked'
                        : 'credential-document'
                    }`}
                  >
                    {/* Credential Document Header */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="font-mono text-slate-500">
                          {vc.id}
                        </span>
                        <span
                          className={`font-semibold ${
                            isRevoked ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {isRevoked ? 'Revoked' : 'Active Credential'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-[18px] sm:text-[19px] font-bold text-slate-950 leading-snug">
                          University Enrollment Credential
                        </h3>
                        <p className="text-[13px] text-slate-500 mt-0.5">
                          Issued by {vc.issuerName}
                        </p>
                      </div>
                    </div>

                    {/* Credential Attributes Grid */}
                    <div className="p-5 sm:p-6 grid grid-cols-2 gap-y-5 gap-x-5">
                      <div>
                        <span className="block text-[12px] font-medium text-slate-500">
                          Student Name
                        </span>
                        <span className="mt-0.5 block text-[15px] font-semibold text-slate-950">
                          {vc.credentialSubject.claims.studentName}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[12px] font-medium text-slate-500">
                          Student ID Number
                        </span>
                        <span className="mt-0.5 block text-[15px] font-mono font-semibold text-slate-900">
                          {vc.credentialSubject.claims.studentNumber}
                        </span>
                      </div>

                      <div className="col-span-2 pt-3 border-t border-slate-100">
                        <span className="block text-[12px] font-medium text-slate-500">
                          Academic Program
                        </span>
                        <span className="mt-0.5 block text-[14.5px] font-medium text-slate-900 leading-snug">
                          {vc.credentialSubject.claims.program}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <span className="block text-[12px] font-medium text-slate-500">
                          Enrollment Status
                        </span>
                        <span className="mt-0.5 block text-[14px] font-semibold text-emerald-700">
                          {vc.credentialSubject.claims.enrollmentStatus} (
                          {vc.credentialSubject.claims.academicYear})
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <span className="block text-[12px] font-medium text-slate-500">
                          Validity Window
                        </span>
                        <span className="mt-0.5 block text-[13px] font-mono text-slate-700">
                          {vc.issuanceDate.slice(0, 10)} –{' '}
                          {vc.expirationDate.slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Actions Bar */}
                    <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[12px] font-mono text-slate-500">
                        Sepolia Index #{vc.credentialStatus.statusListIndex} · 6 Salted Hashes
                      </span>

                      <div className="flex items-center gap-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedVcId(isExpanded ? null : vc.id)
                          }
                          className="text-[13px] font-medium text-slate-700 hover:text-blue-700 cursor-pointer"
                        >
                          {isExpanded ? 'Hide Proof JSON' : 'Inspect Proof JSON'}
                        </button>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemoveCredential(vc.id)}
                          aria-label={`Remove credential ${vc.id} from wallet`}
                          className="text-[13px] font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Collapsible JSON Inspector */}
                    {isExpanded && (
                      <div className="animate-view-enter p-5 bg-slate-950 text-slate-200 border-t border-slate-800 font-mono text-[12px]">
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800 text-slate-400">
                          <span>W3C Verifiable Credential v2.0 Payload</span>
                          <span className="text-emerald-400">
                            DataIntegrityProof Verified
                          </span>
                        </div>
                        <pre className="overflow-x-auto max-h-60 leading-relaxed text-[11px] sm:text-[12px]">
                          {JSON.stringify(vc, null, 2)}
                        </pre>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION D: VERIFICATION REQUESTS */}
        <section className="lg:col-span-6 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-[20px] font-bold text-slate-950">
              Verification Requests ({studentRequests.length})
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Select which attributes to disclose before approving a verifier’s request
            </p>
          </div>

          {studentRequests.length === 0 ? (
            <div className="surface-panel rounded-xl p-10 text-center text-[14px] text-slate-500">
              No verification requests for this student profile.
            </div>
          ) : (
            <div className="space-y-5">
              {studentRequests.map((req) => {
                const selectedClaims = getSelectedClaimsForRequest(req);
                const isPending = req.status === SharingRequestStatus.PENDING;
                const withheldCount =
                  req.requestedClaims.length - selectedClaims.length;

                return (
                  <article
                    key={req.id}
                    data-testid={`sharing-request-${req.id}`}
                    className="surface-panel rounded-xl overflow-hidden"
                  >
                    {/* Request Header */}
                    <div className="p-5 sm:p-6 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[16.5px] font-semibold text-slate-950 leading-snug">
                          {req.verifierName}
                        </h3>
                        <span
                          className={`text-[12.5px] font-semibold shrink-0 ${
                            req.status === SharingRequestStatus.APPROVED
                              ? 'text-emerald-700'
                              : req.status === SharingRequestStatus.PENDING
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {req.status === SharingRequestStatus.PENDING
                            ? 'Pending consent'
                            : req.status === SharingRequestStatus.APPROVED
                            ? 'Approved'
                            : req.status}
                        </span>
                      </div>

                      <p className="text-[14px] text-slate-600 leading-relaxed">
                        {req.purpose}
                      </p>

                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[12px] font-mono text-slate-400">
                        <span>{req.id}</span>
                        <span>·</span>
                        <span>Challenge: {req.challengeNonce}</span>
                      </div>
                    </div>

                    {/* Requested Attributes Table */}
                    <div className="border-t border-slate-200">
                      <div className="px-5 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-[12px] font-medium text-slate-500">
                        <span>Select attributes to disclose</span>
                        <span className="text-slate-700 tabular-nums">
                          {selectedClaims.length} shared · {withheldCount} withheld
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {req.requestedClaims.map((claimKey) => {
                          const isChecked = selectedClaims.includes(claimKey);
                          const sampleVal =
                            studentCredentials[0]?.credentialSubject.claims[
                              claimKey
                            ] || 'Available';
                          return (
                            <label
                              key={claimKey}
                              className={`px-5 sm:px-6 py-3 flex items-center justify-between gap-3 transition-colors ${
                                isPending
                                  ? 'cursor-pointer hover:bg-slate-50/80'
                                  : ''
                              } ${isChecked ? 'bg-white' : 'bg-slate-50/50'}`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <input
                                  type="checkbox"
                                  disabled={!isPending}
                                  checked={isChecked}
                                  onChange={() =>
                                    toggleClaimForRequest(req, claimKey)
                                  }
                                  className="w-4 h-4 accent-blue-700 rounded cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <span
                                    className={`block text-[14px] font-medium ${
                                      isChecked
                                        ? 'text-slate-950'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {CLAIM_LABELS[claimKey]}
                                  </span>
                                  <span
                                    className={`block text-[12.5px] font-mono truncate ${
                                      isChecked
                                        ? 'text-slate-500'
                                        : 'text-slate-400 line-through'
                                    }`}
                                  >
                                    {sampleVal}
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`text-[12.5px] font-medium shrink-0 ${
                                  isChecked
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {isChecked ? 'Shared' : 'Withheld'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Balanced Action Footer */}
                    <div className="px-5 sm:px-6 py-4 bg-slate-50/60 border-t border-slate-200/80">
                      {isPending ? (
                        <div className="grid grid-cols-2 sm:flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isBusy || studentCredentials.length === 0}
                            onClick={() => handleApproveRequest(req)}
                            data-testid={`btn-approve-${req.id}`}
                            className="min-h-[42px] px-4 py-2 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap text-center"
                          >
                            Approve ({selectedClaims.length} Claims)
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleDenyOrWithdrawRequest(req, 'DENY')
                            }
                            className="min-h-[42px] px-4 py-2 text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-center"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-[13px] text-slate-600">
                          <span>
                            Status:{' '}
                            <strong className="text-slate-900 font-semibold">
                              {req.status}
                            </strong>
                          </span>
                          {req.status === SharingRequestStatus.APPROVED && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleDenyOrWithdrawRequest(req, 'WITHDRAW')
                              }
                              className="text-[13px] font-medium text-rose-600 hover:text-rose-800 underline cursor-pointer"
                            >
                              Withdraw Consent
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* SECTION E: VERIFIABLE PRESENTATION QR PASS */}
      <section
        data-testid="wallet-qr-pass-section"
        className="space-y-6 border-t border-slate-200 pt-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-slate-950">
              Verifiable Presentation QR Pass
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Encodes your signed selective disclosure presentation into an OpenID4VP URI for instant optical verification.
            </p>
          </div>

          {studentPresentations.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto shrink-0">
              <label
                htmlFor="qr-presentation-select"
                className="text-[12.5px] font-medium text-slate-500"
              >
                Active Pass
              </label>
              <select
                id="qr-presentation-select"
                aria-label="Selected Presentation for QR"
                value={activeQrPresentation?.id || ''}
                onChange={(e) => setSelectedQrVpId(e.target.value)}
                className="min-h-[40px] px-3 text-[13px] bg-white border border-slate-300 rounded-lg text-slate-900 font-mono cursor-pointer w-full sm:w-auto"
              >
                {studentPresentations.map((vp) => (
                  <option key={vp.id} value={vp.id}>
                    {vp.id} ({Object.keys(vp.disclosedClaims).length} Shared,{' '}
                    {vp.hiddenClaimKeys.length} Withheld)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!activeQrPresentation ? (
          <div className="surface-panel rounded-xl p-12 text-center text-[14px] text-slate-500">
            No presentation pass generated yet. Approve a verification request above or click &ldquo;+ Generate Custom Proof&rdquo; to create a scannable QR code.
          </div>
        ) : (
          <div className="surface-panel rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left 4 Columns: High-Contrast Scannable QR Pass */}
            <div className="lg:col-span-4 bg-slate-950 text-white p-6 sm:p-8 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
              <div className="w-full flex items-center justify-between text-[12px] font-mono text-slate-400 border-b border-slate-800 pb-3">
                <span>OpenID4VP Pass</span>
                <span className="text-emerald-400 font-medium">Signed</span>
              </div>

              <div
                data-testid="wallet-qr-code-svg-container"
                className="my-6 bg-white p-4 rounded-xl"
              >
                <svg
                  viewBox={`0 0 ${qrMatrix.length + 4} ${qrMatrix.length + 4}`}
                  className="w-48 h-48 block"
                  role="img"
                  aria-label={`QR Code encoding presentation ${activeQrPresentation.id}`}
                >
                  <rect
                    x="0"
                    y="0"
                    width={qrMatrix.length + 4}
                    height={qrMatrix.length + 4}
                    fill="#ffffff"
                  />
                  {qrMatrix.map((row: boolean[], rIdx: number) =>
                    row.map((cell: boolean, cIdx: number) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + 2}
                          y={rIdx + 2}
                          width={1}
                          height={1}
                          fill="#0f172a"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              <div className="w-full text-center space-y-1 pt-3 border-t border-slate-800">
                <p className="text-[14px] font-mono font-semibold text-white">
                  {activeQrPresentation.id}
                </p>
                <p className="text-[12px] font-mono text-slate-400">
                  Nonce: {activeQrPresentation.challengeNonce}
                </p>
              </div>
            </div>

            {/* Right 8 Columns: Presentation Hierarchy & Actions */}
            <div className="lg:col-span-8 p-5 sm:p-8 flex flex-col justify-between space-y-6">
              {/* Top Metadata Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-200">
                <div>
                  <span className="block text-[12px] font-medium text-slate-500">
                    Intended Verifier
                  </span>
                  <span className="mt-1 block text-[14px] font-semibold text-slate-950">
                    {activeQrPresentation.verifierAudience}
                  </span>
                </div>
                <div>
                  <span className="block text-[12px] font-medium text-slate-500">
                    Source Credential
                  </span>
                  <span className="mt-1 block text-[14px] font-mono text-slate-800">
                    {activeQrPresentation.verifiableCredential.id}
                  </span>
                </div>
                <div>
                  <span className="block text-[12px] font-medium text-slate-500">
                    Selective Disclosure
                  </span>
                  <span className="mt-1 block text-[14px] font-semibold text-emerald-700">
                    {Object.keys(activeQrPresentation.disclosedClaims).length}{' '}
                    shared · {activeQrPresentation.hiddenClaimKeys.length}{' '}
                    withheld
                  </span>
                </div>
              </div>

              {/* Attribute Breakdown: Disclosed vs Withheld */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-900">
                    Disclosed Attributes ({Object.keys(activeQrPresentation.disclosedClaims).length})
                  </h3>
                  <div className="divide-y divide-slate-100 border-t border-b border-slate-200">
                    {Object.entries(activeQrPresentation.disclosedClaims).map(
                      ([k, val]) => (
                        <div
                          key={k}
                          className="py-2.5 flex items-start justify-between gap-3 text-[13px]"
                        >
                          <span className="text-slate-500 shrink-0">
                            {CLAIM_LABELS[k as keyof StudentCredentialClaims] ||
                              k}
                          </span>
                          <span className="font-semibold text-slate-950 text-right">
                            {val}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-900">
                    Withheld Attributes ({activeQrPresentation.hiddenClaimKeys.length})
                  </h3>
                  {activeQrPresentation.hiddenClaimKeys.length === 0 ? (
                    <p className="py-2.5 text-[13px] text-slate-500 border-t border-slate-200">
                      All credential attributes are disclosed in this presentation.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 border-t border-b border-slate-200">
                      {activeQrPresentation.hiddenClaimKeys.map((hk) => (
                        <div
                          key={hk}
                          className="py-2.5 flex items-center justify-between gap-3 text-[13px]"
                        >
                          <span className="text-slate-700 font-medium">
                            {CLAIM_LABELS[
                              hk as keyof StudentCredentialClaims
                            ] || hk}
                          </span>
                          <span className="font-mono text-[12px] font-medium text-amber-700 shrink-0">
                            Salted Hash Only
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Encoded URI Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-slate-500">
                    Encoded OpenID4VP URI
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyQrUri}
                    data-testid="btn-copy-qr-uri"
                    className="text-[13px] font-medium text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    {copiedQrUri ? 'Copied URI' : 'Copy URI'}
                  </button>
                </div>
                <div
                  data-testid="wallet-qr-uri-display"
                  className="p-3 bg-slate-50 text-slate-700 font-mono text-[12px] rounded-lg break-all border border-slate-200 leading-relaxed"
                >
                  {qrUriString}
                </div>
              </div>

              {/* Verification Action Bar */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-[13px] text-slate-500">
                  Test how a campus verifier validates this presentation without seeing withheld attributes.
                </p>
                <button
                  type="button"
                  data-testid="btn-simulate-qr-scan"
                  onClick={() =>
                    onNavigateToVerifierWithPresentation(activeQrPresentation)
                  }
                  className="min-h-[42px] px-5 py-2 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer shrink-0 text-center whitespace-nowrap"
                >
                  Simulate Scanning in Verifier Console →
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
