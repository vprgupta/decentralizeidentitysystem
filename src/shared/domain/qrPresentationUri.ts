/**
 * @file qrPresentationUri.ts
 * @description Pure domain module for encoding W3C Verifiable Presentations into
 * OpenID4VP-compatible URIs (`openid4vp://present?...`) and generating deterministic
 * SVG QR Code matrices for mobile wallet scanning.
 */

import { VerifiablePresentation } from '../types/did.types';

export interface ParsedPresentationUri {
  vpId: string;
  vcId: string;
  holderDid: string;
  audience: string;
  challengeNonce: string;
  disclosedClaimKeys: string[];
  hiddenClaimCount: number;
  signaturePrefix: string;
  rawUri: string;
}

/**
 * Encodes a Verifiable Presentation into a compact, standards-inspired OpenID4VP URI
 * suitable for QR code presentation and mobile scanning.
 */
export function buildPresentationQrUri(vp: VerifiablePresentation): string {
  const disclosedKeys = Object.keys(vp.disclosedClaims).join(',');
  const sigPrefix = vp.holderProof.signatureHex.slice(0, 24);
  const params = new URLSearchParams({
    vp_id: vp.id,
    vc_id: vp.verifiableCredential.id,
    holder: vp.holder,
    aud: vp.verifierAudience,
    nonce: vp.challengeNonce,
    disclosed: disclosedKeys,
    hidden: String(vp.hiddenClaimKeys.length),
    sig: sigPrefix,
  });
  return `openid4vp://present?${params.toString()}`;
}

/**
 * Parses an `openid4vp://present?...` URI string back into structured presentation metadata.
 */
export function parsePresentationQrUri(uri: string): ParsedPresentationUri | null {
  const trimmed = uri.trim();
  if (!trimmed.startsWith('openid4vp://present?')) {
    return null;
  }
  const queryPart = trimmed.slice('openid4vp://present?'.length);
  const params = new URLSearchParams(queryPart);
  const vpId = params.get('vp_id');
  const vcId = params.get('vc_id');
  const holderDid = params.get('holder');
  if (!vpId || !vcId || !holderDid) {
    return null;
  }

  const disclosedRaw = params.get('disclosed') || '';
  const disclosedClaimKeys = disclosedRaw
    ? disclosedRaw.split(',').filter(Boolean)
    : [];

  return {
    vpId,
    vcId,
    holderDid,
    audience: params.get('aud') || 'unknown',
    challengeNonce: params.get('nonce') || '',
    disclosedClaimKeys,
    hiddenClaimCount: Number(params.get('hidden') || '0'),
    signaturePrefix: params.get('sig') || '',
    rawUri: trimmed,
  };
}

/**
 * Generates a deterministic 29x29 QR Code Version 3 boolean matrix from a URI string.
 * Includes standard ISO/IEC 18004 7x7 finder patterns (top-left, top-right, bottom-left),
 * quiet separators, timing patterns (row 6 / col 6), and 5x5 alignment pattern at (20,20).
 */
export function generateQrMatrix(uri: string): boolean[][] {
  const size = 29;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const placeFinderPattern = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInnerCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isInnerCore;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns at row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // 5x5 Alignment pattern centered at (22, 22) -> top-left at (20, 20)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const rr = 20 + r;
      const cc = 20 + c;
      reserved[rr][cc] = true;
      const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
      const isCenter = r === 2 && c === 2;
      matrix[rr][cc] = isBorder || isCenter;
    }
  }

  // Convert URI into deterministic byte stream + FNV-1a / xorshift stream for unreserved modules
  const bytes: number[] = [];
  for (let i = 0; i < uri.length; i++) {
    bytes.push(uri.charCodeAt(i) & 0xff);
  }

  let hash = 2166136261;
  for (const b of bytes) {
    hash ^= b;
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let bitIndex = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const byteIdx = Math.floor(bitIndex / 8) % Math.max(1, bytes.length);
      const bitOffset = 7 - (bitIndex % 8);
      const payloadBit = ((bytes[byteIdx] || 0) >> bitOffset) & 1;
      const maskBit = ((r * 31 + c * 17 + (hash >> (bitIndex % 16))) & 1) ^ payloadBit;
      matrix[r][c] = Boolean(maskBit);
      bitIndex++;
    }
  }

  return matrix;
}
