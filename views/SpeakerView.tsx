import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { RenderReadyResult, Passage } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { 
  Mic2, 
  Search, 
  Trophy, 
  MapPin, 
  Activity, 
  X,
  Zap,
  Building2,
  Clock,
  Navigation,
  Wind,
  Settings2,
  ChevronRight,
  User,
  Medal,
  Timer
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);

  // Configuration de visibilité
  const [config, setConfig] = useState({
    showClub: true,
    showCity: true,
    showCategory: true,
    showSpeed: true,
    showGaps: true,
    showSplits: true
  });

  const { kernelResults, races } = useRaceKernel(selectedRaceId);

  useEffect(() => {
    if (races.length > 0 && !selectedRaceId) setSelectedRaceId(races[0].id);
  }, [races, selectedRaceId]);

  useEffect(() => {
    const q = query(collection(db, 'passages'), orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        setLastPassage(snap.docs[0].data() as Passage);
      }
    });
    return () => unsub();
  }, []);

  // Détermination du coureur actif (priorité à la sélection manuelle, sinon dernier passage)
  const activeRunner = useMemo(() => {
    if (manuallySelectedId) {
      return kernelResults.find(r => r.id === manuallySelectedId) || null;
    }
    if (!lastPassage) return null;
    return kernelResults.find(r => r.id === lastPassage.participantId) || null;
  }, [manuallySelectedId, lastPassage, kernelResults]);

  // Calcul des écarts
  const gaps = useMemo(() => {
    if (!activeRunner || kernelResults.length === 0) return null;
    const leader = kernelResults.find(r => r.rank === 1);
    const predecessor = kernelResults.find(r => r.rank === activeRunner.rank - 1);
    
    return {
      gapLeader: leader && activeRunner.rank > 1 ? `+ ${formatMsToDisplay(activeRunner.netTimeMs - leader.netTimeMs).split('.')[0]}` : null,
      gapPredecessor: predecessor ? `+ ${formatMsToDisplay(activeRunner.netTimeMs - predecessor.netTimeMs).split('.')[0]}` : null
    };
  }, [activeRunner, kernelResults]);

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
      .slice(0, 50);
  }, [kernelResults]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
      
      {/* Header compact pour usage mobile */}
      <header className="bg-slate-900/80 border-b border-white/5 px-6 py-4 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
            <Mic2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">SPEAKER<span className="text-blue-500">PRO</span></h1>
          </div>
        </div>

        <select 
          className="bg-white/5 border-none font-black text-xs text-blue-400 outline-none cursor-pointer px-4 py-2 rounded-lg"
          value={selectedRaceId}
          onChange={e => { setSelectedRaceId(e.target.value); setManuallySelectedId(null); }}
        >
          {races.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
        </select>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: LIVE FEED (40%) */}
        <aside className="w-[40%] bg-slate-900/40 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="sticky top-0 bg-slate-950/80 p-4 border-b border-white/5 backdrop-blur-md z-10 flex justify-between items-center">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={12} className="text-blue-500" /> Flux Temps Réel
              </h3>
              <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase">{passageHistory.length} passés</span>
           </div>
           
           <div className="p-3 space-y-2">
             {passageHistory.map((r) => {
               const isTop3 = r.rank <= 3 || r.rankCategory <= 3;
               const isSelected = activeRunner?.id === r.id;
               return (
                 <div 
                   key={`${r.id}-${r.lastTimestamp}`} 
                   onClick={() => setManuallySelectedId(r.id)}
                   className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                     isSelected 
                      ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-900/20' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                   } ${isTop3 && !isSelected ? 'shadow-[0_0_15px_rgba(245,158,11,0.2)] border-amber-500/30' : ''}`}
                 >
                    {isTop3 && (
                      <div className="absolute top-0 right-0 p-1">
                        <Medal size={14} className={isSelected ? 'text-white/40' : 'text-amber-500'} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg mono border transition-colors ${
                        isSelected ? 'bg-white text-blue-600 border-white' : 'bg-white/5 text-blue-400 border-white/10'
                      }`}>
                        {r.bib}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-sm uppercase truncate leading-none mb-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {r.lastName}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            #{r.rank} SCRATCH
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className={isSelected ? 'text-white' : 'text-slate-700'} />
                    </div>
                 </div>
               );
             })}
           </div>
        </aside>

        {/* RIGHT COLUMN: RUNNER DETAIL (60%) */}
        <section className="flex-1 flex flex-col p-6 overflow-y-auto scrollbar-hide relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

          {activeRunner ? (
            <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-300">
              
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center">
                 <div className="bg-blue-600/20 border border-blue-500/30 text-blue-400 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-6">
                   #{activeRunner.bib} • {activeRunner.lastCheckpointName}
                 </div>
                 <h2 className="text-7xl font-black tracking-tighter uppercase leading-none text-white mb-2">
                   {activeRunner.lastName}
                 </h2>
                 <h3 className="text-3xl font-bold text-blue-500 uppercase tracking-tight">
                   {activeRunner.firstName}
                 </h3>
              </div>

              {/* Identity & Gaps Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Statistiques Directes</p>
                   <div className="space-y-3">
                      {config.showCategory && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">CATÉGORIE</span>
                          <span className="text-xs font-black text-white">{activeRunner.category} (#{activeRunner.rankCategory})</span>
                        </div>
                      )}
                      {config.showClub && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">CLUB / TEAM</span>
                          <span className="text-xs font-black text-white truncate max-w-[120px]">{activeRunner.club || '---'}</span>
                        </div>
                      )}
                      {config.showGaps && gaps?.gapLeader && (
                         <div className="flex justify-between items-center pt-2 border-t border-white/5">
                           <span className="text-[10px] font-bold text-amber-500">VS LEADER</span>
                           <span className="text-xs font-black text-amber-500 mono">{gaps.gapLeader}</span>
                         </div>
                      )}
                   </div>
                </div>

                <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-900/20 text-center flex flex-col justify-center">
                   <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Position Scratch</p>
                   <p className="text-5xl font-black text-white leading-none">#{activeRunner.rank}</p>
                   {config.showGaps && gaps?.gapPredecessor && (
                      <p className="text-[9px] font-black text-blue-100 mt-2 mono">{gaps.gapPredecessor} sur préc.</p>
                   )}
                </div>
              </div>

              {/* Splits Detail */}
              {config.showSplits && (
                <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Télémétrie des Tronçons</h4>
                    <Timer size={14} className="text-blue-500" />
                  </div>
                  <div className="max-h-60 overflow-y-auto scrollbar-hide">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-white/5">
                        {activeRunner.splits.map((s, idx) => (
                          <tr key={idx} className="group hover:bg-white/[0.02]">
                            <td className="py-4 px-6">
                               <p className="text-[9px] font-black text-blue-400 uppercase truncate max-w-[100px]">{s.label}</p>
                            </td>
                            <td className="py-4 px-4 text-center">
                               <p className="text-sm font-black text-white mono">{s.duration}</p>
                            </td>
                            <td className="py-4 px-6 text-right">
                               <p className="text-[9px] font-black text-slate-500 uppercase"># {s.rankOnSegment}</p>
                               {config.showSpeed && (
                                 <p className="text-[8px] font-bold text-blue-500/60 mono">{s.speed} km/h</p>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeRunner.splits.length === 0 && (
                       <p className="py-10 text-center text-[10px] font-black text-slate-700 uppercase italic">En attente de data...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-6">
               <Activity size={80} className="text-blue-500" />
               <p className="text-xl font-black uppercase tracking-[0.4em]">Awaiting Pack...</p>
            </div>
          )}
        </section>
      </main>

      {/* FLOATING ACTION AREA (ONE-HAND) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
         <button 
           onClick={() => setShowConfig(true)}
           className="w-14 h-14 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center shadow-xl border border-white/5 active:scale-95 transition-all"
         >
           <Settings2 size={24} />
         </button>
         <button 
           onClick={() => setShowSearchModal(true)}
           className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-600/40 active:scale-95 transition-all animate-in zoom-in-95"
         >
           <Search size={32} />
         </button>
      </div>

      {/* CONFIG MODAL */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-end animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-slate-900 w-full rounded-t-[3rem] p-8 pb-12 border-t border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black uppercase tracking-tight">Smart Config</h3>
               <button onClick={() => setShowConfig(false)} className="p-3 bg-white/5 rounded-full"><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               {Object.entries(config).map(([key, value]) => (
                 <button 
                   key={key}
                   onClick={() => setConfig(prev => ({ ...prev, [key]: !value }))}
                   className={`p-5 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-between ${
                     value ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-500'
                   }`}
                 >
                    {key.replace('show', '')}
                    <div className={`w-4 h-4 rounded-full border-2 ${value ? 'bg-blue-500 border-white' : 'border-slate-700'}`}></div>
                 </button>
               ))}
            </div>
            <button 
              onClick={() => setShowConfig(false)}
              className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase text-sm mt-8 shadow-xl"
            >
              Appliquer & Fermer
            </button>
          </div>
        </div>
      )}

      {/* SEARCH OVERLAY */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] p-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-3xl font-black uppercase">Recherche</h2>
             <button onClick={() => setShowSearchModal(false)} className="p-4 bg-white/5 rounded-full"><X size={32}/></button>
          </div>
          
          <div className="relative mb-8">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={32} />
            <input 
              type="text" 
              autoFocus
              placeholder="DOSSARD, NOM..."
              className="w-full bg-white/5 border-2 border-white/5 rounded-[2rem] py-8 pl-20 pr-8 text-4xl font-black text-white outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
             {searchResults.map(r => (
               <div 
                 key={r.id} 
                 onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }}
                 className="bg-white/5 p-6 rounded-[2rem] flex items-center justify-between border border-white/5 active:bg-blue-600 transition-colors"
               >
                  <div className="flex items-center gap-6">
                    <span className="text-4xl font-black mono text-blue-500 group-active:text-white">#{r.bib}</span>
                    <div className="text-left">
                      <p className="text-xl font-black text-white uppercase leading-none mb-1">{r.fullName}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase">{r.category} • {r.club || 'INDIVIDUEL'}</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-700" />
               </div>
             ))}
             {searchTerm && searchResults.length === 0 && (
               <p className="text-center py-20 text-slate-700 font-black uppercase tracking-widest">Aucun résultat</p>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;