import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TideCloakContextProvider } from "@tidecloak/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./style.css";
import "./tasks.css";
import "./commons.css";

function TideCloakBootstrap() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/tidecloak.json", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("public/tidecloak.json is not configured");
        }
        return response.json();
      })
      .then((adapter) => setConfig({ ...adapter, useDPoP: { mode: "strict", alg: "ES256" } }))
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  if (error) return <App configurationError={error} />;
  if (!config) return <main className="boot-screen"><div className="pulse-logo">TF</div><p>Establishing a secure workspace…</p></main>;
  return <TideCloakContextProvider config={config}><App /></TideCloakContextProvider>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <TideCloakBootstrap />
    </BrowserRouter>
  </React.StrictMode>,
);
