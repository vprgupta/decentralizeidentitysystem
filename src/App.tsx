/**
 * @file App.tsx
 * @description Root Application Shell for the Decentralized Identity (DID) System (CS47001).
 * Enterprise SaaS workspace architecture:
 * - Desktop (>= lg): Dedicated 248px navigation sidebar + contextual top bar with session actor switcher.
 * - Mobile / Tablet (< lg): Non-sticky compact brand bar + clean 2x3 segmented workspace switcher.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  FileCheck2,
  Layers,
  Link2,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { apiClient, WorkspaceStateResponse } from './client/services/apiClient';
import { InteractiveDemoView } from './client/components/InteractiveDemoView';
import { StudentWalletView } from './client/components/StudentWalletView';
import { IssuerPortalView } from './client/components/IssuerPortalView';
import { VerifierPortalView } from './client/components/VerifierPortalView';
import { BlockchainExplorerView } from './client/components/BlockchainExplorerView';
import { ArchitectureAuditView } from './client/components/ArchitectureAuditView';
import {
  SharingRequestStatus,
  UserRole,
  VerifiablePresentation,
} from './shared/types/did.types';

export type ActiveTab =
  | 'wallet'
  | 'demo'
  | 'issuer'
  | 'verifier'
  | 'blockchain'
  | 'audit';

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  breadcrumb: string;
  icon: typeof Wallet;
}[] = [
  {
    id: 'wallet',
    label: 'Student Wallet',
    breadcrumb: 'Holder / Student Identity & Wallet',
    icon: Wallet,
  },
  {
    id: 'demo',
    label: 'Overview & Demo',
    breadcrumb: 'Architecture / Interactive Walkthrough',
    icon: BookOpen,
  },
  {
    id: 'issuer',
    label: 'University Issuer',
    breadcrumb: 'Registrar / Issuance & Revocation',
    icon: FileCheck2,
  },
  {
    id: 'verifier',
    label: 'Verifier Console',
    breadcrumb: 'Verifier / Independent Inspection',
    icon: ShieldCheck,
  },
  {
    id: 'blockchain',
    label: 'Sepolia Registry',
    breadcrumb: 'Network / Ethereum Sepolia Ledger',
    icon: Link2,
  },
  {
    id: 'audit',
    label: 'Architecture & Audit',
    breadcrumb: 'Governance / Traceability & Logs',
    icon: Layers,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('wallet');
  const [actorUserId, setActorUserId] = useState<string>('usr-student-1');
  const [workspace, setWorkspace] = useState<WorkspaceStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [preselectedVp, setPreselectedVp] =
    useState<VerifiablePresentation | null>(null);
  const [autoPlayVideoSignal, setAutoPlayVideoSignal] = useState<number>(0);

  const loadWorkspaceState = useCallback(
    async (overrideUserId?: string) => {
      try {
        setError(null);
        const uid = overrideUserId || actorUserId;
        const data = await apiClient.fetchState(uid);
        setWorkspace(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [actorUserId]
  );

  useEffect(() => {
    loadWorkspaceState();
  }, [loadWorkspaceState]);

  const handleSelectUser = async (newUserId: string) => {
    setActorUserId(newUserId);
    await loadWorkspaceState(newUserId);
  };

  const handleSwitchTabWithRoleSync = async (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!workspace) return;
    if (tab === 'issuer') {
      const issuer = workspace.users.find(
        (u) => u.role === UserRole.UNIVERSITY_ISSUER
      );
      if (issuer && actorUserId !== issuer.id) {
        await handleSelectUser(issuer.id);
      }
    } else if (tab === 'verifier') {
      const verifier = workspace.users.find((u) => u.role === UserRole.VERIFIER);
      if (verifier && actorUserId !== verifier.id) {
        await handleSelectUser(verifier.id);
      }
    } else if (tab === 'wallet') {
      const current = workspace.users.find((u) => u.id === actorUserId);
      if (!current || current.role !== UserRole.STUDENT_HOLDER) {
        const firstStudent = workspace.users.find(
          (u) => u.role === UserRole.STUDENT_HOLDER
        );
        if (firstStudent) {
          await handleSelectUser(firstStudent.id);
        }
      }
    }
  };

  const handleResetDemo = async () => {
    setLoading(true);
    try {
      await apiClient.resetSystem(actorUserId);
      setActorUserId('usr-student-1');
      setPreselectedVp(null);
      await loadWorkspaceState('usr-student-1');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToVerifierWithPresentation = async (
    vp: VerifiablePresentation
  ) => {
    setPreselectedVp(vp);
    await handleSwitchTabWithRoleSync('verifier');
  };

  const handleWatchWorkflowVideo = () => {
    setActiveTab('demo');
    setAutoPlayVideoSignal((n) => n + 1);
    window.setTimeout(() => {
      document
        .getElementById('workflow-video-player')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const pendingRequestCount = workspace
    ? workspace.presentationRequests.filter(
        (r) => r.status === SharingRequestStatus.PENDING
      ).length
    : 0;

  const activeNavMeta =
    NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] text-slate-900">
      {/* Desktop Workspace Sidebar (248px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-slate-200 z-30">
        <div className="h-14 px-5 flex items-center border-b border-slate-200/80 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSwitchTabWithRoleSync('wallet');
            }}
            className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-slate-950 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            <span className="w-2.5 h-2.5 rounded-[3px] bg-blue-700 shrink-0" />
            <span>Decentralized Identity</span>
          </a>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 tracking-wide">
              Workspaces
            </p>
            <nav
              aria-label="Workspace Navigation"
              className="space-y-0.5"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSwitchTabWithRoleSync(item.id)}
                    className={`w-full min-h-[38px] px-3 py-2 rounded-lg flex items-center justify-between gap-2.5 text-[13.5px] transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-100 text-slate-950 font-semibold'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-blue-700' : 'text-slate-400'
                        }`}
                        strokeWidth={1.9}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'wallet' && pendingRequestCount > 0 && (
                      <span className="text-[12px] font-mono font-semibold text-blue-700 tabular-nums shrink-0">
                        {pendingRequestCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom Ledger & Reset */}
        <div className="p-4 border-t border-slate-200/80 space-y-3 bg-slate-50/60">
          {workspace && (
            <div className="px-1 space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-500 font-medium">Sepolia RPC</span>
                <span
                  className={`font-mono font-medium ${
                    workspace.ethereumRpcOnline
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {workspace.ethereumRpcOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-500 font-medium">Block</span>
                <span className="font-mono text-slate-700 tabular-nums">
                  #{workspace.currentBlockNumber.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetDemo}
            className="w-full min-h-[36px] px-3 py-1.5 flex items-center justify-center gap-2 text-[13px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset State</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Context Bar (Desktop & Mobile) */}
        <header className="bg-white border-b border-slate-200/90 z-20 lg:sticky lg:top-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            {/* Left: Brand on Mobile / Breadcrumb on Desktop */}
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  handleSwitchTabWithRoleSync('wallet');
                }}
                className="lg:hidden flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
              >
                <span className="w-2.5 h-2.5 rounded-[3px] bg-blue-700 shrink-0" />
                <span>Decentralized Identity</span>
              </a>

              <span className="hidden lg:inline-block text-[13px] font-medium text-slate-500 truncate">
                {activeNavMeta.breadcrumb}
              </span>
            </div>

            {/* Right: Session Actor Switcher (Desktop) & Mobile Reset */}
            <div className="flex items-center gap-2.5 shrink-0">
              {workspace && (
                <div className="hidden lg:flex items-center gap-2">
                  <label
                    htmlFor="global-role-switcher"
                    className="text-[12px] text-slate-500 font-medium whitespace-nowrap"
                  >
                    Session
                  </label>
                  <select
                    id="global-role-switcher"
                    aria-label="Active Session Actor"
                    value={workspace.activeUser.id}
                    onChange={(e) => handleSelectUser(e.target.value)}
                    className="min-h-[34px] h-8 px-2.5 text-[13px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-600 transition-colors cursor-pointer max-w-[260px] truncate"
                  >
                    {workspace.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} {u.studentId ? `(${u.studentId})` : ''} ·{' '}
                        {u.role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleResetDemo}
                className="lg:hidden min-h-[34px] h-8 px-3 text-[12px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Mobile / Tablet Session & Workspace Navigation (< lg) */}
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2.5">
            {workspace && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12px] text-slate-500">
                  <span>KIIT University · CS47001</span>
                  <span
                    className={`font-mono font-medium tabular-nums ${
                      workspace.ethereumRpcOnline
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    Sepolia{' '}
                    {workspace.ethereumRpcOnline
                      ? `#${workspace.currentBlockNumber.toLocaleString()}`
                      : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="mobile-role-switcher"
                    className="text-[12px] text-slate-500 font-medium whitespace-nowrap shrink-0"
                  >
                    Session
                  </label>
                  <select
                    id="mobile-role-switcher"
                    aria-label="Mobile Active Session Actor"
                    value={workspace.activeUser.id}
                    onChange={(e) => handleSelectUser(e.target.value)}
                    className="w-full min-h-[38px] px-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-600 cursor-pointer truncate"
                  >
                    {workspace.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} {u.studentId ? `(${u.studentId})` : ''} ·{' '}
                        {u.role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <nav
              aria-label="Mobile Workspace Navigation"
              className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-lg"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSwitchTabWithRoleSync(item.id)}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-[13px] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-950 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-950 font-medium'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.id === 'wallet' && pendingRequestCount > 0 && (
                      <span
                        className={`text-[11px] font-mono font-semibold tabular-nums ${
                          isActive ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        ({pendingRequestCount})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9">
          {loading && !workspace ? (
            <div className="py-24 text-center">
              <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[14px] text-slate-500">
                Loading university identity workspace...
              </p>
            </div>
          ) : error ? (
            <div className="bg-rose-50/90 border border-rose-200 rounded-lg p-5 text-[14px] text-rose-900">
              <p className="font-semibold">Unable to load workspace</p>
              <p className="mt-1 text-rose-700">{error}</p>
            </div>
          ) : (
            workspace && (
              <div key={activeTab} className="animate-view-enter">
                {activeTab === 'demo' && (
                  <InteractiveDemoView
                    users={workspace.users}
                    trustedIssuers={workspace.trustedIssuers}
                    credentials={workspace.credentials}
                    presentations={workspace.presentations}
                    testDatasetCases={workspace.testDatasetCases}
                    ethereumRpcOnline={workspace.ethereumRpcOnline}
                    autoPlayVideoSignal={autoPlayVideoSignal}
                    onRefresh={() => loadWorkspaceState()}
                    onNavigateTab={(tab) => handleSwitchTabWithRoleSync(tab)}
                  />
                )}

                {activeTab === 'wallet' && (
                  <StudentWalletView
                    activeUser={workspace.activeUser}
                    allUsers={workspace.users}
                    didRecords={workspace.didRecords}
                    credentials={workspace.credentials}
                    presentationRequests={workspace.presentationRequests}
                    presentations={workspace.presentations}
                    ethereumRpcOnline={workspace.ethereumRpcOnline}
                    onSelectUser={handleSelectUser}
                    onRefresh={() => loadWorkspaceState()}
                    onNavigateToVerifierWithPresentation={
                      handleNavigateToVerifierWithPresentation
                    }
                    onWatchWorkflowVideo={handleWatchWorkflowVideo}
                  />
                )}

                {activeTab === 'issuer' && (
                  <IssuerPortalView
                    activeUser={workspace.activeUser}
                    allUsers={workspace.users}
                    trustedIssuers={workspace.trustedIssuers}
                    allIssuedCredentials={workspace.allIssuedCredentials}
                    ethereumRpcOnline={workspace.ethereumRpcOnline}
                    onRefresh={() => loadWorkspaceState()}
                  />
                )}

                {activeTab === 'verifier' && (
                  <VerifierPortalView
                    activeUser={workspace.activeUser}
                    allUsers={workspace.users}
                    presentations={workspace.presentations}
                    allIssuedCredentials={workspace.allIssuedCredentials}
                    testDatasetCases={workspace.testDatasetCases}
                    verificationHistory={workspace.verificationHistory}
                    ethereumRpcOnline={workspace.ethereumRpcOnline}
                    preselectedPresentation={preselectedVp}
                    onRefresh={() => loadWorkspaceState()}
                  />
                )}

                {activeTab === 'blockchain' && (
                  <BlockchainExplorerView
                    activeUser={workspace.activeUser}
                    onChainTransactions={workspace.onChainTransactions}
                    onChainStatusRegistry={workspace.onChainStatusRegistry}
                    ethereumRpcOnline={workspace.ethereumRpcOnline}
                    sepoliaContractAddress={workspace.sepoliaContractAddress}
                    currentBlockNumber={workspace.currentBlockNumber}
                    privacyAudit={workspace.privacyAudit}
                    onRefresh={() => loadWorkspaceState()}
                  />
                )}

                {activeTab === 'audit' && (
                  <ArchitectureAuditView auditEvents={workspace.auditEvents} />
                )}
              </div>
            )
          )}
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="border-t border-slate-200/80 bg-white mt-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12.5px] text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">
                Decentralized Identity &amp; Verifiable Credentials
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>W3C DID v1.0 &amp; VC v2.0</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Zero On-Chain PII</span>
            </div>
            <div className="text-[12px] text-slate-400 font-mono leading-relaxed">
              CS47001 · B. Gupta · B. Shahi · A. Singh · A. Giri · N. Gulla
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
