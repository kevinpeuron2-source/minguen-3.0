import React, { useState, useEffect } from 'react';
import { collection, writeBatch, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings, Zap, AlertCircle, Lock, ShieldCheck, Users, Key, Save, Terminal, Shield, RefreshCw } from 'lucide-react';
import { RaceStatus, ParticipantStatus, Race } from '../types';
import { useDatabase } from '../context/DatabaseContext';

const AdminView: React.FC = () => {
  const { isAdmin, setIsAdmin, config, updateConfig } = useDatabase();
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  
  const [tempConfig, setTempConfig] = useState(config);
  const [activeTab, setActiveTab] = useState<'tools' | 'security' | 'raze'>('tools');

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCode === config.softwarePassword) {
      setIsAdmin(true);
    } else {
      alert('Code d\'accès Minguen 3.0 incorrect');
    }
  };

  const handleSaveSecurity = async () => {
    setLoading(true);
    await updateConfig(tempConfig);
    setLoading(false);
    alert('Barrières de sécurité synchronisées.');
  };

  const generateSimulationFromExisting = async () => {
    setLoading(true);
    try {
      const partsSnap = await getDocs(collection(db, 'participants'));
      if (partsSnap.empty) { alert("Inscrire des participants avant simulation."); return; }
      const racesSnap = await getDocs(collection(db, 'races'));
      if (racesSnap.empty) { alert("Configurer des courses avant simulation."); return; }
      
      const batch = writeBatch(db);
      const now = Date.now();
      const startTimeSimulated = now - (3600000 * 1.5);
      
      const oldPassages = await getDocs(collection(db, 'passages'));
      oldPassages.forEach(d => batch.delete(d.ref));
      
      racesSnap.forEach(raceDoc => {
        const race = raceDoc.data() as Race;
        if (race.status === RaceStatus.READY) {
          batch.update(raceDoc.ref, { status: RaceStatus.RUNNING, startTime: startTimeSimulated });
        }
      });
      
      let count = 0;
      partsSnap.forEach(pDoc => {
        const p = pDoc.data();
        const rand = Math.random();
        if (rand < 0.85) {
          const randomNetTime = 2400000 + (Math.random() * 3600000);
          const passageRef = doc(collection(db, 'passages'));
          batch.set(passageRef, {
            participantId: pDoc.id,
            bib: p.bib,
            checkpointId: 'finish',
            checkpointName: 'ARRIVÉE',
            timestamp: startTimeSimulated + randomNetTime,
            netTime: randomNetTime
          });
          batch.update(pDoc.ref, { status: ParticipantStatus.FINISHED });
          count++;
        }
      });
      await batch.commit();
      alert(`${count} arrivées simulées.`);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const fullReset = async () => {
    if (resetConfirm !== 'RESET') return;
    if (!confirm('ATTENTION : Voulez-vous vraiment TOUT supprimer ?')) return;
    setLoading(true);
    try {
      const collections = ['passages', 'participants', 'races', 'active_marshals'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      window.location.reload();
    } catch (err) { alert('Erreur reset.'); } finally { setLoading(false); }
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-6 z-[200]">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center border-t-8 border-indigo-600">
          <div className="w-24 h-24 bg-slate-950 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 text-white">
            <Shield size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight leading-none">MINGUEN<br/>CHRONO 3.0</h2>
          <p className="text-slate-400 mb-10 font-bold uppercase text-[10px] tracking-widest mt-2">Logiciel de Chronométrage Professionnel</p>
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <input 
              type="password" 
              placeholder="CODE QG"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-center text-4xl font-black outline-none focus:border-indigo-500 transition-all"
              value={adminCode}
              onChange={e => setAdminCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-700 transition-all">
              DÉVERROUILLER LE QG
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Le QG - Admin</h1>
          <div className="flex gap-4 mt-6">
             {(['tools', 'security', 'raze'] as const).map(tab => (
               <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
               >
                 {tab === 'tools' ? 'Maintenance' : tab === 'security' ? 'Sécurité' : 'RAZ'}
               </button>
             ))}
          </div>
        </div>
        <button onClick={() => setIsAdmin(false)} className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-500 font-black text-xs uppercase rounded-xl hover:bg-slate-200">
          <Lock size={16} /> Verrouiller
        </button>
      </header>

      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4"><Zap size={28} className="text-blue-600" /> Simulation</h2>
            <button disabled={loading} onClick={generateSimulationFromExisting} className="w-full text-left p-8 rounded-[2.5rem] bg-blue-50 border-2 border-blue-100 group hover:border-blue-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-blue-700 text-xl uppercase">Simuler Arrivées</h3>
                  <p className="text-sm text-blue-500 font-medium">Génère des pointages en temps réel</p>
                </div>
                <Users className="text-blue-300" size={32} />
              </div>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white p-12 rounded-[3.5rem] border shadow-soft space-y-10">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4"><Shield size={28} className="text-indigo-600" /> Barrières de Sécurité</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { id: 'softwarePassword', icon: Shield, label: 'Code Minguen 3.0', sub: 'QG & Alain', color: 'indigo' },
               { id: 'marshalPassword', icon: ShieldCheck, label: 'Code Signaleurs', sub: 'Postes Terrain', color: 'emerald' },
               { id: 'terminalPassword', icon: Terminal, label: 'Code Terminal', sub: 'Arrivées /terminal', color: 'blue' },
             ].map(item => (
                <div key={item.id} className="space-y-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                   <div className="flex items-center gap-3 mb-2">
                     <item.icon size={18} className={`text-${item.color}-600`} />
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                   </div>
                   <input 
                     type="text" 
                     className="w-full bg-white border-2 border-slate-100 rounded-2xl p-6 font-black text-3xl text-center outline-none focus:border-indigo-500" 
                     value={tempConfig[item.id as keyof typeof tempConfig]} 
                     onChange={e => setTempConfig({...tempConfig, [item.id]: e.target.value})} 
                   />
                   <p className="text-[9px] text-slate-400 font-bold uppercase text-center">{item.sub}</p>
                </div>
             ))}
          </div>
          <button onClick={handleSaveSecurity} className="w-full bg-indigo-600 text-white py-8 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
            <Save size={24} /> ENREGISTRER LES ACCÈS
          </button>
        </div>
      )}

      {activeTab === 'raze' && (
        <div className="bg-red-50 p-10 rounded-[3rem] border-2 border-red-100 space-y-8">
          <h2 className="text-2xl font-black text-red-600 uppercase flex items-center gap-4"><RefreshCw size={28} /> Zone Critique</h2>
          <div className="space-y-6">
            <p className="text-xs font-bold text-red-800 uppercase">Effacer tout l'événement actuel (passages, participants, courses).</p>
            <input 
              type="text" 
              placeholder="TAPER RESET" 
              className="w-full bg-white border-2 border-red-100 rounded-2xl px-6 py-5 font-black text-red-600 text-center" 
              value={resetConfirm} 
              onChange={e => setResetConfirm(e.target.value)} 
            />
            <button disabled={resetConfirm !== 'RESET'} onClick={fullReset} className="w-full py-6 rounded-2xl font-black bg-red-600 text-white uppercase text-xl">DÉTRUIRE LES DONNÉES</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;