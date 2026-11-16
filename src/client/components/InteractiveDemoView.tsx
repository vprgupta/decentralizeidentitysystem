/**
 * @file InteractiveDemoView.tsx
 * @description Guided Interactive Walkthrough & Visual System Explainer.
 * Engineered with restrained, high-clarity enterprise SaaS typography and open section dividers.
 */

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import {
  StudentCredentialClaims,
  TestDatasetCase,
  TrustedIssuer,
  UserAccount,
  VerifiableCredential,
  VerifiablePresentation,
  VerificationResult,
} from '../../shared/types/did.types';
import { apiClient } from '../services/apiClient';
import { WorkflowAnimationPlayer } from './WorkflowAnimationPlayer';

interface InteractiveDemoViewProps {
  users: UserAccount[];
  trustedIssuers: TrustedIssuer[];
  credentials: VerifiableCredential[];
  presentations: VerifiablePresentation[];
  testDatasetCases: TestDatasetCase[];
  ethereumRpcOnline: boolean;
  autoPlayVideoSignal?: number;
  onRefresh: () => Promise<void>;
  onNavigateTab: (
    tab: 'wallet' | 'issuer' | 'verifier' | 'blockchain' | 'audit'
  ) => void;
}

interface DemoStepSpec {
  stepNumber: string;
  shortTitle: string;
  headline: string;
  actorLabel: string;
  srsMapping: string;
  plainExplanation: string;
  activeNodes: ('STUDENT' | 'ISSUER' | 'VERIFIER' | 'BLOCKCHAIN')[];
  activeEdge:
    | 'STUDENT_CHAIN'
    | 'ISSUER_STUDENT'
    | 'VERIFIER_STUDENT'
    | 'STUDENT_VERIFIER'
    | 'VERIFIER_CHAIN'
    | 'ISSUER_CHAIN';
  dataFlowLabel: string;
  whatIsHappening: string[];
  whatIsNotHappening: string[];
}

const DEMO_STEPS: DemoStepSpec[] = [
  {
    stepNumber: '01',
    shortTitle: 'Create Student Identity',
    headline: '1. The student creates a private digital identity on their own device',
    actorLabel: 'Student Holder',
    srsMapping: 'SRS UC-01 · FR-04 & FR-05',
    plainExplanation:
      'Before receiving any university credential, the student generates a private cryptographic key pair inside their wallet. This creates a globally unique Decentralized Identifier (did:ethr:sepolia) and anchors only a 32-byte public key hash on the Ethereum Sepolia network so verifiers can confirm identity ownership later.',
    activeNodes: ['STUDENT', 'BLOCKCHAIN'],
    activeEdge: 'STUDENT_CHAIN',
    dataFlowLabel:
      'Student Wallet anchors public verification key hash to Ethereum Sepolia',
    whatIsHappening: [
      'A private and public cryptographic key pair is generated locally on the student’s device.',
      'A W3C Decentralized Identifier (did:ethr:sepolia:0x...) is linked to the student’s public key.',
      'Only the 32-byte cryptographic fingerprint of the public key is registered on the Sepolia smart contract.',
    ],
    whatIsNotHappening: [
      'The student’s name, ID number (e.g. 23053694), email, or department are NEVER written to the blockchain.',
      'The private key never leaves the student’s device or wallet storage.',
      'No central corporate login provider controls this credential.',
    ],
  },
  {
    stepNumber: '02',
    shortTitle: 'University Issues Credential',
    headline:
      '2. The university cryptographically signs and delivers the student credential',
    actorLabel: 'University Registrar',
    srsMapping: 'SRS UC-02 · FR-07 to FR-09',
    plainExplanation:
      'The University Registrar confirms the student is actively enrolled. Each student attribute (name, student number, program, status) is individually salted and hashed with SHA-256. The University signs the collection of hashes with its official key and delivers the credential directly to the student’s wallet.',
    activeNodes: ['ISSUER', 'STUDENT', 'BLOCKCHAIN'],
    activeEdge: 'ISSUER_STUDENT',
    dataFlowLabel:
      'University Registrar signs credential off-chain and updates anonymous status index on Sepolia',
    whatIsHappening: [
      'Every student claim is given a unique cryptographic random salt to support selective disclosure.',
      'The Registrar digitally signs the credential with the university’s verified signing key.',
      'An anonymous numeric status counter (Status Index #1001 = ACTIVE) is anchored on Sepolia for revocation checks.',
    ],
    whatIsNotHappening: [
      'The credential contents and student records are never published on Ethereum or public servers.',
      'No student or third party can alter a claim without invalidating the signature.',
    ],
  },
  {
    stepNumber: '03',
    shortTitle: 'Verifier Requests Proof',
    headline:
      '3. An organization requests proof of enrollment with a replay-safe challenge',
    actorLabel: 'Campus Verifier',
    srsMapping: 'SRS UC-03 · FR-11',
    plainExplanation:
      'When the student applies for a campus research fellowship or library facility, the verifier issues a digital request asking for specific attributes along with a single-use random challenge nonce to prevent replay attacks.',
    activeNodes: ['VERIFIER', 'STUDENT'],
    activeEdge: 'VERIFIER_STUDENT',
    dataFlowLabel:
      'Verifier requests specific claims with a single-use cryptographic challenge nonce',
    whatIsHappening: [
      'The verifier states precisely which attributes are needed (such as Enrollment Status and Program) and why.',
      'A single-use challenge code ensures an intercepted presentation cannot be reused.',
      'The request arrives in the student’s wallet for explicit, informed consent.',
    ],
    whatIsNotHappening: [
      'The verifier cannot silently query the student’s wallet or read unapproved credentials.',
      'The verifier does not need direct access to the University’s internal student database.',
    ],
  },
  {
    stepNumber: '04',
    shortTitle: 'Selective Disclosure',
    headline:
      '4. The student chooses which attributes to share, withholding sensitive data',
    actorLabel: 'Student Holder',
    srsMapping: 'SRS UC-03 · FR-11 to FR-13',
    plainExplanation:
      'The student reviews the request. If the verifier only needs to know they are an Active B.Tech student, the student unchecks their University ID Number (23053694). The wallet replaces the ID number with its salted SHA-256 digest, producing a presentation that still validates against the University’s original signature.',
    activeNodes: ['STUDENT', 'VERIFIER'],
    activeEdge: 'STUDENT_VERIFIER',
    dataFlowLabel:
      'Student sends selective disclosure presentation and QR pass with approved claims only',
    whatIsHappening: [
      'Approved claims include plaintext and salt so the verifier can recalculate the hash.',
      'Withheld claims are omitted; only their one-way SHA-256 digest remains to satisfy the signature.',
      'The wallet generates an OpenID4VP QR pass signed by the student and bound to the challenge nonce.',
    ],
    whatIsNotHappening: [
      'Hiding a claim does NOT invalidate the University’s digital signature.',
      'The verifier cannot reverse or brute-force the hidden Student ID from the salted hash.',
    ],
  },
  {
    stepNumber: '05',
    shortTitle: 'Instant Verification',
    headline:
      '5. The verifier executes a 6-stage mathematical check in milliseconds',
    actorLabel: 'Verifier Engine',
    srsMapping: 'SRS UC-04 · FR-14 to FR-19',
    plainExplanation:
      'The verifier performs a deterministic 6-stage check: validating W3C schema structure, confirming the University is on the trusted registry, verifying digital signatures and claim hashes, checking expiration dates, and reading the anonymous revocation status directly from Ethereum Sepolia.',
    activeNodes: ['VERIFIER', 'BLOCKCHAIN', 'ISSUER'],
    activeEdge: 'VERIFIER_CHAIN',
    dataFlowLabel:
      'Verifier resolves issuer DID and queries revocation status on Sepolia: VALID',
    whatIsHappening: [
      'The mathematical proof is verified deterministically in under 5 milliseconds.',
      'The verifier checks Ethereum Sepolia to confirm the University key is authorized and Status Index #1001 is ACTIVE.',
      'If the blockchain network is unreachable, the system fails closed rather than accepting unverified data.',
    ],
    whatIsNotHappening: [
      'The verifier never contacts the University registrar office directly.',
      'Any tampered claim is immediately rejected with INVALID_SIGNATURE.',
    ],
  },
  {
    stepNumber: '06',
    shortTitle: 'Anonymous Revocation',
    headline:
      '6. The university can revoke credentials without publishing student identities',
    actorLabel: 'University Registrar',
    srsMapping: 'SRS UC-05 · FR-17 & FR-24',
    plainExplanation:
      'If a student graduates, withdraws, or a credential was issued in error, the University Registrar updates Status Index #1001 from ACTIVE to REVOKED on Ethereum Sepolia. Any future verification attempt immediately rejects the credential.',
    activeNodes: ['ISSUER', 'BLOCKCHAIN', 'VERIFIER'],
    activeEdge: 'ISSUER_CHAIN',
    dataFlowLabel:
      'University updates Status Index #1001 = REVOKED on Sepolia smart contract',
    whatIsHappening: [
      'The status update on Sepolia updates an integer index without exposing student personal data.',
      'All verifiers immediately observe the revocation upon querying the contract index.',
    ],
    whatIsNotHappening: [
      'No public list of student names or roll numbers is published.',
      'External observers only see an anonymous status index transition.',
    ],
  },
];

const CLAIM_META: {
  key: keyof StudentCredentialClaims;
  label: string;
  sampleValue: string;
  sensitive?: boolean;
}[] = [
  {
    key: 'studentName',
    label: 'Student Full Name',
    sampleValue: 'Bishal Gupta',
  },
  {
    key: 'studentNumber',
    label: 'Student ID Number',
    sampleValue: '23053694',
    sensitive: true,
  },
  {
    key: 'program',
    label: 'Academic Program',
    sampleValue: 'B.Tech Computer Science & Engineering (CS47001)',
  },
  {
    key: 'enrollmentStatus',
    label: 'Enrollment Status',
    sampleValue: 'Active',
  },
  { key: 'academicYear', label: 'Academic Year', sampleValue: '2026-2027' },
  {
    key: 'universityName',
    label: 'Institution',
    sampleValue: 'School of Computer Engineering (KIIT Prototype)',
  },
];

export const InteractiveDemoView: React.FC<InteractiveDemoViewProps> = ({
  credentials,
  testDatasetCases,
  ethereumRpcOnline,
  autoPlayVideoSignal = 0,
  onNavigateTab,
}) => {
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [localPlaySignal, setLocalPlaySignal] = useState<number>(0);
  const currentStep = DEMO_STEPS[activeStepIdx];
  const combinedPlaySignal = autoPlayVideoSignal + localPlaySignal;

  const [disclosedKeys, setDisclosedKeys] = useState<
    (keyof StudentCredentialClaims)[]
  >(['studentName', 'program', 'enrollmentStatus', 'universityName']);
  const [sandboxVerificationResult, setSandboxVerificationResult] =
    useState<VerificationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const primaryCredential = credentials[0] || testDatasetCases[0]?.credential;

  const toggleClaimInSandbox = (key: keyof StudentCredentialClaims) => {
    setDisclosedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setSandboxVerificationResult(null);
  };

  const handleRunLiveSandboxVerification = async (
    scenario: 'VALID' | 'TAMPERED' | 'REVOKED'
  ) => {
    setIsSimulating(true);
    try {
      const testCaseId =
        scenario === 'VALID'
          ? 'TC-01'
          : scenario === 'TAMPERED'
          ? 'TC-02'
          : 'TC-05';
      const response = await apiClient.verifyPayload('usr-verifier-1', {
        testCaseId,
      });
      setSandboxVerificationResult(response.result);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* SECTION 1: HERO & TRUST TRIANGLE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-blue-700">
              System Architecture Overview · CS47001
            </p>
            <h1 className="text-[26px] sm:text-[32px] font-bold text-slate-950 leading-tight">
              Verifiable Academic Credentials with Selective Privacy
            </h1>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              Universities issue digitally signed W3C credentials directly to a student’s private wallet. Students prove their enrollment status to employers or campus services using salted SHA-256 commitments—without exposing sensitive roll numbers or writing personal data to the blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-y border-slate-200">
            <div>
              <p className="text-[12px] font-mono font-medium text-slate-400">
                01. Ownership
              </p>
              <p className="text-[15px] font-semibold text-slate-950 mt-1">
                Self-Controlled DID
              </p>
              <p className="text-[13px] text-slate-600 mt-1">
                Private keys remain in the student’s local wallet.
              </p>
            </div>

            <div>
              <p className="text-[12px] font-mono font-medium text-slate-400">
                02. Disclosure
              </p>
              <p className="text-[15px] font-semibold text-slate-950 mt-1">
                Salted Hash Proofs
              </p>
              <p className="text-[13px] text-slate-600 mt-1">
                Withhold sensitive IDs while preserving signature validity.
              </p>
            </div>

            <div>
              <p className="text-[12px] font-mono font-medium text-slate-400">
                03. Registry
              </p>
              <p className="text-[15px] font-semibold text-slate-950 mt-1">
                Zero On-Chain PII
              </p>
              <p className="text-[13px] text-slate-600 mt-1">
                Sepolia stores only public key hashes and status indices.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLocalPlaySignal((n) => n + 1);
                document
                  .getElementById('workflow-video-player')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="min-h-[42px] px-5 py-2 inline-flex items-center gap-2 text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              <span>Play Full Workflow Video</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('wallet')}
              className="min-h-[42px] px-4 py-2 text-[14px] font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Open Student Wallet →
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('verifier')}
              className="min-h-[42px] px-4 py-2 text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Verifier Console
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('issuer')}
              className="min-h-[42px] px-3 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
            >
              University Issuer
            </button>
          </div>
        </div>

        {/* Right Column: Trust Triangle Diagram */}
        <div className="lg:col-span-5 bg-slate-950 rounded-xl p-6 text-white border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <p className="text-[12px] text-slate-400">W3C Architecture</p>
              <h2 className="text-[15px] font-semibold text-white">
                Decentralized Trust Triangle
              </h2>
            </div>
            <span className="text-[12px] font-mono text-slate-300 tabular-nums">
              Step {currentStep.stepNumber} / 06
            </span>
          </div>

          <div className="py-2 flex items-center justify-center">
            <svg
              viewBox="0 0 420 270"
              className="w-full h-auto max-h-[240px] select-none"
              role="img"
              aria-label="Trust triangle diagram connecting University Issuer, Student Wallet, Verifier, and Ethereum Sepolia"
            >
              <line
                x1="100"
                y1="60"
                x2="320"
                y2="60"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1="100"
                y1="60"
                x2="210"
                y2="225"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1="320"
                y1="60"
                x2="210"
                y2="225"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1="320"
                y1="60"
                x2="210"
                y2="140"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1="100"
                y1="60"
                x2="210"
                y2="140"
                stroke="#334155"
                strokeWidth="1"
              />
              <line
                x1="210"
                y1="140"
                x2="210"
                y2="225"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {currentStep.activeEdge === 'STUDENT_CHAIN' && (
                <line
                  x1="320"
                  y1="60"
                  x2="210"
                  y2="225"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  className="animate-edge-flow"
                />
              )}
              {currentStep.activeEdge === 'ISSUER_STUDENT' && (
                <>
                  <line
                    x1="100"
                    y1="60"
                    x2="320"
                    y2="60"
                    stroke="#60a5fa"
                    strokeWidth="2.5"
                    className="animate-edge-flow"
                  />
                  <line
                    x1="100"
                    y1="60"
                    x2="210"
                    y2="225"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    className="animate-edge-flow"
                  />
                </>
              )}
              {(currentStep.activeEdge === 'VERIFIER_STUDENT' ||
                currentStep.activeEdge === 'STUDENT_VERIFIER') && (
                <line
                  x1="320"
                  y1="60"
                  x2="210"
                  y2="140"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  className="animate-edge-flow"
                />
              )}
              {currentStep.activeEdge === 'VERIFIER_CHAIN' && (
                <line
                  x1="210"
                  y1="140"
                  x2="210"
                  y2="225"
                  stroke="#60a5fa"
                  strokeWidth="2.5"
                  className="animate-edge-flow"
                />
              )}
              {currentStep.activeEdge === 'ISSUER_CHAIN' && (
                <line
                  x1="100"
                  y1="60"
                  x2="210"
                  y2="225"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  className="animate-edge-flow"
                />
              )}

              {/* UNIVERSITY REGISTRAR */}
              <g transform="translate(100, 60)">
                <rect
                  x="-65"
                  y="-24"
                  width="130"
                  height="48"
                  rx="8"
                  fill="#0f172a"
                  stroke={
                    currentStep.activeNodes.includes('ISSUER')
                      ? '#60a5fa'
                      : '#475569'
                  }
                  strokeWidth="1.5"
                />
                <text
                  y="-3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                >
                  University
                </text>
                <text y="12" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                  Academic Registrar
                </text>
              </g>

              {/* STUDENT WALLET */}
              <g transform="translate(320, 60)">
                <rect
                  x="-65"
                  y="-24"
                  width="130"
                  height="48"
                  rx="8"
                  fill="#0f172a"
                  stroke={
                    currentStep.activeNodes.includes('STUDENT')
                      ? '#34d399'
                      : '#475569'
                  }
                  strokeWidth="1.5"
                />
                <text
                  y="-3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                >
                  Student
                </text>
                <text y="12" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                  Private Device Wallet
                </text>
              </g>

              {/* VERIFIER */}
              <g transform="translate(210, 140)">
                <rect
                  x="-65"
                  y="-22"
                  width="130"
                  height="44"
                  rx="8"
                  fill="#0f172a"
                  stroke={
                    currentStep.activeNodes.includes('VERIFIER')
                      ? '#a78bfa'
                      : '#475569'
                  }
                  strokeWidth="1.5"
                />
                <text
                  y="-2"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                >
                  Verifier
                </text>
                <text y="12" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                  Campus / Employer
                </text>
              </g>

              {/* ETHEREUM SEPOLIA */}
              <g transform="translate(210, 225)">
                <rect
                  x="-85"
                  y="-22"
                  width="170"
                  height="44"
                  rx="8"
                  fill="#0f172a"
                  stroke={
                    currentStep.activeNodes.includes('BLOCKCHAIN')
                      ? '#38bdf8'
                      : '#475569'
                  }
                  strokeWidth="1.5"
                />
                <text
                  y="-2"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                >
                  Ethereum Sepolia
                </text>
                <text
                  y="12"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  Public Keys &amp; Status Only
                </text>
              </g>
            </svg>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[13px] text-slate-300">
            <span className="text-slate-400 font-medium text-[11.5px] block mb-0.5">
              Active Protocol Flow
            </span>
            {currentStep.dataFlowLabel}
          </div>
        </div>
      </section>

      {/* SECTION 1.5: INTERACTIVE FULL WORKING ANIMATED VIDEO */}
      <div className="space-y-4 border-t border-slate-200 pt-10">
        <div>
          <h2 className="text-[20px] font-bold text-slate-950">
            Full Working Workflow Video
          </h2>
          <p className="text-[14px] text-slate-600 mt-0.5">
            Watch the complete identity lifecycle in continuous motion—or scrub directly to any stage and jump into the live workspace.
          </p>
        </div>
        <WorkflowAnimationPlayer
          onNavigateTab={onNavigateTab}
          autoPlaySignal={combinedPlaySignal}
          onSceneChange={setActiveStepIdx}
        />
      </div>

      {/* SECTION 2: 6-STEP LIFECYCLE WALKTHROUGH */}
      <section className="space-y-6 border-t border-slate-200 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-slate-950">
              Protocol Lifecycle Walkthrough
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Inspect what happens cryptographically at each stage versus what is prevented by design.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={activeStepIdx === 0}
              onClick={() => setActiveStepIdx((i) => Math.max(0, i - 1))}
              className="min-h-[38px] px-3.5 text-[13px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={activeStepIdx === DEMO_STEPS.length - 1}
              onClick={() =>
                setActiveStepIdx((i) => Math.min(DEMO_STEPS.length - 1, i + 1))
              }
              className="min-h-[38px] px-3.5 text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              Next Step →
            </button>
          </div>
        </div>

        {/* Step Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {DEMO_STEPS.map((step, idx) => {
            const isSelected = idx === activeStepIdx;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => setActiveStepIdx(idx)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/50 text-slate-950 border-blue-600 ring-1 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span
                  className={`block font-mono text-[12px] ${
                    isSelected ? 'text-blue-700 font-semibold' : 'text-slate-400'
                  }`}
                >
                  Step {step.stepNumber}
                </span>
                <span className="mt-1 block text-[13px] font-semibold leading-snug">
                  {step.shortTitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Step Detail */}
        <div
          key={currentStep.stepNumber}
          className="animate-view-enter surface-panel rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div className="space-y-2 max-w-3xl">
            <p className="text-[12.5px] font-mono text-slate-500">
              {currentStep.actorLabel} · {currentStep.srsMapping}
            </p>
            <h3 className="text-[19px] sm:text-[20px] font-bold text-slate-950">
              {currentStep.headline}
            </h3>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              {currentStep.plainExplanation}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100">
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-emerald-800">
                What Happens Cryptographically
              </h4>
              <ul className="space-y-2 text-[14px] text-slate-700">
                {currentStep.whatIsHappening.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-emerald-700 shrink-0" aria-hidden="true">
                      +
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-rose-800">
                What Is Strictly Prevented
              </h4>
              <ul className="space-y-2 text-[14px] text-slate-700">
                {currentStep.whatIsNotHappening.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-rose-700 shrink-0" aria-hidden="true">
                      ×
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: INTERACTIVE SELECTIVE DISCLOSURE SANDBOX */}
      <section className="space-y-6 border-t border-slate-200 pt-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-slate-950">
              Interactive Selective Disclosure Sandbox
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Toggle student attributes on the left to observe how withheld claims are replaced with salted SHA-256 digests on the right.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleRunLiveSandboxVerification('VALID')}
              className="min-h-[40px] px-4 py-2 text-[13px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Test Authentic Verification
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleRunLiveSandboxVerification('TAMPERED')}
              className="min-h-[40px] px-3.5 py-2 text-[13px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Simulate Modified Claim (TC-02)
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleRunLiveSandboxVerification('REVOKED')}
              className="min-h-[40px] px-3.5 py-2 text-[13px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Simulate Revoked Status (TC-05)
            </button>
          </div>
        </div>

        <div className="surface-panel rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left 5 Columns: Student Consent */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[12px] font-medium text-slate-500">
              <span>Student Wallet Consent</span>
              <span className="text-slate-800 tabular-nums">
                {disclosedKeys.length} of 6 Shared
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {CLAIM_META.map((claim) => {
                const isDisclosed = disclosedKeys.includes(claim.key);
                return (
                  <label
                    key={claim.key}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isDisclosed}
                        onChange={() => toggleClaimInSandbox(claim.key)}
                        className="w-4 h-4 accent-blue-700 rounded cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="block text-[14px] font-medium text-slate-950">
                          {claim.label}
                          {claim.sensitive && (
                            <span className="ml-1.5 text-[11.5px] font-normal text-amber-700">
                              · Sensitive
                            </span>
                          )}
                        </span>
                        <span className="block text-[12.5px] font-mono text-slate-500 truncate">
                          {claim.sampleValue}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[12.5px] font-medium shrink-0 ${
                        isDisclosed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {isDisclosed ? 'Shared' : 'Withheld'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right 7 Columns: Verifier View */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[12px] font-medium text-slate-500">
                <span>What the External Verifier Receives</span>
                <span className="tabular-nums">{6 - disclosedKeys.length} Withheld</span>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CLAIM_META.map((claim) => {
                  const isDisclosed = disclosedKeys.includes(claim.key);
                  const digest =
                    primaryCredential?.proof?.claimDigests?.[claim.key] ||
                    '7a01a71ce5b03cff007705d5';
                  return (
                    <div
                      key={claim.key}
                      className={`p-3.5 rounded-lg border ${
                        isDisclosed
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-slate-500 font-medium">
                          {claim.label}
                        </span>
                        <span
                          className={`font-mono text-[11.5px] ${
                            isDisclosed ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isDisclosed ? 'Plaintext' : 'Salted Digest'}
                        </span>
                      </div>
                      {isDisclosed ? (
                        <p className="text-[14px] font-semibold text-slate-950 truncate">
                          {claim.sampleValue}
                        </p>
                      ) : (
                        <p className="font-mono text-[12px] text-slate-500 truncate">
                          sha256:{digest.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200">
              {sandboxVerificationResult ? (
                <div
                  className={`p-4 rounded-lg border text-[13px] space-y-1.5 ${
                    sandboxVerificationResult.isValid
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>
                      Outcome: {sandboxVerificationResult.outcome}
                    </span>
                    <span className="font-mono text-[12px]">
                      Sepolia {ethereumRpcOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p>{sandboxVerificationResult.reasonSummary}</p>
                </div>
              ) : (
                <p className="text-[13px] text-slate-500">
                  Click &ldquo;Test Authentic Verification&rdquo; above to execute the 6-stage verification pipeline on this selective presentation.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
