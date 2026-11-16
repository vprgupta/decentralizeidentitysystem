# Verification Strategy, Test Plan & Requirement Traceability (`CS47001-DID-TEST-001`)

## 1. Minimum Test Dataset Execution Matrix (SRS Section 12.1)

| Test Case ID | SRS Reference | Synthetic Input Scenario | Expected Outcome | Automated Test Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | `AC-07`, `FR-14` | Valid unmodified student credential issued to Bishal Gupta (`23053694`) by KIIT University Academic Registrar | `VALID` | PASS (`node:test`) |
| **TC-02** | `AC-08`, `NFR-06` | Credential with tampered `enrollmentStatus` claim (`Active + Full Tuition Scholarship`) and unchanged proof | `INVALID_SIGNATURE` | PASS (`node:test`) |
| **TC-03** | `AC-09`, `FR-16` | Credential issued to Bhabesh Shahi (`23053725`) with expired validity date (`2025-08-01`) | `EXPIRED` | PASS (`node:test`) |
| **TC-04** | `AC-09`, `FR-15` | Credential issued to Aashutosh Narayan Singh (`23053825`) signed by an untrusted external issuer | `UNTRUSTED_ISSUER` | PASS (`node:test`) |
| **TC-05** | `AC-09`, `FR-17` | Credential issued to Alokraj Giri (`23053599`) whose status index `#2005` is marked `REVOKED` on-chain | `REVOKED` | PASS (`node:test`) |
| **TC-06** | `FR-14`, `FR-23` | Malformed credential using unsupported `did:invalidmethod:99999` and missing W3C schema fields | `MALFORMED` | PASS (`node:test`) |
| **TC-07** | `AC-10`, `NFR-07`, `NFR-15` | Verification attempt while Ethereum Sepolia RPC / DID Resolver is unreachable | `UNABLE_TO_VERIFY` | PASS (`node:test`) |

---

## 2. Running the Automated Test Suite

```bash
npm test
# or directly via tsx:
npx --yes tsx --test src/shared/domain/verificationPipeline.test.ts
```
