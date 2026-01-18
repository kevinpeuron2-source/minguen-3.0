import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import TimingView from './views/TimingView';
import RacesView from './views/RacesView';
import ParticipantsView from './views/ParticipantsView';
import ResultsView from './views/ResultsView';
import AdminView from './views/AdminView';
import SignaleurView from './views/SignaleurView';
import LiveView from './views/LiveView';
import MarshalInputView from './views/MarshalInputView';
import RemoteFinishView from './views/RemoteFinishView';
import FinishTerminalView from './views/FinishTerminalView';
import SpeakerView from './views/SpeakerView';
import { Shield, Lock, Terminal, ArrowRight } from 'lucide-react';

// GARDE LOGICIEL (PC COURSE & ALAIN)
const SoftwareGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, setIsAdmin, config } = useDatabase();
  const [pass, setPass] = useState('');

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-6 z-[200]">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center border-t-8 border-indigo-600">
          <div className="w-24 h-24 bg-slate-950 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 text-white"><Shield size={48} /></div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">MINGUEN 3.0</h2>
          <p className="text-slate-400 mb-10 font-bold uppercase text-[10px] tracking-widest mt-2">Accès Logiciel QG</p>
          <form onSubmit={(e) => { e.preventDefault(); if(pass === config.softwarePassword) setIsAdmin(true); else alert('Code incorrect'); }} className="space-y-6">
            <input type="password" placeholder="CODE QG" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-center text-4xl font-black outline-none focus:border-indigo-500" value={pass} onChange={e => setPass(e.target.value)} autoFocus />
            <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-700 transition-all">DÉVERROUILLER</button>
          </form>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// GARDE TERMINAL (ARRIVÉES)
const TerminalGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isTerminalAuth, setIsTerminalAuth, config } = useDatabase();
  const [pass, setPass] = useState('');

  if (!isTerminalAuth) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-6 z-[200]">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center border-t-8 border-blue-600">
          <div className="w-20 h-20 bg-blue-950 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 text-white"><Terminal size={40} /></div>
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">ACCÈS TERMINAL</h2>
          <form onSubmit={(e) => { e.preventDefault(); if(pass === config.terminalPassword) setIsTerminalAuth(true); else alert('Code incorrect'); }} className="space-y-6">
            <input type="password" placeholder="CODE TERMINAL" className="w-full bg-slate-50 border-2 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-blue-500" value={pass} onChange={e => setPass(e.target.value)} autoFocus />
            <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3">OUVRIR <ArrowRight size={20} /></button>
          </form>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// GARDE SIGNALEURS (FORÊT)
const MarshalGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMarshalAuth, setIsMarshalAuth, config } = useDatabase();
  const [pass, setPass] = useState('');

  if (!isMarshalAuth) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[200]">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center border-t-8 border-emerald-600">
          <div className="w-20 h-20 bg-emerald-950 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 text-white"><Shield size={40} /></div>
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">ACCÈS SIGNALEUR</h2>
          <form onSubmit={(e) => { e.preventDefault(); if(pass === config.marshalPassword) setIsMarshalAuth(true); else alert('Code incorrect'); }} className="space-y-6">
            <input type="password" placeholder="CODE" className="w-full bg-slate-50 border-2 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-emerald-500" value={pass} onChange={e => setPass(e.target.value)} autoFocus />
            <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3">DÉMARRER <ArrowRight size={20} /></button>
          </form>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <DatabaseProvider>
      <Router>
        <Routes>
          {/* VUES INDÉPENDANTES (Plein écran, standalone) */}
          <Route path="/live" element={<LiveView />} />
          <Route path="/speaker" element={<SpeakerView />} />
          <Route path="/finish-terminal" element={<TerminalGuard><FinishTerminalView /></TerminalGuard>} />
          <Route path="/signaleur-terrain" element={<MarshalGuard><MarshalInputView /></MarshalGuard>} />
          <Route path="/remote-finish" element={<TerminalGuard><RemoteFinishView /></TerminalGuard>} />
          
          {/* LOGICIEL QG (HQ) - Protégé et Intégré au Layout Sidebar */}
          <Route path="/*" element={
            <SoftwareGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/timing" element={<TimingView />} />
                  <Route path="/races" element={<RacesView />} />
                  <Route path="/participants" element={<ParticipantsView />} />
                  <Route path="/results" element={<ResultsView />} />
                  <Route path="/admin" element={<AdminView />} />
                  <Route path="/signaleur" element={<SignaleurView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </SoftwareGuard>
          } />
        </Routes>
      </Router>
    </DatabaseProvider>
  );
};

export default App;