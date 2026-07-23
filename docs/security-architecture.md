# LegacyOS Security Architecture & Zero Trust Model

## Overview

LegacyOS provides a secure platform for digital legacy planning, asset management, and controlled posthumous release.

---

## Access Pipeline

```
USER REQUEST
   │
   ▼
FIREBASE AUTHENTICATION (ID Token)
   │
   ▼
BACKEND TOKEN VERIFICATION (authMiddleware)
   │
   ▼
ZERO TRUST AUTHORIZATION SERVICE (authorizationService)
   │
   ├─► Vault Ownership Check (isVaultOwner)
   ├─► Trusted Person Check (isTrustedPerson)
   ├─► Asset Permission Check (canViewAsset / canDownloadAsset)
   ├─► Release Token & Expiration Check (canAccessRelease)
   └─► Rate Limit & Brute-Force Check (rateLimitMiddleware)
   │
   ▼
CONTROLLER / SERVICE EXECUTION
   │
   ├─► AES-256-GCM Decryption (if sensitive payload)
   ├─► Short-Lived Signed Storage URL (5 mins)
   └─► Append-Only Audit Logging & Security Events
   │
   ▼
API RESPONSE
```

---

## Data Sensitivity Classification

| Level | Description | Examples | Handling |
|---|---|---|---|
| `public` | Unrestricted public platform metadata | Health check endpoint | Unencrypted |
| `internal` | Standard vault metadata | Asset name, category, priority | Server-side Zero Trust auth |
| `private` | User personal configurations | Continuity check-in schedule | Vault owner access only |
| `sensitive` | Confidential records & legacy notes | Financial notes, legal instructions | **AES-256-GCM Encrypted** |
| `critical` | Credentials & master recovery keys | Account recovery notes | **AES-256-GCM Encrypted + Audit Logged** |

---

## Cryptographic Specification

- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode)
- **Key Length**: 256 bits (32 bytes) derived from `ENCRYPTION_KEY`
- **IV / Nonce**: 96 bits (12 bytes) cryptographically random per payload (`crypto.randomBytes(12)`)
- **Auth Tag**: 128 bits (16 bytes) for authenticated data integrity validation
- **Format**: `{ ciphertext, iv, authTag, version: "v1" }`

---

## Defense Against Common Attack Vectors

1. **IDOR (Insecure Direct Object Reference)**:
   - Backend queries always cross-verify `ownerId === req.user.uid` or active release authorization before returning subdocuments.
2. **Replay & Token Tampering**:
   - Short-lived signed Storage URLs expire after 5 minutes.
   - Controlled Release tokens expire after 72 hours.
3. **Mass Assignment**:
   - Explicit payload picking in controllers; client-supplied `ownerId` or `status` values are stripped and overwritten with server-calculated states.
4. **Brute-Force & Rate Limits**:
   - Sliding window limiters block repetitive verification attempts (max 10/hr) and file download links (max 30/min).
