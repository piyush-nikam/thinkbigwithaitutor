// Starts the server in this same process, probes it, then exits.
// Run: npx tsx scripts/smoke.ts
await import("../server/index.ts");
await new Promise((r) => setTimeout(r, 1000));

let failed = false;
try {
  const health = await fetch("http://127.0.0.1:3001/api/health").then((r) => r.json());
  console.log("health:", JSON.stringify(health));
  const home = await fetch("http://127.0.0.1:3001/");
  const html = await home.text();
  console.log("home status:", home.status, "| serves app:", html.includes('id="root"'));
} catch (e) {
  console.error("smoke test failed:", (e as Error).message, (e as { cause?: unknown }).cause);
  failed = true;
}
process.exit(failed ? 1 : 0);
