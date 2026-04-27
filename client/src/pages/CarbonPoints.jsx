import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Footprints, Bike, Car, Wallet, TrendingUp, History, CheckCircle, Sparkles, RefreshCw, Dumbbell, Sprout } from 'lucide-react';

export default function CarbonPoints() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successFlash, setSuccessFlash] = useState(null); // e.g. { action: 'Walked 2km', points: 20 }
  const [pointsPop, setPointsPop] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchUser = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user`);
      setUser(res.data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogAction = async (actionDesc, points) => {
    setIsLoading(true);
    setSuccessFlash(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/actions/log`, { action: actionDesc, points });
      if (res.data.status === 'ok') {
        setUser(res.data.user);
        // Show success feedback
        setSuccessFlash({ action: actionDesc, points });
        setPointsPop(true);
        setTimeout(() => setPointsPop(false), 600);
        setTimeout(() => setSuccessFlash(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <div className="h-64 flex items-center justify-center text-blue-500 font-mono animate-pulse">Loading Wallet...</div>;

  const history = [...(user.actionHistory || [])].reverse();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* SUCCESS TOAST */}
      {successFlash && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/50 text-emerald-300 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400" />
          <div>
            <p className="font-bold text-sm">{successFlash.action}</p>
            <p className="text-xs text-emerald-400 font-mono">+{successFlash.points} Carbon Points earned!</p>
          </div>
        </div>
      )}

       {/* WALLET HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-2xl text-blue-400 mb-4 md:mb-0 inline-block group hover:rotate-6 transition-transform">
            <Wallet size={40} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-slate-100">Carbon Wallet</h1>
              <button 
                onClick={() => fetchUser(true)} 
                className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${isRefreshing ? 'text-blue-400 animate-spin' : 'text-slate-500'}`}
                title="Sync Data"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-sm text-slate-400">Track your eco-impact & earn points to plant trees.</p>
            {lastUpdated && <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest flex items-center gap-1.5"><Activity size={10} /> Last synced {lastUpdated}</p>}
          </div>
        </div>

        <div className={`relative z-10 mt-6 md:mt-0 text-center md:text-right bg-slate-950/50 p-6 rounded-2xl border border-slate-700/50 min-w-[200px] transition-all duration-300 ${pointsPop ? 'scale-110 border-blue-500/50' : 'scale-100'}`}>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Available Points</p>
          <div className="flex items-center justify-center md:justify-end gap-2">
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 to-blue-600">{user.carbonPoints}</p>
            <Sparkles size={20} className={`text-blue-400/50 ${pointsPop ? 'animate-ping' : 'opacity-0'}`} />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS TO EARN POINTS */}
      <div className="p-1 md:p-0">
        <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14}/> Log Sustainability Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          
          <button 
            onClick={() => handleLogAction('Walked 2km', 20)}
            disabled={isLoading}
            className="group bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-emerald-500/50 p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <Footprints size={24} />
            </div>
            <span className="font-bold text-sm">Walked 2km</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">+20 CP</span>
          </button>

          <button 
            onClick={() => handleLogAction('Cycled 5km', 50)}
            disabled={isLoading}
            className="group bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/50 p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <Bike size={24} />
            </div>
            <span className="font-bold text-sm">Cycled 5km</span>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">+50 CP</span>
          </button>

          <button 
            onClick={() => handleLogAction('Used EV / Shared Ride', 30)}
            disabled={isLoading}
            className="group bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-purple-500/50 p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
              <Car size={24} />
            </div>
            <span className="font-bold text-sm">Shared / EV Ride</span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">+30 CP</span>
          </button>

          <button 
            onClick={() => handleLogAction('Outdoor Athlete: High-Intensity Park Session', 45)}
            disabled={isLoading}
            className="group bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-orange-500/50 p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl group-hover:scale-110 transition-transform">
              <Dumbbell size={24} />
            </div>
            <span className="font-bold text-sm text-orange-200">Athlete Session</span>
            <span className="text-[10px] font-mono text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20">+45 CP</span>
          </button>

          <button 
            onClick={() => handleLogAction('Elderly: Morning Terrace Gardening', 25)}
            disabled={isLoading}
            className="group bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-teal-500/50 p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl group-hover:scale-110 transition-transform">
              <Sprout size={24} />
            </div>
            <span className="font-bold text-sm text-teal-200">Terrace Gardening</span>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-400/10 px-2 py-1 rounded border border-teal-400/20">+25 CP</span>
          </button>

        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 overflow-hidden relative">
        <div className="flex items-center gap-3 mb-6">
          <History className="text-slate-400" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Ledger History</h3>
        </div>
        
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">No actions logged yet. Start moving to earn points!</p>
        ) : (
          <div className="space-y-3">
            {history.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-white/5 hover:bg-slate-800/50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-200">{item.action}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                <div className={`text-sm font-black font-mono ${item.points > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {item.points > 0 ? '+' : ''}{item.points} CP
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
