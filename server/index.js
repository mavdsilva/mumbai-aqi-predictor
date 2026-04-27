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

const isValidCoordinate = (value) => typeof value === 'number' && Number.isFinite(value);
const sendError = (res, status, message) => res.status(status).json({ error: message });

// 1. MongoDB Connection (Using Environment Variable for Deployment)
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log("🍃 MongoDB Connected: Analytics Engine Active"))
  .catch(err => console.error("❌ Connection error:", err))

// 2. Schema
const AqiSchema = new mongoose.Schema({
  city: String,
  aqi: Number,
  station: String,
  reliabilityScore: Number,
  accuracy: Number,
  processingMethod: String,
  timestamp: { type: Date, default: Date.now }
});
const AqiRecord = mongoose.model('AqiRecord', AqiSchema);

const MMR_LOCATIONS = [
  { name: 'South Mumbai (Colaba)', lat: 18.9067, lon: 72.8147 },
  { name: 'Central Mumbai (Kurla)', lat: 19.0726, lon: 72.8845 },
  { name: 'Western Suburbs (Bandra)', lat: 19.0550, lon: 72.8400 },
  { name: 'Andheri East', lat: 19.1136, lon: 72.8697 },
  { name: 'Borivali', lat: 19.2307, lon: 72.8567 },
  { name: 'Worli', lat: 19.0161, lon: 72.8168 },
  { name: 'Sion', lat: 19.0390, lon: 72.8619 },
  { name: 'Vashi', lat: 19.0772, lon: 72.9987 },
  { name: 'Thane', lat: 19.2183, lon: 72.9781 },
  { name: 'Kalyan', lat: 19.2403, lon: 73.1300 },
  { name: 'Dombivli', lat: 19.2184, lon: 73.0898 },
  { name: 'Panvel', lat: 18.9984, lon: 73.1187 },
  { name: 'Vasai', lat: 19.3919, lon: 72.8397 },
  { name: 'Mira-Bhayandar', lat: 19.3070, lon: 72.8540 },
  { name: 'Bhiwandi', lat: 19.3005, lon: 73.0570 },
  { name: 'Uran', lat: 18.9249, lon: 72.9516 },
  { name: 'Alibag', lat: 18.6417, lon: 72.8797 },
  { name: 'Navi Mumbai (Nerul)', lat: 19.0330, lon: 73.0185 },
  { name: 'Mumbra', lat: 19.1538, lon: 73.0314 },
  { name: 'Thane Creek (Koparkhairane)', lat: 19.1128, lon: 72.9978 }
];

const aqiCategory = (aqi) => {
  if (aqi <= 50) return { label: 'Low', color: '#8b5cf6', level: 'Good' };
  if (aqi <= 100) return { label: 'Moderate', color: '#facc15', level: 'Moderate' };
  if (aqi <= 200) return { label: 'High', color: '#fb923c', level: 'Unhealthy' };
  return { label: 'Severe', color: '#ef4444', level: 'Very Poor' };
};

const getHealthAlert = (aqi) => {
  if (aqi <= 50) return 'Air quality is good. Vulnerable groups are safe outdoors.';
  if (aqi <= 100) return 'Moderate air quality. Sensitive groups should reduce prolonged outdoor activity.';
  if (aqi <= 200) return 'High pollution alert. Elderly, children, and asthma patients should avoid outdoor exertion.';
  return 'Severe pollution alert. All vulnerable individuals should stay indoors and use masks if outside.';
};

/**
 * MODEL ACCURACY ESTIMATION
 * Uses pollutant stability and distance from moderate thresholds.
 */
const estimateModelAccuracy = (pm25) => {
  const base = 0.94;
  const stabilityBoost = Math.max(-0.05, Math.min(0.04, (60 - Math.abs(pm25 - 35)) / 400));
  return Math.round((base + stabilityBoost) * 100);
};

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
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const areaName = req.query.areaName?.trim();
    const persona = req.query.persona || 'General Public';

    if (!isValidCoordinate(lat) || !isValidCoordinate(lon) || !areaName) {
      return sendError(res, 400, 'lat, lon, and areaName are required and must be valid values.');
    }

    if (!process.env.OPENWEATHER_API_KEY) {
      return sendError(res, 500, 'OPENWEATHER_API_KEY is not configured on the server.');
    }

    const apiUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`;
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const record = response.data?.list?.[0];

    if (!record || !record.components) {
      return sendError(res, 502, 'Unexpected air quality data from the provider.');
    }

    const components = record.components;
    const pm25 = components.pm2_5;
    if (!isValidCoordinate(pm25)) {
      return sendError(res, 502, 'PM2.5 data is unavailable from the weather provider.');
    }

    const baseAqi = calculateIndianAQI(pm25);
    const processedAqi = applyAdvancedHeuristics(baseAqi, areaName);
    const accuracyPercent = estimateModelAccuracy(pm25);

    const history = await AqiRecord.find({ city: areaName }).sort({ timestamp: -1 }).limit(10);
    const recentHistory = history.reverse();

    const aiInsights = await generateAIInsights(areaName, processedAqi, persona, components, recentHistory);

    const newEntry = new AqiRecord({
      city: areaName,
      aqi: processedAqi,
      station: `NODE-${areaName.toUpperCase()}`,
      reliabilityScore: 0.99,
      accuracy: accuracyPercent,
      processingMethod: 'Deterministic-CPCB-V6'
    });
    await newEntry.save();

    res.json({
      status: 'ok',
      data: {
        aqi: processedAqi,
        city: { name: `${areaName}, Mumbai` },
        dominentpol: 'pm2_5',
        accuracy: accuracyPercent,
        insights: aiInsights
      }
    });
  } catch (error) {
    console.error('Air API error:', error);
    res.status(500).json({ error: 'Internal processing failure' });
  }
});

const fetchAqiForLocation = async (location) => {
  const apiUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${location.lat}&lon=${location.lon}&appid=${process.env.OPENWEATHER_API_KEY}`;
  const response = await axios.get(apiUrl, { timeout: 10000 });
  const record = response.data?.list?.[0];
  if (!record || !record.components) {
    throw new Error(`No data for ${location.name}`);
  }

  const pm25 = record.components.pm2_5;
  if (!isValidCoordinate(pm25)) {
    throw new Error(`PM2.5 missing for ${location.name}`);
  }

  const baseAqi = calculateIndianAQI(pm25);
  const aqi = applyAdvancedHeuristics(baseAqi, location.name);
  const category = aqiCategory(aqi);

  return {
    ...location,
    aqi,
    pm25,
    category: category.level,
    color: category.color,
    alert: getHealthAlert(aqi),
    vulnerable: aqi > 100
  };
};

app.get('/api/air/bulk', async (req, res) => {
  try {
    if (!process.env.OPENWEATHER_API_KEY) {
      return sendError(res, 500, 'OPENWEATHER_API_KEY is not configured on the server.');
    }

    const responses = await Promise.allSettled(MMR_LOCATIONS.map(fetchAqiForLocation));
    const results = responses
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b.aqi - a.aqi);

    res.json({ status: 'ok', locations: results });
  } catch (error) {
    console.error('Bulk AQI API error:', error);
    res.status(500).json({ error: 'Failed to retrieve bulk AQI data' });
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
    if (!action || typeof action !== 'string' || !Number.isInteger(points)) {
      return sendError(res, 400, 'action must be a string and points must be a whole number.');
    }

    let user = await User.findOne({ userId: 'demo-user' });
    if (!user) {
      user = new User({ userId: 'demo-user', carbonPoints: 0 });
    }

    user.carbonPoints += points;
    user.actionHistory.push({ action, points });
    await user.save();
    res.json({ status: 'ok', user });
  } catch (err) {
    console.error('Action log error:', err);
    res.status(500).json({ error: 'Failed to log action' });
  }
});

// Donate to plant a tree
app.post('/api/donate', async (req, res) => {
  try {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    const sponsorType = req.body.sponsorType;
    const sponsorName = req.body.sponsorName?.trim() || 'Anonymous';
    const message = req.body.message?.trim() || 'Planting a tree for a greener Mumbai.';

    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      return sendError(res, 400, 'latitude and longitude are required and must be valid numbers.');
    }
    if (!['points', 'money'].includes(sponsorType)) {
      return sendError(res, 400, 'sponsorType must be either points or money.');
    }

    if (sponsorType === 'points') {
      const pointsCost = Number(req.body.pointsAmount);
      if (!Number.isInteger(pointsCost) || pointsCost <= 0) {
        return sendError(res, 400, 'pointsAmount must be a positive whole number.');
      }

      let user = await User.findOne({ userId: 'demo-user' });
      if (!user || user.carbonPoints < pointsCost) {
        return sendError(res, 400, `Insufficient Carbon Points. (Requires ${pointsCost}, you have ${user ? user.carbonPoints : 0})`);
      }
      user.carbonPoints -= pointsCost;
      user.actionHistory.push({ action: `Donated ${pointsCost} CP to Plant a Tree`, points: -pointsCost });
      await user.save();
    }

    const newTree = new Tree({ latitude, longitude, sponsorType, sponsorName, message });
    await newTree.save();

    res.json({ status: 'ok', tree: newTree });
  } catch (err) {
    console.error('Donation error:', err);
    res.status(500).json({ error: 'Donation failed' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unexpected server error:', err);
  res.status(500).json({ error: 'Unexpected server error' });
});

app.listen(PORT, () => console.log(`🚀 Final Stable Engine online at ${PORT}`));