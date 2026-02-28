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

  if (!startTime) return <span className="text-slate-400">--:--:--</span>;
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

  const displayList = useMemo(() => {
    return [...kernelResults]
      .filter(r => r.lastTimestamp > 0)
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .slice(0, 50); 
  }, [kernelResults]);

  const getRowStyle = (rank: number) => {
    const base = "border-[3px] border-black";
    if (rank === 1) return `${base} bg-yellow-400`;
    if (rank === 2) return `${base} bg-gray-300`;
    if (rank === 3) return `${base} bg-orange-400`;
    return `${base} bg-white`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-[3px] border-black">
      {/* COLUMN HEADER - High Contrast Black/White */}
      <div className="bg-black text-white p-6 border-b-[3px] border-black sticky top-0 z-10 shadow-md">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 truncate leading-none" title={race.name}>
          {race.name}
        </h2>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-white/80 font-bold uppercase text-lg">
            <MapPin size={20} />
            <span>{race.distance} KM</span>
          </div>
          <div className="flex items-center gap-2 text-black font-black text-3xl bg-white px-4 py-1 rounded-lg">
            <Clock size={24} />
            <RaceTimer startTime={race.startTime} />
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {displayList.map(r => {
           return (
             <div 
               key={r.id}
               className={`p-4 rounded-xl flex items-center justify-between shadow-sm transition-transform hover:scale-[1.01] ${getRowStyle(r.rank)}`}
             >
               <div className="flex items-center gap-6 overflow-hidden">
                 {/* BIB - King Size */}
                 <div className="w-24 h-24 flex items-center justify-center bg-black text-white font-black text-4xl rounded-xl shrink-0 border-2 border-white/20 shadow-lg">
                   {r.bib}
                 </div>
                 
                 {/* NAME - King Size */}
                 <div className="min-w-0 flex flex-col justify-center">
                   <p className="text-3xl font-bold text-black uppercase truncate leading-none tracking-tight">
                     {r.lastName}
                   </p>
                   <p className="text-2xl font-bold text-black/80 uppercase truncate leading-tight mt-1">
                     {r.firstName}
                   </p>
                   {/* Reduced secondary info */}
                   <div className="flex items-center gap-2 mt-2 opacity-60">
                     <span className="text-xs font-black bg-black text-white px-2 py-0.5 rounded uppercase">
                       {r.category}
                     </span>
                   </div>
                 </div>
               </div>
               
               {/* TIME - King Size Monospace */}
               <div className="text-right shrink-0 ml-4">
                 <p className="text-5xl font-black text-black mono tracking-tighter leading-none">
                   {r.displayTime.split('.')[0]}
                 </p>
                 <p className="text-sm font-black text-black/50 uppercase mt-2 tracking-widest">
                   #{r.rank} SCRATCH
                 </p>
               </div>
             </div>
           );
        })}
        {displayList.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <Activity size={64} />
            <p className="font-black uppercase mt-4 text-2xl">En attente...</p>
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
      
      {/* GLOBAL PODIUM ALERT STACK - 30% Height */}
      {alerts.length > 0 && (
        <div className="bg-white border-b-[8px] border-black shadow-2xl z-50 h-[30vh] flex flex-col shrink-0 animate-in slide-in-from-top duration-300">
          <div className="p-4 bg-black text-white flex justify-between items-center sticky top-0 z-20 shrink-0">
             <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-4">
               <Trophy className="fill-yellow-400 text-yellow-400" size={32} />
               ALERTES PODIUM ({alerts.length})
             </h2>
             <button 
               onClick={clearAllAlerts}
               className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase text-sm hover:bg-red-700 transition-colors flex items-center gap-2 border-2 border-white"
             >
               <Trash2 size={20} />
               TOUT EFFACER
             </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-slate-100 flex-1">
            {alerts.map(alert => (
              <div 
                key={alert.alertId} 
                className={`relative p-6 rounded-2xl border-[4px] border-black shadow-xl flex items-center justify-between animate-in zoom-in-95 duration-300 bg-white`}
              >
                <div className="flex items-center gap-8">
                  <div className="text-6xl drop-shadow-md">
                    {alert.rank === 1 ? '🏆' : alert.rank === 2 ? '🥈' : '🥉'}
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-500 uppercase tracking-widest mb-1 bg-slate-200 inline-block px-2 rounded">
                      {alert.raceName}
                    </p>
                    <div className="flex flex-col">
                      <p className="text-4xl font-black text-black uppercase leading-none mt-2">
                        {alert.lastName}
                      </p>
                      <p className="text-2xl font-bold text-black/70 uppercase leading-none">
                        {alert.firstName}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                       <span className="font-mono font-black text-4xl bg-black text-white px-4 py-1 rounded-lg">
                         {alert.displayTime.split('.')[0]}
                       </span>
                       <span className={`text-sm font-black px-3 py-1 rounded text-white uppercase border-2 border-black ${
                         alert.gender === 'M' ? 'bg-blue-600' : 'bg-pink-600'
                       }`}>
                         {alert.gender === 'M' ? 'HOMME' : 'FEMME'}
                       </span>
                    </div>
                  </div>
                </div>
                
                {/* GIANT CLOSE BUTTON */}
                <button 
                  onClick={() => removeAlert(alert.alertId)}
                  className="absolute inset-y-0 right-0 w-32 bg-slate-100 hover:bg-red-100 border-l-[4px] border-black flex items-center justify-center transition-colors group rounded-r-xl"
                >
                  <X size={64} className="text-slate-400 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RACES GRID - With Gaps */}
      <div className={`flex-1 grid ${getGridClass()} gap-8 p-8 overflow-hidden bg-slate-100`}>
        {races.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center opacity-30">
            <Activity size={80} />
            <p className="text-4xl font-black uppercase mt-6">Aucune course active</p>
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