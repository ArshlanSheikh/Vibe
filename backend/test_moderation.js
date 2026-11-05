import assert from "assert";

const BASE_URL = "http://localhost:5000/api/v1";

const runModerationTests = async () => {
  console.log("🧪 Starting AI Content Moderation Pipeline Tests...\n");

  // Case 1: Safe Controversial Opinion
  console.log("1. Testing safe controversial opinion...");
  const res1 = await fetch(`${BASE_URL}/moderation/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "I genuinely think working 9 to 5 is modern serfdom and most meetings could be an email.",
      contentType: "post"
    })
  });
  const data1 = await res1.json();
  assert.strictEqual(data1.success, true);
  assert.strictEqual(data1.data.approved, true, "Safe opinion must be APPROVED");
  assert.strictEqual(data1.data.decision, "approved");
  console.log("   ✅ Safe controversial opinion correctly APPROVED");

  // Case 2: PII Exposure (Phone Number Doxxing)
  console.log("\n2. Testing PII Phone Number Detection...");
  const res2 = await fetch(`${BASE_URL}/moderation/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Here is their real number +1 (555) 839-2041, go bother them",
      contentType: "post"
    })
  });
  const data2 = await res2.json();
  assert.strictEqual(data2.data.approved, false, "Phone number must be REJECTED");
  assert.strictEqual(data2.data.decision, "rejected");
  assert.strictEqual(data2.data.categories[0], "pii_exposure");
  console.log(`   ✅ PII exposure correctly REJECTED: ${data2.data.reason}`);

  // Case 3: PII Exposure (Email Address)
  console.log("\n3. Testing PII Email Address Detection...");
  const res3 = await fetch(`${BASE_URL}/moderation/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "You can reach me directly at confidential.leaks@corp.org for secrets",
      contentType: "comment"
    })
  });
  const data3 = await res3.json();
  assert.strictEqual(data3.data.approved, false, "Email must be REJECTED");
  assert.strictEqual(data3.data.decision, "rejected");
  assert.strictEqual(data3.data.categories[0], "pii_exposure");
  console.log(`   ✅ PII email correctly REJECTED: ${data3.data.reason}`);

  // Case 4: Violent Threat
  console.log("\n4. Testing Violent Threat Detection...");
  const res4 = await fetch(`${BASE_URL}/moderation/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "I am going to shoot all of you tomorrow at the office",
      contentType: "post"
    })
  });
  const data4 = await res4.json();
  assert.strictEqual(data4.data.approved, false, "Threat must be REJECTED");
  assert.strictEqual(data4.data.decision, "rejected");
  assert.strictEqual(data4.data.categories[0], "violence_and_harm");
  console.log(`   ✅ Violent threat correctly REJECTED: ${data4.data.reason}`);

  // Case 5: Crypto Phishing / Spam
  console.log("\n5. Testing Crypto Scam & Spam Detection...");
  const res5 = await fetch(`${BASE_URL}/moderation/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Free crypto giveaways! DM for crypto 100x gains guaranteed now!",
      contentType: "post"
    })
  });
  const data5 = await res5.json();
  assert.strictEqual(data5.data.approved, false, "Spam must be REJECTED");
  assert.strictEqual(data5.data.decision, "rejected");
  console.log(`   ✅ Spam correctly REJECTED: ${data5.data.reason}`);

  console.log("\n🎯 All AI Content Moderation tests passed with 100% accuracy!");
};

runModerationTests().catch((err) => {
  console.error("❌ Moderation test failed:", err);
  process.exit(1);
});
