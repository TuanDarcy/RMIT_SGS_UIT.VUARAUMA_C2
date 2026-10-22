# CommonGround demo video

## Final file

The submission video must be saved as `Video.mp4` in the repository root. The current file predates CommonGround and is not evidence of this prototype. Replace it only after reviewing the new recording.

## Suggested 2-minute script

1. **Possibility (0:00–0:20)** — “Students should be able to ask their community for help without giving one administrator the key to their private story.”
2. **Encrypted request (0:20–0:50)** — Sign in as a Member, submit a synthetic support request, and show that the server-side record contains ciphertext rather than the explanation.
3. **Collective review (0:50–1:25)** — Sign in as a Steward, reveal the explanation through TideCloak, cast one vote, then show the request remains pending until a second matching vote arrives.
4. **Trust boundary (1:25–1:50)** — Explain that the API stores no decryption key; TideCloak's distributed network performs the protected decrypt. The app's two-vote quorum is prototype application logic, not a custom Forseti policy.
5. **Close (1:50–2:00)** — “CommonGround makes asking for support possible without giving one person control of the story and the outcome.”

## Recording checklist

- [ ] Use a configured TideCloak realm with separate Member and Steward accounts and the `commons-case` encryption roles.
- [ ] Clear unrelated browser tabs, notifications and personal data.
- [ ] Confirm `/api/health` is healthy and both dev processes are running.
- [ ] Record at 1080p; keep browser zoom at 100%.
- [ ] Show actual login, callback, session restoration and logout.
- [ ] Show a synthetic support request stored as ciphertext.
- [ ] Show a steward decrypt through TideCloak and show one vote is insufficient.
- [ ] Show the second matching steward vote finalizing the decision.
- [ ] Do not display tokens, adapter JSON, admin password or developer-console secrets.
- [ ] Export H.264/AAC MP4 and verify audio, legibility and full playback.
- [ ] Replace root `Video.mp4`, check its size/duration, then commit it intentionally.
