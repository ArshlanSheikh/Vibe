import assert from "assert";

const BASE_URL = "http://localhost:5000/api/v1";

const runFeatureTests = async () => {
  console.log("🧪 Starting Core Anonymous Social Networking Feature Tests...\n");

  // 1. Setup two anonymous users
  const user1Email = `author_${Date.now()}@vibe.anon`;
  const user2Email = `voter_${Date.now()}@vibe.anon`;

  console.log("1. Creating test users...");
  const u1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user1Email, password: "password123", interests: ["Tech & AI", "Hot Takes"] })
  });
  const u1Data = await u1Res.json();
  const token1 = u1Data.data.accessToken;

  const u2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user2Email, password: "password123", interests: ["Confessions"] })
  });
  const u2Data = await u2Res.json();
  const token2 = u2Data.data.accessToken;

  console.log(`   Author: @${u1Data.data.user.anonymousUsername}, Voter: @${u2Data.data.user.anonymousUsername}`);

  // 2. Post Creation (Hot Take)
  console.log("\n2. Creating a Hot Take Post (AI Moderated)...");
  const postRes = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      postType: "hot_take",
      title: "AI and Creativity",
      content: "AI tools do not destroy creativity, they expose people who had none in the first place.",
      tags: ["tech", "hottake", "opinion"]
    })
  });
  const postData = await postRes.json();
  assert.strictEqual(postData.success, true);
  assert.strictEqual(postData.data.moderationStatus, "approved");
  const hotTakeId = postData.data._id;
  console.log("   ✅ Hot take post approved & created:", hotTakeId);

  // 3. Complete The Sentence Post
  console.log("\n3. Creating Complete-the-Sentence Post...");
  const sentenceRes = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      postType: "complete_sentence",
      sentencePrefix: "The best part about being completely anonymous is",
      content: "Finish this thought with your unfiltered truth.",
      tags: ["confessions", "unfiltered"]
    })
  });
  const sentenceData = await sentenceRes.json();
  assert.strictEqual(sentenceData.success, true);
  const sentencePostId = sentenceData.data._id;
  console.log("   ✅ Complete-the-sentence post created:", sentencePostId);

  // 4. Submit Sentence Completion
  console.log("\n4. Submitting sentence answer by User 2...");
  const compRes = await fetch(`${BASE_URL}/posts/${sentencePostId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ completion: "you don't have to pretend to be happy when you're burnt out." })
  });
  const compData = await compRes.json();
  assert.strictEqual(compRes.status, 201);
  assert.strictEqual(compData.success, true);
  console.log("   ✅ Sentence completion saved:", compData.data.completion);

  // 5. Stance Voting (Agree / Disagree)
  console.log("\n5. User 2 votes 'agree' on Hot Take...");
  const stanceRes = await fetch(`${BASE_URL}/posts/${hotTakeId}/stance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ stance: "agree" })
  });
  const stanceData = await stanceRes.json();
  assert.strictEqual(stanceData.success, true);
  assert.strictEqual(stanceData.data.agreesCount, 1);
  assert.strictEqual(stanceData.data.agreePercentage, 100);
  console.log("   ✅ Stance recorded. Agreement % is now:", stanceData.data.agreePercentage);

  // 6. Interactive Polling Creation & Voting
  console.log("\n6. Creating an Interactive Poll...");
  const pollRes = await fetch(`${BASE_URL}/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      question: "Which work environment brings out your true peak productivity?",
      pollType: "opinion",
      options: [
        { text: "100% Remote from Home" },
        { text: "Hybrid (2-3 days office)" },
        { text: "Late Night Coffee Shops" }
      ],
      durationHours: 48,
      isResultsHiddenUntilVote: true
    })
  });
  const pollData = await pollRes.json();
  assert.strictEqual(pollData.success, true);
  const pollId = pollData.data._id;
  const optionIdToVote = pollData.data.options[0].optionId;
  console.log("   ✅ Interactive poll created:", pollId);

  console.log("\n7. User 2 casts vote on Poll option 1...");
  const voteRes = await fetch(`${BASE_URL}/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ optionIds: [optionIdToVote] })
  });
  const voteData = await voteRes.json();
  assert.strictEqual(voteData.success, true);
  assert.strictEqual(voteData.data.totalVotes, 1);
  assert.strictEqual(voteData.data.options[0].percentage, 100);
  console.log("   ✅ Poll vote recorded and live percentage computed: 100%");

  console.log("\n8. Testing duplicate vote prevention on poll...");
  const dupVoteRes = await fetch(`${BASE_URL}/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ optionIds: [optionIdToVote] })
  });
  assert.strictEqual(dupVoteRes.status, 409, "Must reject duplicate vote with 409 Conflict");
  console.log("   ✅ Duplicate vote prevention passed");

  // 9. Comments & Helpful Answer
  console.log("\n9. Testing Comments & Helpful Answer marking...");
  const commentRes = await fetch(`${BASE_URL}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
    body: JSON.stringify({
      postId: hotTakeId,
      content: "I totally agree! AI just removes the tedious friction, true taste is human."
    })
  });
  const commentData = await commentRes.json();
  assert.strictEqual(commentData.success, true);
  const commentId = commentData.data._id;

  // Author marks comment as helpful
  const helpfulRes = await fetch(`${BASE_URL}/comments/${commentId}/helpful`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token1}` }
  });
  const helpfulData = await helpfulRes.json();
  assert.strictEqual(helpfulData.success, true);
  assert.strictEqual(helpfulData.data.isMarkedHelpful, true);
  console.log("   ✅ Comment marked as helpful answer!");

  // 10. Feed System
  console.log("\n10. Testing Feed retrieval across categories...");
  const feedForYou = await (await fetch(`${BASE_URL}/feed?tab=for-you`)).json();
  assert.strictEqual(feedForYou.success, true);
  assert.ok(feedForYou.data.items.length >= 2);

  const feedPolls = await (await fetch(`${BASE_URL}/feed?tab=polls`)).json();
  assert.strictEqual(feedPolls.success, true);
  assert.ok(feedPolls.data.items.some((i) => i.feedType === "poll"));
  console.log(`   ✅ Feed functional: For You (${feedForYou.data.items.length} items), Polls (${feedPolls.data.items.length} polls)`);

  // 11. Search & Trending
  console.log("\n11. Testing Search & Discovery...");
  const searchRes = await (await fetch(`${BASE_URL}/search?q=creativity`)).json();
  assert.strictEqual(searchRes.success, true);
  assert.ok(searchRes.data.posts.length >= 1);

  const trendingRes = await (await fetch(`${BASE_URL}/search/trending-topics`)).json();
  assert.strictEqual(trendingRes.success, true);
  console.log("   ✅ Universal search and trending topics operational!");

  console.log("\n🎉 ALL CORE ANONYMOUS SOCIAL NETWORK BACKEND FEATURES VERIFIED SUCCESSFULLY!");
};

runFeatureTests().catch((err) => {
  console.error("❌ Feature test failed:", err);
  process.exit(1);
});
