import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Passage, Race, ParticipantStatus } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Mic2, Search, Activity, X, Navigation, Settings2, ChevronRight, Medal, Timer, Building2, MapPin, Plus, Minus, User, Zap
} from 'lucide-react';

const SpeakerView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [lastPassage, setLastPassage] = useState<Passage | null>(null);
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeRaceIdForKernel, setActiveRaceIdForKernel] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(16);

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

  const activeRace = races.find(r => r.id === activeRaceIdForKernel);

  const gaps = useMemo(() => {
    if (!activeRunner || kernelResults.length === 0) return null;
    const leader = kernelResults.find(r => r.rank === 1);
    return leader && activeRunner.rank > 1 ? `+ ${formatMsToDisplay(activeRunner.netTimeMs - leader.netTimeMs).split('.')[0]}` : null;
  }, [activeRunner, kernelResults]);

  const passageHistory = useMemo(() => {
    return kernelResults.filter(r => r.netTimeMs > 0).sort((a, b) => b.lastTimestamp - a.lastTimestamp).slice(0, 30);
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
      <header className="h-[10vh] bg-slate-900 border-b border-white/5 px-6 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl"><Mic2 size={18} className="text-white" /></div>
          <h1 className="text-xs font-black tracking-tighter uppercase leading-none">ALAIN <span className="text-indigo-500">LIVE-CONSOLE</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button onClick={() => setZoomLevel(prev => Math.max(10, prev - 1))} className="p-2 hover:bg-white/10 rounded-lg text-slate-400"><Minus size={14} /></button>
            <button onClick={() => setZoomLevel(prev => Math.min(28, prev + 1))} className="p-2 hover:bg-white/10 rounded-lg text-slate-400"><Plus size={14} /></button>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HAUT: FLUX VERTICAL (40%) */}
        <section className="h-[40vh] bg-slate-900/40 border-b border-white/5 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="sticky top-0 bg-slate-950/90 p-3 border-b border-white/5 backdrop-blur-md z-10 flex justify-between items-center">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={10} className="text-indigo-500" /> Flux des derniers pointages
              </h3>
           </div>
           <div className="p-3 flex flex-col gap-2">
             {passageHistory.map((r) => {
               const is1 = r.rank === 1; const is2 = r.rank === 2; const is3 = r.rank === 3;
               const isSelected = activeRunner?.id === r.id;
               return (
                 <div key={r.id} onClick={() => setManuallySelectedId(r.id)}
                   className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shrink-0 ${
                     isSelected ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-white/5 border-white/5'
                   } ${is1 ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : is2 ? 'border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.3)]' : is3 ? 'border-amber-700 shadow-[0_0_15px_rgba(217,119,6,0.3)]' : ''}`}
                 >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg mono border ${isSelected ? 'bg-white text-indigo-600' : 'bg-white/5 text-indigo-400 border-white/5'}`}>{r.bib}</div>
                        <div>
                          <p className={`font-black text-xs uppercase truncate ${isSelected ? 'text-white' : 'text-slate-100'}`}>{r.lastName}</p>
                          <p className={`text-[8px] font-bold uppercase mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{r.lastCheckpointName} • Scratch #{r.rank}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-600/20 text-indigo-400'}`}>
                           {races.find(rc => rc.id === r.id)?.name || 'COURSE'}
                        </span>
                        {(is1 || is2 || is3) && <Medal size={14} className={`mt-1 ${is1 ? 'text-amber-400' : is2 ? 'text-slate-300' : 'text-amber-700'}`} />}
                      </div>
                    </div>
                 </div>
               );
             })}
           </div>
        </section>

        {/* BAS: FICHE DÉTAILLÉE (60%) */}
        <section className="h-[50vh] flex flex-col p-6 overflow-y-auto scrollbar-hide relative bg-black/40">
          {activeRunner ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center bg-white/5 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">#{activeRunner.bib} • DERNIER : {activeRunner.lastCheckpointName}</p>
                 <h2 className="text-5xl font-black uppercase text-white leading-none mb-1 tracking-tighter">{activeRunner.lastName}</h2>
                 <h3 className="text-2xl font-bold text-indigo-500 uppercase tracking-tight">{activeRunner.firstName}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl flex items-center justify-between border-t border-white/20">
                   <div>
                     <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">SCRATCH</p>
                     <p className="text-6xl font-black text-white leading-none">#{activeRunner.rank}</p>
                   </div>
                   {gaps && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">ÉCART LEADER</p>
                        <p className="text-2xl font-black text-white mono">{gaps}</p>
                      </div>
                   )}
                </div>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-3">
                   <div className="flex items-center gap-4 text-xs"><Building2 size={16} className="text-slate-500"/><span className="text-slate-500 font-black w-20 uppercase text-[8px]">Club</span><span className="font-black text-white truncate">{activeRunner.club || 'INDIVIDUEL'}</span></div>
                   <div className="flex items-center gap-4 text-xs"><Activity size={16} className="text-slate-500"/><span className="text-slate-500 font-black w-20 uppercase text-[8px]">Caté</span><span className="font-black text-white">{activeRunner.category} (#{activeRunner.rankCategory})</span></div>
                   <div className="flex items-center gap-4 text-xs"><MapPin size={16} className="text-slate-500"/><span className="text-slate-500 font-black w-20 uppercase text-[8px]">Ville</span><span className="font-black text-white uppercase">{activeRunner.city || '---'}</span></div>
                </div>
              </div>

              <div className="bg-white/5 rounded-[2rem] border border-white/5 overflow-hidden shadow-xl">
                <div className="p-4 bg-white/[0.02] flex items-center gap-3 border-b border-white/5">
                  <Timer size={18} className="text-indigo-500"/>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TRONÇONS NOMMÉS</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/40 text-[7px] font-black text-slate-500 uppercase">
                        <th className="py-2 px-5">Tronçon</th>
                        <th className="py-2 px-2 text-center">Temps</th>
                        <th className="py-2 px-5 text-right"># / Vitesse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeRunner.splits.map((s, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-5 text-xs font-black text-indigo-400 uppercase leading-none">{s.label}</td>
                          <td className="py-3 px-2 text-center text-xl font-black text-white mono">{s.duration}</td>
                          <td className="py-3 px-5 text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase">#{s.rankOnSegment}</p>
                             <p className="text-[8px] font-bold text-indigo-500/60 mono">{s.speed} KM/H</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-6">
               <Mic2 size={80} className="text-indigo-500 animate-pulse" />
               <p className="text-lg font-black uppercase tracking-[0.5em]">Alain, en attente de direct...</p>
            </div>
          )}
        </section>
      </main>

      <button 
        onClick={() => setShowSearchModal(true)} 
        className="fixed bottom-10 right-10 w-16 h-16 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-90 transition-all z-[60] border-4 border-[#020617]"
      >
        <Search size={28} />
      </button>

      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] p-8 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Rechercher Alain</h2>
             <button onClick={() => setShowSearchModal(false)} className="p-3 bg-white/5 rounded-full"><X size={32} className="text-white"/></button>
          </div>
          <input 
            type="text" 
            autoFocus 
            placeholder="NOM OU DOSSARD..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-8 text-4xl font-black text-white outline-none focus:border-indigo-500 mb-10 transition-all" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="space-y-4">
             {searchResults.map(r => (
               <div key={r.id} onClick={() => { setManuallySelectedId(r.id); setShowSearchModal(false); setSearchTerm(''); }} className="bg-white/5 p-6 rounded-3xl flex items-center justify-between border border-white/5 active:bg-indigo-600 transition-all cursor-pointer">
                  <div className="flex items-center gap-6">
                    <span className="text-3xl font-black mono text-indigo-500">#{r.bib}</span>
                    <div><p className="text-lg font-black text-white uppercase">{r.fullName}</p><p className="text-[9px] font-black text-slate-500 uppercase mt-1">{r.category} • {r.club}</p></div>
                  </div>
                  <ChevronRight size={24} className="text-slate-800" />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerView;