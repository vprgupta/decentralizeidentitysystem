/**
 * @file WorkflowAnimationPlayer.tsx
 * @description Interactive full-workflow animated walkthrough player illustrating the
 * complete DID -> Issuance -> Request -> Selective Disclosure QR -> 6-Stage Verification -> Revocation lifecycle.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  TOTAL_WALKTHROUGH_DURATION_MS,
  WALKTHROUGH_SCENES,
  WalkthroughTargetTab,
  clampPlaybackTime,
  formatTimecode,
  getOverallProgressPercent,
  getSceneAtTime,
  getSceneLocalProgress,
} from '../../shared/domain/walkthroughTimeline';

interface WorkflowAnimationPlayerProps {
  onNavigateTab: (tab: WalkthroughTargetTab) => void;
  autoPlaySignal?: number;
  onSceneChange?: (sceneIndex: number) => void;
}

const SPEED_OPTIONS = [1, 1.5, 2] as const;

const VERIFICATION_STAGES = [
  'W3C Schema & Context',
  'Issuer Digital Signature',
  'Salted Claim Digests',
  'Trusted University Registry',
  'Credential Expiration Window',
  'Sepolia Status #1001',
];

export const WorkflowAnimationPlayer: React.FC<WorkflowAnimationPlayerProps> = ({
  onNavigateTab,
  autoPlaySignal = 0,
  onSceneChange,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [playbackMs, setPlaybackMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const lastFrameRef = useRef<number | null>(null);

  const currentScene = getSceneAtTime(playbackMs);
  const localProgress = getSceneLocalProgress(playbackMs);
  const overallPercent = getOverallProgressPercent(playbackMs);
  const isAtEnd = playbackMs >= TOTAL_WALKTHROUGH_DURATION_MS;

  // Respond to external autoplay trigger (e.g., "Watch Full Video" from Student Wallet)
  useEffect(() => {
    if (autoPlaySignal > 0) {
      setPlaybackMs(0);
      setIsPlaying(true);
    }
  }, [autoPlaySignal]);

  // Notify parent when active scene index shifts (e.g., to sync Trust Triangle)
  useEffect(() => {
    onSceneChange?.(currentScene.index);
  }, [currentScene.index, onSceneChange]);

  // Deterministic requestAnimationFrame playback clock
  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }

    let rafId = 0;
    const tick = (now: number) => {
      if (lastFrameRef.current !== null) {
        const deltaMs = Math.min(100, now - lastFrameRef.current) * speed;
        setPlaybackMs((prev) => {
          const next = clampPlaybackTime(prev + deltaMs);
          if (next >= TOTAL_WALKTHROUGH_DURATION_MS) {
            setIsPlaying(false);
          }
          return next;
        });
      }
      lastFrameRef.current = now;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      lastFrameRef.current = null;
    };
  }, [isPlaying, speed]);

  const handleTogglePlay = () => {
    if (isAtEnd) {
      setPlaybackMs(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleRestart = () => {
    setPlaybackMs(0);
    setIsPlaying(true);
  };

  const handleJumpToScene = (index: number, autoStart = true) => {
    const target = WALKTHROUGH_SCENES[index];
    if (!target) return;
    setPlaybackMs(target.startMs);
    if (autoStart) {
      setIsPlaying(true);
    }
  };

  const handlePrevScene = () => {
    const prevIdx = Math.max(0, currentScene.index - 1);
    handleJumpToScene(prevIdx, isPlaying);
  };

  const handleNextScene = () => {
    const nextIdx = Math.min(
      WALKTHROUGH_SCENES.length - 1,
      currentScene.index + 1
    );
    handleJumpToScene(nextIdx, isPlaying);
  };

  return (
    <section
      id="workflow-video-player"
      data-testid="workflow-animation-player"
      aria-label="Interactive End-to-End Walkthrough Video"
      className="surface-panel rounded-xl overflow-hidden scroll-mt-20"
    >
      {/* Top Cinema Stage */}
      <div className="bg-slate-950 text-white p-5 sm:p-7 space-y-6">
        {/* Stage Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[12px] font-mono text-slate-400 tabular-nums">
              <span>Interactive Workflow Animation</span>
              <span aria-hidden="true">·</span>
              <span className="text-blue-400">
                Scene {currentScene.stepNumber} / 06
              </span>
            </div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-white">
              {currentScene.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab(currentScene.targetTab)}
            className="min-h-[38px] px-4 py-1.5 text-[13px] font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap self-start sm:self-auto"
          >
            {currentScene.targetLabel} →
          </button>
        </div>

        {/* Live Data Flow Strip */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[12px] font-mono text-slate-300 shrink-0">
              {currentScene.actor}
            </span>

            {/* Animated Signal Track */}
            <div className="relative flex-1 h-7 flex items-center min-w-[140px]">
              <div className="w-full h-px bg-slate-700" />
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-600 text-white font-mono text-[11px] whitespace-nowrap shadow-xs"
                animate={
                  prefersReducedMotion
                    ? { left: '35%' }
                    : {
                        left: `${Math.min(72, Math.max(2, localProgress * 72))}%`,
                      }
                }
                transition={{ duration: 0.08, ease: 'linear' }}
              >
                <span>{currentScene.packetLabel}</span>
              </motion.div>
            </div>

            <span className="text-[12px] font-mono text-emerald-400 tabular-nums shrink-0">
              {Math.round(localProgress * 100)}%
            </span>
          </div>
        </div>

        {/* Animated Visual Stage (6 Interactive Scenes) */}
        <div className="min-h-[270px] sm:min-h-[290px] flex items-stretch">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              {/* SCENE 01: Local DID Keygen + Sepolia Anchor */}
              {currentScene.index === 0 && (
                <>
                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Student Device Keypair
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-mono text-emerald-400">
                        <Lock className="w-3.5 h-3.5" />
                        Private Key Local
                      </span>
                    </div>
                    <div className="space-y-2.5 font-mono text-[12px]">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1">
                          Generated Decentralized Identifier
                        </span>
                        <span className="text-slate-100 break-all">
                          did:ethr:sepolia:0x3a7540a98d149bd6c4b8e0550f19baa51566032a
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Private Signing Key</span>
                        <span className="text-amber-300">Encrypted · Never Transmitted</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Ethereum Sepolia Anchor
                      </span>
                      <span className="text-[12px] font-mono text-sky-400">
                        {localProgress > 0.45 ? 'Confirmed · Block #7,184,910' : 'Anchoring...'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[12px] space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>publicKeyCommitment</span>
                          <span>32 bytes</span>
                        </div>
                        <p className="text-sky-300 truncate">
                          0x65fe9323ac6e01ac3ea2ca9f77d19048b8421ef1a9c002
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[12px] text-slate-400">
                          <span>Personal Identity Data Written On-Chain</span>
                          <span className="font-mono text-emerald-400">0 Bytes PII</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all duration-150"
                            style={{ width: `${Math.min(100, localProgress * 125)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SCENE 02: University Signs & Delivers Credential */}
              {currentScene.index === 1 && (
                <>
                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Salted SHA-256 Claim Commitments
                      </span>
                      <span className="text-[12px] font-mono text-blue-400">
                        Registrar Signing Key
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11.5px]">
                      {[
                        ['studentName', 'Bishal Gupta'],
                        ['studentNumber', '23053694'],
                        ['program', 'B.Tech CSE (CS47001)'],
                        ['enrollmentStatus', 'Active'],
                        ['academicYear', '2026-2027'],
                        ['universityName', 'KIIT School of CS'],
                      ].map(([key, val], idx) => {
                        const hashed = localProgress > idx * 0.12;
                        return (
                          <div
                            key={key}
                            className={`p-2.5 rounded-lg border transition-colors ${
                              hashed
                                ? 'bg-slate-950 border-blue-500/50 text-slate-100'
                                : 'bg-slate-950/50 border-slate-800 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">{key}</span>
                              <span className={hashed ? 'text-emerald-400' : 'text-slate-600'}>
                                {hashed ? 'Salted ✓' : 'Pending'}
                              </span>
                            </div>
                            <div className="truncate mt-0.5 text-slate-200">{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[12px] font-mono text-slate-400">
                        Signed Deliverable
                      </span>
                      <h3 className="text-[16px] font-semibold text-white">
                        VC-2026-CS47001-001
                      </h3>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[12px] space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Signature</span>
                        <span className="text-emerald-400">
                          {localProgress > 0.65 ? 'Valid Proof Attached' : 'Signing...'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sepolia Index</span>
                        <span className="text-sky-300">#1001 · ACTIVE</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Delivery</span>
                        <span className="text-slate-200">Holder Wallet</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SCENE 03: Verifier Sends Challenge Request */}
              {currentScene.index === 2 && (
                <>
                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Verifier Authorization Request
                      </span>
                      <span className="text-[12px] font-mono text-violet-300">
                        REQ-2026-001
                      </span>
                    </div>
                    <p className="text-[13.5px] text-slate-300 leading-relaxed">
                      Campus Central Library &amp; Research Portal asks to confirm active 2026–2027 university enrollment without requiring your Student ID Number.
                    </p>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[12px] flex items-center justify-between">
                      <span className="text-slate-400">Replay-Safe Nonce</span>
                      <span className="text-violet-300">nonce-lib-884120a9</span>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <span className="text-[13px] font-semibold text-white">
                      Requested Attributes (Explicit Consent Required)
                    </span>
                    <div className="space-y-2 text-[13px]">
                      {[
                        'Student Full Name',
                        'Academic Program',
                        'Enrollment Status',
                        'Issuing University',
                      ].map((item, idx) => (
                        <div
                          key={item}
                          className={`px-3.5 py-2.5 rounded-lg border flex items-center justify-between transition-opacity ${
                            localProgress > idx * 0.16
                              ? 'bg-slate-950 border-slate-700 opacity-100'
                              : 'bg-slate-950/40 border-slate-800 opacity-45'
                          }`}
                        >
                          <span className="text-slate-200">{item}</span>
                          <span className="text-[12px] font-mono text-slate-400">
                            Requested
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* SCENE 04: Selective Disclosure & QR Pass */}
              {currentScene.index === 3 && (
                <>
                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Student Selective Disclosure Control
                      </span>
                      <span className="text-[12px] font-mono text-emerald-400">
                        4 Shared · 2 Withheld
                      </span>
                    </div>
                    <div className="space-y-2 text-[13px]">
                      <div className="px-3.5 py-2.5 rounded-lg bg-slate-950 border border-emerald-500/40 flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">Student Name &amp; Program</span>
                          <span className="block text-[11.5px] font-mono text-slate-400">
                            Bishal Gupta · B.Tech CSE (CS47001)
                          </span>
                        </div>
                        <span className="text-[12px] font-mono text-emerald-400">Shared</span>
                      </div>

                      <div className="px-3.5 py-2.5 rounded-lg bg-slate-950 border border-amber-500/50 flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">Student ID Number</span>
                          <span className="block text-[11.5px] font-mono text-amber-300">
                            {localProgress > 0.3
                              ? 'sha256:7a01a71ce5b03cff007705d5...'
                              : '23053694 -> Computing salted digest...'}
                          </span>
                        </div>
                        <span className="text-[12px] font-mono text-amber-300">
                          Withheld
                        </span>
                      </div>

                      <div className="px-3.5 py-2.5 rounded-lg bg-slate-950 border border-emerald-500/40 flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">Enrollment Status</span>
                          <span className="block text-[11.5px] font-mono text-slate-400">
                            Active · Signed by Registrar
                          </span>
                        </div>
                        <span className="text-[12px] font-mono text-emerald-400">Shared</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative p-3 bg-white rounded-xl overflow-hidden">
                      <QrCode className="w-24 h-24 text-slate-950" strokeWidth={1.6} />
                      {!prefersReducedMotion && (
                        <motion.div
                          className="absolute left-0 right-0 h-0.5 bg-blue-600"
                          animate={{ top: ['12%', '88%', '12%'] }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-mono text-[12.5px] font-semibold text-white">
                        VP-2026-001 · OpenID4VP QR Pass
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">
                        Signature intact even with 2 claims hidden
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* SCENE 05: 6-Stage Deterministic Verification */}
              {currentScene.index === 4 && (
                <>
                  <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        6-Stage Deterministic Pipeline
                      </span>
                      <span className="text-[12px] font-mono text-emerald-400">
                        Fail-Closed Engine
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {VERIFICATION_STAGES.map((stage, idx) => {
                        const passed = localProgress > (idx + 0.5) / 7;
                        return (
                          <div
                            key={stage}
                            className={`px-3 py-2.5 rounded-lg border flex items-center justify-between text-[12.5px] transition-colors ${
                              passed
                                ? 'bg-slate-950 border-emerald-500/40 text-white'
                                : 'bg-slate-950/40 border-slate-800 text-slate-500'
                            }`}
                          >
                            <span>
                              0{idx + 1}. {stage}
                            </span>
                            {passed ? (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="font-mono text-[11px]">...</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[11.5px] font-mono text-slate-400 block">
                          Verifier Decision
                        </span>
                        <span className="text-[18px] font-bold text-emerald-400">
                          {localProgress > 0.78 ? 'VALID' : 'Evaluating...'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11.5px] space-y-1.5 text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Registrar Contacted</span>
                        <span className="text-emerald-400 text-right">No</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Student ID Exposed</span>
                        <span className="text-emerald-400 text-right">No (Withheld)</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Latency</span>
                        <span className="text-slate-100 text-right">3.2 ms</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SCENE 06: Anonymous Revocation */}
              {currentScene.index === 5 && (
                <>
                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">
                        Sepolia StatusList2021 Registry
                      </span>
                      <span
                        className={`text-[12px] font-mono font-semibold ${
                          localProgress > 0.4 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {localProgress > 0.4 ? 'Index #1001 -> REVOKED' : 'Index #1001 -> ACTIVE'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[12px] space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400 shrink-0">On-Chain Call</span>
                        <span className="text-slate-200 text-right truncate">
                          setCredentialStatus(1001, 2)
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400 shrink-0">Student PII</span>
                        <span className="text-emerald-400 text-right">
                          None (0 Bytes)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert
                        className={`w-6 h-6 shrink-0 ${
                          localProgress > 0.5 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <span className="text-[11.5px] font-mono text-slate-400 block">
                          Subsequent Scan Outcome
                        </span>
                        <span
                          className={`text-[18px] font-bold ${
                            localProgress > 0.5 ? 'text-rose-400' : 'text-slate-200'
                          }`}
                        >
                          {localProgress > 0.5 ? 'REJECTED · REVOKED' : 'Re-querying Index #1001...'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-slate-300 leading-relaxed">
                      Every verifier checking Status Index #1001 immediately rejects the credential while public blockchain observers only see an anonymous numeric flip.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Narrated Caption & Transport Controls */}
      <div className="bg-white border-t border-slate-200 p-5 sm:p-6 space-y-5">
        {/* Spoken/Visual Caption Track */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <p className="text-[14.5px] text-slate-800 leading-relaxed max-w-3xl">
            <span className="font-mono text-[12.5px] font-semibold text-blue-700 mr-2">
              [{currentScene.stepNumber}]
            </span>
            {currentScene.caption}
          </p>
          <span
            data-testid="video-timecode"
            className="font-mono text-[12.5px] font-medium text-slate-500 tabular-nums shrink-0"
          >
            {formatTimecode(playbackMs)} / {formatTimecode(TOTAL_WALKTHROUGH_DURATION_MS)}
          </span>
        </div>

        {/* Single Unified Scrubber Track */}
        <div className="relative h-5 flex items-center">
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all duration-75"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-blue-700 border-2 border-white shadow-xs"
            style={{ left: `${overallPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={TOTAL_WALKTHROUGH_DURATION_MS}
            step={100}
            value={Math.round(playbackMs)}
            aria-label="Walkthrough timeline scrubber"
            onChange={(e) => {
              setPlaybackMs(Number(e.target.value));
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Transport Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="btn-video-play-pause"
              onClick={handleTogglePlay}
              className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-[13.5px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : isAtEnd ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Replay Video</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Play Video</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart walkthrough video"
              className="min-h-[40px] px-3 py-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            <button
              type="button"
              onClick={handlePrevScene}
              disabled={currentScene.index === 0}
              aria-label="Previous scene"
              className="min-h-[40px] px-2.5 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNextScene}
              disabled={currentScene.index === WALKTHROUGH_SCENES.length - 1}
              aria-label="Next scene"
              className="min-h-[40px] px-2.5 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Playback Speed Control */}
          <div
            role="group"
            aria-label="Playback speed"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSpeed(opt)}
                className={`min-h-[32px] px-2.5 text-[12.5px] font-mono rounded-md transition-colors cursor-pointer ${
                  speed === opt
                    ? 'bg-white text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {opt}x
              </button>
            ))}
          </div>
        </div>

        {/* 6 Interactive Chapter Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {WALKTHROUGH_SCENES.map((scene) => {
            const isActive = scene.index === currentScene.index;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleJumpToScene(scene.index, true)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/60 border-blue-600 text-slate-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <span
                  className={`block font-mono text-[11px] ${
                    isActive ? 'text-blue-700 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {scene.stepNumber} · {formatTimecode(scene.startMs)}
                </span>
                <span className="block text-[12.5px] font-semibold leading-snug mt-0.5 truncate">
                  {scene.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
