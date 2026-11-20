import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

// In production the server also serves the built frontend.
const dist = path.resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`server listening on http://localhost:${port}`));
