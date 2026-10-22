[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

# TrustFlow

TrustFlow is a secure student collaboration platform by **UIT.VUARAUMA (SGS)**. It gives student teams one polished workspace for projects, tasks and decisions while TideCloak verifies who each person is and the API independently enforces what they may do.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked), React, Vite and Express.

## 1. Vision & originality

Student teams move quickly across chat threads, shared documents and informal task boards. That speed is useful, but it also makes ownership and privileged changes ambiguous. TrustFlow combines the familiar feel of a modern project workspace with a security boundary designed for real collaboration: every protected request carries a verified identity, sender-bound session proof and role from TideCloak.

The prototype focuses on a working vertical slice:

- TideCloak login, callback handling, session restoration and logout.
- Dismissible first-login display-name onboarding through the user's own Account API token; no email is requested or invented.
- Responsive overview, project board and explicit unauthorized page.
- Admin and Member roles, read from the verified token.
- Complete project/task CRUD with destructive operations protected again at the API.
- Governed approval requests: Members propose changes, a different Admin approves or rejects them, and request ownership is enforced for cancellation.
- An actor-bound activity trail for protected changes.

## 2. Trust constraint insight

Ordinary collaboration tools often rely on the browser to hide controls, or on one backend role table that an attacker can bypass after compromising the app. In TrustFlow, client checks improve the experience but never make the authorization decision.

The Express API fails closed. It validates the JWT signature against the adapter's **embedded JWK**, checks issuer and authorized party, requires a valid RFC 9449 DPoP proof for sender-bound tokens, rejects proof replay, and only then evaluates `admin` or `member` roles from the verified token. Missing configuration, missing roles, expired tokens, Bearer replay of a bound token and invalid proof details all produce 401/403 responses. Approval requests add separation of duties: even an Admin cannot approve a change they requested themselves.

## 3. Value & impact

TrustFlow helps student teams coordinate work without turning one team leader or one browser session into unchecked authority. A Member can create, update and delete tasks. Only an Admin can create or delete projects. Members can request a sensitive change, but only a different verified Admin can approve or reject it. Every operation is enforced at the API even if someone bypasses the interface.

For judges, the concrete story is simple: sign in, manage a task as a Member, request approval for a high-risk change, attempt the Admin URL and observe the 403 experience, then sign in as an Admin to decide the request and create or delete a project through the protected API.

## 4. Why TideCloak matters

TideCloak supplies the identity and governed role source. TrustFlow uses the official `@tidecloak/react` SDK with strict ES256 DPoP, `useAuthCallback`, session restoration, `secureFetch`, login and logout. The resource server uses the Tide adapter's embedded JWK instead of falling back to a remote JWKS endpoint.

The integration follows Raziel's official invariants:

- UI role checks are presentation only; APIs enforce authorization.
- JWTs are verified server-side against the embedded Tide key set.
- `cnf.jkt` is not treated as sufficient: the DPoP proof, method, URL, access-token hash, issued time and one-time `jti` are verified.
- Roles come only from the verified JWT, never from an unprotected app role table.

The included replay store is in-memory and correct for this single-process demo. A multi-instance deployment must replace it with a shared atomic store such as Redis or Postgres.

## 5. Prototype & storytelling

The prototype demonstrates the security boundary rather than a fake login. Without a real Tide adapter it deliberately shows a configuration-required screen. With a configured realm, the flow is:

1. Continue with TideCloak and complete the real hosted/local login.
2. Return through `/auth/redirect`; the SDK exchanges and restores the session.
3. Load `/api/workspace` through DPoP-aware `secureFetch`.
4. Create, move and delete a task and see actor-bound audit events appear.
5. Submit a high-risk approval request as a Member.
6. Visit `/admin` as a Member to see the unauthorized experience and server-side 403.
7. Sign in as a different Admin, approve the request, then create and delete a temporary project through independently protected APIs.

See [docs/DEMO_VIDEO.md](docs/DEMO_VIDEO.md) for the narration and recording checklist.

See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for the evidence-based Challenge 2 completion assessment and remaining submission work.

## Local development

### Prerequisites

- Node.js 20+ and npm.
- A TideCloak realm and public client.
- Realm roles: `_tide_enabled`, `member`, and `admin`.
- Valid redirect URI: `http://localhost:5137/auth/redirect`.
- Valid web origin: `http://localhost:5137`.
- An exported Tide adapter containing `realm`, `resource`, `auth-server-url`, Tide metadata and an embedded `jwk.keys` array.

Before creating a Tide realm, Tide's official workflow requires the human operator to provide the licence email, accept the [Tide Terms & Conditions](https://tide.org/legal), and choose local Docker or hosted Skycloak. Each operator must make those decisions for their own deployment.

### Install and configure

```powershell
Set-Location "D:\code\RMIT-C2"
npm.cmd install
# Only needed on a new machine/deployment:
Copy-Item "C:\path\to\exported\tidecloak.json" ".\public\tidecloak.json"
```

`public/tidecloak.json` is intentionally gitignored. Never add a confidential client secret to the browser adapter.

Run the API and Vite app in separate terminals:

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev
```

Open `http://localhost:5137`.

### TideCloak development infrastructure

The development instance used for the 2026-10-22 verification runs the official `tideorg/tidecloak-dev:latest` image at `http://localhost:8080`, with realm `trustflow` and public client `trustflow-client`. Its H2 data, master-admin credential and exported adapter are local-only and gitignored.

For a fresh environment, provide your own licence email and Terms acceptance, then follow Raziel's current `start-tidecloak-dev` / bootstrap playbook. The underlying local container shape is:

```powershell
docker run --name trustflow-tidecloak -p 8080:8080 `
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin `
  -e KC_BOOTSTRAP_ADMIN_PASSWORD="<set-outside-source-control>" `
  tideorg/tidecloak-dev:latest
```

Do not reuse the placeholder password, commit it, or assume a locally created realm can later be moved to hosted Skycloak. Export the adapter only after IGA and the required roles are configured.

## Security architecture

```text
Browser / @tidecloak/react
  ├─ TideCloak login + callback + session restoration
  ├─ strict DPoP key and proof generation
  └─ secureFetch
          │ access token + DPoP proof
          ▼
Express API
  ├─ local JWT verification using adapter.jwk
  ├─ issuer + azp + time checks
  ├─ DPoP signature, cnf.jkt, ath, htm, htu, iat, jti checks
  ├─ admin/member role enforcement
  └─ project/task operation + audit event
```

HTTP outcomes are intentional: `401` means identity or proof could not be verified; `403` means the verified identity lacks the required role; validation errors return `400`.

## Quality checks

```powershell
npm.cmd run check
```

The check runs ESLint, Node security/authorization tests and the production Vite build. Tide Doctor also validates the local adapter, embedded key, signed origin, DPoP provider/relay, server verification and secret hygiene.

## Current submission status

- Source application: implemented on branch `codex/trustflow-final`.
- Automated checks: ESLint, 14 Node tests, production build and npm audit passed on 2026-10-22. The earlier Tide Doctor run also passed its configured checks.
- UI system: one Inter type family, one indigo/slate token palette, shared form controls and responsive desktop/mobile layouts were visually checked on 2026-10-22.
- TideCloak local verification: realm `trustflow`, client `trustflow-client`, IGA and admin Tide account linking completed. The exported adapter and Docker data remain intentionally local and gitignored.
- Browser verification: real TideCloak login, callback, session restoration and the protected dashboard were observed locally on 2026-10-22.
- Authorization status: the linked account has effective `member`; its TrustFlow `admin` grant is an IGA change request awaiting explicit Tide approval in the Tide console.
- Repository source: the working implementation is pushed to `origin/codex/trustflow-final` on 2026-10-22. This branch is not claimed as merged into `main` or formally submitted to the organizer.
- Final demo video target: `Video.mp4` in the repository root. The existing file predates TrustFlow work and must be replaced with a newly recorded TrustFlow demo before submission; it is not claimed as the final recording.

## Team

**UIT.VUARAUMA** · SGS Campus · RMIT Hackathon 2026 Challenge 2
