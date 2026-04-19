import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Wind, AlertCircle, CheckCircle, Activity, ClipboardList, RefreshCw, Download, MapPin, ShieldCheck, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import xlsx from "json-as-xlsx";

// Leaflet default icon fix for Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

const MUMBAI_STATIONS = [
  { name: 'South Mumbai (Colaba)', lat: 18.9067, lon: 72.8147 },
  { name: 'Central Mumbai (Kurla)', lat: 19.0726, lon: 72.8845 },
  { name: 'Western Suburbs (Bandra)', lat: 19.0550, lon: 72.8400 },
  { name: 'Andheri East', lat: 19.1136, lon: 72.8697 },
  { name: 'Borivali', lat: 19.2307, lon: 72.8567 },
  { name: 'Worli', lat: 19.0161, lon: 72.8168 },
  { name: 'Sion', lat: 19.0390, lon: 72.8619 },
  { name: 'Vile Parle', lat: 19.0968, lon: 72.8485 },
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

const PERSONAS = ["General Public", "Asthma Patient", "Outdoor Athlete", "Elderly"];

const getAqiColor = (aqi) => {
  if (aqi <= 50) return '#8b5cf6';
  if (aqi <= 100) return '#facc15';
  if (aqi <= 200) return '#fb923c';
  return '#ef4444';
};

const getAqiLabel = (aqi) => {
  if (aqi <= 50) return 'Low';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 200) return 'High';
  return 'Severe';
};

function Dashboard() {
  const [data, setData] = useState(null);
  const [processingInfo, setProcessingInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState(MUMBAI_STATIONS[0]);
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [nextRefresh, setNextRefresh] = useState(30);
  const [bulkAqi, setBulkAqi] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAllData = async (station = selectedStation, persona = selectedPersona) => {
    setIsRefreshing(true);
    try {
      const liveRes = await axios.get(
        `${API_BASE_URL}/api/air?lat=${station.lat}&lon=${station.lon}&areaName=${station.name}&persona=${encodeURIComponent(persona)}`
      );
      
      if (liveRes.data.status === "ok") {
        setData(liveRes.data.data);
        setProcessingInfo(liveRes.data.processingInfo);
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
        setNextRefresh(30);
      }

      const historyRes = await axios.get(`${API_BASE_URL}/api/history`);
      setHistory(historyRes.data);
    } catch (err) {
      console.error("Pipeline Error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchBulkAqi = async () => {
    setMapLoading(true);
    try {
      const listRes = await axios.get(`${API_BASE_URL}/api/air/bulk`);
      if (listRes.data.status === 'ok') {
        setBulkAqi(listRes.data.locations);
      }
    } catch (err) {
      console.error('Bulk AQI fetch error:', err);
    } finally {
      setMapLoading(false);
    }
  };

  const calculateTrend = () => {
    if (history.length < 2) return { label: "Stable", icon: <Activity size={16}/> };
    const diff = history[0].aqi - history[1].aqi;
    if (diff > 2) return { label: "Degrading", color: "text-red-400", icon: <TrendingUp size={16}/> };
    if (diff < -2) return { label: "Improving", color: "text-emerald-400", icon: <TrendingDown size={16}/> };
    return { label: "Stable", color: "text-blue-400", icon: <Activity size={16}/> };
  };

  const downloadExcel = () => {
    const settings = { fileName: `Mumbai_Research_Data_${new Date().toISOString().split('T')[0]}`, extraLength: 3, writeMode: "writeFile" };
    const dataForExcel = [{
      sheet: "Telemetry Logs",
      columns: [
        { label: "Timestamp", value: (row) => new Date(row.timestamp).toLocaleString() },
        { label: "Locality", value: "city" },
        { label: "AQI (Weighted)", value: "aqi" },
        { label: "Reliability Score", value: "reliabilityScore" },
        { label: "Algorithm", value: "processingMethod" }
      ],
      content: history, 
    }];
    xlsx(dataForExcel, settings);
  };

  useEffect(() => {
    fetchAllData(MUMBAI_STATIONS[0], PERSONAS[0]);
    fetchBulkAqi();
  }, []);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      fetchAllData(selectedStation, selectedPersona);
      fetchBulkAqi();
    }, 30000);
    return () => clearInterval(refreshTimer);
  }, [selectedStation, selectedPersona]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setNextRefresh((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(countdown);
  }, [selectedStation, selectedPersona]);

  const computeAccuracyLabel = () => {
    const accuracyValue = data?.accuracy ?? processingInfo?.accuracy ?? (history[0]?.reliabilityScore || 0.98) * 100;
    return `${Math.round(accuracyValue)}%`;
  };

  const accuracyLabel = computeAccuracyLabel();

  if (!data) return <div className="h-screen flex items-center justify-center bg-slate-950 text-blue-500 font-mono italic animate-pulse">Initializing Research Pipeline...</div>;

  const trend = calculateTrend();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-slate-900/30 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-10%] w-[30%] h-[200%] bg-blue-500/10 blur-3xl rounded-full transform rotate-45 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">Mumbai Air Pulse</h1>
            <p className="text-[10px] text-indigo-200/50 font-mono mt-1.5 tracking-[0.2em]">SMART ANALYTICS ENGINE V2.0.0</p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0 items-center">
            <select 
              className="bg-slate-800 border-none rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500"
              value={selectedStation.name}
              onChange={(e) => {
                const s = MUMBAI_STATIONS.find(x => x.name === e.target.value);
                setSelectedStation(s);
                fetchAllData(s, selectedPersona);
              }}
            >
              {MUMBAI_STATIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>

            <select 
              className="bg-slate-800 border-none rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 text-purple-300"
              value={selectedPersona}
              onChange={(e) => {
                const p = e.target.value;
                setSelectedPersona(p);
                fetchAllData(selectedStation, p);
              }}
            >
              {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <button onClick={() => { fetchAllData(selectedStation, selectedPersona); fetchBulkAqi(); }} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all">
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={downloadExcel} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              <Download size={14} /> EXPORT CSV
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400">
            <span>Auto-refresh every 30s · next update in {nextRefresh}s</span>
            <span>Last synced: <span className="text-slate-200 font-semibold">{lastUpdated || 'Pending'}</span></span>
          </div>
        </header>

        {/* SPATIAL AQI MAP HERO */}
        <section className="mb-8 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">MMR Spatial AQI Map</p>
                <h2 className="text-2xl font-black text-slate-100 mt-2">Real-Time Regional Air Quality</h2>
                <p className="text-sm text-slate-400 mt-1">Explore AQI for towns, villages, and cities across the Mumbai Metropolitan Region.</p>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                {mapLoading ? 'Refreshing map...' : `${bulkAqi.length} region points`}
              </div>
            </div>

            <div className="h-[480px]">
              <MapContainer center={[19.0760, 72.8777]} zoom={10} className="h-full w-full">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {bulkAqi.map((location) => (
                  <CircleMarker
                    key={location.name}
                    center={[location.lat, location.lon]}
                    radius={Math.min(18, Math.max(8, location.aqi / 20))}
                    pathOptions={{
                      color: getAqiColor(location.aqi),
                      fillColor: getAqiColor(location.aqi),
                      fillOpacity: 0.8,
                      weight: 1
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900">
                        <strong>{location.name}</strong>
                        <div className="text-[12px] mt-1">AQI: <span className="font-bold">{location.aqi}</span></div>
                        <div className="text-[11px] text-slate-700 mt-1">Status: {getAqiLabel(location.aqi)}</div>
                        <div className="text-[11px] mt-2">{location.alert}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Vulnerable Area Alerts</h3>
              {bulkAqi.filter((item) => item.aqi > 100).slice(0, 5).length === 0 ? (
                <p className="text-sm text-slate-400">No vulnerable zones detected right now. Air quality is moderate or better across the map.</p>
              ) : (
                <div className="space-y-4">
                  {bulkAqi.filter((item) => item.aqi > 100).slice(0, 5).map((item) => (
                    <div key={item.name} className="p-4 rounded-3xl border border-white/10 bg-slate-950/70">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-100">{item.name}</p>
                          <p className="text-[11px] text-slate-500">{getAqiLabel(item.aqi)} zone</p>
                        </div>
                        <span className="text-sm font-black" style={{ color: getAqiColor(item.aqi) }}>{item.aqi}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3">{item.alert}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">AQI Legend</h3>
              <div className="space-y-3 text-[13px] text-slate-300">
                <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[#8b5cf6]"></span> Low / Violet (AQI ≤ 50)</div>
                <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[#facc15]"></span> Moderate / Yellow (AQI 51-100)</div>
                <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[#fb923c]"></span> High / Orange (AQI 101-200)</div>
                <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[#ef4444]"></span> Severe / Red (AQI 201+)</div>
              </div>
            </div>
          </aside>
        </section>

        {/* AI INSIGHT CARD */}
        {data.insights && (
          <div className="space-y-6 mb-8">
            <div className="relative group overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900/80 to-purple-900/20 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:border-purple-500/50 transition-all duration-500">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex gap-4">
                  <div className="mt-1 p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1">{selectedPersona} Health Tip</h3>
                    <p className="text-sm text-slate-100 font-medium leading-relaxed">{data.insights.healthTip}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 text-blue-400">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Pollutant Analysis</h3>
                    <p className="text-sm text-slate-100 font-medium leading-relaxed">{data.insights.analysis}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-emerald-400">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">AI Smart Recommendation</h3>
                    <p className="text-sm text-emerald-100 font-black leading-relaxed italic">{data.insights.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI FORECAST PULSE */}
            {data.insights.forecast && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                      <Wind size={16} className="animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tighter text-slate-200">12-Hour AI Forecast Pulse</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Predictive Atmospheric Simulation</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-transparent rounded-full opacity-30"></div>
                    <span className="text-[10px] text-blue-400 font-bold tracking-tighter">GEMINI REAL-TIME INFERENCE</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.insights.forecast.map((fc, i) => (
                    <div key={i} className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl hover:border-blue-500/30 transition-all hover:-translate-y-1 relative group/fc">
                      <p className="text-[10px] font-black text-slate-500 mb-2 font-mono group-hover/fc:text-blue-400 transition-colors uppercase">{fc.timeSlot}</p>
                      <div className="flex items-end gap-2 mb-1">
                        <span className={`text-3xl font-black ${fc.predictedAqi > 120 ? 'text-orange-500' : 'text-emerald-400'}`}>
                          {fc.predictedAqi}
                        </span>
                        <span className="text-[10px] text-slate-600 mb-1 font-bold">AQI</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${fc.predictedAqi > 120 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{fc.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Main Score */}
          <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 hover:border-blue-500/50 transition-all duration-300">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wind size={80}/></div>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Weighted AQI</p>
             <h2 className={`text-7xl font-black my-2 ${data.aqi > 100 ? 'text-orange-500' : 'text-emerald-500'}`}>{data.aqi}</h2>
             <div className={`flex items-center gap-2 text-xs font-bold uppercase ${data.aqi > 100 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {data.aqi > 100 ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
                {data.aqi > 100 ? 'Elevated Pollution' : 'Safe Atmosphere'}
             </div>
             <div className="mt-6 pt-4 border-t border-slate-800/50">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Live Model Accuracy</p>
               <div className="text-3xl font-black text-blue-300">{accuracyLabel}</div>
               <p className="text-[11px] text-slate-400 mt-2">Refreshed every 30 seconds with the latest node-level forecast.</p>
             </div>
          </div>

          {/* Health & Reliability Monitor */}
          <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 hover:border-blue-500/50 transition-all duration-300">
             <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Pipeline Health</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 italic flex items-center gap-2"><ShieldCheck size={14} className="text-blue-500"/> Reliability Score</span>
                    <span className="text-xs font-mono font-bold">{(history[0]?.reliabilityScore || 0.98) * 100}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 italic flex items-center gap-2"><Activity size={14} className="text-purple-500"/> Trend Factor</span>
                    <span className={`text-xs font-bold flex items-center gap-1 ${trend.color}`}>{trend.icon} {trend.label}</span>
                  </div>
                </div>
             </div>
             <div className="mt-4 pt-4 border-t border-slate-800/50">
                <p className="text-[10px] text-slate-500">Processing: <span className="text-slate-300 font-mono">{processingInfo?.method || 'Standard CPCB'}</span></p>
             </div>
          </div>

          {/* Temporal Analysis Graph */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl hover:border-blue-500/50 transition-all duration-300 group">
            <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center justify-between">Time-Series Variance Analysis <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div></h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...history].reverse()}>
                  <defs>
                    <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px'}} />
                  <Area type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAqi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* MONGODB LOGS */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 overflow-hidden relative group hover:border-slate-700 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6">
            <ClipboardList className="text-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Research Dataset Audit Trail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-800">
                  <th className="pb-4">Epoch Time</th>
                  <th className="pb-4">Target Node</th>
                  <th className="pb-4">Heuristic AQI</th>
                  <th className="pb-4">Reliability</th>
                  <th className="pb-4">Accuracy</th>
                  <th className="pb-4 text-right">Processing Logic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.map((record, i) => (
                  <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 font-mono text-[10px] text-slate-500">{new Date(record.timestamp).toLocaleString()}</td>
                    <td className="py-4 text-xs font-bold text-blue-400">{record.city}</td>
                    <td className={`py-4 text-xs font-black ${record.aqi > 100 ? 'text-orange-500' : 'text-emerald-500'}`}>{record.aqi}</td>
                    <td className="py-4 text-[10px] font-mono">{(record.reliabilityScore || 0.98).toFixed(2)}</td>
                    <td className="py-4 text-[10px] font-mono">{record.accuracy ? `${record.accuracy}%` : 'N/A'}</td>
                    <td className="py-4 text-[10px] text-slate-500 italic text-right">{record.processingMethod || 'Standard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;