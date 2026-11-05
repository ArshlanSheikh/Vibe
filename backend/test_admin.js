import assert from "assert";
import mongoose from "mongoose";
import User from "./modules/auth/auth.model.js";

const BASE_URL = "http://localhost:5000/api/v1";

const runAdminTests = async () => {
  console.log("🧪 Starting Admin Module & Dashboard Integration Tests...\n");

  const adminEmail = `admin_${Date.now()}@vibe.anon`;
  const normalUserEmail = `target_user_${Date.now()}@vibe.anon`;

  // 1. Register admin user
  console.log("1. Creating Admin User...");
  const adminRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "adminPassword123" })
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.data.accessToken;

  // Make sure this user has admin role in DB
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vibe_db");
  await User.updateOne({ email: adminEmail }, { $set: { role: "admin" } });

  // Login again to get updated JWT token with admin role
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "adminPassword123" })
  });
  const freshAdminData = await adminLogin.json();
  const validAdminToken = freshAdminData.data.accessToken;

  // 2. Register normal user to test management
  console.log("2. Creating Normal User...");
  const userRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalUserEmail, password: "password123" })
  });
  const userData = await userRes.json();
  const normalUserToken = userData.data.accessToken;

  // 3. Test Dashboard Stats
  console.log("\n3. Testing /admin/dashboard/stats...");
  const statsRes = await fetch(`${BASE_URL}/admin/dashboard/stats`, {
    headers: { Authorization: `Bearer ${validAdminToken}` }
  });
  const statsData = await statsRes.json();
  assert.strictEqual(statsData.success, true);
  assert.ok(statsData.data.users.total >= 2);
  assert.ok(statsData.data.content.totalPosts >= 0);
  console.log(`   ✅ Stats fetched: ${statsData.data.users.total} users, ${statsData.data.content.totalPosts} posts`);

  // 4. Test User Accounts List
  console.log("\n4. Testing /admin/users...");
  const usersRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${validAdminToken}` }
  });
  const usersData = await usersRes.json();
  assert.strictEqual(usersData.success, true);
  const targetInList = usersData.data.users.find((u) => u.email === normalUserEmail);
  assert.ok(targetInList, "Normal user must be in user list");
  console.log(`   ✅ User list verified with mask: @${targetInList.anonymousProfile?.anonymousUsername}`);

  // 5. Test Suspending User Account
  console.log("\n5. Testing user account suspension...");
  const suspendRes = await fetch(`${BASE_URL}/admin/users/${targetInList._id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({ status: "suspended", reason: "Repeated safety violation test" })
  });
  const suspendData = await suspendRes.json();
  assert.strictEqual(suspendData.success, true);
  assert.strictEqual(suspendData.data.status, "suspended");
  console.log("   ✅ User suspended successfully");

  // Verify suspended user is blocked from making actions
  console.log("   Verifying suspended user blocked from posting...");
  const blockedRes = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${normalUserToken}` },
    body: JSON.stringify({ postType: "text", content: "This should fail because I'm suspended." })
  });
  assert.strictEqual(blockedRes.status, 403, "Suspended user must be blocked with 403 Forbidden");
  console.log("   ✅ Suspended user correctly rejected with 403 Forbidden");

  // 6. Test Reactivating Account
  console.log("\n6. Testing account reactivation...");
  const reactivateRes = await fetch(`${BASE_URL}/admin/users/${targetInList._id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({ status: "active" })
  });
  const reactivateData = await reactivateRes.json();
  assert.strictEqual(reactivateData.data.status, "active");
  console.log("   ✅ Account reactivated successfully");

  // 7. Test Admin Audit Logs
  console.log("\n7. Testing /admin/audit-logs...");
  const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${validAdminToken}` }
  });
  const auditData = await auditRes.json();
  assert.strictEqual(auditData.success, true);
  assert.ok(auditData.data.logs.length >= 2, "Audit logs must record suspension and reactivation");
  console.log(`   ✅ Audit trail verified (${auditData.data.logs.length} logged actions)`);

  console.log("\n👑 ALL ADMIN MODULE & DASHBOARD TESTS PASSED WITH 100% SUCCESS!");
  await mongoose.disconnect();
};

runAdminTests().catch((err) => {
  console.error("❌ Admin test failed:", err);
  process.exit(1);
});
