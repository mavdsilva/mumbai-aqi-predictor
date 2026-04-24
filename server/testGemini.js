require('dotenv').config();
const { generateAIInsights } = require('./services/geminiService');

async function test() {
  console.log("Testing Gemini API...");
  try {
    const insights = await generateAIInsights("South Mumbai (Colaba)", 105, "General Public", { pm2_5: 50, pm10: 80, o3: 20 }, []);
    console.log("SUCCESS. Insights:", JSON.stringify(insights, null, 2));
  } catch (error) {
    console.error("FAIL. Error:", error);
  }
}

test();
