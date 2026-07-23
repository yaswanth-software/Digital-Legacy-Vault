# Security Policy & Architecture

## Security Philosophy

LegacyOS is designed with **security and privacy as core principles**. The system handles sensitive digital assets and legacy release rules, and enforces server-side Zero Trust authorization, structured AES-256-GCM data encryption, and strict audit integrity.

We do **not** claim "100% unhackable" or "military-grade" security. Instead, we implement verifiable security engineering controls and clear threat modeling.

---

## Technical Security Controls

### 1. Authentication & Identity Verification
- Primary user identity is derived exclusively from verified **Firebase Authentication ID Tokens** (`req.user.uid`).
- Frontend-provided `ownerId`, `userId`, or `vaultId` parameters are never trusted for authorization decisions.
- Disabled or deleted user accounts are rejected server-side.

### 2. Zero Trust Central Authorization Service
- All sensitive API operations run through [authorizationService.js](file:///c:/Users/gujja/OneDrive/Desktop/Digital%20Legacy%20Vault/backend/src/services/authorizationService.js).
- Evaluates:
  $$\text{Requesting UID} \rightarrow \text{Vault Ownership} \rightarrow \text{Trusted Person Status} \rightarrow \text{Asset Permission} \rightarrow \text{Release Status} \rightarrow \text{Expiration Window}$$
- IDOR (Insecure Direct Object Reference) protection prevents cross-tenant access to vaults, assets, release tokens, or emergency requests.

### 3. Data Protection & AES-256-GCM Encryption
- Structured sensitive fields (private notes, recovery instructions) are encrypted at rest using **AES-256-GCM**.
- Every encryption operation generates a unique, cryptographically random 12-byte IV/nonce and a 128-bit authentication tag.
- Encryption keys are loaded from environment variables (`ENCRYPTION_KEY`) in development and managed via secure secret managers (e.g. Google Cloud Secret Manager) in production.

### 4. Storage Security & Short-Lived Access
- Firebase Storage bucket rules block public access.
- File view and download URLs are signed short-lived URLs (valid for 5 minutes).
- File access requires an active, unexpired, and unrevoked release token.

### 5. Rate Limiting & Brute-Force Protection
- Sliding-window rate limiting protects emergency access requests (5/hr), verification steps (10/hr with lockout), and file URL generation (30/min).

### 6. Security Event Monitoring & Audit Integrity
- Security alerts (`failed_access_attempt`, `unauthorized_asset_access`, `expired_release_access_attempt`) are logged to Firestore and presented on the owner's `/security` dashboard.
- Audit logs are append-only from the client perspective.

---

## Production Security Checklist

- [x] Firebase Auth ID tokens verified server-side.
- [x] Zero Trust central authorization service implemented.
- [x] AES-256-GCM application-level encryption for sensitive text.
- [x] Storage access protected with short-lived signed URLs.
- [x] Rate limiting & brute-force protection active.
- [x] Security headers (CSP, Frame-Ancestors, HSTS, X-Content-Type-Options) active.
- [x] CORS restricted to `CLIENT_URL`.
- [x] Environment variables & service accounts excluded from Git (`.gitignore`).
- [x] Data export & reauthenticated account deletion flows implemented.

---

## Reporting Vulnerabilities

If you discover a security vulnerability in LegacyOS, please report it privately to `security@legacyos.local`. Do not create public GitHub issues for security vulnerabilities.
