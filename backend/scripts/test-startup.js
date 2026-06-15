/**
 * Startup test — verifies the server boots without Express 5 route registration errors.
 *
 * Tests:
 *   1. app.js loads without throwing (catches Express 5 wildcard issues, etc.)
 *   2. Server starts listening without crashing
 *   3. GET /health returns 200 with expected shape
 *   4. A known-404 route returns 404 (notFound middleware works)
 *   5. Server shuts down cleanly
 */

const http = require("http");

// Load env before anything else (mirrors app.js)
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

// ---------------------------------------------------------------------------
// Helper: raw HTTP request
// ---------------------------------------------------------------------------
function request(method, path, port) {
  return new Promise((resolve) => {
    const opts = { hostname: "127.0.0.1", port, path, method };
    const r = http.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    r.on("error", (e) => resolve({ status: 0, body: e.message }));
    r.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const failures = [];
  const pass = (label) => console.log(`  ✓ ${label}`);
  const fail = (label, detail) => {
    console.log(`  ✗ ${label}: ${detail}`);
    failures.push(label);
  };

  console.log("\n═══ Server Startup Test ═══\n");

  // ---- Step 1: app.js loads without throwing ----
  console.log("Step 1: Loading app.js …");
  let app;
  try {
    app = require("../src/app");
    if (app && typeof app.listen === "function") {
      pass("app.js loaded, exports an Express app");
    } else {
      fail("app.js loaded", "export is not an Express app (missing .listen)");
    }
  } catch (err) {
    fail("app.js loaded", err.message);
    // No point continuing if the module itself throws
    console.log("\n❌ FATAL: app.js failed to load. Fix route registration errors first.\n");
    process.exit(1);
  }

  // ---- Step 2: Start server ----
  console.log("\nStep 2: Starting server …");
  const server = app.listen(0, "127.0.0.1");

  // Wait for the server to start or fail with a timeout
  const serverReady = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), 5000);
    server.on("listening", () => {
      clearTimeout(timer);
      resolve("listening");
    });
    server.on("error", (err) => {
      clearTimeout(timer);
      resolve("error:" + err.message);
    });
  });

  if (serverReady.startsWith("error")) {
    fail("Server startup", serverReady.slice(6));
    await new Promise((resolve) => server.close(resolve));
    process.exit(1);
  }
  if (serverReady === "timeout") {
    fail("Server startup", "timed out after 5s");
    await new Promise((resolve) => server.close(resolve));
    process.exit(1);
  }
  const addr = server.address();
  pass(`Server listening on 127.0.0.1:${addr.port}`);

  const port = server.address().port;

  // ---- Step 3: GET /health ----
  console.log("\nStep 3: GET /health …");    const health = await request("GET", "/health", port);
  if (health.status === 200) {
    try {
      const body = JSON.parse(health.body);
      if (body.success === true && body.message === "Finspect API is running.") {
        pass("GET /health returns 200 with correct payload");
      } else {
        fail("GET /health", `unexpected payload: ${health.body}`);
      }
    } catch {
      fail("GET /health", `invalid JSON: ${health.body}`);
    }
  } else {
    fail("GET /health", `status ${health.status}: ${health.body}`);
  }

  // ---- Step 4: Unknown route returns 404 ----
  console.log("\nStep 4: GET /nonexistent-route …");    const notFound = await request("GET", "/nonexistent-route", port);
  if (notFound.status === 404) {
    try {
      const body = JSON.parse(notFound.body);
      if (body.success === false && body.message) {
        pass("GET /nonexistent-route returns 404 with error message");
      } else {
        fail("Not-found route", `unexpected payload: ${notFound.body}`);
      }
    } catch {
      fail("Not-found route", `invalid JSON: ${notFound.body}`);
    }
  } else {
    fail("Not-found route", `expected 404, got ${notFound.status}`);
  }

  // ---- Summary ----
  console.log("\n═══ Results ═══");
  if (failures.length === 0) {
    console.log(`  ✅ All ${4} tests passed. Server boots cleanly.\n`);
  } else {
    console.log(`  ❌ ${failures.length} test(s) failed: ${failures.join(", ")}\n`);
  }

  // ---- Cleanup ----
  await new Promise((resolve) => server.close(resolve));
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error in test:", err.message);
  process.exit(1);
});
