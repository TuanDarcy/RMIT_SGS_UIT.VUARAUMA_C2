# TrustFlow demo video

## Final file

The submission video must be saved as `Video.mp4` in the repository root. The current file was already present before the TrustFlow implementation and is **not** evidence of a completed TrustFlow recording. Replace it only after reviewing the new recording.

## Suggested 3-minute script

1. **Problem (0:00–0:20)** — “Student teams collaborate quickly, but shared tools often trust the browser or one powerful admin. TrustFlow makes access verifiable.”
2. **Real login (0:20–0:45)** — Show the landing page, choose “Continue with TideCloak”, complete login, and point out the redirect back into the app.
3. **Verified CRUD (0:45–1:15)** — Open Projects, create a temporary task, advance it and delete it. Return to Overview and show the actor-bound audit events.
4. **Approval request (1:15–1:40)** — As a Member, open Approvals and submit a high-risk request to publish the final demo.
5. **Unauthorized behavior (1:40–2:00)** — Navigate directly to `/admin`; show the clear 403 page. If practical, show the protected Admin API returning 403 without exposing tokens.
6. **Admin separation of duties (2:00–2:35)** — Sign in as a different Admin, approve the pending request, create a temporary project and delete it. Explain that the requester cannot approve their own change.
7. **Security close (2:35–2:55)** — Explain TideCloak session restoration, embedded-JWK JWT verification, DPoP sender binding/replay rejection and server-side role enforcement.
8. **Closing (2:55–3:00)** — “TrustFlow: move ideas forward, keep trust intact. Built by UIT.VUARAUMA.”

## Recording checklist

- [ ] Use a configured TideCloak realm with separate Member and Admin accounts.
- [ ] Clear unrelated browser tabs, notifications and personal data.
- [ ] Confirm `/api/health` is healthy and both dev processes are running.
- [ ] Record at 1080p; keep browser zoom at 100%.
- [ ] Show actual login, callback, session restoration and logout.
- [ ] Show Member create, update and delete a temporary task.
- [ ] Show Member submit a high-risk approval request.
- [ ] Show Member denied from `/admin`.
- [ ] Show a different Admin approve the request.
- [ ] Show Admin create and delete a temporary project.
- [ ] Show the audit trail after protected actions.
- [ ] Do not display tokens, adapter JSON, admin password or developer-console secrets.
- [ ] Export H.264/AAC MP4 and verify audio, legibility and full playback.
- [ ] Replace root `Video.mp4`, check its size/duration, then commit it intentionally.
