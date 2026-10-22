[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

# TrustCare

TrustCare is a privacy-first medical record prototype by **UIT.VUARAUMA (SGS)** for RMIT Hackathon 2026 Challenge 2. Patients control who may join their care team, doctors can work only with assigned patients, and the API verifies identity, role, sender binding and patient relationship before returning or changing protected data.

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked), React, Vite and Express.

> Demo safety: all names, phone numbers and clinical notes included in the source are synthetic. Do not enter real health information into this hackathon prototype.

## 1. Vision & originality

Medical records are useful only when the right care team can reach them, yet access is often expressed as a broad role such as “doctor” or “admin”. TrustCare models the missing relationship: **which doctor is assigned to which patient, and did that patient consent?**

The working vertical slice includes:

- Real TideCloak sign-in, callback handling, session restoration and logout.
- A “Create patient account” action powered by the official TideCloak client registration method.
- Optional display-name onboarding without asking for or inventing an email address.
- Role-aware dashboards for Patient, Doctor and Admin.
- A protected patient timeline and doctor medical-record CRUD.
- Patient-controlled access requests and auditable consent decisions.
- Admin care-team assignment without automatic access to clinical notes.
- Responsive SaaS UI with explicit empty, loading, error and 403 states.

## 2. Trust constraint insight

Hiding a button is not a security boundary. TrustCare treats browser role checks as presentation only and repeats every decision at the Express API.

The resource server validates the JWT against the adapter's **embedded JWK**, checks issuer and authorized party, requires a valid RFC 9449 DPoP proof for sender-bound tokens, rejects proof replay, and reads roles only from verified claims. It then applies object-level rules:

| Persona | Allowed | Explicitly blocked |
| --- | --- | --- |
| Patient | Read their own profile and records; approve or reject access to their own patient ID | Other patients' profiles and records; clinical writes |
| Doctor | Read and CRUD records only for assigned patients; request access | Unassigned patients; self-approving a request; Admin assignment APIs |
| Admin | View patient directory metadata and manage doctor assignments | Clinical note contents by default |

`member` is temporarily mapped to Patient for compatibility with the existing local realm. The target realm roles are `patient`, `doctor` and `admin`; self-registration must never grant Doctor or Admin.

## 3. Value & impact

TrustCare gives judges a concrete privacy story rather than a generic role demo:

1. A patient creates an account and receives a private patient profile.
2. A doctor cannot see that patient until an assignment or approved consent exists.
3. The doctor requests access with a clinical reason.
4. Only the matching patient can approve the request.
5. The doctor can then create, update and delete draft medical records for that patient.
6. An Admin can manage the assignment but still receives no clinical record content.
7. A guessed URL or modified browser request still receives 401/403 from the server.

This is directly extensible to a hospital portal, clinic referral flow or personal health-record vault. The prototype keeps data in memory to keep the hackathon slice reviewable; production deployment requires a database, encryption-at-rest strategy, retention policy and compliance review.

## 4. Why TideCloak matters

TrustCare uses the official `@tidecloak/react` SDK and Raziel integration guidance:

- `TideCloakContextProvider` initializes from the exported adapter.
- `useAuthCallback` completes the redirect and restores the session.
- The SDK's official `register()` path opens TideCloak self-registration.
- `secureFetch` attaches the access token and strict ES256 DPoP proof.
- Session-status iframe monitoring is disabled for the local cross-origin setup. A small idempotent post-install compatibility patch makes a third-party-cookie probe timeout fall back to normal redirect SSO instead of preventing callback processing.
- The server verifies JWT signature, issuer, `azp`, expiry and DPoP `cnf.jkt`, signature, `ath`, method, URL, time and one-time `jti`.
- Protected routes enforce Patient/Doctor/Admin roles and the patient/doctor assignment independently of the UI.

Tide Doctor passed 15 integration checks with `RESULT: OK` on 2026-10-22. The current local realm has IGA enabled. Role creation and self-registration configuration are therefore governed changes; their pending state is reported honestly in [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

The in-memory DPoP replay store is correct only for one API process. A multi-instance deployment must use a shared atomic store such as Redis or Postgres.

## 5. Prototype & storytelling

The recommended demonstration is one end-to-end consent story:

1. Open TrustCare and create/sign in to a Patient account through TideCloak.
2. Show the patient's private profile and explain that `/api/workspace` is filtered using the verified token subject.
3. Sign in as a Doctor with no assignment; show an empty patient list.
4. Request access to the patient's ID.
5. Return as the Patient and approve the request.
6. Return as the Doctor, create a draft consultation, mark it final and show that final records cannot be deleted.
7. Sign in as Admin, show care-team assignments and point out that clinical notes are deliberately absent.
8. Close with JWT, DPoP and object-level authorization evidence.

See [docs/DEMO_VIDEO.md](docs/DEMO_VIDEO.md) for the timed narration and recording checklist. The repository's existing `Video.mp4` predates TrustCare and is **not** claimed as the final demo recording.

## Local development

### Prerequisites

- Node.js 20+ and npm.
- Local Docker TideCloak or hosted Skycloak.
- Realm roles `_tide_enabled`, `patient`, `doctor` and `admin` (`member` is accepted only as a temporary Patient compatibility role).
- Self-registration enabled with Patient included in the realm's default composite role.
- Redirect URI `http://localhost:5137/auth/redirect` and web origin `http://localhost:5137`.
- Exported public adapter with Tide metadata, signed origin and embedded `jwk.keys`.

Before creating a realm, the human operator must provide the Tide licence email, personally accept the [Tide Terms & Conditions](https://tide.org/legal), and choose local Docker or hosted Skycloak. A realm cannot later be moved between those hosting modes.

### Install and run

```powershell
Set-Location "D:\code\RMIT-C2"
npm.cmd install
# Only on a new machine/deployment:
Copy-Item "C:\path\to\exported\tidecloak.json" ".\public\tidecloak.json"
```

`public/tidecloak.json` and `.env` are gitignored. Never put a confidential client secret into the browser adapter.

Run the API and Vite app in separate terminals:

```powershell
npm.cmd run dev:api
```

```powershell
npm.cmd run dev
```

Open `http://localhost:5137`.

### Local TideCloak instance used for verification

- Public URL: `http://localhost:8080`
- Realm: `trustflow`
- Public client: `trustflow-client`
- App URL: `http://localhost:5137`
- Hosting choice: local Docker
- Branding choice: keep Tide's default login branding
- In-app onboarding: display name only, no email field

Credentials, H2 data and the exported adapter remain local and excluded from Git.

## Security architecture

```text
Browser / @tidecloak/react
  ├─ login or patient registration
  ├─ callback + session restoration
  ├─ strict DPoP proof generation
  └─ secureFetch
          │ verified token + proof
          ▼
Express API
  ├─ embedded-JWK JWT verification
  ├─ issuer / azp / time checks
  ├─ DPoP signature / ath / htm / htu / iat / jti checks
  ├─ Patient / Doctor / Admin role enforcement
  ├─ subject ownership or doctor assignment check
  └─ filtered response or protected CRUD
```

`401` means identity or sender proof could not be verified. `403` means the verified identity lacks the required role, ownership or care relationship. Validation failures return `400`; conflicts such as deleting a final record return `409`.

## Quality checks

```powershell
npm.cmd run check
```

Verified on 2026-10-22:

- ESLint: passed.
- Node tests: **16/16 passed**, including DPoP replay and object-level authorization denial cases.
- Vite production build: passed.
- `npm install` audit: **0 vulnerabilities**.
- Tide Doctor: **15 passed, 0 failures, RESULT: OK**; pending IGA changes were reported as a warning, not hidden.

## Current submission status

- Working branch: `codex/trustcare-medical-records`.
- First TrustCare vertical-slice commit: `f549c9c`.
- Source is pushed to the team GitHub repository; it is not claimed as merged into `main` or submitted to the organizer.
- Real login/session/dashboard worked before the pivot; the new Patient self-registration and three-persona story still require the pending realm changes to be approved and then tested live.
- Final demo video has not been recorded. Replace `Video.mp4` only after reviewing the new TrustCare recording.

## Team

**UIT.VUARAUMA** · SGS Campus · RMIT Hackathon 2026 Challenge 2
