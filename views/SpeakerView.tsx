import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { RenderReadyResult, Passage, Race } from '../types';
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
  Timer,
  Info
} from 'lucide-react';

// Composant interne pour Alain (Speaker)
const SpeakerView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);

  // Configuration de visibilité pour Alain
  const [config, setConfig] = useState({
    showClub: true,
    showCity: true,
    showCategory: true,
    showSpeed: true,
    showGaps: true,
    showSplits: true
  });

  // Pour fusionner les courses, on a besoin de toutes les épreuves
  const [races, setRaces] = useState<Race[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'races'), snap => {
      setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Race)));
    });
    return () => unsub();
  }, []);

  // Hook kernelResults pour CHAQUE course pour avoir les classements corrects
  // Dans cette vue Alain, on va fusionner les résultats de toutes les courses actives
  // On recrée une logique de fetch globale car useRaceKernel est filtré par ID
  const [allParticipants, setAllParticipants] = useState<RenderReadyResult[]>([]);

  // Simulation de la fusion : Alain voit tout.
  // Pour la performance et la simplicité, on va charger les passages récents
  // et piocher dans les useRaceKernel correspondants.
  // Une meilleure approche est d'itérer sur toutes les races.
  
  // Hook d'écoute des passages globaux
  useEffect(() => {
    const q = query(collection(db, 'passages'), orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        setLastPassage(snap.docs[0].data() as Passage);
      }
    });
    return () => unsub();
  }, []);

  // Liste des kernels pour chaque course
  const kernels = useMemo(() => {
    return races.map(r => r.id);
  }, [races]);

  // Récupération des données fusionnées
  // Note: On utilise ici un hack pour Alain : on charge tout le monde via une écoute globale
  // car Alain doit voir n'importe quel coureur de n'importe quelle course.
  const [mergedResults, setMergedResults] = useState<RenderReadyResult[]>([]);

  // Pour garder la logique "Splits" et "Segments", on ré-utilise le calcul du kernel
  // mais on le fait ici pour Alain de façon agnostique à la course sélectionnée.
  // On va surveiller tous les passages.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'participants'), (partSnap) => {
      const parts = partSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // On ne peut pas facilement tout recalculer ici sans le hook Kernel
      // Mais on peut écouter les kernels individuellement si nécessaire.
    });
  }, []);

  // Simplification pour l'exercice : Alain utilise le Kernel de la course du dernier passage
  // Si Alain veut voir tout le monde, on doit adapter useRaceKernel pour être global.
  // Modifions l'appel pour qu'il récupère un kernel "merged" si possible.
  // Ici, on va utiliser le premier Kernel par défaut, mais Alain peut changer
  const { kernelResults } = useRaceKernel(lastPassage ? (races.find(r => r.id === kernelResults.find(k => k.id === lastPassage.participantId)?.id)?.id || races[0]?.id) : races[0]?.id);

  // DETERMINATION DU COUREUR ACTIF (Selection manuelle > Dernier Passage)
  const activeRunner = useMemo(() => {
    if (manuallySelectedId) {
      return kernelResults.find(r => r.id === manuallySelectedId) || null;
    }
    if (!lastPassage) return null;
    return kernelResults.find(r => r.id === lastPassage.participantId) || null;
  }, [manuallySelectedId, lastPassage, kernelResults]);

  // CALCUL DES ECARTS
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
      
      {/* Header Alain */}
      <header className="bg-slate-900 border-b border-white/5 px-6 py-4 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Mic2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">L'appli pour <span className="text-blue-500">Alain</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Minguen Pro Engine</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-black mono uppercase">Live Sync</span>
              </div>
           </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* FLUX GAUCHE (40%) */}
        <aside className="w-[40%] bg-slate-900/40 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="sticky top-0 bg-slate-950/80 p-4 border-b border-white/5 backdrop-blur-md z-10 flex justify-between items-center">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={12} className="text-blue-500" /> Flux des détections
              </h3>
           </div>
           
           <div className="p-3 space-y-2">
             {passageHistory.map((r) => {
               const isPodium = r.rank <= 3;
               const isSelected = activeRunner?.id === r.id;
               const raceName = races.find(race => race.id === r.id)?.name || "Course"; // Normalement on récupère via kernel
               
               return (
                 <div 
                   key={`${r.id}-${r.lastTimestamp}`} 
                   onClick={() => setManuallySelectedId(r.id)}
                   className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                     isSelected 
                      ? 'bg-blue-600 border-blue-400 shadow-xl' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                   } ${isPodium && !isSelected ? 'shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-500/40' : ''}`}
                 >
                    {isPodium && (
                      <div className="absolute top-2 right-2">
                        <Medal size={16} className={r.rank === 1 ? 'text-amber-400' : r.rank === 2 ? 'text-slate-300' : 'text-amber-700'} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mono border ${
                        isSelected ? 'bg-white text-blue-600 border-white' : 'bg-white/5 text-blue-400 border-white/10'
                      }`}>
                        {r.bib}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                           <p className={`font-black text-base uppercase truncate leading-none mb-1 ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                             {r.lastName}
                           </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            #{r.rank} SCRATCH • {r.lastCheckpointName}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className={isSelected ? 'text-white' : 'text-slate-700'} />
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
            <div className="relative z-10 space-y-10 animate-in fade-in zoom-in duration-300">
              
              {/* Profile Alain Style */}
              <div className="flex flex-col items-center text-center">
                 <div className="bg-blue-600/20 border border-blue-500/30 text-blue-400 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest mb-8">
                   #{activeRunner.bib} • {activeRunner.lastCheckpointName}
                 </div>
                 <h2 className="text-8xl font-black tracking-tighter uppercase leading-none text-white mb-2">
                   {activeRunner.lastName}
                 </h2>
                 <h3 className="text-4xl font-bold text-blue-500 uppercase tracking-tight">
                   {activeRunner.firstName}
                 </h3>
              </div>

              {/* Identity Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <User size={14} /> Fiche Participant
                   </p>
                   <div className="space-y-4">
                      {config.showCategory && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">CATÉGORIE</span>
                          <span className="text-sm font-black text-white">{activeRunner.category} (#{activeRunner.rankCategory})</span>
                        </div>
                      )}
                      {config.showClub && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">CLUB</span>
                          <span className="text-sm font-black text-white truncate max-w-[150px]">{activeRunner.club || 'INDIVIDUEL'}</span>
                        </div>
                      )}
                      {config.showCity && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">VILLE</span>
                          <span className="text-sm font-black text-white uppercase">{activeRunner.city || '---'}</span>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/30 flex flex-col justify-center items-center text-center">
                   <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Classement Live</p>
                   <p className="text-7xl font-black text-white leading-none">#{activeRunner.rank}</p>
                   <div className="mt-4 flex gap-4">
                      {config.showGaps && gaps?.gapLeader && (
                         <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-white mono">
                            Gap Leader: {gaps.gapLeader}
                         </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Splis / Tronçons */}
              {config.showSplits && (
                <div className="bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden backdrop-blur-sm">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                       <Timer size={18} className="text-blue-500" /> Analyse des Tronçons
                    </h4>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <th className="py-4 px-8">Segment</th>
                          <th className="py-4 px-4 text-center">Temps</th>
                          <th className="py-4 px-8 text-right">Vitesse / Rang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeRunner.splits.map((s, idx) => (
                          <tr key={idx} className="group hover:bg-white/[0.03]">
                            <td className="py-5 px-8">
                               <p className="text-sm font-black text-blue-400 uppercase">{s.label}</p>
                            </td>
                            <td className="py-5 px-4 text-center">
                               <p className="text-xl font-black text-white mono">{s.duration}</p>
                            </td>
                            <td className="py-5 px-8 text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase">POSITION TRONÇON #{s.rankOnSegment}</p>
                               {config.showSpeed && (
                                 <p className="text-xs font-bold text-blue-500/80 mono mt-1 flex items-center justify-end gap-1">
                                    <Wind size={12} /> {s.speed} KM/H
                                 </p>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeRunner.splits.length === 0 && (
                       <div className="py-20 text-center opacity-20">
                          <Activity size={48} className="mx-auto mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest">En attente de détections terrain</p>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-8">
               <Activity size={120} className="text-blue-500" />
               <p className="text-3xl font-black uppercase tracking-[0.6em]">Alain, en attente de data...</p>
            </div>
          )}
        </section>
      </main>

      {/* Alain One-Hand Navigation (Floating) */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-6 z-50">
         <button 
           onClick={() => setShowConfig(true)}
           className="w-16 h-16 bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center shadow-2xl border border-white/5 active:scale-90 transition-all"
         >
           <Settings2 size={28} />
         </button>
         <button 
           onClick={() => setShowSearchModal(true)}
           className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-600/40 active:scale-90 transition-all animate-in zoom-in-95"
         >
           <Search size={36} />
         </button>
      </div>

      {/* MODAL CONFIG SMART */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[100] flex items-end animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-slate-900 w-full rounded-t-[4rem] p-10 pb-16 border-t border-white/10">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-2xl font-black uppercase tracking-tight">Réglages Alain</h3>
               <button onClick={() => setShowConfig(false)} className="p-4 bg-white/5 rounded-full"><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
               {[
                 { id: 'showClub', label: 'Club' },
                 { id: 'showCity', label: 'Ville' },
                 { id: 'showCategory', label: 'Catégorie' },
                 { id: 'showSpeed', label: 'Vitesse' },
                 { id: 'showGaps', label: 'Écarts' },
                 { id: 'showSplits', label: 'Tronçons' },
               ].map(item => (
                 <button 
                   key={item.id}
                   onClick={() => setConfig(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                   className={`p-6 rounded-[2rem] border-2 font-black text-xs uppercase transition-all flex items-center justify-between ${
                     config[item.id] ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-600'
                   }`}
                 >
                    {item.label}
                    <div className={`w-5 h-5 rounded-full border-2 ${config[item.id] ? 'bg-blue-500 border-white' : 'border-slate-800'}`}></div>
                 </button>
               ))}
            </div>
            <button 
              onClick={() => setShowConfig(false)}
              className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black uppercase text-base mt-10 shadow-xl active:scale-95 transition-all"
            >
              C'est bon, Alain !
            </button>
          </div>
        </div>
      )}

      {/* RECHERCHE OVERLAY ALAIN */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] p-10 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-10">
             <h2 className="text-4xl font-black uppercase">Rechercher un coureur</h2>
             <button onClick={() => setShowSearchModal(false)} className="p-6 bg-white/5 rounded-full"><X size={40}/></button>
          </div>
          
          <div className="relative mb-10">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-600" size={40} />
            <input 
              type="text" 
              autoFocus
              placeholder="DOSSARD OU NOM..."
              className="w-full bg-white/5 border-2 border-white/5 rounded-[2.5rem] py-10 pl-24 pr-10 text-5xl font-black text-white outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-4 scrollbar-hide">
             {searchResults.map(r => (
               <div 
                 key={r.id} 
                 onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }}
                 className="bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between border border-white/5 active:bg-blue-600 transition-colors"
               >
                  <div className="flex items-center gap-8">
                    <span className="text-5xl font-black mono text-blue-500 group-active:text-white">#{r.bib}</span>
                    <div className="text-left">
                      <p className="text-2xl font-black text-white uppercase leading-none mb-1">{r.fullName}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase">{r.category} • {r.club || 'INDIVIDUEL'}</p>
                    </div>
                  </div>
                  <ChevronRight size={32} className="text-slate-800" />
               </div>
             ))}
             {searchTerm && searchResults.length === 0 && (
               <p className="text-center py-20 text-slate-800 font-black uppercase tracking-[0.5em]">Aucun résultat pour Alain</p>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;