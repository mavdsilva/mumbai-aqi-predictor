const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose'); 
require('dotenv').config();
const { generateAIInsights } = require('./services/geminiService');
const User = require('./models/User');
const Tree = require('./models/Tree');

const app = express();
app.use(cors());
app.use(express.json()); // Add JSON parsing middleware
const PORT = process.env.PORT || 5000;

// 1. MongoDB Connection (Using Environment Variable for Deployment)
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mumbai_aqi";
mongoose.connect(mongoURI)
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
    const { lat, lon, areaName, persona } = req.query;
    const apiUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`;
    
    const response = await axios.get(apiUrl);

    if (response.data?.list?.[0]) {
      const components = response.data.list[0].components; 
      const pm25 = components.pm2_5; 

      const baseAqi = calculateIndianAQI(pm25);
      const processedAqi = applyAdvancedHeuristics(baseAqi, areaName);

      // Fetch history for AI trend prediction (increased to 10 for better forecasting)
      const history = await AqiRecord.find({ city: areaName }).sort({ timestamp: -1 }).limit(10);
      const recentHistory = history.reverse(); // oldest to newest

      // Generate AI-powered insights
      const aiInsights = await generateAIInsights(areaName, processedAqi, persona, components, recentHistory);

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
          insights: aiInsights
        }
      });
    }
  } catch (error) {
    console.error(error);
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

// 5. Tree Plantation Routes
app.get('/api/trees', async (req, res) => {
  try {
    const trees = await Tree.find();
    res.json(trees);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trees" });
  }
});

// Clear all trees (admin cleanup)
app.delete('/api/trees', async (req, res) => {
  try {
    await Tree.deleteMany({});
    res.json({ status: "ok", message: "All trees cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear trees" });
  }
});

// 6. User and Carbon Points Routes
// Get current user (demo user)
app.get('/api/user', async (req, res) => {
  try {
    let user = await User.findOne({ userId: 'demo-user' });
    if (!user) {
      user = new User({ userId: 'demo-user', carbonPoints: 0 });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// Log an action to earn points
app.post('/api/actions/log', async (req, res) => {
  try {
    const { action, points } = req.body;
    let user = await User.findOne({ userId: 'demo-user' });
    if (!user) {
      user = new User({ userId: 'demo-user', carbonPoints: 0 });
    }
    user.carbonPoints += points;
    user.actionHistory.push({ action, points });
    await user.save();
    res.json({ status: "ok", user });
  } catch (err) {
    res.status(500).json({ error: "Failed to log action" });
  }
});

// Donate to plant a tree
app.post('/api/donate', async (req, res) => {
  try {
    const { latitude, longitude, sponsorType, sponsorName, message } = req.body;

    // If points, deduct them
    if (sponsorType === 'points') {
      const pointsCost = req.body.pointsAmount || 100;
      let user = await User.findOne({ userId: 'demo-user' });
      if (!user || user.carbonPoints < pointsCost) {
        return res.status(400).json({ error: `Insufficient Carbon Points. (Requires ${pointsCost}, you have ${user ? user.carbonPoints : 0})` });
      }
      user.carbonPoints -= pointsCost;
      user.actionHistory.push({ action: `Donated ${pointsCost} CP to Plant a Tree`, points: -pointsCost });
      await user.save();
    }

    const newTree = new Tree({ latitude, longitude, sponsorType, sponsorName, message });
    await newTree.save();

    res.json({ status: "ok", tree: newTree });
  } catch (err) {
    res.status(500).json({ error: "Donation failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Final Stable Engine online at ${PORT}`));