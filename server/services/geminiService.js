const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const generateAIInsights = async (wardName, aqiValue, persona, components, historyData) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing from environment variables.");
      return {
        healthTip: "Monitor local AQI levels and take necessary health precautions.",
        analysis: "API Key missing. Unable to perform detailed pollutant analysis.",
        prediction: "No data available."
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // We will ask the model to return JSON directly.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            healthTip: {
              type: SchemaType.STRING,
              description: "A short, 1-sentence actionable health tip tailored to the provided persona and AQI."
            },
            analysis: {
              type: SchemaType.STRING,
              description: "A 1-sentence analysis of the primary pollution source based on the chemical components (e.g., traffic vs dust)."
            },
            prediction: {
              type: SchemaType.STRING,
              description: "A very short prediction of whether AQI will worsen or improve based on the historical trend."
            }
          },
          required: ["healthTip", "analysis", "prediction"]
        }
      }
    });

    const currComponents = JSON.stringify(components || {});
    // Just pass the last 5 aqi values to give the model a trend line without overwhelming it
    const trend = historyData ? historyData.slice(-5).map(h => h.aqi).join(', ') : "No history";
    
    const prompt = `
      You are an expert environmental health AI analyzing data for ${wardName}, Mumbai.
      - Current AQI: ${aqiValue}
      - Target Persona: ${persona || 'General Public'}
      - Chemical Components (μg/m3): ${currComponents}
      - Recent Historical AQI Trend (oldest to newest): [${trend}]
      
      Provide insights tailored specifically for the Target Persona.
    `;
    
    const result = await model.generateContent(prompt);
    const textData = result.response.text();
    return JSON.parse(textData);
  } catch (error) {
    console.error("Error generating Gemini insight:", error);
    return {
      healthTip: "Monitor local AQI levels and take necessary health precautions.",
      analysis: "Unable to reach AI services.",
      prediction: "Trend unavailable."
    };
  }
};

module.exports = {
  generateAIInsights
};
