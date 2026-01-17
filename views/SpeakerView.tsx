import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { RenderReadyResult, Passage } from '../types';
import { 
  Mic2, 
  Search, 
  Trophy, 
  MapPin, 
  Users, 
  History, 
  Activity, 
  ChevronRight, 
  X,
  Zap,
  Star,
  Building2,
  Clock
} from 'lucide-react';
import { formatDuration } from '../utils/time';

const SpeakerView: React.FC = () => {
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);

  const { kernelResults, races, isSyncing } = useRaceKernel(selectedRaceId);

  // Auto-sélection
  useEffect(() => {
    if (races.length > 0 && !selectedRaceId) setSelectedRaceId(races[0].id);
  }, [races, selectedRaceId]);

  // Écoute du dernier passage en temps réel pour l'animation
  useEffect(() => {
    const q = query(collection(db, 'passages'), orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        setLastPassage(snap.docs[0].data() as Passage);
      }
    });
    return () => unsub();
  }, []);

  const activeRunner = useMemo(() => {
    if (!lastPassage) return null;
    return kernelResults.find(r => r.id === lastPassage.participantId);
  }, [lastPassage, kernelResults]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return kernelResults.filter(r => 
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.bib.includes(searchTerm)
    ).slice(0, 5);
  }, [searchTerm, kernelResults]);

  const activeRace = races.find(r => r.id === selectedRaceId);

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header Premium Speaker */}
      <header className="bg-indigo-900 border-b border-indigo-800 px-10 py-8 flex justify-between items-center shadow-2xl z-20">
        <div className="flex items-center gap-6">
          <div className="bg-white/10 p-4 rounded-[2rem] border border-white/10 shadow-inner">
            <Mic2 size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
              SPEAKER<span className="text-indigo-400">COMMAND</span>
            </h1>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em] mt-1">Direct Live Announcement Kit</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-2xl transition-all group"
          >
            <Search className="text-indigo-300 group-hover:text-white" size={20} />
            <span className="text-sm font-black text-white uppercase tracking-widest">Recherche Coureur</span>
            <span className="bg-indigo-800 text-indigo-300 px-2 py-1 rounded-lg text-[10px] font-black">CMD+K</span>
          </button>
          
          <div className="h-16 w-px bg-white/10 mx-2"></div>

          <div className="text-right">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Épreuve Active</p>
            <select 
              className="bg-transparent border-none font-black text-xl text-white outline-none cursor-pointer text-right"
              value={selectedRaceId}
              onChange={e => setSelectedRaceId(e.target.value)}
            >
              {races.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 p-10 flex gap-10 overflow-hidden">
        
        {/* Main Display: Current Detection */}
        <div className="flex-1 flex flex-col gap-8 overflow-hidden">
          <div className="bg-white rounded-[4rem] border border-slate-200 shadow-soft flex-1 flex flex-col relative overflow-hidden">
            {/* Decoration Glow */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>

            <div className="p-12 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping"></div>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Détection en temps réel</h2>
               </div>
               {lastPassage && (
                 <span className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                   DÉTECTÉ À {new Date(lastPassage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                 </span>
               )}
            </div>

            <div className="flex-1 flex items-center justify-center p-12">
              {activeRunner ? (
                <div key={activeRunner.id} className="w-full max-w-4xl space-y-12 animate-in fade-in zoom-in duration-500">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-indigo-50 text-indigo-600 px-10 py-3 rounded-full font-black text-xl uppercase tracking-widest mb-8 border border-indigo-100 shadow-sm">
                      #{activeRunner.bib} • {activeRunner.lastCheckpointName}
                    </div>
                    <h2 className="text-9xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-4">
                      {activeRunner.lastName}
                    </h2>
                    <h3 className="text-5xl font-bold text-indigo-600 uppercase tracking-tight">
                      {activeRunner.firstName}
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-400 mb-3">
                        <Building2 size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Club / Ville</span>
                      </div>
                      <p className="text-2xl font-black text-slate-900 uppercase truncate">{activeRunner.club || 'Individuel'}</p>
                      <p className="text-sm font-bold text-slate-400 uppercase mt-1">{activeRunner.city}</p>
                    </div>
                    <div className="bg-indigo-600 p-10 rounded-[3rem] text-white text-center shadow-xl shadow-indigo-100">
                      <div className="flex items-center justify-center gap-3 text-indigo-300 mb-3">
                        <Trophy size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Classement</span>
                      </div>
                      <p className="text-6xl font-black leading-none">#{activeRunner.rank}</p>
                      <p className="text-[10px] font-black uppercase mt-4 tracking-[0.2em] opacity-80">Général Scratch</p>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-400 mb-3">
                        <Clock size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Temps Net</span>
                      </div>
                      <p className="text-4xl font-black text-slate-900 mono">{activeRunner.displayTime.split('.')[0]}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase mt-2">{activeRunner.displaySpeed} KM/H</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6 opacity-20">
                  <Activity size={120} className="mx-auto" />
                  <p className="text-2xl font-black text-slate-900 uppercase tracking-[0.5em]">En attente de coureurs...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Feed: Recent Passages */}
        <div className="w-96 flex flex-col gap-6 overflow-hidden">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-soft flex-1 flex flex-col overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <History size={16} /> Flux des Détections
                </h3>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
               {kernelResults.filter(r => r.netTimeMs > 0).sort((a,b) => b.lastTimestamp - a.lastTimestamp).slice(0, 15).map((r, i) => (
                 <div key={r.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex items-center justify-between group animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-slate-200">
                        {r.bib}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-[11px] text-slate-900 uppercase truncate w-32 tracking-tight">{r.lastName}</p>
                        <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">{r.lastCheckpointName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 mono">#{r.rank}</p>
                       <p className="text-[9px] font-bold text-slate-300 mt-0.5">{new Date(r.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                 </div>
               ))}
             </div>

             <div className="p-8 bg-slate-900 text-center text-white">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-60 mb-2">Statistiques Course</p>
                <div className="flex justify-between items-center">
                   <div>
                      <p className="text-xl font-black mono">{kernelResults.filter(r => r.status === 'FINISHED').length}</p>
                      <p className="text-[8px] font-bold text-indigo-400 uppercase">Arrivés</p>
                   </div>
                   <div className="h-8 w-px bg-white/10"></div>
                   <div>
                      <p className="text-xl font-black mono">{kernelResults.filter(r => r.status === 'STARTED').length}</p>
                      <p className="text-[8px] font-bold text-indigo-400 uppercase">En course</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Quick Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Mic2 size={120} />
            </div>
            
            <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Recherche Speaker</h2>
                <p className="text-slate-500 font-medium">Saisissez un dossard ou un nom pour afficher sa fiche complète</p>
              </div>
              <button onClick={() => setShowSearchModal(false)} className="p-4 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-full transition-all">
                <X size={32} />
              </button>
            </div>

            <div className="relative mb-10 z-10">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={32} />
              <input 
                type="text" 
                autoFocus
                placeholder="DOSSARD OU NOM..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] py-10 pl-24 pr-10 text-5xl font-black text-indigo-600 outline-none focus:border-indigo-600 transition-all placeholder:text-slate-200 uppercase mono"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-4 relative z-10">
              {searchResults.map((r) => (
                <button 
                  key={r.id}
                  onClick={() => {
                    setLastPassage({ participantId: r.id, bib: r.bib, checkpointId: 'manual', checkpointName: 'RECHERCHE', timestamp: Date.now(), netTime: r.netTimeMs, id: 'manual' });
                    setShowSearchModal(false);
                    setSearchTerm('');
                  }}
                  className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-center justify-between hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-8">
                    <span className="text-4xl font-black mono text-slate-300 group-hover:text-indigo-300">#{r.bib}</span>
                    <div className="text-left">
                      <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{r.fullName}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.category} • {r.club || 'Individuel'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-indigo-600 mono">{r.displayTime.split('.')[0]}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rang #{r.rank}</p>
                  </div>
                </button>
              ))}
              {searchTerm && searchResults.length === 0 && (
                <div className="py-12 text-center text-slate-300">
                  <p className="text-xl font-black uppercase tracking-widest">Aucun résultat trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;