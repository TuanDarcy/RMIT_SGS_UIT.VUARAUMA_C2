# TrustCare Challenge 2 status

Assessment date: 2026-10-22

This is an evidence-based engineering estimate, not an organizer score. “Implemented” and “live-verified” are tracked separately.

## Current estimate

| Area | Weight | Completion | Evidence | Remaining gap |
| --- | ---: | ---: | --- | --- |
| Discovery and preservation | 10% | 100% | Existing Vite/Tide integrations were inspected, TrustFlow was preserved on its branch, and the pivot uses a dedicated branch. | Recheck only if organizer requirements change. |
| Working application | 30% | 92% | Responsive TrustCare dashboard, role-aware records, doctor CRUD, consent flow, assignments, audit view and explicit 403 behavior are implemented. | Live-test all three personas and do a final usability pass. |
| TideCloak and authorization | 30% | 82% | Official SDK login/registration path, callback, restoration, logout, strict DPoP, embedded-JWK JWT validation, role checks and patient-level server checks are implemented. Tide Doctor is OK. | Approve the five pending IGA changes, add Patient to the default realm composite after its role exists, re-sign IdP settings, and verify registration plus Patient/Doctor/Admin tokens. |
| Quality and security | 15% | 92% | ESLint, 16 tests, production build and npm audit pass; tests include Bearer replay, DPoP replay, wrong method/URL and cross-patient access denial. | Add automated browser smoke tests and repeat live denial tests after realm approval. |
| Submission package | 15% | 62% | README follows the five organizer headings; local setup, architecture, status, storytelling and recording checklist are updated for TrustCare. | Record/review the real video, replace stale `Video.mp4`, agree the merge with the team, and submit. |

Weighted engineering completion: **87%**. Practical submission readiness is approximately **75%** because Patient registration/three-role evidence and the final video remain outstanding.

## Verified now

- Branch `codex/trustcare-medical-records` is pushed to the team GitHub repository.
- Commit `f549c9c` contains the TrustCare vertical slice.
- `npm install` reports 0 vulnerabilities.
- `npm run check` passes ESLint, **16/16 tests**, and production build.
- Tide Doctor reports **15 passed, 0 failures, RESULT: OK**.
- Realm `trustflow`, public client `trustflow-client`, signed origin, adapter embedded key, DPoP relay and IGA are present.

## Pending Tide governance work

The local realm currently has five pending IGA change requests:

- Create realm role `patient`.
- Create realm role `doctor`.
- Enable realm self-registration (captured as two realm changes).
- The previously requested application `admin` grant.

These are intentionally pending until a linked Tide administrator approves them in the enclave. After approval:

1. Add `patient` to `default-roles-trustflow` so new users receive Patient automatically.
2. Re-sign Tide IdP settings so the signed `RegOn` value reflects registration being enabled.
3. Log out and back in so updated roles appear in tokens.
4. Test a fresh Patient signup, one Doctor and one Admin end to end.

## Highest-priority next steps

1. Approve the five intended Tide change requests; reject anything unexpected.
2. Finish the default Patient composite and signed registration settings, then rerun Tide Doctor.
3. Create/separate three demo personas: Patient, Doctor and Admin.
4. Verify Patient privacy, unassigned Doctor denial, consent grant, medical CRUD, Admin metadata-only view and logout/session restoration.
5. Record the three-minute walkthrough from `docs/DEMO_VIDEO.md` and intentionally replace `Video.mp4`.
6. Review the branch with the team, merge only with team approval, then complete organizer submission before the deadline.

## Known prototype limits

- Application data and DPoP replay state are in memory and reset with the API process.
- The generated patient profile is demo state, not an electronic health record compliant with any jurisdiction.
- Production requires durable storage, encryption at rest, retention/deletion rules, backups, monitoring and a legal/privacy review.
- Local Tide adapter, credentials and realm database are excluded from Git.
- No final video or organizer submission is claimed.
