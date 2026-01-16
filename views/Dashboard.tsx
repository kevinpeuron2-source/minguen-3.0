import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, RaceStatus, Passage, ParticipantStatus } from '../types';
import { Trophy, Users, Activity, Flag, Edit3, Check, ChevronRight, MapPin, PlayCircle, AlertTriangle, Zap, ArrowUpRight } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const Dashboard: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [eventName, setEventName] = useState('Mon Événement');
  const [isEditingName, setIsEditingName] = useState(false);
  const { setDbError, isPermissionDenied } = useDatabase();

  const handleError = useCallback((err: any) => {
    setDbError(err.message || String(err));
  }, [setDbError]);

  useEffect(() => {
    const unsubRaces = onSnapshot(collection(db, 'races'), (snap) => {
      setRaces(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Race)));
    }, handleError);

    const unsubParticipants = onSnapshot(collection(db, 'participants'), (snap) => {
      setParticipants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)));
    }, handleError);

    const unsubPassages = onSnapshot(collection(db, 'passages'), (snap) => {
      setPassages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Passage)));
    }, handleError);

    const unsubSettings = onSnapshot(doc(db, 'settings', 'event'), (snap) => {
      if (snap.exists()) {
        setEventName(snap.data().name);
      }
    }, handleError);

    return () => {
      unsubRaces();
      unsubParticipants();
      unsubPassages();
      unsubSettings();
    };
  }, [handleError]);

  const saveEventName = async () => {
    try {
      await setDoc(doc(db, 'settings', 'event'), { name: eventName });
      setIsEditingName(false);
    } catch (err: any) {
      setDbError(err.message);
    }
  };

  const raceFlows = useMemo(() => {
    return races.map(race => {
      const raceParticipants = participants.filter(p => p.raceId === race.id);
      const activeParts = raceParticipants.filter(p => p.status !== ParticipantStatus.DNF);
      
      const lastPassagesMap = new Map<string, string>();
      const racePassages = passages.filter(pas => 
        raceParticipants.some(rp => rp.id === pas.participantId)
      ).sort((a, b) => a.timestamp - b.timestamp);

      racePassages.forEach(pas => {
        lastPassagesMap.set(pas.participantId, pas.checkpointId);
      });

      const counts: Record<string, number> = {
        'start': 0,
        'finish': 0,
        'dnf': raceParticipants.filter(p => p.status === ParticipantStatus.DNF).length
      };

      race.checkpoints.forEach(cp => counts[cp.id] = 0);

      activeParts.forEach(p => {
        const lastCpId = lastPassagesMap.get(p.id);
        if (!lastCpId) {
          counts['start']++;
        } else {
          counts[lastCpId] = (counts[lastCpId] || 0) + 1;
        }
      });

      return {
        ...race,
        counts,
        total: raceParticipants.length
      };
    });
  }, [races, participants, passages]);

  const stats = [
    { label: 'Courses Actives', value: races.filter(r => r.status === RaceStatus.RUNNING).length, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Athlètes Engagés', value: participants.length, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Derniers Passages', value: passages.length, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Points Terrain', value: races.reduce((acc, r) => acc + r.checkpoints.length, 0), icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  if (isPermissionDenied) return null;

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      {/* Header Cockpit */}
      <header className="flex flex-col gap-8">
        <div className="flex items-center gap-6 group">
          {isEditingName ? (
            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-3xl border border-white/10 w-full max-w-2xl backdrop-blur-xl">
              <input 
                type="text" 
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="text-4xl font-black text-white outline-none bg-transparent px-4 py-2 w-full"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveEventName()}
              />
              <button onClick={saveEventName} className="p-5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">
                <Check size={28} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                {eventName}
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Edit3 size={14} /> Rename Event
                </button>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid - High Precision Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="group relative bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl transition-all hover:border-blue-500/30">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 group-hover:text-blue-500 transition-all">
                <ArrowUpRight size={24} />
              </div>
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-white tracking-tighter mono">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Course Flow - Left side */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <Activity size={16} className="text-blue-500" /> Live Course Telemetry
              </h2>
           </div>

           <div className="grid grid-cols-1 gap-6">
              {raceFlows.map(race => (
                <div key={race.id} className="bg-[#0f172a] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600/20 group-hover:bg-blue-600 transition-colors"></div>
                  
                  <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${race.status === RaceStatus.RUNNING ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-slate-700'}`}></div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">{race.name}</h3>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Engagés</p>
                        <p className="text-2xl font-black text-blue-500 mono leading-none">{race.total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fini</p>
                        <p className="text-2xl font-black text-emerald-500 mono leading-none">{race.counts.finish}</p>
                      </div>
                    </div>
                  </div>

                  {/* High Tech Timeline */}
                  <div className="relative pt-12 pb-6 px-4">
                    <div className="absolute top-[60px] left-10 right-10 h-0.5 bg-white/5"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                      {/* START */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full border-[6px] border-[#0f172a] shadow-xl flex items-center justify-center transition-all ${race.counts.start > 0 ? 'bg-slate-600' : 'bg-slate-800 opacity-30'}`}>
                          <PlayCircle size={14} className="text-white" />
                        </div>
                        <div className="mt-6 text-center">
                          <span className="block text-xl font-black text-white mono leading-none">{race.counts.start}</span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Starting Area</span>
                        </div>
                      </div>

                      {/* CHECKPOINTS */}
                      {race.checkpoints.map((cp) => (
                        <div key={cp.id} className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full border-[6px] border-[#0f172a] shadow-xl flex items-center justify-center transition-all ${race.counts[cp.id] > 0 ? 'bg-blue-600 scale-125' : 'bg-slate-800 opacity-30'}`}>
                            <MapPin size={14} className="text-white" />
                          </div>
                          <div className="mt-6 text-center">
                            <span className={`block text-xl font-black mono leading-none ${race.counts[cp.id] > 0 ? 'text-blue-400' : 'text-slate-700'}`}>
                              {race.counts[cp.id]}
                            </span>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 truncate max-w-[80px]">{cp.name}</span>
                          </div>
                        </div>
                      ))}

                      {/* FINISH */}
                      <div className="flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-full border-[8px] border-[#0f172a] shadow-xl flex items-center justify-center transition-all ${race.counts.finish > 0 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-800 opacity-30'}`}>
                          <Trophy size={20} className="text-white" />
                        </div>
                        <div className="mt-4 text-center">
                          <span className={`block text-3xl font-black mono leading-none ${race.counts.finish > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>
                            {race.counts.finish}
                          </span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Arrivée</span>
                        </div>
                      </div>
                    </div>

                    {/* DNF Alert Tag */}
                    {race.counts.dnf > 0 && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-rose-500/10 text-rose-500 px-4 py-2 rounded-2xl flex items-center gap-2 border border-rose-500/20 backdrop-blur-md">
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{race.counts.dnf} DNF</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {races.length === 0 && (
                <div className="py-24 text-center bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5">
                   <Flag size={64} className="mx-auto text-slate-800 mb-6 opacity-20" />
                   <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No active race telemetry detected</p>
                </div>
              )}
           </div>
        </div>

        {/* Live Feed - Right side */}
        <div className="space-y-8">
           <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
             <Zap size={16} className="text-amber-500" /> Event Stream
           </h2>

           <div className="bg-[#0f172a] rounded-[3.5rem] border border-white/5 p-8 shadow-2xl space-y-6 max-h-[800px] overflow-y-auto scrollbar-hide">
             {passages.sort((a,b) => b.timestamp - a.timestamp).slice(0, 12).map((p, idx) => (
                <div key={p.id} className="group flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center font-black text-xl mono border border-blue-500/20">
                        {p.bib}
                      </div>
                      <div>
                        <p className="font-black text-[13px] text-white uppercase tracking-tight">{p.checkpointName}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase mono mt-1">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour12: false })}
                        </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <ChevronRight size={18} className="text-slate-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                   </div>
                </div>
             ))}
             
             {passages.length === 0 && (
               <div className="py-20 text-center opacity-20">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Waiting for signal...</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;