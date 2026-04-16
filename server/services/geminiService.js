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
            },
            forecast: {
              type: SchemaType.ARRAY,
              description: "A 12-hour forecast in 3-hour blocks.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  timeSlot: { type: SchemaType.STRING, description: "e.g., '+3h', '+6h', etc." },
                  predictedAqi: { type: SchemaType.NUMBER },
                  label: { type: SchemaType.STRING, description: "e.g., 'Rising', 'Stable', 'Peak'" }
                },
                required: ["timeSlot", "predictedAqi", "label"]
              }
            },
            recommendation: {
              type: SchemaType.STRING,
              description: "One specific recommendation on the best time for outdoor activity today based on the forecast."
            }
          },
          required: ["healthTip", "analysis", "prediction", "forecast", "recommendation"]
        }
      }
    });

    const currComponents = JSON.stringify(components || {});
    // Increase history context for better forecasting (last 10 points)
    const trend = historyData ? historyData.slice(-10).map(h => h.aqi).join(', ') : "No history";
    
    const prompt = `
      You are an expert environmental health AI for Mumbai.
      Analying data for: ${wardName}
      - Current AQI: ${aqiValue}
      - Target Persona: ${persona || 'General Public'}
      - Pollutants (μg/m3): ${currComponents}
      - Recent Trend Data: [${trend}]
      
      TASK: 
      1. Provide health and pollution analysis.
      2. Predict a 12-hour forecast in 4 blocks (3h, 6h, 9h, 12h) based on typical Mumbai diurnal patterns (coastal winds, peak traffic) and provided trend.
      3. Suggest a specific "Best time to go outside" for this persona.
    `;
    
    const result = await model.generateContent(prompt);
    let textData = result.response.text();
    // Clean up potential markdown formatting that breaks JSON.parse
    textData = textData.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
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
