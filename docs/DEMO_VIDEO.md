# TrustFlow demo video

## Final file

The submission video must be saved as `Video.mp4` in the repository root. The current file was already present before the TrustFlow implementation and is **not** evidence of a completed TrustFlow recording. Replace it only after reviewing the new recording.

## Suggested 2–3 minute script

1. **Problem (0:00–0:20)** — “Student teams collaborate quickly, but shared tools often trust the browser or one powerful admin. TrustFlow makes access verifiable.”
2. **Real login (0:20–0:45)** — Show the landing page, choose “Continue with TideCloak”, complete login, and point out the redirect back into the app.
3. **Member flow (0:45–1:20)** — Open Projects, advance a task, return to Overview, and show the new verified activity event.
4. **Unauthorized behavior (1:20–1:40)** — With a Member account, navigate directly to `/admin`; show the clear 403 page. Mention that the API also rejects the operation.
5. **Admin flow (1:40–2:10)** — Sign in as an Admin, open Admin, create a project, and show it in the project list.
6. **Security close (2:10–2:35)** — Explain: TideCloak session restoration; embedded-JWK JWT verification; DPoP sender binding and replay rejection; server-side Admin/Member enforcement.
7. **Closing (2:35–2:45)** — “TrustFlow: move ideas forward, keep trust intact. Built by UIT.VUARAUMA.”

## Recording checklist

- [ ] Use a configured TideCloak realm with separate Member and Admin accounts.
- [ ] Clear unrelated browser tabs, notifications and personal data.
- [ ] Confirm `/api/health` is healthy and both dev processes are running.
- [ ] Record at 1080p; keep browser zoom at 100%.
- [ ] Show actual login, callback, session restoration and logout.
- [ ] Show one successful Member task update.
- [ ] Show Member denied from `/admin`.
- [ ] Show one successful Admin project creation.
- [ ] Do not display tokens, adapter JSON, admin password or developer-console secrets.
- [ ] Export H.264/AAC MP4 and verify audio, legibility and full playback.
- [ ] Replace root `Video.mp4`, check its size/duration, then commit it intentionally.
