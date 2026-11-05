import assert from "assert";

const BASE_URL = "http://localhost:5000/api/v1";

const runAuthTests = async () => {
  console.log("🧪 Starting Authentication & Anonymous Profile Integration Tests...");

  const testEmail = `test_${Date.now()}@vibe.anon`;
  const testPassword = "securePassword123";

  // Test 1: Register User
  console.log("1. Testing User Registration...");
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      interests: ["Tech & AI", "Hot Takes"]
    })
  });
  const regData = await regRes.json();
  assert.strictEqual(regData.success, true, "Registration should succeed");
  assert.ok(regData.data.accessToken, "Should return accessToken");
  assert.ok(regData.data.refreshToken, "Should return refreshToken");
  assert.ok(regData.data.user.anonymousUsername, "Should have anonymousUsername");
  assert.strictEqual(regData.data.user.email, undefined, "Email must NEVER be exposed in public user profile");
  console.log(`   Registered anonymous user: @${regData.data.user.anonymousUsername}`);

  const accessToken = regData.data.accessToken;
  const refreshToken = regData.data.refreshToken;

  // Test 2: Duplicate Registration Prevention
  console.log("2. Testing Duplicate Registration Prevention...");
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const dupData = await dupRes.json();
  assert.strictEqual(dupRes.status, 409, "Should return 409 for duplicate email");
  assert.strictEqual(dupData.success, false);
  console.log("   Duplicate email correctly rejected with 409 Conflict");

  // Test 3: Login User
  console.log("3. Testing User Login...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  assert.ok(loginData.data.accessToken);
  console.log("   Login successful");

  // Test 4: Get Current User Profile (/users/me)
  console.log("4. Testing /users/me endpoint...");
  const meRes = await fetch(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meData = await meRes.json();
  assert.strictEqual(meData.success, true);
  assert.strictEqual(meData.data.anonymousUsername, regData.data.user.anonymousUsername);
  assert.strictEqual(meData.data.email, undefined, "No email in /users/me");
  console.log("   Profile fetched securely without exposing account email");

  // Test 5: Regenerate Anonymous Username
  console.log("5. Testing Anonymous Username Roll...");
  const rollRes = await fetch(`${BASE_URL}/users/regenerate-username`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const rollData = await rollRes.json();
  assert.strictEqual(rollData.success, true);
  assert.notStrictEqual(rollData.data.anonymousUsername, regData.data.user.anonymousUsername);
  console.log(`   Rolled new username: @${rollData.data.anonymousUsername}`);

  // Test 6: Update Profile (Avatar & Interests)
  console.log("6. Testing Profile Customization...");
  const updateRes = await fetch(`${BASE_URL}/users/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      avatar: "avatar_cyber_wolf",
      bio: "Just wandering through the cyber shadows.",
      interests: ["Tech & AI", "Late Night Vibe", "Philosophy"]
    })
  });
  const updateData = await updateRes.json();
  assert.strictEqual(updateData.success, true);
  assert.strictEqual(updateData.data.avatar, "avatar_cyber_wolf");
  assert.strictEqual(updateData.data.bio, "Just wandering through the cyber shadows.");
  console.log("   Profile updated successfully");

  // Test 7: Refresh Token Rotation
  console.log("7. Testing Refresh Token Rotation...");
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  const refreshData = await refreshRes.json();
  assert.strictEqual(refreshData.success, true);
  assert.ok(refreshData.data.accessToken);
  assert.ok(refreshData.data.refreshToken);
  console.log("   Tokens rotated successfully");

  // Test 8: Logout
  console.log("8. Testing Logout...");
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshData.data.refreshToken })
  });
  const logoutData = await logoutRes.json();
  assert.strictEqual(logoutData.success, true);
  console.log("   Logout successful");

  console.log("\n All 8 Authentication & Anonymous Profile tests passed with flying colors!");
};

runAuthTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
