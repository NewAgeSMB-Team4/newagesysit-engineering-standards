# Authentication and authorization

- **MUST** use maintained libraries and standards-based flows (e.g. OAuth 2.0/OIDC where appropriate); do not implement custom cryptography.
- **MUST** store passwords with a modern adaptive password hash (Argon2id preferred where supported; otherwise an approved current alternative such as bcrypt/scrypt with reviewed parameters). Never encrypt or store plaintext passwords.
- **MUST** use secure, HttpOnly, appropriately SameSite cookies for browser sessions; set Secure in HTTPS environments and define session expiry/rotation.
- **MUST** protect session creation, refresh, logout, password reset and account recovery flows against abuse.
- **MUST** enforce authorization server-side on every operation and object; do not rely on hidden UI controls or route obscurity.
- **SHOULD** centralize policy decisions and test role/permission matrices.
- **MUST** prevent insecure direct object references by checking user/tenant ownership for requested records.
- **MUST** avoid placing long-lived credentials or session tokens in localStorage.
