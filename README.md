# Decentralized Identity (DID) System — Project-I (`CS47001`)

Academic web-based prototype demonstrating a user-controlled **Decentralized Identity (DID)** and **W3C Verifiable Credentials v2.0** lifecycle for university-issued student credentials with **Cryptographic Selective Disclosure** and **Ethereum Sepolia Testnet** registry anchoring.

## Project Team (`CS47001`)

| Team Member | Student ID | Role in Prototype |
| :--- | :--- | :--- |
| **Bishal Gupta** | `23053694` | Student Holder (Pre-issued VC + Pending Sharing Requests) |
| **Bhabesh Shahi** | `23053725` | Student Holder (Pre-issued VC) |
| **Aashutosh Narayan Singh** | `23053825` | Student Holder (Pre-issued VC) |
| **Alokraj Giri** | `23053599` | Student Holder (DID Registered, Ready for Issuance) |
| **Naga Sai Prajna Koushik Gulla** | `23052979` | Student Holder (Ready for Live `UC-01` DID Creation Demo) |

---

## Repository Folder Structure

```
/
├── contracts/
│   └── UniversityDIDRegistry.sol        # Solidity smart contract (Zero PII on-chain)
├── docs/
│   ├── ARCHITECTURE.md                  # System Context, Layered Architecture & Boundary Design
│   ├── API_SPECIFICATION.md             # REST API Endpoints & Error Contracts
│   └── TEST_PLAN_AND_EVIDENCE.md        # SRS Section 12.1 Minimum Test Dataset & Traceability
├── public/
│   └── assets/aistudio/did_srs_cc9b6655.pdf # Original Academic SRS Document
├── server.ts                            # Express + Vite Full-Stack Server (Port 3000)
└── src/
    ├── shared/
    │   ├── types/did.types.ts           # W3C DID v1.0, VC v2.0, VP, RBAC & Audit Types
    │   └── domain/
    │       ├── cryptoEngine.ts          # SHA-256 Salted Commitments & HMAC/Ed25519 Proofs
    │       ├── didResolver.ts           # did:ethr:sepolia Resolver & PII Boundary Auditor
    │       ├── verificationPipeline.ts  # 6-Stage Fail-Closed Verification State Machine
    │       └── verificationPipeline.test.ts # Automated Node Test Suite (TC-01 to TC-07)
    ├── server/
    │   ├── repositories/identityRepository.ts
    │   ├── services/identityService.ts
    │   ├── middleware/authMiddleware.ts
    │   └── routes/apiRoutes.ts
    └── client/
        ├── services/apiClient.ts
        └── components/
            ├── StudentWalletView.tsx
            ├── IssuerPortalView.tsx
            ├── VerifierPortalView.tsx
            ├── BlockchainExplorerView.tsx
            └── ArchitectureAuditView.tsx
```

---

## Quick Start & Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated unit tests (SRS TC-01 through TC-07)
npm test

# 3. Start full-stack development server on http://localhost:3000
npm run dev

# 4. Build for production
npm run build
```

---

## Pushing to GitHub

This workspace is initialized as a clean Git repository with all source code, Solidity smart contracts, unit tests, and architecture documentation committed. To push to your GitHub repository:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```
