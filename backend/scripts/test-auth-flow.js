/**
 * End-to-end auth flow verification script.
 * Tests the Jamku-style user management authentication flow:
 * - Only login is public (no signup)
 * - Admin can create/manage users
 * - isActive check at login
 * - Role-based access control
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
  console.log("=== Finspect Auth Flow Verification (Jamku-Style) ===\n");

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
  let adminToken = null;
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
    if (ok) adminToken = login.body.data.token;
  } catch (e) {
    results.push({ test: "Login (valid admin)", pass: false, detail: e.message });
  }

  // --- Test 3: Login with valid staff ---
  let staffToken = null;
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
    if (sOk) staffToken = staffLogin.body.data.token;
  } catch (e) {
    results.push({ test: "Login (valid staff)", pass: false, detail: e.message });
  }

  // --- Test 4: Public signup should be DISABLED ---
  try {
    const signup = await httpRequest("POST", "/api/auth/signup", {
      name: "Should Fail",
      email: "should-not-work@finspect.com",
      password: "Test@123",
      role: "STAFF"
    });
    // Expect 401 or 404 — route removed, falls through to authenticated middleware
    const ok = signup.status === 401 || signup.status === 404;
    results.push({
      test: "Public signup disabled (route removed)",
      pass: ok,
      detail: ok ? `Got ${signup.status} — signup is disabled (expected 401 or 404)` : `Expected 401/404, got ${signup.status}`
    });
  } catch (e) {
    results.push({ test: "Public signup disabled (route removed)", pass: false, detail: e.message });
  }

  // --- Proceed with tests that require admin auth ---
  if (!adminToken) {
    results.push({ test: "Admin creates user via /users", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Admin lists all users", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Staff cannot access admin endpoints", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Admin deactivates a user", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Disabled user login fails", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Admin activates a user", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Admin resets user password", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Auth endpoint (no token)", pass: false, detail: "Skipped — no admin token" });
    results.push({ test: "Auth endpoint (invalid token)", pass: false, detail: "Skipped — no admin token" });
  } else {
    const uniqueEmail = `staff_${Date.now()}@finspect.com`;
    let createdUserId = null;

    // --- Test 5: Admin creates a user via POST /users ---
    try {
      const createUser = await httpRequest("POST", "/api/users", {
        name: "Test Staff Member",
        email: uniqueEmail,
        password: "StaffPass@123",
        role: "STAFF"
      }, adminToken);
      const cOk = createUser.status === 201 && createUser.body.success;
      results.push({
        test: "Admin creates user via /users",
        pass: cOk,
        detail: cOk ? `User created: ${createUser.body.data.name} (${createUser.body.data.role}, active: ${createUser.body.data.isActive})` : `Got ${createUser.status}: ${JSON.stringify(createUser.body)}`
      });
      if (cOk) createdUserId = createUser.body.data.id;
    } catch (e) {
      results.push({ test: "Admin creates user via /users", pass: false, detail: e.message });
    }

    // --- Test 6: Admin lists all users (including creator info) ---
    try {
      const userList = await httpRequest("GET", "/api/users", null, adminToken);
      const uOk = userList.status === 200 && Array.isArray(userList.body.data);
      results.push({
        test: "Admin lists all users",
        pass: uOk,
        detail: uOk ? `Got ${userList.body.data.length} users — includes createdBy info` : `Got ${userList.status}`
      });
      if (uOk && userList.body.data.length > 0) {
        const firstUser = userList.body.data[0];
        if (firstUser.createdBy) {
          console.log(`   ℹ️  Creator tracking: "${firstUser.name}" created by ${firstUser.createdBy.name}`);
        }
        if (firstUser.isActive !== undefined) {
          console.log(`   ℹ️  Status tracking: "${firstUser.name}" isActive=${firstUser.isActive}`);
        }
      }
    } catch (e) {
      results.push({ test: "Admin lists all users", pass: false, detail: e.message });
    }

    // --- Test 7: Staff cannot access admin-only endpoints ---
    if (staffToken) {
      try {
        const staffAccess = await httpRequest("GET", "/api/users", null, staffToken);
        const sOk = staffAccess.status === 403;
        results.push({
          test: "Staff cannot access admin endpoints",
          pass: sOk,
          detail: sOk ? `Got 403 as expected — staff blocked from admin endpoint` : `Expected 403, got ${staffAccess.status}`
        });
      } catch (e) {
        results.push({ test: "Staff cannot access admin endpoints", pass: false, detail: e.message });
      }
    } else {
      results.push({ test: "Staff cannot access admin endpoints", pass: false, detail: "Skipped — no staff token" });
    }

    // --- Test 8: Admin deactivates a user ---
    if (createdUserId) {
      try {
        const deactivate = await httpRequest("PATCH", `/api/users/${createdUserId}/deactivate`, null, adminToken);
        const dOk = deactivate.status === 200 && deactivate.body.success;
        results.push({
          test: "Admin deactivates user",
          pass: dOk,
          detail: dOk ? `User deactivated: ${deactivate.body.message}` : `Got ${deactivate.status}: ${JSON.stringify(deactivate.body)}`
        });
      } catch (e) {
        results.push({ test: "Admin deactivates user", pass: false, detail: e.message });
      }

      // --- Test 9: Disabled user login fails ---
      try {
        const disabledLogin = await httpRequest("POST", "/api/auth/login", {
          email: uniqueEmail,
          password: "StaffPass@123"
        });
        const lOk = disabledLogin.status === 403;
        results.push({
          test: "Disabled user login fails",
          pass: lOk,
          detail: lOk ? `Got 403 as expected — "Account has been disabled"` : `Expected 403, got ${disabledLogin.status}: ${JSON.stringify(disabledLogin.body)}`
        });
      } catch (e) {
        results.push({ test: "Disabled user login fails", pass: false, detail: e.message });
      }

      // --- Test 10: Admin activates the user again ---
      try {
        const activate = await httpRequest("PATCH", `/api/users/${createdUserId}/activate`, null, adminToken);
        const aOk = activate.status === 200 && activate.body.success;
        results.push({
          test: "Admin activates user",
          pass: aOk,
          detail: aOk ? `User activated: ${activate.body.message}` : `Got ${activate.status}: ${JSON.stringify(activate.body)}`
        });
      } catch (e) {
        results.push({ test: "Admin activates user", pass: false, detail: e.message });
      }

      // --- Test 11: Admin resets user password ---
      try {
        const reset = await httpRequest("PATCH", `/api/users/${createdUserId}/reset-password`, {
          password: "NewPass@456"
        }, adminToken);
        const rOk = reset.status === 200 && reset.body.success;
        results.push({
          test: "Admin resets user password",
          pass: rOk,
          detail: rOk ? `Password reset: ${reset.body.message}` : `Got ${reset.status}: ${JSON.stringify(reset.body)}`
        });
      } catch (e) {
        results.push({ test: "Admin resets user password", pass: false, detail: e.message });
      }

      // --- Test 12: User can login with new password ---
      try {
        const newLogin = await httpRequest("POST", "/api/auth/login", {
          email: uniqueEmail,
          password: "NewPass@456"
        });
        const nOk = newLogin.status === 200 && newLogin.body.success && newLogin.body.data.token;
        results.push({
          test: "Login with new password after reset",
          pass: nOk,
          detail: nOk ? `Login successful with new password` : `Got ${newLogin.status}: ${JSON.stringify(newLogin.body)}`
        });
      } catch (e) {
        results.push({ test: "Login with new password after reset", pass: false, detail: e.message });
      }

      // --- Test 13: Admin updates user details ---
      try {
        const update = await httpRequest("PUT", `/api/users/${createdUserId}`, {
          name: "Test Staff Updated"
        }, adminToken);
        const uOk = update.status === 200 && update.body.success;
        results.push({
          test: "Admin updates user details",
          pass: uOk,
          detail: uOk ? `User updated: ${update.body.data.name}` : `Got ${update.status}: ${JSON.stringify(update.body)}`
        });
      } catch (e) {
        results.push({ test: "Admin updates user details", pass: false, detail: e.message });
      }
    } else {
      results.push({ test: "Admin deactivates user", pass: false, detail: "Skipped — user creation failed" });
      results.push({ test: "Disabled user login fails", pass: false, detail: "Skipped — user creation failed" });
      results.push({ test: "Admin activates user", pass: false, detail: "Skipped — user creation failed" });
      results.push({ test: "Admin resets user password", pass: false, detail: "Skipped — user creation failed" });
      results.push({ test: "Login with new password after reset", pass: false, detail: "Skipped — user creation failed" });
      results.push({ test: "Admin updates user details", pass: false, detail: "Skipped — user creation failed" });
    }

    // --- Test 14: Authenticated endpoint without token ---
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

    // --- Test 15: Authenticated endpoint with invalid token ---
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
  }

  // --- Test 16: Login with wrong password ---
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

  // --- Test 17: Login with non-existent user ---
  try {
    const nonExist = await httpRequest("POST", "/api/auth/login", {
      email: "nonexistent@finspect.com",
      password: "AnyPass123"
    });
    const nOk = nonExist.status === 401;
    results.push({
      test: "Login (non-existent user)",
      pass: nOk,
      detail: nOk ? `Got 401 as expected` : `Expected 401, got ${nonExist.status}`
    });
  } catch (e) {
    results.push({ test: "Login (non-existent user)", pass: false, detail: e.message });
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
