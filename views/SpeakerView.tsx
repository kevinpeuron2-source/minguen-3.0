import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Passage, Race, ParticipantStatus, RenderReadyResult } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Mic2, Search, Activity, X, Navigation, Medal, Timer, Building2, MapPin, Plus, Minus, User, Zap, ChevronRight, TrendingUp, Clock
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [lastPassageId, setLastPassageId] = useState<string | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeRaceId, setActiveRaceId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(16);

  // Charger les courses pour alimenter le sélecteur d'épreuve si besoin
  useEffect(() => {
    onSnapshot(collection(db, 'races'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      // Sélectionner la première course par défaut pour le Kernel initial
      if (list.length > 0 && !activeRaceId) setActiveRaceId(list[0].id);
    });
  }, [activeRaceId]);

  // Écouter les derniers passages pour l'automatisation de la fiche détail
  useEffect(() => {
    const q = query(collection(db, 'passages'), orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const passage = snap.docs[0].data() as Passage;
        setLastPassageId(passage.participantId);
        
        // Auto-switch de la course surveillée si un passage arrive
        onSnapshot(collection(db, 'participants'), pSnap => {
            const p = pSnap.docs.find(d => d.id === passage.participantId)?.data();
            if (p && p.raceId !== activeRaceId) setActiveRaceId(p.raceId);
        });
      }
    });
    return () => unsub();
  }, [activeRaceId]);

  // Récupération des données via le Kernel partagé
  const { kernelResults } = useRaceKernel(activeRaceId);

  // Sélectionner le coureur à afficher dans la fiche détail (60%)
  const activeRunner = useMemo(() => {
    if (manuallySelectedId) return kernelResults.find(r => r.id === manuallySelectedId) || null;
    if (lastPassageId) return kernelResults.find(r => r.id === lastPassageId) || null;
    return kernelResults[0] || null;
  }, [manuallySelectedId, lastPassageId, kernelResults]);

  // Flux des derniers passages triés par heure (40%)
  const arrivalHistory = useMemo(() => {
    return [...kernelResults]
      .filter(r => r.lastTimestamp > 0)
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .slice(0, 20);
  }, [kernelResults]);

  // Calcul de l'écart avec le premier (leader)
  const timeGap = useMemo(() => {
    if (!activeRunner || activeRunner.rank === 1) return null;
    const leader = kernelResults.find(r => r.rank === 1);
    if (!leader) return null;
    return `+ ${formatMsToDisplay(activeRunner.netTimeMs - leader.netTimeMs).split('.')[0]}`;
  }, [activeRunner, kernelResults]);

  // Recherche rapide
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return kernelResults.filter(r => 
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.bib.includes(searchTerm)
    ).slice(0, 5);
  }, [searchTerm, kernelResults]);

  // Couleurs des podiums Scratch
  const getScratchGlow = (rank: number) => {
    if (rank === 1) return 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]';
    if (rank === 2) return 'border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)]';
    if (rank === 3) return 'border-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.3)]';
    return 'border-white/5';
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-slate-300';
    if (rank === 3) return 'text-amber-700';
    return 'text-slate-600';
  };

  return (
    <div 
      className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none transition-all duration-300"
      style={{ fontSize: `${zoomLevel}px` }}
    >
      {/* HEADER DE CONTRÔLE (ZOOM + SELECTEUR) */}
      <header className="h-[10vh] min-h-[70px] bg-slate-900 border-b border-white/5 px-6 flex justify-between items-center z-40 shrink-0 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-600/20">
            <Mic2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">ALAIN <span className="text-indigo-500">PRO-VIEW</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> LIVE SYNC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select 
            className="hidden md:block bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-black text-xs uppercase tracking-widest text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
            value={activeRaceId}
            onChange={e => setActiveRaceId(e.target.value)}
          >
            {races.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
          </select>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button onClick={() => setZoomLevel(prev => Math.max(10, prev - 2))} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90 transition-transform"><Minus size={18} /></button>
            <button onClick={() => setZoomLevel(prev => Math.min(24, prev + 2))} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90 transition-transform"><Plus size={18} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HAUT: FLUX DES ARRIVÉES (40%) */}
        <section className="h-[40vh] bg-slate-900/60 border-b border-white/10 flex flex-col overflow-y-auto scrollbar-hide shadow-inner">
           <div className="sticky top-0 bg-slate-950/95 p-3 border-b border-white/5 backdrop-blur-md z-10 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] flex items-center gap-2">
                <Navigation size={14} className="text-indigo-500" /> Flux Direct des Pointages
              </h3>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md">
                {kernelResults.length} Inscrits
              </span>
           </div>
           
           <div className="p-4 flex flex-col gap-3">
             {arrivalHistory.length === 0 ? (
                <div className="py-20 text-center opacity-10 flex flex-col items-center justify-center gap-4">
                  <Zap size={64} />
                  <p className="text-xl font-black uppercase tracking-widest">En attente des premiers passages...</p>
                </div>
             ) : (
               arrivalHistory.map((r) => {
                 const isScratchPodium = r.rank <= 3;
                 const isCategoryPodium = r.rankCategory <= 3;
                 const isSelected = activeRunner?.id === r.id;
                 
                 return (
                   <div 
                     key={r.id} 
                     onClick={() => setManuallySelectedId(r.id)}
                     className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden shrink-0 group ${
                       isSelected ? 'bg-indigo-600 border-indigo-400 shadow-2xl scale-[1.02] z-10' : 'bg-white/5'
                     } ${isScratchPodium ? getScratchGlow(r.rank) : ''}`}
                   >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mono border-2 ${
                            isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-white/5 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {r.bib}
                          </div>
                          <div>
                            <p className={`font-black text-lg uppercase truncate tracking-tight leading-tight ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                              {r.lastName} <span className="font-bold opacity-60">{r.firstName}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                               <p className={`text-[10px] font-bold uppercase ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                                {r.lastCheckpointName}
                               </p>
                               <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-slate-700'}`}></span>
                               <p className={`text-[10px] font-black uppercase ${isSelected ? 'text-white' : 'text-indigo-400'}`}>
                                 #{r.rank} SCRATCH
                               </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {isCategoryPodium && (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-black text-[9px] uppercase shadow-lg ${
                               isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-500 border border-amber-500/20'
                            }`}>
                              <Medal size={12} className={getMedalColor(r.rankCategory)} />
                              {r.rankCategory === 1 ? '1er' : `${r.rankCategory}ème`} {r.category}
                            </div>
                          )}
                          {!isCategoryPodium && (
                             <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${isSelected ? 'bg-indigo-500/50 text-white' : 'bg-white/5 text-slate-500'}`}>
                               #{r.rankCategory} {r.category}
                             </span>
                          )}
                        </div>
                      </div>
                   </div>
                 );
               })
             )}
           </div>
        </section>

        {/* BAS: FICHE DÉTAILLÉE (60%) */}
        <section className="h-[50vh] flex flex-col p-8 overflow-y-auto scrollbar-hide relative bg-black/40 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-20">
          {activeRunner ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
              {/* NOM ET VILLE */}
              <div className="text-center bg-white/5 p-8 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
                 <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-4">#{activeRunner.bib} • DERNIER PASSAGE : {activeRunner.lastCheckpointName}</p>
                 <h2 className="text-7xl font-black uppercase text-white leading-none mb-2 tracking-tighter group-hover:scale-[1.02] transition-transform">{activeRunner.lastName}</h2>
                 <h3 className="text-3xl font-bold text-indigo-500 uppercase tracking-tight mb-4">{activeRunner.firstName}</h3>
                 
                 <div className="flex justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-slate-400 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                       <Building2 size={18} className="text-indigo-400" />
                       <span className="font-black text-xs uppercase">{activeRunner.club || 'INDIVIDUEL'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                       <MapPin size={18} className="text-indigo-400" />
                       <span className="font-black text-xs uppercase">{activeRunner.city || '---'}</span>
                    </div>
                 </div>
              </div>

              {/* RANGS ET CHRONO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-600 p-8 rounded-[3rem] shadow-2xl flex items-center justify-between border-t border-white/20">
                   <div>
                     <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">Classement Scratch</p>
                     <p className="text-7xl font-black text-white leading-none tracking-tighter">#{activeRunner.rank}</p>
                   </div>
                   {timeGap && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">Écart Leader</p>
                        <p className="text-3xl font-black text-white mono">{timeGap}</p>
                      </div>
                   )}
                </div>

                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 flex items-center justify-between group">
                   <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Rang {activeRunner.category}</p>
                     <p className="text-7xl font-black text-indigo-500 leading-none tracking-tighter">#{activeRunner.rankCategory}</p>
                   </div>
                   <div className="text-right">
                      <Medal size={48} className={getMedalColor(activeRunner.rankCategory)} />
                   </div>
                </div>
              </div>

              {/* TABLEAU DES TRONÇONS NOMMÉS */}
              <div className="bg-slate-900/80 rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-6 bg-white/[0.03] flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <Timer size={24} className="text-indigo-500" />
                    <h4 className="text-[12px] font-black text-slate-300 uppercase tracking-[0.3em]">Tronçons Officiels</h4>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeRunner.splits.length} segments</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/40 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <th className="py-4 px-8">Tronçon de course</th>
                        <th className="py-4 px-2 text-center">Temps</th>
                        <th className="py-4 px-8 text-right"># / Vitesse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeRunner.splits.map((s, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-6 px-8">
                             <div className="flex flex-col">
                               <span className="text-sm font-black text-indigo-400 uppercase leading-none">{s.label}</span>
                               <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase tracking-widest">Segment validé</span>
                             </div>
                          </td>
                          <td className="py-6 px-2 text-center">
                            <span className="text-3xl font-black text-white mono tracking-tighter">{s.duration}</span>
                          </td>
                          <td className="py-6 px-8 text-right">
                             <p className="text-xs font-black text-slate-400 uppercase">RANG : {s.rankOnSegment}</p>
                             <div className="flex items-center justify-end gap-2 text-indigo-500/80 mt-1">
                                <TrendingUp size={12} />
                                <span className="text-[10px] font-bold mono">{s.speed} KM/H</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {activeRunner.splits.length === 0 && (
                    <div className="py-12 text-center opacity-20 flex flex-col items-center gap-3">
                       <Clock size={40} />
                       <p className="text-xs font-black uppercase tracking-widest">En attente de données de tronçon...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-8">
               <User size={128} className="text-indigo-500 animate-pulse" />
               <p className="text-2xl font-black uppercase tracking-[0.8em]">Alain, en attente de direct...</p>
            </div>
          )}
        </section>
      </main>

      {/* RECHERCHE ET CONFIGURATION (Boutons flottants) */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-6 z-50">
         <button 
           onClick={() => setShowSearchModal(true)} 
           className="w-20 h-20 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.4)] active:scale-90 transition-all border-4 border-[#020617]"
         >
           <Search size={40} />
         </button>
      </div>

      {/* MODALE DE RECHERCHE CONCURRENT */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] p-8 md:p-20 animate-in fade-in duration-300">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-16">
               <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Rechercher Alain</h2>
               <button onClick={() => setShowSearchModal(false)} className="p-6 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-slate-400"><X size={48}/></button>
            </div>
            
            <div className="relative mb-20">
               <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-indigo-500" size={40} />
               <input 
                 type="text" 
                 autoFocus 
                 placeholder="DOSSARD OU NOM..." 
                 className="w-full bg-white/5 border-b-4 border-indigo-500/30 focus:border-indigo-500 rounded-t-[3rem] py-12 pl-28 pr-12 text-6xl font-black text-white outline-none transition-all placeholder:text-white/5" 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>

            <div className="space-y-6">
               {searchResults.map(r => (
                 <div 
                   key={r.id} 
                   onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }} 
                   className="bg-white/5 p-10 rounded-[3rem] flex items-center justify-between border border-white/10 hover:bg-indigo-600 transition-all cursor-pointer group"
                 >
                    <div className="flex items-center gap-10">
                      <span className="text-7xl font-black mono text-indigo-500 group-hover:text-white tracking-tighter">#{r.bib}</span>
                      <div>
                        <p className="text-3xl font-black text-white uppercase leading-none">{r.fullName}</p>
                        <p className="text-sm font-black text-slate-500 group-hover:text-indigo-200 uppercase mt-3 tracking-widest">{r.category} • {r.club}</p>
                      </div>
                    </div>
                    <ChevronRight size={48} className="text-slate-800 group-hover:text-white" />
                 </div>
               ))}
               {searchTerm && searchResults.length === 0 && (
                  <div className="text-center py-20 opacity-20">
                    <p className="text-2xl font-black uppercase tracking-widest">Aucun résultat pour "{searchTerm}"</p>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default SpeakerView;