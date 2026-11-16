/**
 * @file VerifierPortalView.tsx
 * @description Independent Credential & Presentation Verifier Interface implementing:
 * FR-14 (Cryptographic Proof Validation), FR-15 (Issuer Trust Check),
 * FR-16 (Validity Window Check), FR-17 (Revocation Status Check),
 * FR-19 (Verification Outcome Display), and SRS Section 12.1 (7 Minimum Test Dataset Scenarios).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StudentCredentialClaims,
  TestDatasetCase,
  UserAccount,
  UserRole,
  VerifiableCredential,
  VerifiablePresentation,
  VerificationOutcome,
  VerificationResult,
} from '../../shared/types/did.types';
import { apiClient } from '../services/apiClient';

interface VerifierPortalViewProps {
  activeUser: UserAccount;
  allUsers: UserAccount[];
  presentations: VerifiablePresentation[];
  allIssuedCredentials: VerifiableCredential[];
  testDatasetCases: TestDatasetCase[];
  verificationHistory: VerificationResult[];
  ethereumRpcOnline: boolean;
  preselectedPresentation: VerifiablePresentation | null;
  onRefresh: () => Promise<void>;
}

const ALL_CLAIM_KEYS: { key: keyof StudentCredentialClaims; label: string }[] = [
  { key: 'enrollmentStatus', label: 'Enrollment Status' },
  { key: 'program', label: 'Academic Program' },
  { key: 'universityName', label: 'Institution Name' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'studentName', label: 'Student Full Name' },
  { key: 'studentNumber', label: 'Student ID Number (Sensitive)' },
];

export const VerifierPortalView: React.FC<VerifierPortalViewProps> = ({
  activeUser,
  allUsers,
  presentations,
  testDatasetCases,
  verificationHistory,
  ethereumRpcOnline,
  preselectedPresentation,
  onRefresh,
}) => {
  const studentHolders = allUsers.filter(
    (u) => u.role === UserRole.STUDENT_HOLDER && u.did
  );
  const verifierAccount =
    allUsers.find((u) => u.role === UserRole.VERIFIER) || activeUser;

  const [activeResult, setActiveResult] = useState<VerificationResult | null>(
    () => verificationHistory[0] || null
  );
  const [jsonInput, setJsonInput] = useState<string>(() =>
    preselectedPresentation
      ? JSON.stringify(preselectedPresentation, null, 2)
      : testDatasetCases[0]
      ? JSON.stringify(testDatasetCases[0].credential, null, 2)
      : ''
  );
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('TC-01');
  const [batchResults, setBatchResults] = useState<
    Record<string, { outcome: VerificationOutcome; passedExpectation: boolean }>
  >({});

  const [reqHolderId, setReqHolderId] = useState<string>(
    studentHolders[0]?.id || ''
  );
  const [reqVerifierName, setReqVerifierName] = useState<string>(
    'Campus Central Library & Research Services'
  );
  const [reqPurpose, setReqPurpose] = useState<string>(
    'Verify active 2026-2027 student enrollment for laboratory and library access.'
  );
  const [reqClaims, setReqClaims] = useState<
    (keyof StudentCredentialClaims)[]
  >(['enrollmentStatus', 'program', 'universityName']);
  const [reqFeedback, setReqFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const lastAutoVerifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const targetId =
      preselectedPresentation?.id || testDatasetCases[0]?.testCaseId || null;
    if (!targetId || lastAutoVerifiedIdRef.current === targetId) return;
    lastAutoVerifiedIdRef.current = targetId;

    if (preselectedPresentation) {
      const serialized = JSON.stringify(preselectedPresentation, null, 2);
      setJsonInput(serialized);
      handleVerifyCustomJson(serialized);
    } else if (testDatasetCases.length > 0) {
      setJsonInput(JSON.stringify(testDatasetCases[0].credential, null, 2));
      handleRunTestCase(testDatasetCases[0]);
    }
  }, [preselectedPresentation, testDatasetCases]);

  const handleRunTestCase = async (tc: TestDatasetCase) => {
    setIsVerifying(true);
    setSelectedTestCaseId(tc.testCaseId);
    setJsonInput(JSON.stringify(tc.credential, null, 2));
    try {
      const res = await apiClient.verifyPayload(verifierAccount.id, {
        testCaseId: tc.testCaseId,
      });
      setActiveResult(res.result);
      setBatchResults((prev) => ({
        ...prev,
        [tc.testCaseId]: {
          outcome: res.result.outcome,
          passedExpectation: res.result.outcome === tc.expectedOutcome,
        },
      }));
      await onRefresh();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunAllSevenTestCases = async () => {
    setIsVerifying(true);
    try {
      for (const tc of testDatasetCases) {
        const res = await apiClient.verifyPayload(verifierAccount.id, {
          testCaseId: tc.testCaseId,
        });
        setBatchResults((prev) => ({
          ...prev,
          [tc.testCaseId]: {
            outcome: res.result.outcome,
            passedExpectation: res.result.outcome === tc.expectedOutcome,
          },
        }));
        if (tc.testCaseId === selectedTestCaseId) {
          setActiveResult(res.result);
        }
      }
      await onRefresh();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCustomJson = async (overrideJson?: string) => {
    const raw = overrideJson ?? jsonInput;
    if (!raw.trim()) return;
    setIsVerifying(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { malformedRawText: raw };
      }
      const res = await apiClient.verifyPayload(verifierAccount.id, {
        payload: parsed,
      });
      setActiveResult(res.result);
      await onRefresh();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendPresentationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqHolderId || reqClaims.length === 0) return;
    setIsVerifying(true);
    setReqFeedback(null);
    try {
      const res = await apiClient.createPresentationRequest(
        verifierAccount.id,
        {
          holderUserId: reqHolderId,
          verifierName: reqVerifierName,
          purpose: reqPurpose,
          requestedClaims: reqClaims,
        }
      );
      setReqFeedback({
        type: 'success',
        text: `Sent Presentation Request (${res.request.id}) with fresh challenge nonce to the student wallet.`,
      });
      await onRefresh();
    } catch (err) {
      setReqFeedback({ type: 'error', text: (err as Error).message });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifiedScenariosCount = Object.values(batchResults).filter(
    (r) => r.passedExpectation
  ).length;

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Open Page Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-[13px] font-medium text-blue-700">
            Third-Party Verifier · Deterministic Proof Engine
          </p>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-slate-950 leading-tight">
            Independent Verification Console
          </h1>
          <p className="text-[14.5px] text-slate-600 leading-relaxed">
            Validate W3C Verifiable Credentials and selective disclosure presentations without contacting the university’s private database.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleRunAllSevenTestCases}
            data-testid="btn-run-all-test-cases"
            className="min-h-[42px] px-4 py-2 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto whitespace-nowrap"
          >
            Run All 7 SRS Scenarios
          </button>
        </div>
      </section>

      {/* SRS 12.1 Benchmark Verification Dataset */}
      <section className="space-y-5 border-t border-slate-200 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-[20px] font-bold text-slate-950">
              Benchmark Verification Dataset (SRS §12.1)
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Select any scenario below to load its payload and execute the 6-stage verification pipeline.
            </p>
          </div>
          <span className="text-[13px] font-mono text-slate-600 tabular-nums shrink-0">
            {verifiedScenariosCount} / {testDatasetCases.length} Scenarios Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {testDatasetCases.map((tc) => {
            const isSelected = selectedTestCaseId === tc.testCaseId;
            const recorded = batchResults[tc.testCaseId];
            return (
              <button
                key={tc.testCaseId}
                type="button"
                data-testid={`test-case-card-${tc.testCaseId}`}
                onClick={() => handleRunTestCase(tc)}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/40 text-slate-950 border-blue-600 ring-1 ring-blue-600/20'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12px] font-mono">
                    <span
                      className={
                        isSelected
                          ? 'text-blue-700 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      {tc.testCaseId}
                    </span>
                    {recorded && (
                      <span
                        className={`text-[11.5px] font-semibold truncate ${
                          recorded.passedExpectation
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {recorded.outcome}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[14.5px] font-semibold text-slate-950 leading-snug">
                    {tc.title}
                  </h3>
                  <p className="text-[12.5px] text-slate-500 leading-relaxed line-clamp-2">
                    {tc.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 text-[12px] flex items-center justify-between gap-2">
                  <span className="font-mono text-slate-500 truncate min-w-0">
                    {tc.expectedOutcome}
                  </span>
                  <span className="font-semibold text-blue-700 whitespace-nowrap shrink-0">
                    Evaluate →
                  </span>
                </div>
              </button>
            );
          })}

          {presentations.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const latestVp = presentations[presentations.length - 1];
                const serialized = JSON.stringify(latestVp, null, 2);
                setSelectedTestCaseId(latestVp.id);
                setJsonInput(serialized);
                handleVerifyCustomJson(serialized);
              }}
              className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                selectedTestCaseId === presentations[presentations.length - 1].id
                  ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px] font-mono">
                  <span className="text-slate-500">Student QR Pass</span>
                  <span className="font-sans font-semibold text-emerald-700">
                    Selective
                  </span>
                </div>
                <h3 className="text-[14.5px] font-semibold text-slate-950 leading-snug">
                  Latest Selective Pass ({presentations[presentations.length - 1].id})
                </h3>
                <p className="text-[12.5px] text-slate-500 leading-relaxed line-clamp-2">
                  Verify holder-signed presentation with sensitive personal attributes withheld.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-100 text-[12px] flex items-center justify-between gap-2">
                <span className="font-mono text-slate-500">VALID</span>
                <span className="font-semibold text-blue-700 whitespace-nowrap shrink-0">
                  Verify →
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Main 2-Column Workspace: 6-Stage Pipeline & Payload Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start border-t border-slate-200 pt-10">
        {/* Left 7 Columns: 6-Stage Result */}
        <section className="lg:col-span-7 space-y-5">
          <div className="flex items-end justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-[20px] font-bold text-slate-950">
                6-Stage Verification Pipeline
              </h2>
              <p className="text-[14px] text-slate-600 mt-0.5">
                Fail-closed deterministic evaluation of signatures, commitments, and Sepolia status
              </p>
            </div>
            <span className="text-[12px] font-mono text-slate-500 shrink-0">
              Sepolia: {ethereumRpcOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {activeResult ? (
            <div className="space-y-6 animate-view-enter">
              {/* Verdict Banner */}
              <div
                data-testid="verification-outcome-banner"
                className={`p-5 rounded-xl border space-y-1.5 ${
                  activeResult.isValid
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : activeResult.outcome ===
                      VerificationOutcome.UNABLE_TO_VERIFY
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-mono font-bold tracking-wide">
                    Verdict: {activeResult.outcome}
                  </span>
                  <span className="text-[12px] font-mono text-slate-500 tabular-nums">
                    {activeResult.verifiedAt.slice(11, 19)} UTC
                  </span>
                </div>
                <h3 className="text-[16px] font-semibold text-slate-950">
                  {activeResult.reasonSummary}
                </h3>
                <p className="text-[12px] font-mono text-slate-600 break-all pt-1">
                  Target: {activeResult.targetId} · Issuer: {activeResult.issuerDid}
                </p>
              </div>

              {/* 6 Stage Rows */}
              <div className="surface-panel rounded-xl divide-y divide-slate-200 overflow-hidden">
                {activeResult.checks.map((chk, idx) => (
                  <div
                    key={chk.stepId}
                    className={`p-4 flex items-start justify-between gap-4 ${
                      chk.passed ? 'bg-white' : 'bg-rose-50/35'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="text-[12px] font-mono font-semibold text-slate-400 shrink-0 mt-0.5 tabular-nums">
                        0{idx + 1}
                      </span>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h4 className="text-[14px] font-semibold text-slate-950">
                            {chk.label}
                          </h4>
                          <span className="text-[11.5px] font-mono text-slate-400">
                            {chk.stepId}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed">
                          {chk.detail}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[12px] font-mono font-semibold shrink-0 mt-0.5 ${
                        chk.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {chk.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Disclosed vs Withheld Breakdown */}
              {(() => {
                const withheldKeys = ALL_CLAIM_KEYS.map((c) => c.key).filter(
                  (k) => !(k in activeResult.disclosedClaims)
                );
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="surface-panel rounded-xl p-5 space-y-3">
                      <h4 className="text-[13px] font-semibold text-slate-900">
                        Verified Disclosed Claims ({Object.keys(activeResult.disclosedClaims).length})
                      </h4>
                      <div className="divide-y divide-slate-100 text-[13px]">
                        {Object.entries(activeResult.disclosedClaims).map(
                          ([k, val]) => (
                            <div
                              key={k}
                              className="py-2 flex items-start justify-between gap-2"
                            >
                              <span className="text-slate-500 font-mono text-[12px]">
                                {k}
                              </span>
                              <span className="font-medium text-slate-950 text-right">
                                {String(val)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="surface-panel rounded-xl p-5 space-y-3">
                      <h4 className="text-[13px] font-semibold text-slate-900">
                        Withheld via Selective Disclosure ({withheldKeys.length})
                      </h4>
                      {withheldKeys.length === 0 ? (
                        <p className="text-[13px] text-slate-500">
                          Full credential disclosed (0 withheld claims).
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100 text-[12.5px] font-mono text-slate-600">
                          {withheldKeys.map((hk) => (
                            <li key={hk} className="py-2 flex items-center justify-between gap-2">
                              <span>{hk}</span>
                              <span className="text-amber-700 font-medium">
                                Salted Digest
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="surface-panel rounded-xl p-10 text-center text-[14px] text-slate-500">
              Select a scenario above or click Verify Payload to run the 6-stage pipeline.
            </div>
          )}
        </section>

        {/* Right 5 Columns: JSON Inspector & Request Dispatcher */}
        <section className="lg:col-span-5 space-y-8">
          <div className="surface-panel rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[16px] font-semibold text-slate-950">
                Raw W3C VC / VP Payload Inspector
              </h3>
              <span className="text-[12px] text-slate-400">Editable</span>
            </div>

            <p className="text-[13px] text-slate-600 leading-relaxed">
              Modify any claim below without updating the cryptographic signature to observe immediate tamper rejection.
            </p>

            <textarea
              aria-label="Raw Credential or Presentation JSON Payload"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className="w-full p-3.5 bg-slate-950 text-slate-200 border border-slate-800 rounded-lg font-mono text-[12px] focus:outline-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    const obj = JSON.parse(jsonInput);
                    if (obj.credentialSubject?.claims) {
                      obj.credentialSubject.claims.enrollmentStatus =
                        'TAMPERED_HONORS_STATUS';
                    } else if (obj.disclosedClaims) {
                      obj.disclosedClaims.enrollmentStatus =
                        'TAMPERED_HONORS_STATUS';
                    }
                    const tamperedStr = JSON.stringify(obj, null, 2);
                    setJsonInput(tamperedStr);
                    handleVerifyCustomJson(tamperedStr);
                  } catch {
                    // ignore
                  }
                }}
                className="min-h-[40px] px-3.5 py-2 text-[13px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Inject Claim Tampering
              </button>

              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleVerifyCustomJson()}
                data-testid="btn-verify-json-payload"
                className="min-h-[40px] px-4 py-2 text-[13px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Verify Payload
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSendPresentationRequest}
            className="surface-panel rounded-xl p-6 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-[16px] font-semibold text-slate-950">
                Dispatch Proof Request to Student
              </h3>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Sends a challenge-bound verification request to a student wallet.
              </p>
            </div>

            {reqFeedback && (
              <div
                className={`p-3 rounded-lg text-[13px] font-medium border ${
                  reqFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {reqFeedback.text}
              </div>
            )}

            <div className="space-y-3.5 text-[14px]">
              <div>
                <label
                  htmlFor="verifier-target-student"
                  className="block text-[13px] font-medium text-slate-700 mb-1"
                >
                  Student Holder
                </label>
                <select
                  id="verifier-target-student"
                  value={reqHolderId}
                  onChange={(e) => setReqHolderId(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px] text-slate-900"
                >
                  {studentHolders.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">
                  Requester Organization
                </label>
                <input
                  type="text"
                  required
                  value={reqVerifierName}
                  onChange={(e) => setReqVerifierName(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1">
                  Verification Purpose
                </label>
                <input
                  type="text"
                  required
                  value={reqPurpose}
                  onChange={(e) => setReqPurpose(e.target.value)}
                  className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-[14px]"
                />
              </div>

              <div>
                <span className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Requested Attributes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_CLAIM_KEYS.map((item) => {
                    const checked = reqClaims.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-[13px]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setReqClaims((prev) =>
                              prev.includes(item.key)
                                ? prev.filter((k) => k !== item.key)
                                : [...prev, item.key]
                            )
                          }
                          className="w-4 h-4 accent-blue-700 rounded"
                        />
                        <span className="truncate">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || reqClaims.length === 0}
              className="w-full min-h-[42px] px-4 py-2 text-[14px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Send Request to Student Wallet
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
