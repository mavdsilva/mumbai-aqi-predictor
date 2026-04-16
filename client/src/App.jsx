import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Map, Wallet, Leaf } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TreePlantation from './pages/TreePlantation';
import CarbonPoints from './pages/CarbonPoints';

function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "bg-slate-800 text-blue-400 border-blue-500/50" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent";

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl px-2 py-2 rounded-2xl flex items-center gap-2 transition-all">
      <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isActive('/')}`}>
        <Activity size={16} /> Dashboard
      </Link>
      <Link to="/trees" className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isActive('/trees')}`}>
        <Map size={16} /> Tree Map
      </Link>
      <Link to="/carbon-wallet" className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isActive('/carbon-wallet')}`}>
        <Wallet size={16} /> Carbon Wallet
      </Link>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
        <Navbar />
        <div className="pt-24 pb-12 px-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trees" element={<TreePlantation />} />
            <Route path="/carbon-wallet" element={<CarbonPoints />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;