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
  Timer,
  Sun,
  Moon
} from 'lucide-react';
import { ParticipantStatus, Race, RenderReadyResult } from '../types';

const LiveView: React.FC = () => {
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [displayMode, setDisplayMode] = useState<'RANKING' | 'LIVE'>('RANKING');
  const [races, setRaces] = useState<Race[]>([]);
  const [isSunMode, setIsSunMode] = useState(false);
  
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
    <div className={`fixed inset-0 flex flex-col font-sans overflow-hidden select-none transition-colors duration-300 ${
      isSunMode ? 'bg-white text-slate-900' : 'bg-[#020617] text-white'
    }`}>
      
      <header className={`border-b p-6 flex justify-between items-center z-20 backdrop-blur-xl shrink-0 transition-colors duration-300 ${
        isSunMode ? 'bg-white/90 border-slate-200' : 'bg-slate-900 border-white/5'
      }`}>
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-2xl shadow-indigo-600/20">
            <Zap size={28} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              MINGUEN<span className="text-indigo-500">LIVE</span>
            </h1>
            <p className={`text-[9px] font-black uppercase tracking-[0.4em] mt-1.5 ${
              isSunMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Système de Télémétrie Broadcast</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className={`flex p-1 rounded-[1rem] border ${
            isSunMode ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
             {(['RANKING', 'LIVE'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`px-6 py-2 rounded-[0.8rem] text-[10px] font-black uppercase transition-all ${
                    displayMode === mode 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : isSunMode ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mode === 'RANKING' ? 'Classement' : 'Flux Direct'}
                </button>
             ))}
          </div>

          <div className={`flex p-1 rounded-[1rem] border ${
            isSunMode ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
             {(['ALL', 'M', 'F'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-6 py-2 rounded-[0.8rem] text-[10px] font-black uppercase transition-all ${
                    genderFilter === g 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : isSunMode ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {g === 'ALL' ? 'Tous' : g === 'M' ? 'Hommes' : 'Femmes'}
                </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
           <button 
             onClick={() => setIsSunMode(!isSunMode)}
             className={`p-3 rounded-full transition-colors ${
               isSunMode ? 'bg-slate-100 text-amber-500 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:text-white'
             }`}
           >
             {isSunMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>

           <div className="text-right">
              <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${
                isSunMode ? 'text-slate-400' : 'text-slate-500'
              }`}>Status Synchronisation</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className={`text-xs font-black mono uppercase ${
                  isSunMode ? 'text-slate-700' : ''
                }`}>SYNC OK</span>
              </div>
           </div>
        </div>
      </header>

      <main 
        className={`flex-1 grid gap-px overflow-hidden transition-colors duration-300 ${
          isSunMode ? 'bg-slate-200' : 'bg-white/5'
        }`}
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
              isSunMode={isSunMode}
            />
          ))
        )}
      </main>

      <footer className={`px-8 py-3 flex justify-between items-center shrink-0 transition-colors duration-300 ${
        isSunMode ? 'bg-slate-100 border-t border-slate-200' : 'bg-indigo-950'
      }`}>
         <div className="flex items-center gap-4 overflow-hidden">
           <div className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
             isSunMode ? 'bg-indigo-100 text-indigo-600' : 'bg-white/10 text-indigo-300'
           }`}>LIVE FEED</div>
           <div className="flex items-center gap-12 whitespace-nowrap animate-marquee">
             <p className={`text-[10px] font-bold uppercase tracking-wide ${
               isSunMode ? 'text-slate-600' : 'text-white'
             }`}>
               MinguenLive : Résultats en temps réel • Suivez chaque passage en direct • Les temps affichés sont soumis à homologation par le juge arbitre.
             </p>
           </div>
         </div>
         <p className={`text-[8px] font-black uppercase tracking-[0.3em] ml-10 ${
           isSunMode ? 'text-indigo-600' : 'text-indigo-400'
         }`}>Minguen OS 4.0 Stable</p>
      </footer>
      
      {/* Runner Details Modal */}
      {selectedRunner && (
        <RunnerModal 
          runner={selectedRunner.data} 
          leaderTime={selectedRunner.leaderTime}
          onClose={() => setSelectedRunner(null)}
          isSunMode={isSunMode}
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
  isSunMode: boolean;
}

const RaceColumn: React.FC<RaceColumnProps> = ({ race, genderFilter, displayMode, favorites, toggleFavorite, onSelectRunner, isSunMode }) => {
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
    <div className={`flex flex-col border-r overflow-hidden h-full relative transition-colors duration-300 ${
      isSunMode ? 'bg-white border-slate-200' : 'bg-[#020617] border-white/5'
    }`}>
      <div className={`p-5 border-b shrink-0 space-y-3 transition-colors duration-300 ${
        isSunMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-white/5'
      }`}>
        <div className="flex justify-between items-center">
          <h2 className={`text-xl font-black tracking-tight uppercase truncate pr-4 ${
            isSunMode ? 'text-slate-900' : 'text-white'
          }`}>{race.name}</h2>
          <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${
            isSunMode ? 'text-indigo-600' : 'text-indigo-400'
          }`}>{race.distance} KM</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
             <p className={`text-[8px] font-black uppercase tracking-widest ${
               isSunMode ? 'text-slate-400' : 'text-slate-500'
             }`}>
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
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isSunMode ? 'text-slate-400' : 'text-slate-500'
          }`} size={14} />
          <input 
            type="text" 
            placeholder="Dossard, Nom..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-lg py-2 pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors uppercase ${
              isSunMode 
                ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400' 
                : 'bg-slate-950 border-white/10 text-white placeholder:text-slate-600'
            }`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {columnData.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-40 ${
            isSunMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <Search size={24} className="mb-2 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest">Aucun coureur trouvé</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className={`sticky top-0 z-10 ${
              isSunMode ? 'bg-white' : 'bg-[#020617]'
            }`}>
              <tr className={`text-[8px] font-black uppercase tracking-widest ${
                isSunMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-500'
              }`}>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-2">Pos</th>
                <th className="py-3 px-3">Dos.</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-6 text-right">Temps</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isSunMode ? 'divide-slate-100' : 'divide-white/5'
            }`}>
              {columnData.map((r, i) => {
                const isFav = favorites.includes(r.id);
                return (
                  <tr 
                    key={r.id} 
                    onClick={() => onSelectRunner(r, leaderTime)}
                    className={`group cursor-pointer transition-colors ${
                      isFav 
                        ? (isSunMode ? 'bg-amber-50 border-l-2 border-amber-500' : 'bg-yellow-500/5 border-l-2 border-yellow-500')
                        : `border-l-2 border-transparent ${isSunMode ? 'hover:bg-indigo-50' : 'hover:bg-indigo-600/10'}`
                    }`}
                  >
                    <td className="py-4 px-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(r.id); }}
                        className={`transition-transform active:scale-90 ${
                          isFav 
                            ? (isSunMode ? 'text-amber-500' : 'text-yellow-500') 
                            : (isSunMode ? 'text-slate-300 group-hover:text-slate-400' : 'text-slate-700 group-hover:text-slate-500')
                        }`}
                      >
                        <Star size={14} fill={isFav ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                        displayMode === 'RANKING' && r.rank <= 3 
                          ? 'bg-indigo-600 text-white' 
                          : (isSunMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-500')
                      }`}>
                        {displayMode === 'RANKING' ? r.rank : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <span className={`text-base font-black mono tracking-tighter ${
                        isSunMode ? 'text-indigo-600' : 'text-indigo-400'
                      }`}>#{r.bib}</span>
                    </td>
                    <td className="py-4 px-4">
                      <p className={`font-black text-xs uppercase truncate w-32 ${
                        isSunMode ? 'text-slate-900' : 'text-white'
                      }`}>
                        <span className="font-black">{r.lastName.toUpperCase()}</span> <span>{r.firstName}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[7px] font-black uppercase ${
                          isSunMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {r.category} ({r.rankCategory}{r.rankCategory === 1 ? 'er' : 'ème'})
                        </span>
                        <div className={`w-0.5 h-0.5 rounded-full ${
                          isSunMode ? 'bg-slate-300' : 'bg-slate-700'
                        }`}></div>
                        <span className={`text-[7px] font-black uppercase truncate max-w-[80px] ${
                          isSunMode ? 'text-indigo-600' : 'text-indigo-500'
                        }`}>{r.lastCheckpointName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className={`text-lg font-black mono leading-none ${
                        isSunMode ? 'text-slate-900' : 'text-white'
                      }`}>{r.displayTime.split('.')[0]}</p>
                      <p className={`text-[8px] font-bold mt-1 uppercase ${
                        isSunMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>{r.displaySpeed} KM/H</p>
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

const RunnerModal: React.FC<{ runner: RenderReadyResult, leaderTime: number, onClose: () => void, isSunMode: boolean }> = ({ runner, leaderTime, onClose, isSunMode }) => {
  const gap = runner.netTimeMs - leaderTime;
  const gapStr = gap > 0 ? `+${new Date(gap).toISOString().substr(11, 8)}` : '--';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md h-full shadow-2xl border-l flex flex-col animate-slide-in overflow-hidden transition-colors duration-300 ${
        isSunMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        
        {/* Header */}
        <div className={`p-8 relative overflow-hidden shrink-0 ${
          isSunMode ? 'bg-slate-100' : 'bg-indigo-950'
        }`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={120} className={isSunMode ? 'text-indigo-900' : 'text-white'} />
          </div>
          <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${
            isSunMode ? 'text-slate-400 hover:text-slate-600' : 'text-white/50 hover:text-white'
          }`}>
            <X size={24} />
          </button>
          
          <div className="relative z-10">
            <span className={`inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-4 ${
              isSunMode ? 'bg-white text-indigo-600 shadow-sm' : 'bg-white/10 text-indigo-300'
            }`}>
              Fiche Athlète
            </span>
            <h2 className={`text-3xl font-black uppercase leading-none mb-1 ${
              isSunMode ? 'text-slate-900' : 'text-white'
            }`}>
              {runner.lastName}
            </h2>
            <p className={`text-xl font-medium mb-6 ${
              isSunMode ? 'text-indigo-600' : 'text-indigo-200'
            }`}>{runner.firstName}</p>
            
            <div className={`flex items-center gap-4 text-xs font-bold uppercase tracking-wide ${
              isSunMode ? 'text-slate-500' : 'text-white/60'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded ${
                  isSunMode ? 'bg-white text-slate-900 border border-slate-200' : 'bg-white/10 text-white'
                }`}>#{runner.bib}</span>
              </div>
              <span>{runner.category}</span>
              <span>•</span>
              <span>{runner.club}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-3 gap-px border-b shrink-0 ${
          isSunMode ? 'bg-slate-200 border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <div className={`p-4 text-center ${
            isSunMode ? 'bg-white' : 'bg-slate-900'
          }`}>
            <div className="flex justify-center mb-2 text-indigo-500"><Timer size={20} /></div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
              isSunMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Temps Total</p>
            <p className={`text-sm font-black mono ${
              isSunMode ? 'text-slate-900' : 'text-white'
            }`}>{runner.displayTime.split('.')[0]}</p>
          </div>
          <div className={`p-4 text-center ${
            isSunMode ? 'bg-white' : 'bg-slate-900'
          }`}>
            <div className="flex justify-center mb-2 text-emerald-500"><Zap size={20} /></div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
              isSunMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Vitesse Moy.</p>
            <p className={`text-sm font-black mono ${
              isSunMode ? 'text-slate-900' : 'text-white'
            }`}>{runner.displaySpeed} <span className="text-[8px]">KM/H</span></p>
          </div>
          <div className={`p-4 text-center ${
            isSunMode ? 'bg-white' : 'bg-slate-900'
          }`}>
            <div className="flex justify-center mb-2 text-orange-500"><Trophy size={20} /></div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
              isSunMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Écart 1er</p>
            <p className={`text-sm font-black mono ${
              isSunMode ? 'text-slate-900' : 'text-white'
            }`}>{gapStr}</p>
          </div>
        </div>

        {/* Splits List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${
            isSunMode ? 'text-slate-900' : 'text-white'
          }`}>
            <MapPin size={14} className="text-indigo-500" />
            Détail du Parcours
          </h3>
          
          <div className={`space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 ${
            isSunMode ? 'before:bg-slate-200' : 'before:bg-white/10'
          }`}>
            {runner.splits.map((split, i) => (
              <div key={i} className="relative pl-8">
                <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-indigo-500 z-10 ${
                  isSunMode ? 'bg-white' : 'bg-indigo-950'
                }`}></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-xs font-bold uppercase mb-1 ${
                      isSunMode ? 'text-slate-900' : 'text-white'
                    }`}>{split.label}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${
                      isSunMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {split.speed} KM/H • Rang: {split.rankOnSegment || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black mono ${
                      isSunMode ? 'text-indigo-600' : 'text-indigo-400'
                    }`}>{split.duration}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {runner.splits.length === 0 && (
              <p className={`text-center text-xs italic py-10 ${
                isSunMode ? 'text-slate-400' : 'text-slate-600'
              }`}>Aucun temps intermédiaire enregistré.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LiveView;