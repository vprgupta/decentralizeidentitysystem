# System Architecture & Detailed Design Document

**Project Title:** Decentralized Identity (DID) System  
**Document ID:** `CS47001-DID-ARCH-001`  
**Baseline Reference:** `CS47001-DID-SRS-001` (Version 1.0, 10 November 2026)  
**Project Team:** Bishal Gupta (`23053694`), Bhabesh Shahi (`23053725`), Aashutosh Narayan Singh (`23053825`), Alokraj Giri (`23053599`), Naga Sai Prajna Koushik Gulla (`23052979`)

---

## 1. Architectural Overview & Software Engineering Principles

The Decentralized Identity (DID) System is engineered following **Clean / Layered Architecture**, **Domain-Driven Design (DDD)**, and **SOLID** principles as required by **NFR-11** (*Maintainability: separate frontend, backend, credential logic, and blockchain integration into documented modules*):

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (React 19 + TypeScript)               │
│  StudentWalletView | IssuerPortalView | VerifierPortalView | ExplorerView  │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │ HTTPS / JSON REST (/api/v1/*)
┌───────────────────────────────────────▼────────────────────────────────────┐
│                  APPLICATION API & RBAC MIDDLEWARE (Express)               │
│     attachCurrentUser() -> requireRoles([STUDENT, ISSUER, VERIFIER, ADMIN])│
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION SERVICE LAYER (identityService)             │
│  DID Lifecycle | VC Issuance | Consent & Selective Disclosure | Audit Log  │
└─────────────────┬──────────────────────────────────────────┬───────────────┘
                  │                                          │
┌─────────────────▼──────────────────────┐ ┌─────────────────▼───────────────┐
│   PURE DOMAIN & CRYPTOGRAPHIC CORE     │ │   ETHEREUM TESTNET INTEGRATION  │
│  - cryptoEngine.ts (SHA256/HMAC/Salts) │ │  - didResolver.ts (did:ethr)    │
│  - verificationPipeline.ts (6 Stages)  │ │  - UniversityDIDRegistry.sol    │
└────────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 2. Technology Decision Record (Addressing SRS Section 15 Open Questions)

| Decision Area | Selected Profile | Engineering Rationale |
| :--- | :--- | :--- |
| **DID Method** | `did:ethr:sepolia:0x<address>` | W3C DID v1.0 compliant, maps 1-to-1 with Ethereum Sepolia addresses and public verification keys (`FR-04`, `FR-05`). |
| **VC Data Model** | W3C Verifiable Credentials Data Model v2.0 | Standard JSON-LD context structure with `credentialSubject`, `credentialStatus`, and `proof` (`FR-08`, `FR-10`). |
| **Selective Disclosure** | Salted SHA-256 Claim Commitments (`DataIntegrityProof`) | Each claim is hashed with a unique cryptographic salt (`SHA256(key:value:salt)`). The issuer signs the canonical root of all claim digests. Holders reveal only approved claims + salts while withholding sensitive fields like `studentNumber` (`FR-12`, `AC-06`). |
| **On-Chain Boundary** | `UniversityDIDRegistry.sol` (Sepolia Testnet) | Stores only public key commitments, authorized issuer hashes, and numeric status list indices (`ACTIVE` / `REVOKED`). Zero PII is ever written on-chain (`NFR-04`, `AC-12`). |
| **Fail-Closed Policy** | 6-Stage Verification State Machine | If the Ethereum RPC or DID Resolver is offline, verification immediately returns `UNABLE_TO_VERIFY` instead of crashing or falsely returning `VALID` (`NFR-07`, `NFR-15`, `AC-10`). |

---

## 3. Strict On-Chain vs. Off-Chain Data Boundary (SRS Section 3.3)

| Data Category | Storage Location | On-Chain Status | Security Control |
| :--- | :--- | :--- | :--- |
| Private keys / signing secrets | Restricted key derivation memory | **NEVER ON-CHAIN** | Never stored in plaintext in database, logs, or API responses (`NFR-03`). |
| Student Name, Student ID, Program | Off-chain holder wallet store | **NEVER ON-CHAIN** | Disclosed only with explicit holder consent per request (`NFR-04`, `NFR-05`). |
| Full Verifiable Credential JSON | Off-chain wallet store | **NEVER ON-CHAIN** | Protected by RBAC; tamper-evident via cryptographic proof (`NFR-02`, `NFR-06`). |
| Public DID & Verification Key Hash | Sepolia Registry & DID Resolver | **ON-CHAIN (PUBLIC)** | Contains only `did:ethr:sepolia:0x...` and `bytes32` public key hash. |
| Credential Revocation Status | Sepolia Status List Index (`#1001`) | **ON-CHAIN (PUBLIC)** | Opaque numeric index mapped to `ACTIVE` or `REVOKED` (`FR-17`, `FR-24`). |
| Audit Events | Off-chain Audit Log | **NEVER ON-CHAIN** | Timestamped, excludes private keys and full credential payloads (`FR-21`). |
