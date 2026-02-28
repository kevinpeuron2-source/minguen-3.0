import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Activity, 
  Zap
} from 'lucide-react';
import { ParticipantStatus, Race } from '../types';

const LiveView: React.FC = () => {
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [displayMode, setDisplayMode] = useState<'RANKING' | 'LIVE'>('RANKING');
  const [races, setRaces] = useState<Race[]>([]);
  
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
      
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

interface RaceColumnProps {
  race: Race;
  genderFilter: 'ALL' | 'M' | 'F';
  displayMode: 'RANKING' | 'LIVE';
}

const RaceColumn: React.FC<RaceColumnProps> = ({ race, genderFilter, displayMode }) => {
  const { kernelResults } = useRaceKernel(race.id);

  const columnData = useMemo(() => {
    let data = [...kernelResults].filter(r => r.netTimeMs > 0 || r.status !== ParticipantStatus.REGISTERED);
    if (genderFilter !== 'ALL') data = data.filter(r => r.gender === genderFilter);
    if (displayMode === 'RANKING') return data.sort((a, b) => a.rank - b.rank);
    return data.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [kernelResults, genderFilter, displayMode]);

  return (
    <div className="flex flex-col bg-[#020617] border-white/5 overflow-hidden h-full">
      <div className="p-5 border-b border-white/5 bg-slate-900/30 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-black tracking-tight text-white uppercase truncate pr-4">{race.name}</h2>
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest shrink-0">{race.distance} KM</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
               {displayMode === 'RANKING' ? 'PROVISOIRE' : 'LIVE FEED'}
             </p>
          </div>
          <p className="text-base font-black mono text-emerald-500">
            {race.startTime ? new Date(Date.now() - race.startTime).toISOString().substr(11, 8) : '00:00:00'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-[#020617] z-10">
            <tr className="bg-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
              <th className="py-3 px-6">Pos</th>
              <th className="py-3 px-3">Dos.</th>
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-6 text-right">Temps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {columnData.map((r, i) => (
              <tr key={r.id} className="group hover:bg-indigo-600/10 transition-colors">
                <td className="py-4 px-6">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                    displayMode === 'RANKING' && i < 3 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'
                  }`}>
                    {displayMode === 'RANKING' ? r.rank : i + 1}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveView;