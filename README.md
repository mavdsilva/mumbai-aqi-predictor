# 🌆 Mumbai Air Pulse 
### Powered by Google Gemini & OpenWeather APIs

<div align="center">
  <img src="https://img.shields.io/badge/Google%20Solution%20Challenge-2026-blue?style=for-the-badge&logo=google" alt="Google Solution Challenge" />
  <img src="https://img.shields.io/badge/Gemini%202.5%20Flash-AI%20Engine-purple?style=for-the-badge&logo=googlebard" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/SDG%203-Good%20Health-green?style=for-the-badge" alt="SDG 3" />
  <img src="https://img.shields.io/badge/SDG%2011-Sustainable%20Cities-orange?style=for-the-badge" alt="SDG 11" />
</div>

<br/>

**Mumbai Air Pulse** is an intelligent, real-time air quality monitoring dashboard built to protect vulnerable individuals from the severe health impacts of urban air pollution. 

Designed specifically for the **Google Solution Challenge: #BuildWithAI Hackathon**, the platform goes beyond simple metric display by leveraging **Google Gemini 2.5 Flash** to provide personalized, persona-driven health advice and predictive forecasting.

### 🌟 Key Hackathon Ready Features
- **Persona-Based AI Insights**: Custom medical and health recommendations for Athletes, the Elderly, Asthma Patients, and the General Public.
- **Smart Caching Layer**: Sophisticated MongoDB-based caching prevents API quota exhaustion and ensures 0ms latency for repeated requests.
- **Resilience Safe Mode**: Automatic fallback system to ensure the UI remains functional if the AI API is under high load or offline.
- **Sustainability Ecosystem**: An integrated "Carbon Wallet" and Tree Plantation system that turns atmospheric data into real-world environmental action.

---

## 🌍 The Problem

Air pollution is a silent global crisis. In densely populated megacities like Mumbai, PM2.5 and PM10 levels fluctuate wildly based on traffic, coastal winds, and industrial activity. While citizens can view a raw "AQI number", they often lack the contextual understanding of what that number means *for them*. An AQI of 120 means something very different for a healthy 20-year-old athlete than it does for a 65-year-old with chronic asthma. 

This project directly addresses two **United Nations Sustainable Development Goals**:
- **Goal 3 (Good Health and Well-being):** Providing clear, personalized medical precautions to mitigate respiratory illnesses.
- **Goal 11 (Sustainable Cities and Communities):** Utilizing IoT data and AI to foster awareness of structural urban pollution challenges.

### 🧠 Advanced AI Architecture
Mumbai Air Pulse bridges the gap between raw environmental data and actionable health intelligence using **Google Gemini 2.5 Flash**. 

When a user selects a locality and their personal health profile ("Persona"):
1. The backend fetches raw pollutant concentrations (PM2.5, PM10, CO, NO2, Ozone) from OpenWeather.
2. **Smart Cache Lookup**: The system checks if a fresh analysis (last 60 mins) exists for that specific persona and location.
3. **Gemini AI Core**: If no cache is found, Gemini is dynamically prompted to return structured JSON containing:
   - A hyper-personalized **Health Tip** for the specific persona.
   - An **Analysis** of primary pollution drivers.
   - A **12-Hour Forecast Pulse** simulating diurnal patterns in Mumbai.
   - A specific **Recommendation** for the best time to go outside.

### 🍃 Sustainability & Impact
To meet **SDG 13 (Climate Action)**, we've integrated a "Carbon Wallet":
- Users log sustainable actions (Cycling, EV rides, Gardening) to earn **Carbon Points (CP)**.
- **Tree Plantation**: Users can spend CP or donate money to virtually plant trees in verified green zones (Aarey Colony, Sanjay Gandhi National Park, etc.).
- **Impact Tracking**: All actions are logged in a global ledger to demonstrate community-wide environmental change.

---

## 🛠️ System Architecture

* **Frontend:** React (Vite) + TailwindCSS for a premium, glassmorphism UI. Recharts for time-series visualization.
* **Backend:** Node.js + Express.js API framework.
* **Database:** MongoDB for persistent telemetry logging, enabling trend analysis.
* **AI Engine:** `@google/generative-ai` (Gemini 2.5 Flash) - Optional for enhanced insights.
* **Environment Engine:** OpenWeather API.

---

## 💻 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Local or Cloud MongoDB instance
- OpenWeather API Key

### Optional
- Gemini API Key ([Get it from Google AI Studio](https://aistudio.google.com/)) - For AI-powered health insights and predictions. The app works without it using basic static responses.

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mumbai-aqi.git
   cd mumbai-aqi
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/mumbai_aqi
   OPENWEATHER_API_KEY=your_openweather_key
   GEMINI_API_KEY=your_gemini_key  # Optional - app works without it
   ```

3. **Start the Backend Server**
   ```bash
   cd server
   npm install
   node index.js
   ```

4. **Start the React Frontend**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

5. **Open** `http://localhost:5173` in your browser.

---

## 🧠 Future Roadmap 

- [ ] **Multi-modal Computer Vision:** Allowing users to upload pictures of the skyline for Gemini Vision to correlate physical smog visibility with AQI data.
- [ ] **SMS Alerts:** Integrated push notifications via Twilio for emergency pollution spikes.
- [ ] **PWA Support:** Make the application installable on mobile devices for ease of access.


