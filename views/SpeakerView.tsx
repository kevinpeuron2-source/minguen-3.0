import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { RenderReadyResult, Passage, Race } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Mic2, Search, Activity, X, Navigation, Wind, Settings2, ChevronRight, User, Medal, Timer, Building2, MapPin, Plus, Minus
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeRaceIdForKernel, setActiveRaceIdForKernel] = useState<string>('');
  
  // Système de Zoom pour Alain
  const [zoomLevel, setZoomLevel] = useState(14); // Base de 14px pour mobile

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
    <div 
      className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none transition-all duration-200"
      style={{ fontSize: `${zoomLevel}px` }}
    >
      
      {/* Header Alain - Redimensionné pour Mobile */}
      <header className="bg-slate-900 border-b border-white/5 px-4 py-3 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Mic2 size={18} className="text-white" /></div>
          <h1 className="text-sm font-black tracking-tight uppercase">ALAIN <span className="text-blue-500">LIVE</span></h1>
        </div>

        {/* Contrôles de Zoom */}
        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setZoomLevel(prev => Math.max(10, prev - 1))}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90 transition-all"
          >
            <Minus size={16} />
          </button>
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <button 
            onClick={() => setZoomLevel(prev => Math.min(24, prev + 1))}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* FLUX GAUCHE (40%) - Cartes plus fines pour mobile */}
        <aside className="w-[40%] bg-slate-900/40 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="sticky top-0 bg-slate-950/80 p-3 border-b border-white/5 backdrop-blur-md z-10 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={10} className="text-blue-500" /> Flux
              </h3>
              <span className="text-[9px] font-black text-slate-600 mono">{passageHistory.length}</span>
           </div>
           
           <div className="p-1.5 space-y-1.5">
             {passageHistory.map((r) => {
               const is1 = r.rank === 1;
               const is2 = r.rank === 2;
               const is3 = r.rank === 3;
               const isSelected = activeRunner?.id === r.id;
               const currentRace = races.find(rc => rc.id === r.id); // On utilise l'ID pour la démo Alain

               return (
                 <div 
                   key={`${r.id}-${r.lastTimestamp}`} 
                   onClick={() => setManuallySelectedId(r.id)}
                   className={`p-2 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                     isSelected ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-white/5 border-white/5'
                   } ${is1 ? 'border-amber-400/40' : is2 ? 'border-slate-300/40' : is3 ? 'border-amber-700/40' : ''}`}
                 >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm mono border ${isSelected ? 'bg-white text-blue-600' : 'bg-white/5 text-blue-400 border-white/5'}`}>
                        {r.bib}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-xs uppercase truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-100'}`}>{r.lastName}</p>
                        <p className={`text-[8px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          #{r.rank} SCR
                        </p>
                      </div>
                      {(is1 || is2 || is3) && (
                         <Medal size={12} className={is1 ? 'text-amber-400' : is2 ? 'text-slate-300' : 'text-amber-700'} />
                      )}
                    </div>
                 </div>
               );
             })}
           </div>
        </aside>

        {/* DETAIL DROITE (60%) - Ultra Compact */}
        <section className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-hide relative bg-black/20">
          {activeRunner ? (
            <div className="relative z-10 space-y-4 animate-in fade-in duration-300">
              
              {/* Profile Card Alain */}
              <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/5">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">#{activeRunner.bib} • {activeRunner.lastCheckpointName}</p>
                 <h2 className="text-3xl font-black uppercase text-white leading-none mb-1">{activeRunner.lastName}</h2>
                 <h3 className="text-lg font-bold text-blue-500 uppercase">{activeRunner.firstName}</h3>
              </div>

              {/* Identity Compact Grid */}
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                   {config.showCategory && (
                     <div className="flex items-center gap-3 text-xs">
                        <Activity size={14} className="text-slate-500 shrink-0" />
                        <span className="text-slate-400 uppercase font-bold text-[10px] w-16">Caté</span>
                        <span className="font-black truncate text-white">{activeRunner.category} (#{activeRunner.rankCategory})</span>
                     </div>
                   )}
                   {config.showClub && (
                     <div className="flex items-center gap-3 text-xs">
                        <Building2 size={14} className="text-slate-500 shrink-0" />
                        <span className="text-slate-400 uppercase font-bold text-[10px] w-16">Club</span>
                        <span className="font-black truncate text-white">{activeRunner.club || 'INDIVIDUEL'}</span>
                     </div>
                   )}
                   {config.showCity && (
                     <div className="flex items-center gap-3 text-xs">
                        <MapPin size={14} className="text-slate-500 shrink-0" />
                        <span className="text-slate-400 uppercase font-bold text-[10px] w-16">Ville</span>
                        <span className="font-black truncate text-white uppercase">{activeRunner.city || '---'}</span>
                     </div>
                   )}
                </div>

                <div className="bg-blue-600 p-3 rounded-xl shadow-lg flex items-center justify-between px-6">
                   <div className="text-left">
                     <p className="text-[9px] font-black text-blue-200 uppercase">Scratch</p>
                     <p className="text-3xl font-black text-white leading-none">#{activeRunner.rank}</p>
                   </div>
                   {config.showGaps && gaps && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-blue-200 uppercase">GAP LDR</p>
                        <p className="text-sm font-black text-white mono">{gaps}</p>
                      </div>
                   )}
                </div>
              </div>

              {/* Splits - Table Condensée */}
              {config.showSplits && (
                <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Timer size={14} className="text-blue-500"/> TRONÇONS</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20 text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                          <th className="py-2 px-3">Segment</th>
                          <th className="py-2 px-2 text-center">Temps</th>
                          <th className="py-2 px-3 text-right">#</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeRunner.splits.map((s, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.03]">
                            <td className="py-2 px-3 text-[10px] font-black text-blue-400 uppercase truncate max-w-[80px]">{s.label}</td>
                            <td className="py-2 px-2 text-center text-xs font-black text-white mono">{s.duration}</td>
                            <td className="py-2 px-3 text-right">
                               <p className="text-[10px] font-black text-slate-500">#{s.rankOnSegment}</p>
                               {config.showSpeed && <p className="text-[8px] font-bold text-blue-500/60 mono">{s.speed}k</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeRunner.splits.length === 0 && (
                     <p className="py-6 text-center text-[9px] font-black text-slate-700 uppercase italic">Awaiting telemetry...</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-4">
               <Activity size={48} className="text-blue-500" />
               <p className="text-sm font-black uppercase tracking-widest">Alain, ready...</p>
            </div>
          )}
        </section>
      </main>

      {/* Alain Bottom Controls - Spacés pour Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-5 z-50">
         <button 
          onClick={() => setShowConfig(true)} 
          className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center shadow-xl border border-white/5 active:scale-90"
         >
           <Settings2 size={20} />
         </button>
         <button 
          onClick={() => setShowSearchModal(true)} 
          className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 animate-in zoom-in-95"
         >
           <Search size={24} />
         </button>
      </div>

      {/* MODAL CONFIG COMPACTE */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-end animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-slate-900 w-full rounded-t-[2.5rem] p-6 pb-10">
            <h3 className="text-lg font-black uppercase mb-6 flex items-center gap-3"><Settings2 size={18}/> Affichage Alain</h3>
            <div className="grid grid-cols-2 gap-3">
               {[
                 { id: 'showClub', label: 'Club' },
                 { id: 'showCity', label: 'Ville' },
                 { id: 'showCategory', label: 'Caté' },
                 { id: 'showSpeed', label: 'Vitesse' },
                 { id: 'showGaps', label: 'Écarts' },
                 { id: 'showSplits', label: 'Tronçons' },
               ].map(item => (
                 <button 
                  key={item.id} 
                  onClick={() => setConfig(prev => ({ ...prev, [item.id]: !prev[item.id] }))} 
                  className={`p-4 rounded-xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-between ${config[item.id] ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-600'}`}
                 >
                    {item.label} <div className={`w-3 h-3 rounded-full border-2 ${config[item.id] ? 'bg-blue-500 border-white' : 'border-slate-800'}`}></div>
                 </button>
               ))}
            </div>
            <button onClick={() => setShowConfig(false)} className="w-full bg-white text-slate-950 py-4 rounded-xl font-black uppercase text-sm mt-6 shadow-xl">Appliquer</button>
          </div>
        </div>
      )}

      {/* RECHERCHE COMPACTE */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-[100] p-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-black uppercase">Recherche</h2>
             <button onClick={() => setShowSearchModal(false)} className="p-3 bg-white/5 rounded-full"><X size={24}/></button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={24} />
            <input type="text" autoFocus placeholder="DOSSARD, NOM..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-2xl font-black text-white outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
             {searchResults.map(r => (
               <div key={r.id} onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5 active:bg-blue-600">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black mono text-blue-500">#{r.bib}</span>
                    <div className="text-left">
                      <p className="text-sm font-black text-white uppercase truncate w-40">{r.fullName}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase">{r.category}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-800" />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;