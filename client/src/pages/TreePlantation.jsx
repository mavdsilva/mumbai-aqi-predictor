import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Leaf, DollarSign, Wallet, CheckCircle, X, ArrowRight, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

const defaultCenter = [19.0760, 72.8777];

// Valid land-based plantation zones in Mumbai
const MUMBAI_PLANTATION_ZONES = [
  { name: "Aarey Colony",          lat: 19.1550, lon: 72.8650 },
  { name: "Sanjay Gandhi National Park", lat: 19.2147, lon: 72.9107 },
  { name: "Powai Lake Greenbelt", lat: 19.1264, lon: 72.9050 },
  { name: "Borivali East Forest", lat: 19.2290, lon: 72.8700 },
  { name: "Jogeshwari Greenbelt", lat: 19.1400, lon: 72.8480 },
  { name: "Goregaon Hills",       lat: 19.1630, lon: 72.8490 },
  { name: "Bhandup Green Zone",   lat: 19.1500, lon: 72.9380 },
  { name: "Mulund West Forest",   lat: 19.1750, lon: 72.9450 },
  { name: "Thane Creek Mangrove", lat: 19.0900, lon: 72.9700 },
  { name: "Vikhroli Parklands",   lat: 19.1100, lon: 72.9280 },
  { name: "Marol Green Belt",     lat: 19.1170, lon: 72.8780 },
  { name: "Film City Greens",     lat: 19.1620, lon: 72.8730 },
  { name: "Ghatkopar Hill Garden", lat: 19.0860, lon: 72.9130 },
  { name: "Kurla Urban Park",     lat: 19.0726, lon: 72.8845 },
  { name: "Bandra Fort Garden",   lat: 19.0440, lon: 72.8200 },
  { name: "Mahim Nature Park",    lat: 19.0370, lon: 72.8460 },
  { name: "Sion Hilltop Garden",  lat: 19.0440, lon: 72.8660 },
];

function getRandomLandCoordinate() {
  const zone = MUMBAI_PLANTATION_ZONES[Math.floor(Math.random() * MUMBAI_PLANTATION_ZONES.length)];
  const jitterLat = (Math.random() - 0.5) * 0.008;
  const jitterLon = (Math.random() - 0.5) * 0.008;
  return { lat: zone.lat + jitterLat, lon: zone.lon + jitterLon, zoneName: zone.name };
}

const PAYMENT_METHODS = [
  { id: 'gpay',       name: 'Google Pay',  icon: '💳', color: 'from-blue-500 to-blue-700' },
  { id: 'paypal',     name: 'PayPal',      icon: '🅿️', color: 'from-indigo-500 to-indigo-700' },
  { id: 'netbanking', name: 'Net Banking', icon: '🏦', color: 'from-teal-500 to-teal-700' },
];

export default function TreePlantation() {
  const [trees, setTrees] = useState([]);
  const [sponsorName, setSponsorName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Carbon points modal
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsDonateAmount, setPointsDonateAmount] = useState('100');
  const [pointsError, setPointsError] = useState('');
  const [pointsProcessing, setPointsProcessing] = useState(false);

  // Multi-step payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Steps: 'upi' -> 'method' -> 'amount' -> 'password' -> 'processing' -> 'success'
  const [paymentStep, setPaymentStep] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [donationAmount, setDonationAmount] = useState('500');
  const [paymentPassword, setPaymentPassword] = useState('');
  const [formError, setFormError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchTrees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/trees`);
      setTrees(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTrees(); }, []);

  const plantTree = async (type, pointsAmount) => {
    const coord = getRandomLandCoordinate();
    const payload = {
      latitude: coord.lat, longitude: coord.lon,
      sponsorType: type,
      sponsorName: sponsorName || 'Anonymous',
      message: message || `Planted in ${coord.zoneName}`,
      ...(pointsAmount && { pointsAmount }),
    };
    const res = await axios.post(`${API_BASE_URL}/api/donate`, payload);
    return { res, coord };
  };

  // Points donation — opens modal first
  const handleOpenPointsModal = () => {
    setShowPointsModal(true);
    setPointsDonateAmount('100');
    setPointsError('');
    setPointsProcessing(false);
  };

  const handleConfirmPointsDonation = async () => {
    const amt = parseInt(pointsDonateAmount, 10);
    if (!amt || amt < 10) {
      setPointsError('Minimum donation is 10 Carbon Points'); return;
    }
    setPointsProcessing(true); setPointsError('');
    try {
      const { coord } = await plantTree('points', amt);
      setStatusMsg({ type: 'success', text: `🌳 Tree planted in ${coord.zoneName} using ${amt} CP!` });
      fetchTrees(); setSponsorName(''); setMessage('');
      setShowPointsModal(false);
    } catch (err) {
      setPointsError(err.response?.data?.error || 'Transaction failed.');
    } finally { setPointsProcessing(false); }
  };

  // Money donation — opens payment flow
  const handleOpenPayment = () => {
    setShowPaymentModal(true);
    setPaymentStep('upi');
    setUpiId(''); setSelectedMethod(null); setDonationAmount('500');
    setPaymentPassword(''); setFormError('');
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setFormError('');
  };

  // Step handlers
  const handleUpiNext = () => {
    if (!upiId || !upiId.includes('@')) {
      setFormError('Please enter a valid UPI ID (e.g. yourname@oksbi)');
      return;
    }
    setFormError(''); setPaymentStep('method');
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setFormError(''); setPaymentStep('amount');
  };

  const handleAmountNext = () => {
    const amt = parseInt(donationAmount, 10);
    if (!amt || amt < 100) {
      setFormError('Minimum donation is ₹100'); return;
    }
    setFormError(''); setPaymentStep('password');
  };

  const handlePasswordConfirm = async () => {
    if (paymentPassword.length < 4) {
      setFormError('Please enter your UPI PIN / password (min 4 digits)'); return;
    }
    setFormError('');
    setPaymentStep('processing');

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const { coord } = await plantTree('money');
      setPaymentStep('success');
      setStatusMsg({ type: 'success', text: `🌳 Tree planted in ${coord.zoneName}!` });
      fetchTrees(); setSponsorName(''); setMessage('');
      setTimeout(() => { handleClosePayment(); }, 4000);
    } catch (err) {
      setPaymentStep('password');
      setFormError('Payment failed. Please try again.');
    }
  };

  // Step indicator
  const steps = ['UPI ID', 'Method', 'Amount', 'Confirm'];
  const stepIndex = { upi: 0, method: 1, amount: 2, password: 3, processing: 3, success: 3 };

  return (
    <>
      <div className="max-w-7xl mx-auto h-[80vh] flex flex-col lg:flex-row gap-6">
        
        {/* Map Section */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative group">
          <div className="absolute top-4 left-4 z-[400] bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-200">
            Total Trees Planted: <span className="text-emerald-400 text-base">{trees.length}</span>
          </div>
          <MapContainer center={defaultCenter} zoom={11} className="w-full h-full z-10" zoomControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {trees.map((tree, idx) => (
              <Marker key={idx} position={[tree.latitude, tree.longitude]}>
                <Popup>
                  <div className="p-2 space-y-1">
                    <h3 className="font-bold text-emerald-600 capitalize flex items-center gap-2"><Leaf size={14}/> Planted by {tree.sponsorName}</h3>
                    <p className="text-xs text-gray-500 italic">"{tree.message}"</p>
                    <p className="text-[10px] text-gray-400 uppercase">Via: {tree.sponsorType}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Donation Panel */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] p-6 rounded-3xl relative overflow-hidden flex-1 group hover:shadow-[0_0_40px_rgba(16,185,129,0.2)] transition-all">
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>
             
             <h2 className="text-2xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Plant a Tree</h2>
             <p className="text-xs text-slate-400 mb-6">Contribute to a greener Mumbai. Choose your method below.</p>

             <div className="space-y-4 mb-8">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Your Name</label>
                  <input type="text" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Dedication Message</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave a short message..." rows={3}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-200 resize-none" />
                </div>
             </div>

             {statusMsg && !showPaymentModal && (
               <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  <CheckCircle size={14} /> {statusMsg.text}
               </div>
             )}

             <div className="space-y-3 mt-auto">
               <button onClick={handleOpenPointsModal} disabled={isLoading}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95">
                  <Wallet size={16} className="relative z-10" /> 
                  <span className="relative z-10">Donate Carbon Points</span>
               </button>
               <button onClick={handleOpenPayment} disabled={isLoading}
                  className="w-full relative overflow-hidden group bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-emerald-400 transition-all disabled:opacity-50 cursor-pointer active:scale-95">
                  <DollarSign size={16} /> 
                  <span>Donate Money</span>
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* ========== PAYMENT MODAL ========== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.15)] w-full max-w-md mx-4 overflow-hidden relative animate-modal-in">
            
            {/* Close */}
            {paymentStep !== 'processing' && paymentStep !== 'success' && (
              <button onClick={handleClosePayment} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors z-10 cursor-pointer">
                <X size={20} />
              </button>
            )}

            {/* Step Indicator */}
            {paymentStep !== 'processing' && paymentStep !== 'success' && (
              <div className="px-8 pt-6">
                <div className="flex items-center justify-between mb-6">
                  {steps.map((label, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                        i <= stepIndex[paymentStep] 
                          ? 'bg-emerald-500 text-white scale-110' 
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-[10px] font-bold hidden sm:block ${
                        i <= stepIndex[paymentStep] ? 'text-emerald-400' : 'text-slate-600'
                      }`}>{label}</span>
                      {i < steps.length - 1 && (
                        <div className={`w-6 h-[2px] mx-1 ${i < stepIndex[paymentStep] ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: UPI ID */}
            {paymentStep === 'upi' && (
              <div className="px-8 pb-8">
                <h3 className="text-lg font-black text-slate-100 mb-1">Enter Your UPI ID</h3>
                <p className="text-xs text-slate-500 mb-6">We'll use this to process your payment securely.</p>
                
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@oksbi"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-200 mb-2" />
                
                <p className="text-[10px] text-slate-600 mb-4">Supported: @oksbi, @okaxis, @okhdfcbank, @paytm, @ybl</p>
                
                {formError && <p className="text-xs text-red-400 mb-4 font-bold">{formError}</p>}

                <button onClick={handleUpiNext}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 2: Payment Method Selection */}
            {paymentStep === 'method' && (
              <div className="px-8 pb-8">
                <button onClick={() => setPaymentStep('upi')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-4 cursor-pointer">
                  <ArrowLeft size={12} /> Back
                </button>
                <h3 className="text-lg font-black text-slate-100 mb-1">Select Payment Method</h3>
                <p className="text-xs text-slate-500 mb-6">Choose how you'd like to pay for this donation.</p>
                
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.id} onClick={() => handleMethodSelect(m)}
                      className="w-full bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/50 p-4 rounded-xl flex items-center gap-4 transition-all cursor-pointer group active:scale-95">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
                        {m.icon}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm text-slate-100">{m.name}</p>
                        <p className="text-[10px] text-slate-500">Pay using {m.name}</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Amount */}
            {paymentStep === 'amount' && (
              <div className="px-8 pb-8">
                <button onClick={() => setPaymentStep('method')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-4 cursor-pointer">
                  <ArrowLeft size={12} /> Back
                </button>
                <h3 className="text-lg font-black text-slate-100 mb-1">Enter Donation Amount</h3>
                <p className="text-xs text-slate-500 mb-6">Paying via <span className="text-emerald-400 font-bold">{selectedMethod?.name}</span> • UPI: <span className="font-mono text-slate-300">{upiId}</span></p>
                
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500">₹</span>
                  <input type="number" value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-5 text-3xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-100" />
                </div>

                <div className="flex gap-2 mb-6">
                  {[100, 250, 500, 1000].map((amt) => (
                    <button key={amt} onClick={() => setDonationAmount(String(amt))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        donationAmount === String(amt) 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}>
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-600 mb-2">Each ₹500 plants one tree. Minimum donation: ₹100</p>
                {formError && <p className="text-xs text-red-400 mb-4 font-bold">{formError}</p>}

                <button onClick={handleAmountNext}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer">
                  Proceed to Pay <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 4: Password / UPI PIN Confirmation */}
            {paymentStep === 'password' && (
              <div className="px-8 pb-8">
                <button onClick={() => setPaymentStep('amount')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-4 cursor-pointer">
                  <ArrowLeft size={12} /> Back
                </button>
                <h3 className="text-lg font-black text-slate-100 mb-1">Confirm Payment</h3>
                <p className="text-xs text-slate-500 mb-6">Enter your UPI PIN to authorize this payment.</p>

                {/* Summary */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6 space-y-2 border border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="text-slate-200 font-bold">{selectedMethod?.icon} {selectedMethod?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">UPI ID</span>
                    <span className="text-slate-200 font-mono">{upiId}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-700 pt-2 mt-2">
                    <span className="text-slate-500 font-bold">Total Amount</span>
                    <span className="text-emerald-400 font-black text-lg">₹{donationAmount}</span>
                  </div>
                </div>

                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">UPI PIN / Password</label>
                <input type="password" value={paymentPassword} 
                  onChange={(e) => setPaymentPassword(e.target.value)}
                  placeholder="••••••" maxLength={6}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-200 mb-2" />
                
                {formError && <p className="text-xs text-red-400 mb-4 font-bold">{formError}</p>}

                <button onClick={handlePasswordConfirm}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer">
                  <Lock size={14} /> Pay ₹{donationAmount}
                </button>
                <p className="text-[10px] text-slate-600 text-center mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck size={10} /> Secured with 256-bit SSL encryption
                </p>
              </div>
            )}

            {/* STEP: Processing */}
            {paymentStep === 'processing' && (
              <div className="p-14 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">Processing Payment</h3>
                <p className="text-xs text-slate-500">Verifying with {selectedMethod?.name}...</p>
                <p className="text-[10px] text-slate-600 mt-2 font-mono">{upiId}</p>
              </div>
            )}

            {/* STEP: Success */}
            {paymentStep === 'success' && (
              <div className="p-14 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-emerald-400 mb-2">Payment Successful!</h3>
                <p className="text-sm text-slate-300 mb-4">₹{donationAmount} has been deducted from your account.</p>
                
                <div className="bg-slate-800/50 rounded-xl p-4 w-full space-y-2 border border-emerald-500/20">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Deducted From</span>
                    <span className="text-slate-200 font-mono">{upiId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Payment Via</span>
                    <span className="text-slate-200 font-bold">{selectedMethod?.icon} {selectedMethod?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Amount</span>
                    <span className="text-emerald-400 font-black">₹{donationAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-700 pt-2">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="text-slate-300 font-mono text-[10px]">TXN{Date.now()}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mt-4">Your tree has been planted 🌳</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========== CARBON POINTS MODAL ========== */}
      {showPointsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(59,130,246,0.15)] w-full max-w-md mx-4 overflow-hidden relative animate-modal-in">
            
            <button onClick={() => setShowPointsModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors z-10 cursor-pointer">
              <X size={20} />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">Donate Carbon Points</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Support Mumbai's Greenery</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Choose Points Amount</label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-500">CP</span>
                  <input type="number" value={pointsDonateAmount}
                    onChange={(e) => setPointsDonateAmount(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-100" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 200].map((amt) => (
                    <button key={amt} onClick={() => setPointsDonateAmount(String(amt))}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        pointsDonateAmount === String(amt) 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                          : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}>
                      {amt} CP
                    </button>
                  ))}
                </div>
              </div>

              {pointsError && (
                <div className="p-3 rounded-xl mb-4 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold">
                  {pointsError}
                </div>
              )}

              <button 
                onClick={handleConfirmPointsDonation}
                disabled={pointsProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {pointsProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Donate {pointsDonateAmount} CP & Plant Tree</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: modal-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
