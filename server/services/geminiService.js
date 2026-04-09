const { GoogleGenerativeAI } = require('@google/generative-ai');

const generateHealthTip = async (wardName, aqiValue) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing from environment variables.");
      return "Monitor local AQI levels and take necessary health precautions.";
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `You are a health AI specialized in air quality. Provide a single, short, 1-sentence actionable health tip for a resident in the Mumbai ward of ${wardName}, where the current Air Quality Index (AQI) is ${aqiValue}. Keep it brief, and tailored to this specific AQI level.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating Gemini insight:", error);
    return "Monitor local AQI levels and take necessary health precautions.";
  }
};

module.exports = {
  generateHealthTip
};
