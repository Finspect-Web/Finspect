/**
 * End-to-end auth flow verification script.
 * Starts the server, tests login/signup/auth endpoints, then shuts down.
 */

const { spawn } = require("child_process");
const http = require("http");

const PORT = 5123; // Use non-standard port to avoid conflicts
const BASE = `http://localhost:${PORT}`;

// Track whether we need to kill the server
let serverProcess = null;

function httpRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function waitForServer(url, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) resolve();
        else if (++attempts < maxAttempts) setTimeout(check, 500);
        else reject(new Error("Server failed to start"));
      }).on("error", () => {
        if (++attempts < maxAttempts) setTimeout(check, 500);
        else reject(new Error("Server failed to start (connection refused)"));
      });
    };
    check();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", ["src/server.js"], {
      cwd: require("path").join(__dirname, ".."),
      env: { ...process.env, PORT: String(PORT) },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true
    });

    proc.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
    proc.stderr.on("data", (d) => process.stderr.write(`[server:err] ${d}`));

    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.log(`Server exited with code ${code}`);
      }
    });

    serverProcess = proc;
    // Give it a moment to start
    setTimeout(() => resolve(proc), 1000);
  });
}

function killServer() {
  if (serverProcess) {
    try {
      process.kill(-serverProcess.pid, "SIGTERM");
    } catch {
      try { serverProcess.kill("SIGTERM"); } catch {}
    }
    serverProcess = null;
  }
}

async function run() {
  console.log("=== Finspect Auth Flow Verification ===\n");

  // --- Start server ---
  console.log("1. Starting server...");
  await startServer();
  await waitForServer(`${BASE}/health`);
  console.log("   ✅ Server is up\n");

  const results = [];

  // --- Test 1: Health check ---
  try {
    const health = await httpRequest("GET", "/health");
    const ok = health.status === 200 && health.body.success === true;
    results.push({ test: "Health check", pass: ok, detail: ok ? "OK" : `Got ${health.status}` });
  } catch (e) {
    results.push({ test: "Health check", pass: false, detail: e.message });
  }

  // --- Test 2: Login with valid admin ---
  try {
    const login = await httpRequest("POST", "/api/auth/login", {
      email: "admin@finspect.com",
      password: "Admin@123"
    });
    const ok = login.status === 200 && login.body.success && login.body.data.token;
    results.push({
      test: "Login (valid admin)",
      pass: ok,
      detail: ok ? `Token received, user: ${login.body.data.user.name} (${login.body.data.user.role})` : `Got ${login.status}: ${JSON.stringify(login.body)}`
    });
    if (ok) {
      const adminToken = login.body.data.token;

      // --- Test 3: Login with valid staff ---
      try {
        const staffLogin = await httpRequest("POST", "/api/auth/login", {
          email: "staff@finspect.com",
          password: "Staff@123"
        });
        const sOk = staffLogin.status === 200 && staffLogin.body.success && staffLogin.body.data.token;
        results.push({
          test: "Login (valid staff)",
          pass: sOk,
          detail: sOk ? `Token received, user: ${staffLogin.body.data.user.name} (${staffLogin.body.data.user.role})` : `Got ${staffLogin.status}`
        });
      } catch (e) {
        results.push({ test: "Login (valid staff)", pass: false, detail: e.message });
      }

      // --- Test 4: Authenticated endpoint with valid token ---
      try {
        const me = await httpRequest("GET", "/api/users", null, adminToken);
        const mOk = me.status === 200;
        results.push({
          test: "Auth endpoint (valid token)",
          pass: mOk,
          detail: mOk ? `Got ${me.status} — user list returned with ${me.body.data?.length || '?'} users` : `Got ${me.status}: ${JSON.stringify(me.body)}`
        });
      } catch (e) {
        results.push({ test: "Auth endpoint (valid token)", pass: false, detail: e.message });
      }

      // --- Test 5: Authenticated endpoint without token ---
      try {
        const noAuth = await httpRequest("GET", "/api/users");
        const nOk = noAuth.status === 401;
        results.push({
          test: "Auth endpoint (no token)",
          pass: nOk,
          detail: nOk ? `Got 401 as expected` : `Expected 401, got ${noAuth.status}`
        });
      } catch (e) {
        results.push({ test: "Auth endpoint (no token)", pass: false, detail: e.message });
      }

      // --- Test 6: Authenticated endpoint with invalid token ---
      try {
        const badToken = await httpRequest("GET", "/api/users", null, "invalid-token-here");
        const bOk = badToken.status === 401;
        results.push({
          test: "Auth endpoint (invalid token)",
          pass: bOk,
          detail: bOk ? `Got 401 as expected` : `Expected 401, got ${badToken.status}`
        });
      } catch (e) {
        results.push({ test: "Auth endpoint (invalid token)", pass: false, detail: e.message });
      }
    } else {
      // Login failed, skip dependent tests
      results.push({ test: "Login (valid staff)", pass: false, detail: "Skipped — admin login failed" });
      results.push({ test: "Auth endpoint (valid token)", pass: false, detail: "Skipped — admin login failed" });
      results.push({ test: "Auth endpoint (no token)", pass: false, detail: "Skipped — admin login failed" });
      results.push({ test: "Auth endpoint (invalid token)", pass: false, detail: "Skipped — admin login failed" });
    }
  } catch (e) {
    results.push({ test: "Login (valid admin)", pass: false, detail: e.message });
  }

  // --- Test 7: Login with wrong password ---
  try {
    const badLogin = await httpRequest("POST", "/api/auth/login", {
      email: "admin@finspect.com",
      password: "wrong-password"
    });
    const bOk = badLogin.status === 401;
    results.push({
      test: "Login (wrong password)",
      pass: bOk,
      detail: bOk ? `Got 401 as expected` : `Expected 401, got ${badLogin.status}`
    });
  } catch (e) {
    results.push({ test: "Login (wrong password)", pass: false, detail: e.message });
  }

  const uniqueEmail = `testuser_${Date.now()}@finspect.com`;

  // --- Test 8: Signup new user ---
  try {
    const signup = await httpRequest("POST", "/api/auth/signup", {
      name: "Test New User",
      email: uniqueEmail,
      password: "Test@123",
      role: "STAFF"
    });
    const sOk = signup.status === 201 && signup.body.success && signup.body.data.token;
    results.push({
      test: "Signup new user",
      pass: sOk,
      detail: sOk ? `User created: ${signup.body.data.user.email} (${signup.body.data.user.role})` : `Got ${signup.status}: ${JSON.stringify(signup.body)}`
    });
  } catch (e) {
    results.push({ test: "Signup new user", pass: false, detail: e.message });
  }

  // --- Test 9: Signup duplicate email ---
  try {
    const dupSignup = await httpRequest("POST", "/api/auth/signup", {
      name: "Duplicate",
      email: "admin@finspect.com",
      password: "Test@123",
      role: "STAFF"
    });
    const dOk = dupSignup.status === 409;
    results.push({
      test: "Signup duplicate email",
      pass: dOk,
      detail: dOk ? `Got 409 as expected` : `Expected 409, got ${dupSignup.status}`
    });
  } catch (e) {
    results.push({ test: "Signup duplicate email", pass: false, detail: e.message });
  }

  // --- Test 10: Signup missing fields ---
  try {
    const missing = await httpRequest("POST", "/api/auth/signup", { email: "missing@test.com" });
    const mOk = missing.status === 400;
    results.push({
      test: "Signup missing fields",
      pass: mOk,
      detail: mOk ? `Got 400 as expected` : `Expected 400, got ${missing.status}`
    });
  } catch (e) {
    results.push({ test: "Signup missing fields", pass: false, detail: e.message });
  }

  // --- Print results ---
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Auth Flow Test Results");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  let passed = 0;
  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    console.log(`  ${icon} ${r.test}`);
    console.log(`     ${r.detail}`);
    if (r.pass) passed++;
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  ${passed}/${results.length} tests passed`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Cleanup
  killServer();

  if (passed === results.length) {
    console.log("🎉 All auth flow tests passed!");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed.");
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on("SIGINT", () => { killServer(); process.exit(1); });
process.on("SIGTERM", () => { killServer(); process.exit(1); });

run().catch((err) => {
  console.error("Fatal error:", err);
  killServer();
  process.exit(1);
});
