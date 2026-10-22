import { useMemo, useState } from "react";
import { useTideCloak } from "@tidecloak/react";

const DISMISS_PREFIX = "trustflow.profile-onboarding.dismissed";

export function ProfileOnboarding() {
  const tide = useTideCloak();
  const subject = tide.getValueFromToken("sub") || "anonymous";
  const dismissKey = useMemo(() => `${DISMISS_PREFIX}.${subject}`, [subject]);
  const [hidden, setHidden] = useState(() => localStorage.getItem(dismissKey) === "1");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentName = tide.getValueFromToken("given_name") || tide.getValueFromToken("name");
  if (!tide.authenticated || currentName || hidden) return null;

  function dismiss() {
    localStorage.setItem(dismissKey, "1");
    setHidden(true);
  }

  async function save(event) {
    event.preventDefault();
    const firstName = displayName.trim();
    if (!firstName) {
      setError("Please enter a display name or choose Not now.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const token = await tide.getToken();
      if (!token) throw new Error("Your session is not ready. Please sign in again.");
      const config = tide.getConfig();
      const baseUrl = String(config["auth-server-url"] || tide.baseURL).replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/realms/${config.realm}/account/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ firstName }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Profile access was denied. Please sign out and sign in again.");
      }
      if (response.status === 202) {
        throw new Error("Your display name is awaiting Tide approval and is not saved yet.");
      }
      if (!response.ok) throw new Error(`Could not save your display name (${response.status}).`);

      await tide.forceRefreshToken().catch(() => false);
      setHidden(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your display name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <form className="onboarding-card" onSubmit={save}>
        <span className="onboarding-mark">TF</span>
        <p className="eyebrow">ONE QUICK DETAIL</p>
        <h2 id="onboarding-title">Welcome to TrustFlow</h2>
        <p>Choose the name teammates will see. This is optional and we do not ask for your email.</p>
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength="2"
          maxLength="80"
          autoComplete="given-name"
          autoFocus
          placeholder="e.g. Minh Anh"
        />
        {error && <p className="onboarding-error" role="alert">{error}</p>}
        <div className="onboarding-actions">
          <button type="button" className="secondary-button" onClick={dismiss} disabled={busy}>Not now</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save name"}</button>
        </div>
      </form>
    </div>
  );
}
