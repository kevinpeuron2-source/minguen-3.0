import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Passage, Race, ParticipantStatus } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Mic2, Search, Activity, X, Navigation, Settings2, ChevronRight, Medal, Timer, Building2, MapPin, Plus, Minus
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeRaceIdForKernel, setActiveRaceIdForKernel] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(14);

  const [config, setConfig] = useState({
    showClub: true,
    showCity: true,
    showCategory: true,
    showSpeed: true,
    showGaps: true,
    showSplits: true
  });

  useEffect(() => {
    onSnapshot(collection(db, 'races'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      if (list.length > 0 && !activeRaceIdForKernel) setActiveRaceIdForKernel(list[0].id);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'passages'), orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const passage = snap.docs[0].data() as Passage;
        setLastPassage(passage);
        onSnapshot(collection(db, 'participants'), pSnap => {
            const p = pSnap.docs.find(d => d.id === passage.participantId)?.data();
            if (p) setActiveRaceIdForKernel(p.raceId);
        });
      }
    });
    return () => unsub();
  }, []);

  const { kernelResults } = useRaceKernel(activeRaceIdForKernel);

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

  const passageHistory = useMemo(() => {
    return kernelResults.filter(r => r.netTimeMs > 0).sort((a, b) => b.lastTimestamp - a.lastTimestamp).slice(0, 40);
  }, [kernelResults]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return kernelResults.filter(r => r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || r.bib.includes(searchTerm)).slice(0, 5);
  }, [searchTerm, kernelResults]);

  return (
    <div 
      className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none transition-all duration-200"
      style={{ fontSize: `${zoomLevel}px` }}
    >
      <header className="bg-slate-900 border-b border-white/5 px-6 py-4 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl"><Mic2 size={24} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase leading-none">L'APPLI POUR <span className="text-blue-500">ALAIN</span></h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Console Speaker Broadcast</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/10">
            <button onClick={() => setZoomLevel(prev => Math.max(10, prev - 1))} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90 transition-transform"><Minus size={18} /></button>
            <span className="text-[10px] font-black text-slate-500 mono px-2 uppercase tracking-widest">Zoom</span>
            <button onClick={() => setZoomLevel(prev => Math.min(26, prev + 1))} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90 transition-transform"><Plus size={18} /></button>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* FLUX FUSIONNÉ (40%) */}
        <aside className="w-[40%] bg-slate-900/40 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="sticky top-0 bg-slate-950/80 p-4 border-b border-white/5 backdrop-blur-md z-10 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={12} className="text-blue-500" /> Flux Direct
              </h3>
              <span className="text-[9px] font-black text-slate-600 mono">{passageHistory.length} pass.</span>
           </div>
           <div className="p-3 space-y-2">
             {passageHistory.map((r) => {
               const is1 = r.rank === 1; const is2 = r.rank === 2; const is3 = r.rank === 3;
               const isSelected = activeRunner?.id === r.id;
               const race = races.find(rc => rc.id === r.id); // Note: Simplified for demo
               return (
                 <div key={r.id} onClick={() => setManuallySelectedId(r.id)}
                   className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                     isSelected ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                   } ${is1 ? 'shadow-[0_0_25px_rgba(251,191,36,0.15)] border-amber-400/40' : is2 ? 'shadow-[0_0_25px_rgba(203,213,225,0.15)] border-slate-300/40' : is3 ? 'shadow-[0_0_25px_rgba(217,119,6,0.15)] border-amber-700/40' : ''}`}
                 >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg mono border transition-colors ${isSelected ? 'bg-white text-blue-600' : 'bg-white/5 text-blue-400 border-white/5'}`}>{r.bib}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                           <p className={`font-black text-sm uppercase truncate ${isSelected ? 'text-white' : 'text-slate-100'}`}>{r.lastName}</p>
                           <span className="text-[7px] bg-white/5 px-1.5 py-0.5 rounded uppercase font-black text-slate-500">{r.lastCheckpointName}</span>
                        </div>
                        <p className={`text-[9px] font-bold uppercase mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>Scratch #{r.rank} • {r.displayTime.split('.')[0]}</p>
                      </div>
                      {(is1 || is2 || is3) && <Medal size={18} className={is1 ? 'text-amber-400' : is2 ? 'text-slate-300' : 'text-amber-700'} />}
                    </div>
                 </div>
               );
             })}
           </div>
        </aside>

        {/* DETAIL (60%) */}
        <section className="flex-1 flex flex-col p-10 overflow-y-auto scrollbar-hide relative bg-black/5">
          {activeRunner ? (
            <div className="relative z-10 space-y-8 animate-in fade-in duration-300">
              <div className="text-center bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-sm">
                 <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-4">#{activeRunner.bib} • DERNIER PASSAGE : {activeRunner.lastCheckpointName}</p>
                 <h2 className="text-7xl font-black uppercase text-white leading-none mb-2 tracking-tighter">{activeRunner.lastName}</h2>
                 <h3 className="text-3xl font-bold text-blue-500 uppercase tracking-tight">{activeRunner.firstName}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                   {config.showCategory && <div className="flex items-center gap-4 text-sm"><Activity size={20} className="text-slate-500"/><span className="text-slate-500 font-black w-20 uppercase text-[10px] tracking-widest">Catégorie</span><span className="font-black text-white">{activeRunner.category} (#{activeRunner.rankCategory})</span></div>}
                   {config.showClub && <div className="flex items-center gap-4 text-sm"><Building2 size={20} className="text-slate-500"/><span className="text-slate-500 font-black w-20 uppercase text-[10px] tracking-widest">Club</span><span className="font-black text-white truncate">{activeRunner.club || 'INDIVIDUEL'}</span></div>}
                   {config.showCity && <div className="flex items-center gap-4 text-sm"><MapPin size={20} className="text-slate-500"/><span className="text-slate-500 font-black w-20 uppercase text-[10px] tracking-widest">Ville</span><span className="font-black text-white uppercase">{activeRunner.city || '---'}</span></div>}
                </div>
                <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl flex items-center justify-between border-t border-white/20">
                   <div>
                     <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em] mb-2">Scratch</p>
                     <p className="text-7xl font-black text-white leading-none tracking-tighter">#{activeRunner.rank}</p>
                   </div>
                   {config.showGaps && gaps && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em] mb-2">Retard Leader</p>
                        <p className="text-3xl font-black text-white mono">{gaps}</p>
                      </div>
                   )}
                </div>
              </div>

              {config.showSplits && (
                <div className="bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden shadow-xl">
                  <div className="p-6 bg-white/[0.02] flex items-center justify-between border-b border-white/5">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-3 tracking-[0.2em]"><Timer size={20} className="text-blue-500"/> TRONÇONS NOMMÉS</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-black/20 text-[9px] font-black text-slate-500 uppercase">
                          <th className="py-3 px-6">Segment de Course</th>
                          <th className="py-3 px-2 text-center">Temps de Passage</th>
                          <th className="py-3 px-6 text-right">Rang / Vitesse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeRunner.splits.map((s, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-4 px-6 text-sm font-black text-blue-400 uppercase tracking-tight">{s.label}</td>
                            <td className="py-4 px-2 text-center text-2xl font-black text-white mono">{s.duration}</td>
                            <td className="py-4 px-6 text-right">
                               <p className="text-xs font-black text-slate-400 uppercase"># {s.rankOnSegment}</p>
                               {config.showSpeed && <p className="text-[10px] font-bold text-blue-500/80 mono">{s.speed} km/h</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-6">
               <Activity size={96} className="text-blue-500" />
               <p className="text-xl font-black uppercase tracking-[0.8em]">Alain, en attente...</p>
            </div>
          )}
        </section>
      </main>

      {/* CONTROLES FLOTTANTS ALAIN */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-5 z-50">
         <button onClick={() => setShowConfig(true)} className="w-14 h-14 bg-slate-800 text-slate-400 rounded-[1.8rem] flex items-center justify-center shadow-2xl hover:bg-slate-700 active:scale-90 transition-all border border-white/5"><Settings2 size={24} /></button>
         <button onClick={() => setShowSearchModal(true)} className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl hover:bg-blue-500 active:scale-90 transition-all"><Search size={32} /></button>
      </div>

      {/* MODAL CONFIG */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-end animate-in slide-in-from-bottom-full duration-500">
          <div className="bg-slate-900 w-full rounded-t-[3.5rem] p-10 pb-16">
            <h3 className="text-2xl font-black uppercase mb-10 flex items-center gap-4 tracking-tighter"><Settings2 size={24}/> Affichage de la Console</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
               {[
                 { id: 'showClub', label: 'Club Sportif' },
                 { id: 'showCity', label: 'Ville / Origine' },
                 { id: 'showCategory', label: 'Classement Caté' },
                 { id: 'showSpeed', label: 'Vitesse Moyenne' },
                 { id: 'showGaps', label: 'Écarts Leaders' },
                 { id: 'showSplits', label: 'Tronçons Détaillés' },
               ].map(item => (
                 <button key={item.id} onClick={() => setConfig(prev => ({ ...prev, [item.id]: !prev[item.id] }))} 
                   className={`p-6 rounded-2xl border-2 font-black text-xs uppercase transition-all flex items-center justify-between ${config[item.id] ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-600'}`}>
                    {item.label} <div className={`w-4 h-4 rounded-full border-2 ${config[item.id] ? 'bg-blue-500 border-white' : 'border-slate-800'}`}></div>
                 </button>
               ))}
            </div>
            <button onClick={() => setShowConfig(false)} className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black uppercase text-lg mt-10 shadow-2xl active:scale-[0.98] transition-all">TERMINER</button>
          </div>
        </div>
      )}

      {/* RECHERCHE */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] p-10 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-16">
             <h2 className="text-3xl font-black uppercase tracking-tighter">Recherche Concurrent</h2>
             <button onClick={() => setShowSearchModal(false)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={40}/></button>
          </div>
          <input type="text" autoFocus placeholder="NOM, DOSSARD..." className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-10 px-12 text-6xl font-black text-white outline-none focus:border-blue-500 mb-16 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          <div className="space-y-4">
             {searchResults.map(r => (
               <div key={r.id} onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }} className="bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between border border-white/5 active:bg-blue-600 transition-all cursor-pointer">
                  <div className="flex items-center gap-10">
                    <span className="text-5xl font-black mono text-blue-500">#{r.bib}</span>
                    <div><p className="text-2xl font-black text-white uppercase">{r.fullName}</p><p className="text-sm font-black text-slate-500 uppercase mt-1">{r.category} • {r.club}</p></div>
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