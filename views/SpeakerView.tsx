import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { RenderReadyResult, Passage, Race } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Mic2, Search, Activity, X, Navigation, Wind, Settings2, ChevronRight, User, Medal, Timer, Building2, MapPin
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeRaceIdForKernel, setActiveRaceIdForKernel] = useState<string>('');

  // Configuration Alain
  const [config, setConfig] = useState({
    showClub: true,
    showCity: true,
    showCategory: true,
    showSpeed: true,
    showGaps: true,
    showSplits: true
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'races'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      if (list.length > 0 && !activeRaceIdForKernel) setActiveRaceIdForKernel(list[0].id);
    });
    return () => unsub();
  }, []);

  // Écoute globale des passages
  useEffect(() => {
    const q = query(collection(db, 'passages'), orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const passage = snap.docs[0].data() as Passage;
        setLastPassage(passage);
        // On change de kernel automatiquement pour la course concernée si nécessaire
        onSnapshot(collection(db, 'participants'), pSnap => {
            const p = pSnap.docs.find(d => d.id === passage.participantId)?.data();
            if (p) setActiveRaceIdForKernel(p.raceId);
        });
      }
    });
    return () => unsub();
  }, []);

  const { kernelResults } = useRaceKernel(activeRaceIdForKernel);

  // Coureur actif (Selection > Dernier passage)
  const activeRunner = useMemo(() => {
    if (manuallySelectedId) return kernelResults.find(r => r.id === manuallySelectedId) || null;
    if (!lastPassage) return null;
    return kernelResults.find(r => r.id === lastPassage.participantId) || null;
  }, [manuallySelectedId, lastPassage, kernelResults]);

  const gaps = useMemo(() => {
    if (!activeRunner || kernelResults.length === 0) return null;
    const leader = kernelResults.find(r => r.rank === 1);
    return leader && activeRunner.rank > 1 ? `+ ${formatMsToDisplay(activeRunner.netTimeMs - leader.netTimeMs).split('.')[0]}` : null;
  }, [activeRunner, kernelResults]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return kernelResults.filter(r => r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || r.bib.includes(searchTerm)).slice(0, 5);
  }, [searchTerm, kernelResults]);

  const passageHistory = useMemo(() => {
    return kernelResults.filter(r => r.netTimeMs > 0).sort((a, b) => b.lastTimestamp - a.lastTimestamp).slice(0, 40);
  }, [kernelResults]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
      
      {/* Header Alain */}
      <header className="bg-slate-900 border-b border-white/5 px-6 py-4 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl"><Mic2 size={24} className="text-white" /></div>
          <h1 className="text-lg font-black tracking-tight uppercase">L'APPLI POUR <span className="text-blue-500">ALAIN</span></h1>
        </div>
        <div className="text-right">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-[10px] font-black mono text-blue-400">ALAIN_SYNCCED_v4</span>
           </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* FLUX GAUCHE (40%) */}
        <aside className="w-[40%] bg-slate-900/40 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="sticky top-0 bg-slate-950/80 p-4 border-b border-white/5 backdrop-blur-md z-10">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={12} className="text-blue-500" /> Flux Participants
              </h3>
           </div>
           
           <div className="p-3 space-y-2">
             {passageHistory.map((r) => {
               const is1 = r.rank === 1;
               const is2 = r.rank === 2;
               const is3 = r.rank === 3;
               const isSelected = activeRunner?.id === r.id;
               const currentRace = races.find(rc => rc.id === activeRaceIdForKernel);

               return (
                 <div 
                   key={`${r.id}-${r.lastTimestamp}`} 
                   onClick={() => setManuallySelectedId(r.id)}
                   className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                     isSelected ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'
                   } ${is1 ? 'shadow-[0_0_20px_rgba(251,191,36,0.3)] border-amber-400/50' : is2 ? 'shadow-[0_0_20px_rgba(203,213,225,0.3)] border-slate-300/50' : is3 ? 'shadow-[0_0_20px_rgba(217,119,6,0.3)] border-amber-700/50' : ''}`}
                 >
                    {(is1 || is2 || is3) && (
                      <div className="absolute top-2 right-2">
                        <Medal size={16} className={is1 ? 'text-amber-400' : is2 ? 'text-slate-300' : 'text-amber-700'} />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mono border ${isSelected ? 'bg-white text-blue-600' : 'bg-white/5 text-blue-400'}`}>
                        {r.bib}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-base uppercase truncate leading-none mb-1 ${isSelected ? 'text-white' : 'text-slate-100'}`}>{r.lastName}</p>
                        <p className={`text-[8px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {currentRace?.name} • #{r.rank} Scratch
                        </p>
                      </div>
                    </div>
                 </div>
               );
             })}
           </div>
        </aside>

        {/* DETAIL DROITE (60%) */}
        <section className="flex-1 flex flex-col p-8 overflow-y-auto scrollbar-hide relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[70%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

          {activeRunner ? (
            <div className="relative z-10 space-y-10 animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center">
                 <div className="bg-blue-600/20 border border-blue-500/30 text-blue-400 px-8 py-3 rounded-full font-black text-sm uppercase mb-8">
                   #{activeRunner.bib} • {activeRunner.lastCheckpointName}
                 </div>
                 <h2 className="text-8xl font-black tracking-tighter uppercase text-white mb-2 leading-none">{activeRunner.lastName}</h2>
                 <h3 className="text-4xl font-bold text-blue-500 uppercase">{activeRunner.firstName}</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2"><User size={14}/> Fiche Alain</p>
                   <div className="space-y-4">
                      {config.showCategory && <div className="flex justify-between"><span className="text-xs font-bold text-slate-400 uppercase">Caté</span><span className="text-sm font-black">{activeRunner.category} (#{activeRunner.rankCategory})</span></div>}
                      {config.showClub && <div className="flex justify-between"><span className="text-xs font-bold text-slate-400 uppercase">Club</span><span className="text-sm font-black truncate max-w-[150px]">{activeRunner.club || '---'}</span></div>}
                      {config.showCity && <div className="flex justify-between"><span className="text-xs font-bold text-slate-400 uppercase">Ville</span><span className="text-sm font-black uppercase">{activeRunner.city || '---'}</span></div>}
                   </div>
                </div>
                <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-center items-center text-center">
                   <p className="text-[10px] font-black text-blue-200 uppercase mb-2">Scratch</p>
                   <p className="text-7xl font-black text-white leading-none">#{activeRunner.rank}</p>
                   {config.showGaps && gaps && <div className="mt-4 px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-white mono">LDR GAP: {gaps}</div>}
                </div>
              </div>

              {config.showSplits && (
                <div className="bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase flex items-center gap-3"><Timer size={18} className="text-blue-500"/> Tronçons Nommés</h4>
                  </div>
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-white/5">
                      {activeRunner.splits.map((s, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.03]">
                          <td className="py-5 px-8 text-sm font-black text-blue-400 uppercase">{s.label}</td>
                          <td className="py-5 px-4 text-center text-xl font-black text-white mono">{s.duration}</td>
                          <td className="py-5 px-8 text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase"># {s.rankOnSegment}</p>
                             {config.showSpeed && <p className="text-xs font-bold text-blue-500/80 mono mt-1">{s.speed} KM/H</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-8">
               <Activity size={120} className="text-blue-500" />
               <p className="text-3xl font-black uppercase tracking-[0.6em]">Alain, en attente...</p>
            </div>
          )}
        </section>
      </main>

      {/* Alain Bottom Controls */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-6 z-50">
         <button onClick={() => setShowConfig(true)} className="w-16 h-16 bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center shadow-2xl active:scale-90 transition-all"><Settings2 size={28} /></button>
         <button onClick={() => setShowSearchModal(true)} className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-90 transition-all animate-in zoom-in-95"><Search size={36} /></button>
      </div>

      {/* CONFIG */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[100] flex items-end animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-slate-900 w-full rounded-t-[4rem] p-10 pb-16">
            <h3 className="text-2xl font-black uppercase mb-10">Réglages pour Alain</h3>
            <div className="grid grid-cols-2 gap-6">
               {Object.entries(config).map(([key, value]) => (
                 <button key={key} onClick={() => setConfig(prev => ({ ...prev, [key]: !value }))} className={`p-6 rounded-[2rem] border-2 font-black text-xs uppercase flex items-center justify-between ${value ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-600'}`}>
                    {key.replace('show', '')} <div className={`w-5 h-5 rounded-full border-2 ${value ? 'bg-blue-500 border-white' : 'border-slate-800'}`}></div>
                 </button>
               ))}
            </div>
            <button onClick={() => setShowConfig(false)} className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black uppercase mt-10">OK Alain</button>
          </div>
        </div>
      )}

      {/* SEARCH */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] p-10 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-10">
             <h2 className="text-4xl font-black uppercase">Rechercher Alain</h2>
             <button onClick={() => setShowSearchModal(false)} className="p-6 bg-white/5 rounded-full"><X size={40}/></button>
          </div>
          <div className="relative mb-10">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-600" size={40} />
            <input type="text" autoFocus placeholder="DOSSARD, NOM..." className="w-full bg-white/5 border-2 border-white/5 rounded-[2.5rem] py-10 pl-24 pr-10 text-5xl font-black text-white outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-4 scrollbar-hide">
             {searchResults.map(r => (
               <div key={r.id} onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }} className="bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between border border-white/5 active:bg-blue-600 transition-colors">
                  <div className="flex items-center gap-8">
                    <span className="text-5xl font-black mono text-blue-500">#{r.bib}</span>
                    <div className="text-left">
                      <p className="text-2xl font-black text-white uppercase leading-none mb-1">{r.fullName}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase">{r.category} • {r.club || 'INDIVIDUEL'}</p>
                    </div>
                  </div>
                  <ChevronRight size={32} className="text-slate-800" />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;