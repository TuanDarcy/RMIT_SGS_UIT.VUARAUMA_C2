# TrustCare implementation decisions

## 2026-10-22

- Preserved the completed TrustFlow implementation on `codex/trustflow-final` and performed the medical-record pivot on the dedicated `codex/trustcare-medical-records` branch.
- Kept React/Vite and the existing Express resource server. A framework migration would add delivery risk without improving this vertical slice.
- Renamed the product to **TrustCare — private care, verified access** and standardized the UI on Inter with a teal/slate clinical SaaS palette and larger base text.
- Kept official TideCloak login, callback, restoration, logout, strict ES256 DPoP, embedded-JWK JWT verification and fail-closed middleware intact.
- Added patient registration through the official underlying TideCloak client `register()` method. No OIDC or PKCE flow is hand-built.
- Self-registration is Patient-only. Doctor and Admin remain governed roles; the UI never lets a user choose or elevate their own role.
- Temporarily normalize the existing default `member` role to Patient so the linked demo account continues to work while `patient` and `doctor` realm roles wait for IGA approval.
- Enforce object-level authorization on the server: Patient ownership comes from verified `sub`; Doctor access requires an assignment for the requested patient ID; Admin does not receive clinical record contents by default.
- Modelled consent separately from authorization. Doctors request access, only the matching Patient can decide it, and approval creates the care assignment used by future API checks.
- Implemented medical record create/update/delete for assigned Doctors. Final records are immutable to deletion in the prototype; only drafts can be removed.
- Kept synthetic, in-memory demo data to avoid collecting real health information and introducing an unaudited persistence layer under hackathon time pressure.
- Kept the in-memory DPoP replay store for one-process demonstration only. Production scaling requires a shared atomic replay store and durable database.
- Submitted role creation and self-registration settings through TideCloak's official Admin API. IGA correctly captured five pending governed changes; they were not bypassed or falsely reported as active.
- Kept Tide's default sign-in branding at the operator's earlier request.
- Kept display-name-only onboarding. No email is requested or invented by the app.
- Treat the old root `Video.mp4` as stale evidence; never call it the TrustCare demo until a new recording has been reviewed and intentionally replaced.
