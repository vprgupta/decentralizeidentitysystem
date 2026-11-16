/**
 * @file didResolver.ts
 * @description W3C Decentralized Identifier (DID v1.0) creation, resolution, and
 * On-Chain / Off-Chain privacy boundary enforcement (FR-04, FR-05, NFR-04, AC-12).
 */

import crypto from 'node:crypto';
import { DIDDocument, DIDReferenceRecord, OnChainTransactionRecord } from '../types/did.types';
import { deriveKeyPairFromSeed } from './cryptoEngine';

export const SEPOLIA_REGISTRY_CONTRACT = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

/**
 * Validates whether a DID string conforms to the supported `did:ethr:sepolia:0x...` syntax.
 */
export function isValidSupportedDid(did: string): boolean {
  return /^did:ethr:sepolia:0x[a-fA-F0-9]{40}$/.test(did.trim());
}

/**
 * Creates a W3C DID v1.0 Document and associated Ethereum Sepolia public anchor record.
 * Strictly enforces Section 3.3 of the SRS: no student names, student numbers, or PII
 * are included in the DID Document or on-chain transaction record.
 */
export function buildDidRecordFromSeed(params: {
  ownerUserId: string;
  seed: string;
  createdAt: string;
  blockNumber: number;
}): {
  didRecord: DIDReferenceRecord;
  onChainTx: OnChainTransactionRecord;
} {
  const keyPair = deriveKeyPairFromSeed(params.seed);
  const did = `did:ethr:sepolia:${keyPair.ethereumAddress}`;
  const txHash =
    '0x' +
    crypto
      .createHash('sha256')
      .update(`sepolia-tx:${did}:${params.createdAt}`)
      .digest('hex');

  const didDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyHex: keyPair.publicKeyHex,
        ethereumAddress: keyPair.ethereumAddress,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    created: params.createdAt,
    updated: params.createdAt,
    onChainTxHash: txHash,
    network: 'ethereum-sepolia-testnet',
  };

  const didRecord: DIDReferenceRecord = {
    did,
    method: 'did:ethr:sepolia',
    ownerUserId: params.ownerUserId,
    publicKeyHex: keyPair.publicKeyHex,
    ethereumAddress: keyPair.ethereumAddress,
    didDocument,
    onChainTxHash: txHash,
    blockNumber: params.blockNumber,
    createdAt: params.createdAt,
  };

  const publicReferenceHash =
    '0x' +
    crypto
      .createHash('sha256')
      .update(`${did}:${keyPair.publicKeyHex}`)
      .digest('hex');

  const onChainTx: OnChainTransactionRecord = {
    txHash,
    blockNumber: params.blockNumber,
    timestamp: params.createdAt,
    operationType: 'DID_REGISTER',
    contractAddress: SEPOLIA_REGISTRY_CONTRACT,
    callerAddress: keyPair.ethereumAddress,
    publicReferenceHash,
    containsPersonalData: false,
    summary: `Registered public DID verification key anchor for ${did.slice(0, 28)}...`,
  };

  return { didRecord, onChainTx };
}

/**
 * Audits an on-chain transaction payload to verify zero PII leakage (NFR-04, AC-12).
 */
export function verifyZeroPiiOnChain(
  txRecords: OnChainTransactionRecord[],
  forbiddenStrings: string[]
): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const tx of txRecords) {
    const serialized = JSON.stringify(tx).toLowerCase();
    for (const pii of forbiddenStrings) {
      const cleaned = pii.trim().toLowerCase();
      if (cleaned.length >= 4 && serialized.includes(cleaned)) {
        violations.push(`Transaction ${tx.txHash.slice(0, 12)}... leaked PII value '${pii}'.`);
      }
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}
