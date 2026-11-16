/**
 * @file ArchitectureAuditView.tsx
 * @description System Architecture, Privacy-Minimized Audit Event Log (FR-21, NFR-14),
 * SRS Requirements Traceability Matrix (Appendix B), and Academic SRS PDF Reference.
 */

import React, { useState } from 'react';
import { AuditEvent } from '../../shared/types/did.types';

interface ArchitectureAuditViewProps {
  auditEvents: AuditEvent[];
}

const TRACEABILITY_MATRIX = [
  {
    obj: 'OBJ-01: User-Controlled DID',
    reqs: 'FR-01 to FR-06',
    ac: 'AC-01, AC-02',
    module: 'src/shared/domain/didResolver.ts & StudentWalletView.tsx',
    status: 'Verified',
  },
  {
    obj: 'OBJ-02: University Credential Issuance',
    reqs: 'FR-07 to FR-10',
    ac: 'AC-03, AC-04',
    module: 'src/shared/domain/cryptoEngine.ts & IssuerPortalView.tsx',
    status: 'Verified',
  },
  {
    obj: 'OBJ-03: Consent & Selective Disclosure',
    reqs: 'FR-11 to FR-13, FR-20',
    ac: 'AC-05, AC-06',
    module: 'createSelectiveDisclosurePresentation() & StudentWalletView.tsx',
    status: 'Verified',
  },
  {
    obj: 'OBJ-04: Independent Cryptographic Verification',
    reqs: 'FR-14 to FR-17, FR-19',
    ac: 'AC-07 to AC-10',
    module: 'src/shared/domain/verificationPipeline.ts & VerifierPortalView.tsx',
    status: 'Verified (7/7 Scenarios Pass)',
  },
  {
    obj: 'OBJ-05: Ethereum Testnet Integration',
    reqs: 'FR-18',
    ac: 'AC-11, AC-12',
    module: 'contracts/UniversityDIDRegistry.sol & BlockchainExplorerView.tsx',
    status: 'Verified (Zero PII On-Chain)',
  },
  {
    obj: 'OBJ-06: Secure & Documented Prototype',
    reqs: 'FR-21 to FR-24, NFR-01 to NFR-16',
    ac: 'AC-12, AC-13',
    module:
      'docs/ARCHITECTURE.md, authMiddleware.ts, verificationPipeline.test.ts',
    status: 'Verified',
  },
];

export const ArchitectureAuditView: React.FC<ArchitectureAuditViewProps> = ({
  auditEvents,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const filteredEvents = auditEvents.filter((ev) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      ev.actionType.toLowerCase().includes(q) ||
      ev.actorRole.toLowerCase().includes(q) ||
      ev.privacyMinimizedSummary.toLowerCase().includes(q) ||
      ev.targetReference.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Open Page Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[13px] font-medium text-slate-500">
            Engineering Governance · CS47001 Specification
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold text-slate-950 tracking-tight leading-tight">
            Architecture &amp; Traceability Audit
          </h1>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            Every functional requirement and acceptance criterion from the Software Requirements Specification maps directly to an isolated module in this codebase.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/assets/aistudio/did_srs_cc9b6655.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[42px] px-4 py-2 text-[13px] font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors w-full sm:w-auto whitespace-nowrap"
          >
            Open Original SRS PDF ↗
          </a>
        </div>
      </section>

      {/* Modular Structure & GitHub Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start border-t border-slate-200 pt-8 sm:pt-10">
        <div className="lg:col-span-7 space-y-4 min-w-0">
          <div>
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              Clean Architecture &amp; Modular Structure (NFR-11)
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Strict separation of React UI, Express REST API, domain services, cryptographic engine, and Solidity contract
            </p>
          </div>
          <pre className="p-4 sm:p-5 bg-slate-950 text-slate-200 rounded-xl text-[11px] sm:text-[12px] font-mono overflow-x-auto leading-relaxed border border-slate-800 max-w-full">
{`/
├── contracts/
│   └── UniversityDIDRegistry.sol        # Solidity Registry (0 Bytes PII)
├── docs/
│   ├── ARCHITECTURE.md                  # Layered Architecture Design
│   ├── API_SPECIFICATION.md             # REST API Spec (/api/v1/*)
│   └── TEST_PLAN_AND_EVIDENCE.md        # SRS 12.1 Test Cases (TC-01..TC-07)
├── server.ts                            # Express + Vite Full-Stack Entry
└── src/
    ├── shared/
    │   ├── types/did.types.ts           # W3C DID v1.0, VC v2.0, VP Models
    │   └── domain/
    │       ├── cryptoEngine.ts          # Salted Commitments & Signatures
    │       ├── didResolver.ts           # did:ethr:sepolia Resolver
    │       ├── verificationPipeline.ts  # 6-Stage Deterministic Verifier
    │       └── verificationPipeline.test.ts # 9 Automated Domain Tests
    ├── server/
    │   ├── middleware/authMiddleware.ts # Role-Based Access Control
    │   ├── repositories/identityRepository.ts
    │   ├── services/identityService.ts
    │   └── routes/apiRoutes.ts
    └── client/
        ├── services/apiClient.ts
        └── components/                  # Student, Issuer, Verifier Views`}
          </pre>
        </div>

        <div className="lg:col-span-5 space-y-4 min-w-0">
          <div>
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              GitHub Repository Synchronization
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Initialized on branch <code className="font-mono text-slate-900">main</code> with all deliverables committed
            </p>
          </div>
          <pre className="p-4 sm:p-5 bg-slate-950 text-slate-200 rounded-xl text-[11px] sm:text-[12px] font-mono overflow-x-auto leading-relaxed border border-slate-800 max-w-full">
{`# 1. Review status & commit history
git status
git log --oneline -n 5

# 2. Add your remote repository and push
git remote add origin https://github.com/<user>/did-system.git
git branch -M main
git push -u origin main`}
          </pre>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            You can also export directly to GitHub using the <strong>Export to GitHub</strong> action in the top-right AI Studio toolbar.
          </p>
        </div>
      </div>

      {/* Requirements Traceability Matrix */}
      <section className="space-y-5 border-t border-slate-200 pt-8 sm:pt-10">
        <div>
          <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
            Requirements Traceability Matrix (SRS Appendix B)
          </h2>
          <p className="text-[14px] text-slate-600 mt-0.5">
            Maps every project objective, functional requirement, and acceptance criterion to its engineered module
          </p>
        </div>

        {/* Mobile Stacked Cards (md:hidden) */}
        <div className="md:hidden space-y-3">
          {TRACEABILITY_MATRIX.map((row) => (
            <div
              key={row.obj}
              className="surface-panel rounded-xl p-4 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-semibold text-slate-950 leading-snug">
                  {row.obj}
                </h3>
                <span className="text-[12px] font-semibold text-emerald-700 shrink-0">
                  {row.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[12px]">
                <div>
                  <span className="text-slate-500 font-medium text-[11px] block">
                    Functional Reqs
                  </span>
                  <span className="font-mono text-slate-800">{row.reqs}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium text-[11px] block">
                    Acceptance Criteria
                  </span>
                  <span className="font-mono text-slate-800">{row.ac}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-100 text-[12px]">
                <span className="text-slate-500 font-medium text-[11px] block">
                  Engineered Module
                </span>
                <span className="font-mono text-slate-700 break-words">
                  {row.module}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block surface-panel rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[12px] text-slate-600 font-semibold">
                <th className="py-3 px-5">Project Objective</th>
                <th className="py-3 px-4">Functional Reqs</th>
                <th className="py-3 px-4">Acceptance Criteria</th>
                <th className="py-3 px-4">Engineered Module</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {TRACEABILITY_MATRIX.map((row) => (
                <tr key={row.obj} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 font-semibold text-slate-950">
                    {row.obj}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-slate-700">
                    {row.reqs}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-slate-700">
                    {row.ac}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-slate-600">
                    {row.module}
                  </td>
                  <td className="py-3 px-5 text-right font-semibold text-emerald-700">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Privacy-Minimized Audit Event Log */}
      <section className="space-y-5 border-t border-slate-200 pt-8 sm:pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              Privacy-Minimized Audit Event Log ({filteredEvents.length})
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Append-only operational trail omitting private keys, passwords, and raw credential payloads (SRS §8.5)
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <input
              type="search"
              aria-label="Filter Audit Events"
              placeholder="Filter by action, role, or reference..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="min-h-[40px] px-3.5 py-2 text-[13px] bg-white border border-slate-300 rounded-lg w-full sm:w-72 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Mobile Stacked Cards (md:hidden) */}
        <div className="md:hidden space-y-3">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="surface-panel rounded-xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] font-bold text-slate-950">
                  {ev.actionType}
                </span>
                <span
                  className={`text-[12px] font-mono font-semibold ${
                    ev.outcome === 'SUCCESS'
                      ? 'text-emerald-700'
                      : ev.outcome === 'UNABLE_TO_VERIFY'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {ev.outcome}
                </span>
              </div>
              <p className="text-[13px] text-slate-700 leading-relaxed">
                {ev.privacyMinimizedSummary}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                <span>
                  {ev.id} · {ev.actorRole}
                </span>
                <span className="tabular-nums">
                  {ev.timestamp.replace('T', ' ').slice(0, 19)} UTC
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block surface-panel rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[12px] text-slate-600 font-semibold">
                <th className="py-3 px-5">Event ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Ref</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-5 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 font-mono text-[12px] font-medium text-slate-900">
                    {ev.id}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-slate-500 tabular-nums">
                    {ev.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-slate-700">
                    {ev.actorRole}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] font-semibold text-slate-950">
                    {ev.actionType}
                  </td>
                  <td className="py-3 px-4 font-mono text-[12px] text-slate-500">
                    {ev.targetReference.slice(0, 22)}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {ev.privacyMinimizedSummary}
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-[12px] font-semibold">
                    <span
                      className={
                        ev.outcome === 'SUCCESS'
                          ? 'text-emerald-700'
                          : ev.outcome === 'UNABLE_TO_VERIFY'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }
                    >
                      {ev.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
