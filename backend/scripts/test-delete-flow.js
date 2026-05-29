/**
 * Tests the delete user flow end-to-end:
 * - Creates a user
 * - Lists users (verify created user appears)
 * - Deletes the user
 * - Lists users (verify deleted user no longer appears)
 * - Verifies deleted user cannot login
 */
const http = require("http");

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (token) opts.headers["Authorization"] = "Bearer " + token;
    const r = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", (e) => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  console.log("=== Delete User Flow Test ===\n");
  const results = [];

  // 1. Login as admin
  const login = await request("POST", "/api/auth/login", {
    email: "admin@finspect.com",
    password: "Admin@123"
  });
  const loginOk = login.status === 200;
  results.push({ test: "Admin login", pass: loginOk, detail: loginOk ? "OK" : `Got ${login.status}: ${login.body}` });
  if (!loginOk) { printResults(results); return; }

  const loginData = JSON.parse(login.body).data;
  const token = loginData.token;
  console.log(`   ℹ️  Admin: ${loginData.user.name} (${loginData.user.role})`);
  const uniqueEmail = `deleteme_${Date.now()}@finspect.com`;

  // 2. Create a user to delete
  const create = await request("POST", "/api/users", {
    name: "Delete Test User",
    email: uniqueEmail,
    password: "DeleteMe123",
    role: "STAFF"
  }, token);
  const createOk = create.status === 201;
  const createdUser = createOk ? JSON.parse(create.body).data : null;
  results.push({
    test: "Create user for delete test",
    pass: createOk,
    detail: createOk ? `Created: ${createdUser.name} (${createdUser.id})` : `Got ${create.status}: ${create.body}`
  });
  if (!createOk) { printResults(results); return; }

  const userId = createdUser.id;

  // 3. List users — verify created user appears
  const list1 = await request("GET", "/api/users", null, token);
  const list1Ok = list1.status === 200;
  const list1Users = list1Ok ? JSON.parse(list1.body).data : [];
  const foundCreated = list1Users.some((u) => u.id === userId);
  results.push({
    test: "Verify user appears in list",
    pass: foundCreated,
    detail: foundCreated ? `User found in list (${list1Users.length} total users)` : "User NOT found in list!"
  });

  // 4. Delete the user
  const del = await request("DELETE", "/api/users/" + userId, null, token);
  const delOk = del.status === 200;
  const delBody = delOk ? JSON.parse(del.body) : null;
  results.push({
    test: "Delete user via DELETE /api/users/:id",
    pass: delOk,
    detail: delOk ? `Deleted: ${delBody.message}` : `Got ${del.status}: ${del.body}`
  });

  // 5. List users — verify deleted user no longer appears
  const list2 = await request("GET", "/api/users", null, token);
  const list2Ok = list2.status === 200;
  const list2Users = list2Ok ? JSON.parse(list2.body).data : [];
  const stillVisible = list2Users.some((u) => u.id === userId);
  results.push({
    test: "Verify deleted user hidden from list",
    pass: !stillVisible,
    detail: stillVisible ? "❌ Deleted user STILL appears in list!" : `✅ User removed from list (${list2Users.length} total users)`
  });

  // 6. Try to login as deleted user — should fail
  const deletedLogin = await request("POST", "/api/auth/login", {
    email: uniqueEmail,
    password: "DeleteMe123"
  });
  results.push({
    test: "Deleted user login fails",
    pass: deletedLogin.status === 403 || deletedLogin.status === 401,
    detail: `Got ${deletedLogin.status} — account inaccessible as expected`
  });

  // 7. Try to delete the same user again — should be idempotent (soft delete)
  const del2 = await request("DELETE", "/api/users/" + userId, null, token);
  results.push({
    test: "Re-delete is idempotent (already soft-deleted)",
    pass: del2.status === 200,
    detail: del2.status === 200 ? `Got 200 — soft delete is idempotent` : `Got ${del2.status}`
  });

  // 8. Try to delete non-existent user (valid UUID format that doesn't exist)
  const fakeUuid = "00000000-0000-0000-0000-000000000000";
  const del3 = await request("DELETE", "/api/users/" + fakeUuid, null, token);
  results.push({
    test: "Delete non-existent user returns 404",
    pass: del3.status === 404,
    detail: del3.status === 404 ? `Got 404 as expected` : `Got ${del3.status}`
  });

  // 9. Try to delete without admin token (no token)
  const del4 = await request("DELETE", "/api/users/" + userId);
  results.push({
    test: "Delete without token returns 401",
    pass: del4.status === 401,
    detail: del4.status === 401 ? `Got 401 as expected` : `Expected 401, got ${del4.status}`
  });

  // 10. Try to delete with staff token (if available)
  const staffLogin = await request("POST", "/api/auth/login", {
    email: "staff@finspect.com",
    password: "Staff@123"
  });
  if (staffLogin.status === 200) {
    const staffToken = JSON.parse(staffLogin.body).data.token;
    // Create another user first using admin
    const create2 = await request("POST", "/api/users", {
      name: "Another Test",
      email: `another_${Date.now()}@finspect.com`,
      password: "TestPass123",
      role: "STAFF"
    }, token);
    if (create2.status === 201) {
      const user2Id = JSON.parse(create2.body).data.id;
      const del5 = await request("DELETE", "/api/users/" + user2Id, null, staffToken);
      results.push({
        test: "Delete with staff token returns 403",
        pass: del5.status === 403,
        detail: del5.status === 403 ? `Got 403 as expected` : `Expected 403, got ${del5.status}`
      });
    }
  }

  printResults(results);
}

function printResults(results) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Delete User Flow Results");
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

  if (passed === results.length) {
    console.log("🎉 All delete flow tests passed!");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
