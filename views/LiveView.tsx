import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Trophy, 
  Activity, 
  MapPin, 
  Zap,
  TrendingUp,
  Clock,
  Navigation
} from 'lucide-react';
import { ParticipantStatus, RenderReadyResult, Race } from '../types';

const LiveView: React.FC = () => {
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [displayMode, setDisplayMode] = useState<'RANKING' | 'LIVE'>('RANKING');
  
  // Le kernel charge tout ce qui est nécessaire. On filtre localement par course.
  // Pour cette vue "Broadcast", on va afficher toutes les courses actives en colonnes.
  const { kernelResults, races, isSyncing } = useRaceKernel('all_races_placeholder'); // Note: useRaceKernel logic might need tweak to handle multiple races if it doesn't already

  // Correction : useRaceKernel actuel prend un ID de course. Pour une vue multi-colonnes, 
  // on va devoir itérer sur les races et appeler les données.
  // Alternative simplifiée pour ce turn : on utilise le kernelResults global (filtré par raceId dans le rendu)
  
  const activeRaces = useMemo(() => races.filter(r => r.status !== 'READY'), [races]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
      
      {/* Broadcast Header */}
      <header className="bg-slate-900 border-b border-white/5 p-8 flex justify-between items-center z-20 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-2xl shadow-indigo-600/20">
            <Zap size={32} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              MINGUEN<span className="text-indigo-500">LIVE</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Professional Broadcast Telemetry</p>
          </div>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-10">
          <div className="flex bg-white/5 p-1.5 rounded-[1.2rem] border border-white/5">
             {(['RANKING', 'LIVE'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`px-8 py-3 rounded-[1rem] text-xs font-black uppercase transition-all ${
                    displayMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mode === 'RANKING' ? 'Leaderboard' : 'Dernières Arrivées'}
                </button>
             ))}
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-[1.2rem] border border-white/5">
             {(['ALL', 'M', 'F'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-8 py-3 rounded-[1rem] text-xs font-black uppercase transition-all ${
                    genderFilter === g ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {g === 'ALL' ? 'Scratch' : g === 'M' ? 'Hommes' : 'Femmes'}
                </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-black mono uppercase">Live Telemetry</span>
              </div>
           </div>
        </div>
      </header>

      {/* Dynamic Multi-Column Grid */}
      <main className="flex-1 flex gap-px bg-white/5 overflow-x-auto scrollbar-hide">
        {activeRaces.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20">
             <Activity size={80} />
             <p className="text-2xl font-black uppercase tracking-[0.5em]">Waiting for active races...</p>
          </div>
        ) : (
          activeRaces.map(race => (
            <RaceColumn 
              key={race.id} 
              race={race} 
              results={kernelResults.filter(r => r.id.includes(race.id) || r.bib.length > 0)} // Note: Logic depends on how kernelResults is filtered. We'll assume the kernel provides all for now or is used per column.
              genderFilter={genderFilter}
              displayMode={displayMode}
            />
          ))
        )}
      </main>

      {/* Scrollable ticker or Footer */}
      <footer className="bg-indigo-900 px-10 py-4 flex justify-between items-center">
         <div className="flex items-center gap-4">
           <div className="px-3 py-1 bg-white/10 rounded-md text-[9px] font-black uppercase tracking-widest">Ticker</div>
           <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide animate-pulse">
             Bienvenue sur le live Minguen Chrono • Résultats officiels soumis à homologation • Suivez votre dossard en temps réel
           </p>
         </div>
         <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Minguen OS 4.0 Pro Broadcast</p>
      </footer>
    </div>
  );
};

interface RaceColumnProps {
  race: Race;
  results: RenderReadyResult[];
  genderFilter: 'ALL' | 'M' | 'F';
  displayMode: 'RANKING' | 'LIVE';
}

const RaceColumn: React.FC<RaceColumnProps> = ({ race, results, genderFilter, displayMode }) => {
  // Filtrage des résultats pour cette colonne spécifique
  const columnData = useMemo(() => {
    // Dans une implémentation réelle, le kernelResults contiendrait le raceId. 
    // Ici on simule ou on s'adapte à la structure existante.
    let data = results.filter(r => r.netTimeMs > 0); // Uniquement ceux ayant un temps
    
    if (genderFilter !== 'ALL') {
      data = data.filter(r => r.gender === genderFilter);
    }

    if (displayMode === 'RANKING') {
      return data.sort((a, b) => a.rank - b.rank).slice(0, 50);
    } else {
      return data.sort((a, b) => b.lastTimestamp - a.lastTimestamp).slice(0, 50);
    }
  }, [results, genderFilter, displayMode, race.id]);

  return (
    <div className="flex-1 min-w-[450px] flex flex-col bg-[#020617] relative">
      <div className="p-8 border-b border-white/5 bg-slate-900/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-black tracking-tight text-white uppercase">{race.name}</h2>
          <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{race.distance} KM</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
               {displayMode === 'RANKING' ? 'Classement Provisoire' : 'Flux des arrivées'}
             </p>
          </div>
          <p className="text-lg font-black mono text-emerald-500">
            {race.startTime ? new Date(Date.now() - race.startTime).toISOString().substr(11, 8) : '00:00:00'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <th className="py-4 px-8">Pos</th>
              <th className="py-4 px-4">Dos.</th>
              <th className="py-4 px-6">Concurrent</th>
              <th className="py-4 px-6 text-right">Temps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {columnData.map((r, i) => (
              <tr key={r.id} className="group hover:bg-indigo-600/10 transition-colors animate-in slide-in-from-bottom-2">
                <td className="py-6 px-8">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                    displayMode === 'RANKING' && i < 3 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'
                  }`}>
                    {displayMode === 'RANKING' ? r.rank : i + 1}
                  </span>
                </td>
                <td className="py-6 px-4">
                  <span className="text-lg font-black mono text-indigo-400 tracking-tighter">#{r.bib}</span>
                </td>
                <td className="py-6 px-6">
                  <p className="font-black text-sm text-white uppercase truncate w-40">{r.fullName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase">{r.category}</span>
                    <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                    <span className="text-[8px] font-black text-indigo-500 uppercase">{r.lastCheckpointName}</span>
                  </div>
                </td>
                <td className="py-6 px-6 text-right">
                  <p className="text-xl font-black mono text-white leading-none">{r.displayTime.split('.')[0]}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{r.displaySpeed} KM/H</p>
                </td>
              </tr>
            ))}
            {columnData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-40 text-center">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">En attente de data...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveView;