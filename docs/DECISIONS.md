# TrustFlow implementation decisions

## 2026-10-22

- Kept the organizer's React/Vite architecture and added a small Express resource server. Migration to Next.js was unnecessary for the vertical slice.
- Replaced the local role switcher with actual TideCloak identity and token roles. There is no demo-auth bypass.
- Chose strict DPoP. The official relay asset is copied byte-for-byte and served with its required path rewrite and headers.
- Treat client guards as UX only. All protected data and writes pass through server JWT, DPoP and role checks.
- Use only the embedded adapter JWK. A missing JWK is a startup/request failure; remote discovery is not a fallback.
- Keep demo data in memory to avoid introducing an unaudited database layer during the hackathon slice. Restarting the API resets it.
- The in-memory DPoP replay store limits production deployment to one API process. A shared atomic store is required before horizontal scaling.
- Bootstrapped local Docker only after the operator supplied the licence email, personally accepted Tide's Terms and selected local Docker hosting.
- Created realm `trustflow` and public client `trustflow-client`, enabled IGA, linked the first Tide admin account, and exported the gitignored browser adapter to `public/tidecloak.json`.
- Added `member` as a default realm role. The first account's application-level `admin` grant remains a governed IGA change request until the operator explicitly approves it.
- Kept Tide's default sign-in branding at the operator's request.
- Added optional in-app onboarding for a display name only. It stores the value as Keycloak `firstName` through the Account API using the user's token; it does not collect or synthesize email.
- Completed task/project CRUD without weakening the security boundary: Members may delete tasks, while project deletion remains Admin-only and is checked by the API.
- Added a governed approval workflow for higher-risk team decisions. A Member or Admin may request approval, only a different Admin may decide it, and only the requester or an Admin may cancel a pending request.
- Kept approval execution explicit: this prototype records a governed decision and audit event; it does not claim to execute payments, contracts or cryptographic multi-party quorum.
