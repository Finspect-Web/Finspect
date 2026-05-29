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
  // Login as admin
  const login = await request("POST", "/api/auth/login", {
    email: "admin@finspect.com",
    password: "Admin@123"
  });
  if (login.status !== 200) {
    console.log("Login failed:", login.status, login.body);
    return;
  }
  const token = JSON.parse(login.body).token;
  console.log("Login OK, token received");

  // Get users list
  const list = await request("GET", "/api/users", null, token);
  const listData = JSON.parse(list.body);
  const users = listData.data || [];
  console.log("Users found:", users.length);

  let staffUser = users.find((u) => u.role === "STAFF");
  if (!staffUser) {
    console.log("No staff user found. Creating one...");
    const createRes = await request("POST", "/api/users", {
      name: "Test Staff",
      email: "teststaff_" + Date.now() + "@finspect.com",
      password: "TestPass123",
      role: "STAFF"
    }, token);
    const created = JSON.parse(createRes.body);
    if (!created.success) {
      console.log("Create failed:", createRes.status, created.message);
      return;
    }
    staffUser = created.data;
    console.log("Created user:", staffUser.id);
  }

  console.log("\nTarget user:", staffUser.id, staffUser.name, "isActive:", staffUser.isActive);

  // Test activate endpoint
  const activate = await request("PATCH", "/api/users/" + staffUser.id + "/activate", null, token);
  console.log("\nPATCH /api/users/" + staffUser.id + "/activate");
  console.log("  Status:", activate.status);
  console.log("  Body:", activate.body.substring(0, 300));

  // Test deactivate endpoint
  const deactivate = await request("PATCH", "/api/users/" + staffUser.id + "/deactivate", null, token);
  console.log("\nPATCH /api/users/" + staffUser.id + "/deactivate");
  console.log("  Status:", deactivate.status);
  console.log("  Body:", deactivate.body.substring(0, 300));

  // Test activate again
  const activate2 = await request("PATCH", "/api/users/" + staffUser.id + "/activate", null, token);
  console.log("\nPATCH /api/users/" + staffUser.id + "/activate (second time)");
  console.log("  Status:", activate2.status);
  console.log("  Body:", activate2.body.substring(0, 300));

  console.log("\n=== RESULTS ===");
  console.log("Activate:", activate.status === 200 ? "PASS" : "FAIL (" + activate.status + ")");
  console.log("Deactivate:", deactivate.status === 200 ? "PASS" : "FAIL (" + deactivate.status + ")");
  console.log("Activate again:", activate2.status === 200 ? "PASS" : "FAIL (" + activate2.status + ")");
}

main().catch(console.error);
