# REST API Specification (`CS47001-DID-API-001`)

All endpoints communicate via JSON over REST under `/api/v1`. Role-Based Access Control (RBAC) is enforced server-side via the `x-actor-user-id` session header (`FR-02`, `FR-03`, `NFR-01`).

---

## 1. Endpoints Summary

| Method | Path | Required Role(s) |SRS Ref | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/state` | Authenticated User | `FR-06` | Retrieves synchronized workspace state, wallet credentials, and privacy audit status. |
| `POST` | `/api/v1/auth/register` | Public / Onboarding | `FR-01` | Registers a new Student Holder account with duplicate Student ID / Email rejection. |
| `POST` | `/api/v1/did/create` | `STUDENT_HOLDER`, `ADMIN` | `FR-04` | Creates and anchors a `did:ethr:sepolia` identifier and W3C DID Document. |
| `GET` | `/api/v1/did/resolve?did=...` | Any Authenticated | `FR-05` | Resolves a `did:ethr:sepolia` DID Document and public key material. |
| `POST` | `/api/v1/credentials/issue` | `UNIVERSITY_ISSUER` | `FR-07`, `FR-08` | Signs and issues a W3C Verifiable Credential to an eligible student holder. |
| `POST` | `/api/v1/credentials/status` | `UNIVERSITY_ISSUER` | `FR-17`, `FR-24` | Revokes or reinstates an issued credential on the status registry. |
| `DELETE` | `/api/v1/wallet/credentials/:id` | `STUDENT_HOLDER` | `FR-22` | Removes a credential from the holder's off-chain wallet view. |
| `POST` | `/api/v1/presentations/request` | `VERIFIER`, `ADMIN` | `FR-11` | Creates a consent-based claim sharing request bound to a cryptographic nonce. |
| `POST` | `/api/v1/presentations/respond` | `STUDENT_HOLDER` | `FR-11`–`FR-13`, `FR-20` | Approves (with selective claim disclosure), denies, or cancels a sharing request. |
| `POST` | `/api/v1/verify` | Any Authenticated | `FR-14`–`FR-19` | Runs the 6-stage fail-closed verification pipeline on a VC, VP, or SRS test case. |
| `POST` | `/api/v1/network/rpc-status` | Any Authenticated | `NFR-07`, `NFR-15` | Simulates Ethereum Sepolia RPC / Resolver online or offline states. |

---

## 2. Error Handling Contract (`FR-23`)

All validation, authorization, and network availability errors return structured JSON without exposing stack traces, private keys, or internal secrets:

```json
{
  "error": "Role authorization denied (FR-03 / NFR-01): Actor 'Bishal Gupta' (STUDENT_HOLDER) is not permitted to perform this operation. Required role: UNIVERSITY_ISSUER."
}
```
