const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose'); 
require('dotenv').config();
const { generateHealthTip } = require('./services/geminiService');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// 1. MongoDB Connection (Using 127.0.0.1 for better reliability)
mongoose.connect("mongodb://127.0.0.1:27017/mumbai_aqi")
  .then(() => console.log("🍃 MongoDB Connected: Analytics Engine Active"))
  .catch(err => console.error("❌ Connection error:", err));

// 2. Schema
const AqiSchema = new mongoose.Schema({
  city: String,
  aqi: Number,
  station: String,
  reliabilityScore: Number,
  processingMethod: String,
  timestamp: { type: Date, default: Date.now }
});
const AqiRecord = mongoose.model('AqiRecord', AqiSchema);

/**
 * INDIAN CPCB CALCULATION
 * Rounds the PM2.5 value first to stop tiny decimal changes from jumping.
 */
const calculateIndianAQI = (pm25) => {
  const val = Math.round(pm25); // STABILITY FIX: Prevents decimal-based jitter
  if (val <= 30) return Math.round((val / 30) * 50);
  if (val <= 60) return Math.round(50 + ((val - 30) / 30) * 50);
  if (val <= 90) return Math.round(100 + ((val - 60) / 30) * 100);
  if (val <= 120) return Math.round(200 + ((val - 90) / 30) * 100);
  return Math.round(300 + ((val - 120) / 30) * 100);
};

/**
 * DETERMINISTIC HEURISTIC PROCESSOR
 * Removed all Math.random() so values only change if the hour or API data changes.
 */
const applyAdvancedHeuristics = (baseAqi, areaName) => {
  const hour = new Date().getHours();
  let weight = 1.0;

  // Stable Peak Hour Weight (3% variance)
  if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) {
    weight = 1.03; 
  }

  // Ward-Specific Offsets
  const industrialZones = ["Kurla", "Sion", "Andheri"];
  const coastalZones = ["Worli", "Colaba"];
  
  let spatialAdjustment = 0;
  if (industrialZones.some(zone => areaName.includes(zone))) spatialAdjustment = 5; 
  if (coastalZones.some(zone => areaName.includes(zone))) spatialAdjustment = -2;

  return Math.round((baseAqi * weight) + spatialAdjustment);
};

// 3. API Route for Current Air Data
app.get('/api/air', async (req, res) => {
  try {
    const { lat, lon, areaName } = req.query;
    const apiUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`;
    
    const response = await axios.get(apiUrl);

    if (response.data?.list?.[0]) {
      const pm25 = response.data.list[0].components.pm2_5; 

      const baseAqi = calculateIndianAQI(pm25);
      const processedAqi = applyAdvancedHeuristics(baseAqi, areaName);

      // Generate AI-powered health tip
      const healthTip = await generateHealthTip(areaName, processedAqi);

      const newEntry = new AqiRecord({
        city: areaName, 
        aqi: processedAqi,
        station: `NODE-${areaName.toUpperCase()}`,
        reliabilityScore: 0.99,
        processingMethod: "Deterministic-CPCB-V6"
      });
      await newEntry.save();
      
      res.json({
        status: "ok",
        data: { 
          aqi: processedAqi, 
          city: { name: `${areaName}, Mumbai` }, 
          dominentpol: "pm2_5",
          healthTip
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal processing failure" });
  }
});

// 4. API Route for History (This brings back your graph)
app.get('/api/history', async (req, res) => {
  try {
    const history = await AqiRecord.find().sort({ timestamp: 1 }).limit(30);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "History retrieval failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Final Stable Engine online at ${PORT}`));