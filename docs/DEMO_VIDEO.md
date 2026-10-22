# TrustCare demo video

## Final file

The final submission video must be saved as `Video.mp4` in the repository root. The current file predates TrustCare and is **not** evidence of a completed recording. Replace it only after reviewing the new export.

## Story in one sentence

“A patient's record is invisible by default; a verified doctor requests access, the patient consents, and only then can that doctor document care.”

## Suggested 3-minute script

1. **Problem — 0:00–0:20**
   “A medical portal should not expose every record to everyone with a staff role. TrustCare verifies both identity and the relationship to one patient.”
2. **Real TideCloak entry — 0:20–0:45**
   Show the TrustCare landing page, “Sign in securely” and “Create patient account”. Complete real TideCloak login and return through `/auth/redirect`.
3. **Patient privacy — 0:45–1:10**
   Show one Patient profile and its timeline. Explain that the API matches the verified token subject to the patient owner; another Patient cannot retrieve it.
4. **Doctor denied by default — 1:10–1:30**
   Sign in as an unassigned Doctor and show the empty patient list. Submit an access request with the target Patient ID and a reason.
5. **Consent — 1:30–1:50**
   Return as the Patient, open Access & consent, approve the known Doctor, and explain that another Patient cannot decide this request.
6. **Protected medical CRUD — 1:50–2:25**
   Return as Doctor. Create a synthetic draft consultation, mark it final, and explain that final records cannot be deleted. If time permits, create/delete a second draft.
7. **Admin without clinical overreach — 2:25–2:45**
   Sign in as Admin. Show patient directory metadata and care assignment management; point out that the API returns no clinical records to Admin by default.
8. **Security close — 2:45–3:00**
   “TideCloak restores identity, DPoP binds the sender, and TrustCare's server checks role plus patient relationship. TrustCare: private care, verified access. Built by UIT.VUARAUMA.”

## Recording checklist

- [ ] Approve only the intended Tide IGA changes.
- [ ] Confirm self-registration is enabled and signed IdP `RegOn` is true.
- [ ] Prepare separate Patient, Doctor and Admin accounts.
- [ ] Use synthetic names and medical data only.
- [ ] Confirm `/api/health`, Vite, API and TideCloak are running.
- [ ] Run `npm run check` and Tide Doctor immediately before recording.
- [ ] Record at 1080p with browser zoom at 100%.
- [ ] Show real Patient registration or login, callback, session restoration and logout.
- [ ] Show an unassigned Doctor cannot see the Patient.
- [ ] Show Doctor access request and matching Patient approval.
- [ ] Show Doctor create/update/delete-draft medical record operations.
- [ ] Show Admin assignment management and absence of clinical notes.
- [ ] Show or narrate clear 401/403 behavior without exposing tokens.
- [ ] Hide adapter JSON, credentials, local `.env`, admin tokens and personal notifications.
- [ ] Export H.264/AAC MP4 and review audio, text legibility and full playback.
- [ ] Replace root `Video.mp4`, verify duration and file identity, then commit intentionally.
