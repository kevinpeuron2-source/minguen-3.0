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
  History, 
  Activity, 
  X,
  Zap,
  Building2,
  Clock,
  Navigation,
  ArrowRight,
  User,
  Heart
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);

  // Note: useRaceKernel hook works with a selectedRaceId.
  // For the speaker, we want to see all passages, but the fiche needs context from a specific race.
  const { kernelResults, races } = useRaceKernel(selectedRaceId);

  useEffect(() => {
    if (races.length > 0 && !selectedRaceId) setSelectedRaceId(races[0].id);
  }, [races, selectedRaceId]);

  // Écouter les passages en temps réel pour l'annonceur
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
    // Si le passage n'est pas de la course sélectionnée, on ajuste selectedRaceId ? 
    // Mieux : on utilise le kernelResults global ou on cherche dans toutes les courses.
    return kernelResults.find(r => r.id === lastPassage.participantId);
  }, [lastPassage, kernelResults]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return kernelResults.filter(r => 
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.bib.includes(searchTerm)
    ).slice(0, 5);
  }, [searchTerm, kernelResults]);

  const passageHistory = useMemo(() => {
    return kernelResults
      .filter(r => r.netTimeMs > 0)
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .slice(0, 20);
  }, [kernelResults]);

  return (
    <div className="fixed inset-0 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Premium Speaker Header */}
      <header className="bg-slate-900 border-b border-white/5 px-12 py-8 flex justify-between items-center z-20 backdrop-blur-xl shrink-0 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-2xl shadow-indigo-500/20">
            <Mic2 size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-4 uppercase">
              CONSOLE<span className="text-indigo-500">SPEAKER</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Direct Live Announcement Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <button 
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-6 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-5 rounded-[1.5rem] transition-all group"
          >
            <Search className="text-indigo-400 group-hover:scale-110 transition-transform" size={24} />
            <span className="text-sm font-black uppercase tracking-widest">Recherche Coureur</span>
            <div className="bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-black text-slate-500">K</div>
          </button>
          
          <div className="h-12 w-px bg-white/10"></div>

          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Focus Épreuve</p>
            <select 
              className="bg-transparent border-none font-black text-xl text-indigo-400 outline-none cursor-pointer text-right"
              value={selectedRaceId}
              onChange={e => setSelectedRaceId(e.target.value)}
            >
              {races.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Dynamic Info Board */}
        <div className="flex-1 p-16 flex flex-col items-center justify-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80%] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none"></div>

          {activeRunner ? (
            <div key={activeRunner.id} className="w-full max-w-5xl space-y-16 animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/5 border border-white/10 text-indigo-400 px-10 py-4 rounded-full font-black text-2xl uppercase tracking-widest mb-10 backdrop-blur-sm shadow-xl">
                  #{activeRunner.bib} • DETECTION : {activeRunner.lastCheckpointName}
                </div>
                <h2 className="text-[12rem] font-black tracking-tighter uppercase leading-none mb-2 text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  {activeRunner.lastName}
                </h2>
                <h3 className="text-7xl font-bold text-indigo-500 uppercase tracking-tight">
                  {activeRunner.firstName}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-12">
                <div className="bg-white/5 p-12 rounded-[4rem] border border-white/5 text-center backdrop-blur-sm hover:border-indigo-500/30 transition-colors group">
                  <div className="flex items-center justify-center gap-3 text-slate-500 mb-4 group-hover:text-indigo-400">
                    <Building2 size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Identification</span>
                  </div>
                  <p className="text-3xl font-black text-white uppercase truncate mb-1">{activeRunner.club || 'INDIVIDUEL'}</p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">{activeRunner.city}</p>
                </div>

                <div className="bg-indigo-600 p-12 rounded-[4rem] text-white text-center shadow-2xl shadow-indigo-600/30 transform hover:scale-105 transition-all">
                  <div className="flex items-center justify-center gap-3 text-indigo-300 mb-4">
                    <Trophy size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Classement Live</span>
                  </div>
                  <p className="text-9xl font-black leading-none">#{activeRunner.rank}</p>
                  <p className="text-[10px] font-black uppercase mt-6 tracking-[0.4em] opacity-60">SCRATCH GÉNÉRAL</p>
                </div>

                <div className="bg-white/5 p-12 rounded-[4rem] border border-white/5 text-center backdrop-blur-sm hover:border-indigo-500/30 transition-colors group">
                  <div className="flex items-center justify-center gap-3 text-slate-500 mb-4 group-hover:text-indigo-400">
                    <Clock size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Chrono Net</span>
                  </div>
                  <p className="text-5xl font-black text-white mono mb-2">{activeRunner.displayTime.split('.')[0]}</p>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{activeRunner.displaySpeed} KM/H</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-10 space-y-12">
              <Activity size={200} className="mx-auto text-indigo-500" />
              <p className="text-5xl font-black uppercase tracking-[0.6em]">Awaiting Live Data</p>
            </div>
          )}
        </div>

        {/* Right Side: Event Stream */}
        <aside className="w-[500px] bg-slate-900/40 border-l border-white/5 flex flex-col backdrop-blur-md">
           <div className="p-12 border-b border-white/5">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.5em] flex items-center gap-4">
                <Navigation size={20} className="text-indigo-500" /> FLUX RÉEL DES PASSAGES
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide">
             {passageHistory.map((r, i) => (
               <div key={`${r.id}-${r.lastTimestamp}`} className="bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between group animate-in slide-in-from-right-4 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/5 text-indigo-400 rounded-3xl flex items-center justify-center font-black text-2xl mono border border-white/10 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                      {r.bib}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-xl text-white uppercase truncate tracking-tight leading-none mb-2">{r.lastName}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[120px]">{r.lastCheckpointName}</span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                        <span className="text-[10px] font-black text-slate-500 mono">{new Date(r.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-3xl font-black text-slate-700 group-hover:text-indigo-500 transition-colors">#{r.rank}</p>
                  </div>
               </div>
             ))}
           </div>

           <div className="p-12 bg-black/30 grid grid-cols-2 gap-8 text-center border-t border-white/5">
              <div className="space-y-2">
                 <p className="text-5xl font-black mono text-emerald-500 leading-none">{kernelResults.filter(r => r.status === 'FINISHED').length}</p>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ARRIVÉS</p>
              </div>
              <div className="space-y-2">
                 <p className="text-5xl font-black mono text-indigo-400 leading-none">{kernelResults.filter(r => r.status === 'STARTED').length}</p>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">EN COURSE</p>
              </div>
           </div>
        </aside>
      </main>

      {/* Search Overlay */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] flex items-center justify-center p-10 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-[5rem] p-20 w-full max-w-5xl shadow-[0_0_100px_rgba(79,70,229,0.1)] relative overflow-hidden">
            <div className="flex justify-between items-center mb-16">
              <h2 className="text-6xl font-black tracking-tighter uppercase">Recherche <span className="text-indigo-500">Speaker</span></h2>
              <button onClick={() => setShowSearchModal(false)} className="p-6 bg-white/5 hover:bg-rose-500 hover:text-white rounded-full text-slate-400 transition-all">
                <X size={48} />
              </button>
            </div>

            <div className="relative mb-16">
              <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-600" size={56} />
              <input 
                type="text" 
                autoFocus
                placeholder="DOSSARD OU NOM..."
                className="w-full bg-white/5 border-2 border-white/5 rounded-[3.5rem] py-16 pl-32 pr-12 text-[6rem] font-black text-white outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800 uppercase mono shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
              {searchResults.map((r) => (
                <button 
                  key={r.id}
                  onClick={() => {
                    setLastPassage({ participantId: r.id, bib: r.bib, checkpointId: 'search', checkpointName: 'RECHERCHE', timestamp: Date.now(), netTime: r.netTimeMs, id: 'search' });
                    setShowSearchModal(false);
                    setSearchTerm('');
                  }}
                  className="w-full bg-white/5 border border-white/5 p-10 rounded-[3rem] flex items-center justify-between hover:bg-indigo-600 transition-all group"
                >
                  <div className="flex items-center gap-12">
                    <span className="text-7xl font-black mono text-slate-700 group-hover:text-white/30">#{r.bib}</span>
                    <div className="text-left">
                      <p className="text-4xl font-black text-white uppercase leading-none mb-3">{r.fullName}</p>
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-white/60">{r.category} • {r.club || 'INDIVIDUEL'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-indigo-400 group-hover:text-white mono mb-2">{r.displayTime.split('.')[0]}</p>
                    <p className="text-xs font-black text-slate-500 uppercase group-hover:text-white/60">Position GÉNÉRALE #{r.rank}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;