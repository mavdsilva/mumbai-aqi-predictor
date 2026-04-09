import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Wind, AlertCircle, CheckCircle, Activity, ClipboardList, RefreshCw, Download, MapPin, ShieldCheck, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import xlsx from "json-as-xlsx";

const MUMBAI_STATIONS = [
  { name: "Central Mumbai (Kurla)", lat: 19.0726, lon: 72.8845 },
  { name: "South Mumbai (Colaba)", lat: 18.9067, lon: 72.8147 },
  { name: "Western Suburbs (Bandra)", lat: 19.0550, lon: 72.8400 },
  { name: "Andheri East", lat: 19.1136, lon: 72.8697 },
  { name: "Borivali", lat: 19.2307, lon: 72.8567 },
  { name: "Worli", lat: 19.0161, lon: 72.8168 },
  { name: "Sion", lat: 19.0390, lon: 72.8619 },
  { name: "Mazgaon", lat: 18.9633, lon: 72.8412 },
  { name: "Vile Parle", lat: 19.0968, lon: 72.8485 }
];

function App() {
  const [data, setData] = useState(null);
  const [processingInfo, setProcessingInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState(MUMBAI_STATIONS[0]); 
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchAllData = async (station = selectedStation) => {
    setIsRefreshing(true);
    try {
      const liveRes = await axios.get(
        `http://localhost:5000/api/air?lat=${station.lat}&lon=${station.lon}&areaName=${station.name}`
      );
      
      if (liveRes.data.status === "ok") {
        setData(liveRes.data.data);
        setProcessingInfo(liveRes.data.processingInfo);
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      }

      const historyRes = await axios.get('http://localhost:5000/api/history');
      setHistory(historyRes.data);
    } catch (err) {
      console.error("Pipeline Error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Google Research Skill: Calculating Trends from Raw Data
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

  useEffect(() => { fetchAllData(MUMBAI_STATIONS[0]); }, []);

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
          
          <div className="flex gap-3 mt-4 md:mt-0">
            <select 
              className="bg-slate-800 border-none rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500"
              value={selectedStation.name}
              onChange={(e) => {
                const s = MUMBAI_STATIONS.find(x => x.name === e.target.value);
                setSelectedStation(s);
                fetchAllData(s);
              }}
            >
              {MUMBAI_STATIONS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <button onClick={() => fetchAllData()} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all">
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={downloadExcel} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              <Download size={14} /> EXPORT CSV
            </button>
          </div>
        </header>

        {/* AI INSIGHT CARD */}
        {data.healthTip && (
          <div className="mb-6 relative group overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900/80 to-purple-900/20 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:border-purple-500/50 transition-all duration-500">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 flex items-start gap-4">
              <div className="mt-1 p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shadow-inner group-hover:bg-purple-500/30 transition-colors">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                  AI Insight 
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                </h3>
                <p className="text-lg md:text-xl text-slate-100 font-medium leading-relaxed drop-shadow-md">
                  {data.healthTip}
                </p>
              </div>
            </div>
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
                <p className="text-[10px] text-slate-500">Processing: <span className="text-slate-300 font-mono">{processingInfo?.method || 'N/A'}</span></p>
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

export default App;