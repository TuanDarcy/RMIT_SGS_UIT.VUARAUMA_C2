import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { authenticate, requireRoles } from "./auth/middleware.js";
import { createProject, createTask, deleteProject, deleteTask, updateTask, workspaceSnapshot } from "./store.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Content-Security-Policy", "frame-src 'self' *; object-src 'none'; base-uri 'self'");
    next();
  });

  app.get("/api/health", (_request, response) => response.json({ status: "ok", auth: "required-on-protected-routes" }));
  app.get("/api/workspace", authenticate, requireRoles("member", "admin"), (request, response) => response.json(workspaceSnapshot(request.auth)));
  app.post("/api/projects", authenticate, requireRoles("admin"), (request, response, next) => {
    try { response.status(201).json(createProject(request.body, request.auth)); } catch (error) { next(error); }
  });
  app.post("/api/projects/:projectId/tasks", authenticate, requireRoles("member", "admin"), (request, response, next) => {
    try { response.status(201).json(createTask(request.params.projectId, request.body, request.auth)); } catch (error) { next(error); }
  });
  app.patch("/api/projects/:projectId/tasks/:taskId", authenticate, requireRoles("member", "admin"), (request, response, next) => {
    try { response.json(updateTask(request.params.projectId, request.params.taskId, request.body, request.auth)); } catch (error) { next(error); }
  });
  app.delete("/api/projects/:projectId/tasks/:taskId", authenticate, requireRoles("member", "admin"), (request, response, next) => {
    try { response.json(deleteTask(request.params.projectId, request.params.taskId, request.auth)); } catch (error) { next(error); }
  });
  app.delete("/api/projects/:projectId", authenticate, requireRoles("admin"), (request, response, next) => {
    try { response.json(deleteProject(request.params.projectId, request.auth)); } catch (error) { next(error); }
  });
  app.use("/api", (_request, response) => response.status(404).json({ error: "API route not found" }));

  app.get("/tide_dpop/*path", (_request, response) => {
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'");
    response.setHeader("Allow-CSP-From", "*");
    response.sendFile(resolve("public/tide_dpop_auth.html"));
  });

  if (existsSync(resolve("dist"))) {
    app.use(express.static(resolve("dist")));
    app.get("/*path", (_request, response) => response.sendFile(resolve("dist/index.html")));
  }

  app.use((error, _request, response, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status === 500) console.error(error);
    response.status(status).json({ error: status === 500 ? "Unexpected server error" : error.message });
  });
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 4000);
  createApp().listen(port, "localhost", () => console.log(`TrustFlow API listening on http://localhost:${port}`));
}
