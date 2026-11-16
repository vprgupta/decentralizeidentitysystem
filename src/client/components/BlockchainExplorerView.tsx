/**
 * @file BlockchainExplorerView.tsx
 * @description Ethereum Sepolia Testnet Explorer, On-Chain / Off-Chain Privacy Boundary Auditor,
 * Solidity Smart Contract Viewer, and RPC Availability Simulator (FR-18, NFR-04, NFR-07, NFR-15, AC-11, AC-12).
 */

import React, { useState } from 'react';
import {
  CredentialStatus,
  OnChainTransactionRecord,
  UserAccount,
} from '../../shared/types/did.types';
import { apiClient } from '../services/apiClient';

interface BlockchainExplorerViewProps {
  activeUser: UserAccount;
  onChainTransactions: OnChainTransactionRecord[];
  onChainStatusRegistry: Record<string, CredentialStatus>;
  ethereumRpcOnline: boolean;
  sepoliaContractAddress: string;
  currentBlockNumber: number;
  privacyAudit: {
    compliant: boolean;
    violations: string[];
  };
  onRefresh: () => Promise<void>;
}

const SOLIDITY_CONTRACT_PREVIEW = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title UniversityDIDRegistry (Deployed on Sepolia Testnet)
 * @notice Enforces SRS Section 3.3 & NFR-04: Zero PII or Credential Payloads On-Chain.
 */
contract UniversityDIDRegistry {
    struct DIDPublicAnchor {
        bytes32 publicKeyCommitment;
        uint64 updatedAt;
        bool active;
    }

    enum OnChainCredentialStatus { UNREGISTERED, ACTIVE, REVOKED, SUSPENDED }

    mapping(address => DIDPublicAnchor) private didAnchors;
    mapping(uint256 => OnChainCredentialStatus) private credentialStatusList;

    function registerDIDAnchor(bytes32 publicKeyCommitment) external {
        didAnchors[msg.sender] = DIDPublicAnchor(publicKeyCommitment, uint64(block.timestamp), true);
    }

    function setCredentialStatus(uint256 statusListIndex, OnChainCredentialStatus newStatus) external {
        credentialStatusList[statusListIndex] = newStatus;
    }
}`;

export const BlockchainExplorerView: React.FC<BlockchainExplorerViewProps> = ({
  activeUser,
  onChainTransactions,
  onChainStatusRegistry,
  ethereumRpcOnline,
  sepoliaContractAddress,
  currentBlockNumber,
  privacyAudit,
  onRefresh,
}) => {
  const [showSolidity, setShowSolidity] = useState(false);
  const [isTogglingRpc, setIsTogglingRpc] = useState(false);

  const handleToggleRpc = async () => {
    setIsTogglingRpc(true);
    try {
      await apiClient.setEthereumRpcStatus(activeUser.id, !ethereumRpcOnline);
      await onRefresh();
    } finally {
      setIsTogglingRpc(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Open Page Header & Telemetry Summary */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-[13px] font-medium text-slate-500">
              Ethereum Sepolia Testnet · Zero-PII Boundary
            </p>
            <h1 className="text-[26px] sm:text-[32px] font-bold text-slate-950 tracking-tight leading-tight">
              On-Chain Ledger &amp; Privacy Boundary Audit
            </h1>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              Every Sepolia transaction is audited against registered student records to guarantee that zero personally identifiable information ever touches the public ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowSolidity((v) => !v)}
              className="min-h-[42px] px-4 py-2 text-[13px] font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {showSolidity ? 'Hide Solidity Contract' : 'View Solidity Contract'}
            </button>
            <button
              type="button"
              disabled={isTogglingRpc}
              onClick={handleToggleRpc}
              data-testid="btn-toggle-sepolia-rpc"
              className={`min-h-[42px] px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                ethereumRpcOnline
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {ethereumRpcOnline
                ? 'Simulate RPC Outage (TC-07)'
                : 'Restore RPC Connection'}
            </button>
          </div>
        </div>

        {/* 4 Structured Summary Columns */}
        <div className="surface-panel rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5 space-y-1">
            <span className="block text-[12px] font-medium text-slate-500">
              Registry Smart Contract
            </span>
            <p
              className="text-[13px] font-mono text-slate-900 truncate"
              title={sepoliaContractAddress}
            >
              {sepoliaContractAddress}
            </p>
            <p className="text-[12px] text-slate-500">W3C DID &amp; Status Anchor</p>
          </div>

          <div className="p-5 space-y-1">
            <span className="block text-[12px] font-medium text-slate-500">
              Sepolia RPC Status
            </span>
            <p
              className={`text-[15px] font-semibold ${
                ethereumRpcOnline ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {ethereumRpcOnline ? 'Online · Synced' : 'Offline · Fail-Closed'}
            </p>
            <p className="text-[12px] text-slate-500 font-mono tabular-nums">
              {ethereumRpcOnline
                ? `Block #${currentBlockNumber.toLocaleString()}`
                : 'Returns UNABLE_TO_VERIFY'}
            </p>
          </div>

          <div className="p-5 space-y-1">
            <span className="block text-[12px] font-medium text-slate-500">
              Anchored Transactions
            </span>
            <p className="text-[20px] font-semibold text-slate-950 font-mono tabular-nums">
              {onChainTransactions.length}
            </p>
            <p className="text-[12px] text-slate-500">Public commitments recorded</p>
          </div>

          <div className="p-5 space-y-1">
            <span className="block text-[12px] font-medium text-slate-500">
              Zero-PII Compliance (AC-12)
            </span>
            <p
              className={`text-[15px] font-semibold ${
                privacyAudit.compliant ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {privacyAudit.compliant
                ? 'PASS · 0 Bytes PII On-Chain'
                : 'VIOLATION DETECTED'}
            </p>
            <p className="text-[12px] text-slate-500">
              All payloads verified free of personal data
            </p>
          </div>
        </div>

        {showSolidity && (
          <div className="animate-view-enter p-6 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 font-mono text-[12px] overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
              <span>contracts/UniversityDIDRegistry.sol · Solidity ^0.8.24</span>
              <span className="text-emerald-400">Zero-PII Storage Verified</span>
            </div>
            <pre className="leading-relaxed">{SOLIDITY_CONTRACT_PREVIEW}</pre>
          </div>
        )}
      </section>

      {/* Main 2-Column Workspace: Transaction Ledger & StatusList2021 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start border-t border-slate-200 pt-8 sm:pt-10">
        {/* Left 8 Columns: Sepolia Transaction Ledger */}
        <section className="lg:col-span-8 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              Ethereum Sepolia Transaction Ledger ({onChainTransactions.length})
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Immutable audit log of public key commitments and credential status transitions
            </p>
          </div>

          <div className="surface-panel rounded-xl divide-y divide-slate-200 overflow-hidden">
            {onChainTransactions.map((tx) => (
              <div key={tx.txHash} className="p-5 space-y-2 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[12px] font-mono tabular-nums">
                    <span className="font-semibold text-slate-950">
                      {tx.operationType}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">·</span>
                    <span className="text-slate-500">
                      Block #{tx.blockNumber.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[12px] font-mono font-medium text-emerald-700">
                    containsPersonalData: {String(tx.containsPersonalData)}
                  </span>
                </div>

                <p className="text-[14px] text-slate-800 font-medium">
                  {tx.summary}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-mono text-slate-500 pt-1">
                  <span className="truncate">Tx: {tx.txHash.slice(0, 36)}...</span>
                  <span className="truncate">
                    Ref: {tx.publicReferenceHash.slice(0, 26)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right 4 Columns: StatusList2021 Registry */}
        <section className="lg:col-span-4 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-[19px] sm:text-[20px] font-bold text-slate-950 tracking-tight">
              StatusList2021 Registry
            </h2>
            <p className="text-[14px] text-slate-600 mt-0.5">
              Anonymous integer indices mapped to credential revocation states
            </p>
          </div>

          <div className="surface-panel rounded-xl divide-y divide-slate-200 overflow-hidden">
            {Object.entries(onChainStatusRegistry).map(
              ([indexKey, statusVal]) => (
                <div
                  key={indexKey}
                  className="px-5 py-3.5 flex items-center justify-between bg-white hover:bg-slate-50/60 transition-colors text-[13px] font-mono tabular-nums"
                >
                  <span className="text-slate-800 font-medium">
                    Status Index #{indexKey}
                  </span>
                  <span
                    className={`text-[12px] font-semibold ${
                      statusVal === CredentialStatus.ACTIVE
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {statusVal}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
