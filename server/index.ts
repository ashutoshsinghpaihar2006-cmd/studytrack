import express from "express";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
const httpServer = createHttpServer(app);
app.get("/api/public-config", (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  response.json({
    configured: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl: supabaseUrl ?? null,
    supabaseAnonKey: supabaseAnonKey ?? null,
  });
});

if (isProduction) {
  const publicDirectory = path.resolve(process.cwd(), "dist/public");
  app.use(express.static(publicDirectory, { index: false, maxAge: "1h" }));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(publicDirectory, "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true, allowedHosts: true, hmr: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`StudyTrack server listening on port ${port}`);
});
