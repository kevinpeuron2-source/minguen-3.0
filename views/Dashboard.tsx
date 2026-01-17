import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, RaceStatus, Passage, ParticipantStatus } from '../types';
// Fixed: Added missing ChevronRight import to resolve reference error on line 247
import { Trophy, Users, Activity, Flag, Edit3, Check, MapPin, PlayCircle, AlertTriangle, Zap, ArrowUpRight, ChevronRight } from 'lucide-react';
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
    { label: 'Courses Actives', value: races.filter(r => r.status === RaceStatus.RUNNING).length, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Participants', value: participants.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Derniers Passages', value: passages.length, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Points Terrain', value: races.reduce((acc, r) => acc + r.checkpoints.length, 0), icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (isPermissionDenied) return null;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-6 group">
          {isEditingName ? (
            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 w-full max-w-2xl shadow-soft">
              <input 
                type="text" 
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="text-4xl font-black text-slate-900 outline-none bg-transparent px-4 py-2 w-full"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveEventName()}
              />
              <button onClick={saveEventName} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                <Check size={28} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                {eventName}
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                >
                  <Edit3 size={14} /> Renommer l'événement
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-soft transition-all hover:-translate-y-1 hover:shadow-md">
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                <stat.icon size={28} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-4xl font-black text-slate-900 tracking-tighter mono">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Activity size={16} className="text-indigo-600" /> Télémétrie des épreuves
              </h2>
           </div>

           <div className="grid grid-cols-1 gap-8">
              {raceFlows.map(race => (
                <div key={race.id} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-soft relative overflow-hidden group hover:border-indigo-200 transition-all">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-100 group-hover:bg-indigo-600 transition-colors"></div>
                  
                  <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${race.status === RaceStatus.RUNNING ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`}></div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{race.name}</h3>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Participants</p>
                        <p className="text-2xl font-black text-indigo-600 mono leading-none">{race.total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fini</p>
                        <p className="text-2xl font-black text-emerald-500 mono leading-none">{race.counts.finish}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative pt-12 pb-6 px-4">
                    <div className="absolute top-[60px] left-10 right-10 h-1 bg-slate-100 rounded-full"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full bg-white border-2 shadow-sm flex items-center justify-center transition-all ${race.counts.start > 0 ? 'border-indigo-500 text-indigo-600' : 'border-slate-100 text-slate-200'}`}>
                          <PlayCircle size={14} />
                        </div>
                        <div className="mt-6 text-center">
                          <span className="block text-xl font-black text-slate-900 mono leading-none">{race.counts.start}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase mt-1">Départ</span>
                        </div>
                      </div>

                      {race.checkpoints.map((cp) => (
                        <div key={cp.id} className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full bg-white border-2 shadow-sm flex items-center justify-center transition-all ${race.counts[cp.id] > 0 ? 'border-indigo-500 text-indigo-600' : 'border-slate-100 text-slate-200'}`}>
                            <MapPin size={14} />
                          </div>
                          <div className="mt-6 text-center">
                            <span className={`block text-xl font-black mono leading-none ${race.counts[cp.id] > 0 ? 'text-indigo-600' : 'text-slate-200'}`}>
                              {race.counts[cp.id]}
                            </span>
                            <span className="text-[8px] font-black text-slate-400 uppercase mt-1 truncate max-w-[80px]">{cp.name}</span>
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-full bg-white border-2 shadow-md flex items-center justify-center transition-all ${race.counts.finish > 0 ? 'border-emerald-500 text-emerald-600' : 'border-slate-100 text-slate-200'}`}>
                          <Trophy size={20} />
                        </div>
                        <div className="mt-4 text-center">
                          <span className={`block text-3xl font-black mono leading-none ${race.counts.finish > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                            {race.counts.finish}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase mt-1">Arrivée</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="space-y-8">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
             <Zap size={16} className="text-amber-500" /> Flux d'événements
           </h2>

           <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-soft space-y-6 max-h-[800px] overflow-y-auto scrollbar-hide">
             {passages.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border border-slate-200">
                        {p.bib}
                      </div>
                      <div>
                        <p className="font-black text-xs text-slate-900 uppercase tracking-tight">{p.checkpointName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mono mt-0.5">
                          {new Date(p.timestamp).toLocaleTimeString([], { hour12: false })}
                        </p>
                      </div>
                   </div>
                   <ChevronRight size={16} className="text-slate-200" />
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;