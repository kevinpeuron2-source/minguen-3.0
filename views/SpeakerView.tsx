import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, ParticipantStatus, RenderReadyResult } from '../types';
import { formatMsToDisplay } from '../utils/formatters';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { 
  Trophy, X, Clock, MapPin, Users, Activity, Trash2
} from 'lucide-react';

// --- TYPES ---
interface PodiumAlert extends RenderReadyResult {
  raceName: string;
  alertId: string; // Unique ID for the alert instance
}

// --- HELPER COMPONENTS ---

const RaceTimer: React.FC<{ startTime?: number }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return <span className="text-slate-400">EN ATTENTE</span>;
  return <span className="font-mono">{formatMsToDisplay(elapsed).split('.')[0]}</span>;
};

const SpeakerRaceColumn: React.FC<{ 
  race: Race; 
  onPodium: (runner: RenderReadyResult, raceName: string) => void;
  processedIds: React.MutableRefObject<Set<string>>;
}> = ({ race, onPodium, processedIds }) => {
  const { kernelResults } = useRaceKernel(race.id);
  
  // Monitor for Podiums
  useEffect(() => {
    const totalCheckpoints = race.checkpoints?.length || 0;
    
    kernelResults.forEach(r => {
      // Check if runner is finished (status is FINISHED or has a valid net time and completed checkpoints)
      const isFinished = r.status === ParticipantStatus.FINISHED || (r.netTimeMs > 0 && totalCheckpoints > 0 && r.passedCheckpointsCount === totalCheckpoints);
      const isPodium = r.rank <= 3;

      if (isFinished && isPodium) {
        if (!processedIds.current.has(r.id)) {
          processedIds.current.add(r.id);
          onPodium(r, race.name);
        }
      }
    });
  }, [kernelResults, race, onPodium, processedIds]);

  // Sort by last timestamp for "Live Flux" feel, or by rank if finished?
  // Prompt says "Flux des arrivées" in previous context, but here "Colonnes de courses".
  // Usually speaker wants to see latest arrivals.
  // Let's keep the "Arrival History" logic: sort by lastTimestamp desc.
  const displayList = useMemo(() => {
    return [...kernelResults]
      .filter(r => r.lastTimestamp > 0)
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .slice(0, 50); // Limit to 50 to prevent lag
  }, [kernelResults]);

  const getRowStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 border-yellow-300';
    if (rank === 2) return 'bg-slate-100 border-slate-300';
    if (rank === 3) return 'bg-orange-100 border-orange-300';
    return 'bg-white border-slate-200';
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div className="flex flex-col h-full border-r-4 border-slate-200 last:border-r-0 bg-slate-50">
      {/* COLUMN HEADER */}
      <div className="bg-white p-6 border-b-4 border-slate-200 sticky top-0 z-10 shadow-sm">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-2 truncate" title={race.name}>
          {race.name}
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-sm">
            <MapPin size={16} />
            <span>{race.distance} KM</span>
          </div>
          <div className="flex items-center gap-2 text-black font-black text-2xl bg-slate-100 px-3 py-1 rounded-lg">
            <Clock size={20} />
            <RaceTimer startTime={race.startTime} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
          <Users size={14} />
          <span>{kernelResults.length} PARTANTS</span>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayList.map(r => {
           const isPodium = r.rank <= 3;
           return (
             <div 
               key={r.id}
               className={`p-4 rounded-xl border-2 flex items-center justify-between shadow-sm transition-transform hover:scale-[1.01] ${getRowStyle(r.rank)}`}
             >
               <div className="flex items-center gap-4 overflow-hidden">
                 <div className="w-12 h-12 flex items-center justify-center bg-black text-white font-black text-xl rounded-lg shrink-0">
                   {r.bib}
                 </div>
                 <div className="min-w-0">
                   <div className="flex items-center gap-2">
                     {isPodium && <span className="text-xl">{getMedalIcon(r.rank)}</span>}
                     <p className="text-xl font-black text-black uppercase truncate leading-none">
                       {r.lastName} <span className="font-bold text-slate-600 text-lg">{r.firstName}</span>
                     </p>
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs font-black bg-black/5 px-2 py-0.5 rounded text-slate-600 uppercase">
                       {r.category}
                     </span>
                     <span className="text-xs font-bold text-slate-400 uppercase truncate">
                       {r.lastCheckpointName}
                     </span>
                   </div>
                 </div>
               </div>
               
               <div className="text-right shrink-0 ml-2">
                 <p className="text-2xl font-black text-black mono tracking-tight leading-none">
                   {r.displayTime.split('.')[0]}
                 </p>
                 <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                   #{r.rank} SCRATCH
                 </p>
               </div>
             </div>
           );
        })}
        {displayList.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <Activity size={48} />
            <p className="font-black uppercase mt-4">En attente...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const SpeakerView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [alerts, setAlerts] = useState<PodiumAlert[]>([]);
  const processedIds = useRef<Set<string>>(new Set());

  // Fetch Races
  useEffect(() => {
    const q = query(collection(db, 'races'), orderBy('startTime', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
    });
    return () => unsub();
  }, []);

  const handlePodium = (runner: RenderReadyResult, raceName: string) => {
    setAlerts(prev => [{
      ...runner,
      raceName,
      alertId: `${runner.id}_${Date.now()}`
    }, ...prev]);
  };

  const removeAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  // Grid Layout Logic
  const getGridClass = () => {
    if (races.length === 1) return 'grid-cols-1';
    if (races.length === 2) return 'grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  return (
    <div className="fixed inset-0 bg-white text-black font-sans flex flex-col overflow-hidden">
      
      {/* GLOBAL PODIUM ALERT STACK */}
      {alerts.length > 0 && (
        <div className="bg-white border-b-8 border-amber-500 shadow-2xl z-50 max-h-[40vh] overflow-y-auto shrink-0 animate-in slide-in-from-top duration-300">
          <div className="p-4 bg-amber-500 flex justify-between items-center sticky top-0 z-20">
             <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
               <Trophy className="fill-white text-white" />
               ALERTES PODIUM ({alerts.length})
             </h2>
             <button 
               onClick={clearAllAlerts}
               className="bg-white text-amber-600 px-6 py-2 rounded-xl font-black uppercase text-xs hover:bg-amber-50 transition-colors flex items-center gap-2 shadow-sm"
             >
               <Trash2 size={16} />
               TOUT EFFACER
             </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map(alert => (
              <div 
                key={alert.alertId} 
                className={`relative p-4 rounded-xl border-l-[8px] shadow-md flex items-center justify-between animate-in zoom-in-95 duration-300 ${
                  alert.gender === 'M' ? 'bg-blue-50 border-blue-600' : 'bg-pink-50 border-pink-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {alert.rank === 1 ? '🏆' : alert.rank === 2 ? '🥈' : '🥉'}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      {alert.raceName}
                    </p>
                    <p className="text-xl font-black text-black uppercase leading-none">
                      {alert.lastName} <span className="font-bold text-slate-600">{alert.firstName}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="font-mono font-black text-lg bg-white/60 px-2 rounded text-black">
                         {alert.displayTime.split('.')[0]}
                       </span>
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded text-white uppercase ${
                         alert.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                       }`}>
                         {alert.gender === 'M' ? 'HOMME' : 'FEMME'}
                       </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeAlert(alert.alertId)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X size={24} className="text-black/40 hover:text-black" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RACES GRID */}
      <div className={`flex-1 grid ${getGridClass()} divide-x-4 divide-slate-200 overflow-hidden`}>
        {races.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center opacity-30">
            <Activity size={64} />
            <p className="text-2xl font-black uppercase mt-4">Aucune course active</p>
          </div>
        ) : (
          races.map(race => (
            <SpeakerRaceColumn 
              key={race.id} 
              race={race} 
              onPodium={handlePodium}
              processedIds={processedIds}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SpeakerView;