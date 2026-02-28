import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Activity, 
  Zap,
  RefreshCw,
  Star,
  Search,
  X,
  Clock,
  MapPin,
  Trophy,
  Timer
} from 'lucide-react';
import { ParticipantStatus, Race, RenderReadyResult } from '../types';

const LiveView: React.FC = () => {
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [displayMode, setDisplayMode] = useState<'RANKING' | 'LIVE'>('RANKING');
  const [races, setRaces] = useState<Race[]>([]);
  
  // Favorites State (Persisted)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('minguen_favorites') || '[]');
    } catch { return []; }
  });

  // Modal State
  const [selectedRunner, setSelectedRunner] = useState<{ data: RenderReadyResult, leaderTime: number } | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('minguen_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'races'), (snap) => {
      setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Race)));
    });
    return () => unsub();
  }, []);

  const activeRaces = useMemo(() => 
    races.filter(r => r.status !== 'READY').sort((a, b) => a.distance - b.distance)
  , [races]);

  const gridLayout = useMemo(() => {
    const count = activeRaces.length;
    if (count === 0) return { rows: 1, cols: 1 };
    
    if (count <= 4) {
      return { rows: 1, cols: count };
    } else {
      const rows = 2;
      const cols = Math.min(4, Math.ceil(count / rows));
      return { rows, cols };
    }
  }, [activeRaces]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
      
      <header className="bg-slate-900 border-b border-white/5 p-6 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-2xl shadow-indigo-600/20">
            <Zap size={28} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              MINGUEN<span className="text-indigo-500">LIVE</span>
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1.5">Système de Télémétrie Broadcast</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex bg-white/5 p-1 rounded-[1rem] border border-white/5">
             {(['RANKING', 'LIVE'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`px-6 py-2 rounded-[0.8rem] text-[10px] font-black uppercase transition-all ${
                    displayMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mode === 'RANKING' ? 'Classement' : 'Flux Direct'}
                </button>
             ))}
          </div>

          <div className="flex bg-white/5 p-1 rounded-[1rem] border border-white/5">
             {(['ALL', 'M', 'F'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-6 py-2 rounded-[0.8rem] text-[10px] font-black uppercase transition-all ${
                    genderFilter === g ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {g === 'ALL' ? 'Tous' : g === 'M' ? 'Hommes' : 'Femmes'}
                </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Synchronisation</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-black mono uppercase">SYNC OK</span>
              </div>
           </div>
        </div>
      </header>

      <main 
        className={`flex-1 grid gap-px bg-white/5 overflow-hidden`}
        style={{
          gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`
        }}
      >
        {activeRaces.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-6 opacity-20">
             <Activity size={80} />
             <p className="text-2xl font-black uppercase tracking-[0.5em]">En attente de départ...</p>
          </div>
        ) : (
          activeRaces.map(race => (
            <RaceColumn 
              key={race.id} 
              race={race} 
              genderFilter={genderFilter}
              displayMode={displayMode}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onSelectRunner={(data, leaderTime) => setSelectedRunner({ data, leaderTime })}
            />
          ))
        )}
      </main>

      <footer className="bg-indigo-950 px-8 py-3 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-4 overflow-hidden">
           <div className="px-3 py-1 bg-white/10 rounded-md text-[9px] font-black uppercase tracking-widest text-indigo-300">LIVE FEED</div>
           <div className="flex items-center gap-12 whitespace-nowrap animate-marquee">
             <p className="text-[10px] font-bold text-white uppercase tracking-wide">
               MinguenLive : Résultats en temps réel • Suivez chaque passage en direct • Les temps affichés sont soumis à homologation par le juge arbitre.
             </p>
           </div>
         </div>
         <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] ml-10">Minguen OS 4.0 Stable</p>
      </footer>
      
      {/* Runner Details Modal */}
      {selectedRunner && (
        <RunnerModal 
          runner={selectedRunner.data} 
          leaderTime={selectedRunner.leaderTime}
          onClose={() => setSelectedRunner(null)} 
        />
      )}

      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

interface RaceColumnProps {
  race: Race;
  genderFilter: 'ALL' | 'M' | 'F';
  displayMode: 'RANKING' | 'LIVE';
  favorites: string[];
  toggleFavorite: (id: string) => void;
  onSelectRunner: (data: RenderReadyResult, leaderTime: number) => void;
}

const RaceColumn: React.FC<RaceColumnProps> = ({ race, genderFilter, displayMode, favorites, toggleFavorite, onSelectRunner }) => {
  const { kernelResults, refreshRanking } = useRaceKernel(race.id);
  const [search, setSearch] = useState('');

  const columnData = useMemo(() => {
    let data = [...kernelResults].filter(r => r.netTimeMs > 0 || r.status !== ParticipantStatus.REGISTERED);
    
    // Gender Filter
    if (genderFilter !== 'ALL') data = data.filter(r => r.gender === genderFilter);
    
    // Search Filter
    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter(r => 
        r.bib.toLowerCase().includes(s) || 
        r.lastName.toLowerCase().includes(s) || 
        r.firstName.toLowerCase().includes(s)
      );
    }

    // Sorting
    if (displayMode === 'RANKING') {
      data.sort((a, b) => a.rank - b.rank);
    } else {
      data.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    }

    // Favorites Priority
    return data.sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [kernelResults, genderFilter, displayMode, search, favorites]);

  // Find leader time for gap calculation
  const leaderTime = useMemo(() => {
    const leader = kernelResults.find(r => r.rank === 1);
    return leader?.netTimeMs || 0;
  }, [kernelResults]);

  return (
    <div className="flex flex-col bg-[#020617] border-white/5 overflow-hidden h-full relative">
      <div className="p-5 border-b border-white/5 bg-slate-900/30 shrink-0 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black tracking-tight text-white uppercase truncate pr-4">{race.name}</h2>
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest shrink-0">{race.distance} KM</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
               {displayMode === 'RANKING' ? 'PROVISOIRE' : 'LIVE FEED'}
             </p>
             <button 
               onClick={refreshRanking}
               className="ml-2 flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-1 rounded hover:bg-orange-500/20 transition-colors"
               title="Recalculer les rangs"
             >
               <RefreshCw size={10} />
               <span className="text-[8px] font-black uppercase">RECALCULER</span>
             </button>
          </div>
          <p className="text-base font-black mono text-emerald-500">
            {race.startTime ? new Date(Date.now() - race.startTime).toISOString().substr(11, 8) : '00:00:00'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Dossard, Nom..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors uppercase"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {columnData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600">
            <Search size={24} className="mb-2 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest">Aucun coureur trouvé</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#020617] z-10">
              <tr className="bg-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-2">Pos</th>
                <th className="py-3 px-3">Dos.</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-6 text-right">Temps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {columnData.map((r, i) => {
                const isFav = favorites.includes(r.id);
                return (
                  <tr 
                    key={r.id} 
                    onClick={() => onSelectRunner(r, leaderTime)}
                    className={`group cursor-pointer transition-colors ${
                      isFav ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : 'hover:bg-indigo-600/10 border-l-2 border-transparent'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(r.id); }}
                        className={`transition-transform active:scale-90 ${isFav ? 'text-yellow-500' : 'text-slate-700 group-hover:text-slate-500'}`}
                      >
                        <Star size={14} fill={isFav ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                        displayMode === 'RANKING' && r.rank <= 3 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'
                      }`}>
                        {displayMode === 'RANKING' ? r.rank : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-base font-black mono text-indigo-400 tracking-tighter">#{r.bib}</span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-black text-xs text-white uppercase truncate w-32">
                        <span className="font-black">{r.lastName.toUpperCase()}</span> <span>{r.firstName}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[7px] font-black text-slate-500 uppercase">
                          {r.category} ({r.rankCategory}{r.rankCategory === 1 ? 'er' : 'ème'})
                        </span>
                        <div className="w-0.5 h-0.5 bg-slate-700 rounded-full"></div>
                        <span className="text-[7px] font-black text-indigo-500 uppercase truncate max-w-[80px]">{r.lastCheckpointName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="text-lg font-black mono text-white leading-none">{r.displayTime.split('.')[0]}</p>
                      <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase">{r.displaySpeed} KM/H</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const RunnerModal: React.FC<{ runner: RenderReadyResult, leaderTime: number, onClose: () => void }> = ({ runner, leaderTime, onClose }) => {
  const gap = runner.netTimeMs - leaderTime;
  const gapStr = gap > 0 ? `+${new Date(gap).toISOString().substr(11, 8)}` : '--';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 h-full shadow-2xl border-l border-white/10 flex flex-col animate-slide-in overflow-hidden">
        
        {/* Header */}
        <div className="p-8 bg-indigo-950 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={120} />
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
          
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 bg-white/10 rounded text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4">
              Fiche Athlète
            </span>
            <h2 className="text-3xl font-black text-white uppercase leading-none mb-1">
              {runner.lastName}
            </h2>
            <p className="text-xl font-medium text-indigo-200 mb-6">{runner.firstName}</p>
            
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-white/60">
              <div className="flex items-center gap-2">
                <span className="bg-white/10 px-2 py-1 rounded text-white">#{runner.bib}</span>
              </div>
              <span>{runner.category}</span>
              <span>•</span>
              <span>{runner.club}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/5 shrink-0">
          <div className="bg-slate-900 p-4 text-center">
            <div className="flex justify-center mb-2 text-indigo-500"><Timer size={20} /></div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Temps Total</p>
            <p className="text-sm font-black mono text-white">{runner.displayTime.split('.')[0]}</p>
          </div>
          <div className="bg-slate-900 p-4 text-center">
            <div className="flex justify-center mb-2 text-emerald-500"><Zap size={20} /></div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Vitesse Moy.</p>
            <p className="text-sm font-black mono text-white">{runner.displaySpeed} <span className="text-[8px]">KM/H</span></p>
          </div>
          <div className="bg-slate-900 p-4 text-center">
            <div className="flex justify-center mb-2 text-orange-500"><Trophy size={20} /></div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Écart 1er</p>
            <p className="text-sm font-black mono text-white">{gapStr}</p>
          </div>
        </div>

        {/* Splits List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <MapPin size={14} className="text-indigo-500" />
            Détail du Parcours
          </h3>
          
          <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {runner.splits.map((split, i) => (
              <div key={i} className="relative pl-8">
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-indigo-950 border-2 border-indigo-500 z-10"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white uppercase mb-1">{split.label}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {split.speed} KM/H • Rang: {split.rankOnSegment || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black mono text-indigo-400">{split.duration}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {runner.splits.length === 0 && (
              <p className="text-center text-slate-600 text-xs italic py-10">Aucun temps intermédiaire enregistré.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveView;