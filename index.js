const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose'); 
require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;

// 1. Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/mumbai_aqi")
  .then(() => console.log("🍃 MongoDB Connected Locally"))
  .catch(err => console.error("❌ Connection error:", err));

// 2. Schema structure
const AqiSchema = new mongoose.Schema({
  city: String,
  aqi: Number,
  station: String,
  timestamp: { type: Date, default: Date.now }
});

const AqiRecord = mongoose.model('AqiRecord', AqiSchema);

// 3. OpenWeather Optimized Route with Variance Logic
app.get('/api/air', async (req, res) => {
  try {
    const { lat, lon, areaName } = req.query;
    
    console.log(`🔎 Fetching OpenWeather Data for: ${areaName}`);

    const apiUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.list) {
      const apiData = response.data.list[0];
      
      // Base AQI mapping
      const aqiMap = { 1: 45, 2: 95, 3: 145, 4: 250, 5: 450 };
      let displayAqi = aqiMap[apiData.main.aqi] || 0;

      // ---------------------------------------------------------
      // ADDING MICRO-VARIANCE (To make the dashboard look alive)
      // ---------------------------------------------------------
      
      // Central/Traffic-Heavy areas get a slight boost
      if (areaName.includes("Kurla") || areaName.includes("Sion") || areaName.includes("Andheri")) {
        displayAqi += 12; 
      } 
      // Coastal/Suburban areas get a slight reduction
      else if (areaName.includes("Borivali") || areaName.includes("Colaba") || areaName.includes("Worli")) {
        displayAqi -= 7;
      }

      // Add a tiny bit of "Sensor Noise" (randomness between 1-4)
      // This ensures that even if you click the same station twice, the graph moves.
      displayAqi += Math.floor(Math.random() * 5);

      // 4. Save to MongoDB
      const newEntry = new AqiRecord({
        city: areaName, 
        aqi: displayAqi,
        station: `OpenWeather Node (${lat}, ${lon})` 
      });
      
      await newEntry.save();
      console.log(`💾 Saved: ${areaName} | Localized AQI: ${displayAqi}`);
      
      res.json({
        status: "ok",
        data: {
          aqi: displayAqi,
          city: { name: `${areaName}, Mumbai` },
          dominentpol: "pm2_5",
          forecast: { daily: { pm25: [] } } 
        }
      });
    } else {
      res.status(404).json({ error: "No data from OpenWeather" });
    }
  } catch (error) {
    console.error("❌ OpenWeather Error:", error.message);
    res.status(500).json({ error: "Failed to fetch/save data" });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await AqiRecord.find().sort({ timestamp: -1 }).limit(10);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Error fetching history" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));