import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, ParticipantStatus, RaceStatus } from '../types';
import { formatDuration } from '../utils/time';
import { 
  CheckCircle2, 
  History, 
  Undo2, 
  X, 
  Delete, 
  Timer, 
  ChevronRight, 
  ArrowLeft,
  Settings,
  Zap,
  User,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const FinishTerminalView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bibInput, setBibInput] = useState('');
  const [recentPassages, setRecentPassages] = useState<Passage[]>([]);
  const [lastValidation, setLastValidation] = useState<{bib: string, name: string} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubRaces = onSnapshot(collection(db, 'races'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      if (list.length > 0 && !selectedRaceId) setSelectedRaceId(list[0].id);
    });

    const unsubParts = onSnapshot(collection(db, 'participants'), snap => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });

    const q = query(
      collection(db, 'passages'), 
      orderBy('timestamp', 'desc'), 
      limit(10)
    );
    const unsubPassages = onSnapshot(q, snap => {
      setRecentPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
    });

    return () => { unsubRaces(); unsubParts(); unsubPassages(); };
  }, [selectedRaceId]);

  const activeRace = useMemo(() => races.find(r => r.id === selectedRaceId), [races, selectedRaceId]);

  const handleBibEntry = async (bib: string) => {
    if (!bib) return;
    const runner = participants.find(p => p.bib === bib && p.raceId === selectedRaceId);
    
    if (!runner) {
      alert(`Dossard ${bib} introuvable pour cette course.`);
      setBibInput('');
      return;
    }

    if (!activeRace || activeRace.status !== RaceStatus.RUNNING) {
      alert("La course n'est pas lancée.");
      return;
    }

    const timestamp = Date.now();
    const netTime = timestamp - (runner.startTime || activeRace.startTime || timestamp);

    await addDoc(collection(db, 'passages'), {
      participantId: runner.id,
      bib: runner.bib,
      checkpointId: 'finish',
      checkpointName: 'ARRIVÉE',
      timestamp,
      netTime
    });

    await updateDoc(doc(db, 'participants', runner.id), { status: ParticipantStatus.FINISHED });
    
    setLastValidation({ bib: runner.bib, name: `${runner.lastName} ${runner.firstName}` });
    setBibInput('');
    setTimeout(() => setLastValidation(null), 3000);
  };

  const cancelArrival = async (passage: Passage) => {
    if (!confirm(`Annuler l'arrivée du dossard ${passage.bib} ?`)) return;
    await deleteDoc(doc(db, 'passages', passage.id));
    await updateDoc(doc(db, 'participants', passage.participantId), { status: ParticipantStatus.STARTED });
  };

  const appendToBib = (val: string) => setBibInput(prev => (prev + val).slice(0, 5));
  const backspace = () => setBibInput(prev => prev.slice(0, -1));

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header compact & Status */}
      <header className="bg-white border-b border-slate-200 px-10 py-6 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-3 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Timer className="text-indigo-600" size={24} /> TERMINAL<span className="text-indigo-600">ARRIVÉE</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Minguen OS 4.0 Pro Station</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Chrono Course</p>
            <p className="text-3xl font-black text-indigo-600 mono leading-none">
              {activeRace?.startTime ? formatDuration(Date.now() - activeRace.startTime).split('.')[0] : '00:00:00'}
            </p>
          </div>
          <select 
            className="bg-slate-100 border-none rounded-2xl px-6 py-4 font-black text-sm text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 cursor-pointer"
            value={selectedRaceId}
            onChange={e => setSelectedRaceId(e.target.value)}
          >
            {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Recording Interface */}
        <div className="flex-1 p-12 flex flex-col gap-10">
          
          {/* Validation Feedback Banner */}
          <div className={`h-24 rounded-[2rem] flex items-center justify-center gap-4 transition-all duration-500 overflow-hidden ${
            lastValidation ? 'bg-indigo-600 shadow-xl shadow-indigo-100 translate-y-0' : 'bg-slate-100 opacity-20 -translate-y-2'
          }`}>
            {lastValidation ? (
              <>
                <CheckCircle2 size={32} className="text-white animate-in zoom-in" />
                <span className="text-2xl font-black text-white uppercase tracking-tight">
                  #{lastValidation.bib} • {lastValidation.name} VALIDÉ
                </span>
              </>
            ) : (
              <span className="text-slate-400 font-black uppercase text-sm tracking-widest">En attente de saisie...</span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-12 gap-10">
            {/* Display & Numeric Keypad */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
              <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-12 shadow-soft text-center flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mb-4">Dossard en cours</span>
                <div className="text-[12rem] font-black text-slate-900 mono leading-none tracking-tighter">
                  {bibInput || <span className="text-slate-100">000</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === 'C') backspace();
                      else if (key === 'OK') handleBibEntry(bibInput);
                      else appendToBib(key.toString());
                    }}
                    className={`rounded-[2.5rem] font-black text-4xl transition-all active:scale-95 shadow-soft border border-slate-100 ${
                      key === 'OK' ? 'bg-indigo-600 text-white col-span-1' : 
                      key === 'C' ? 'bg-rose-50 text-rose-500' : 'bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* History Sidebar */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-soft flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-8 px-2">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <History size={18} /> Dernières Arrivées
                  </h3>
                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">TOP 10</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                  {recentPassages.map((p, i) => {
                    const runner = participants.find(part => part.id === p.participantId);
                    return (
                      <div key={p.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex items-center justify-between group animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-slate-200">
                            {p.bib}
                          </div>
                          <div>
                            <p className="font-black text-sm text-slate-900 uppercase tracking-tight truncate w-40">{runner?.lastName || '---'}</p>
                            <p className="text-[10px] font-black text-slate-400 mono mt-0.5">{formatDuration(p.netTime).split('.')[0]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => cancelArrival(p)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Undo2 size={20} />
                        </button>
                      </div>
                    );
                  })}
                  {recentPassages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4 opacity-50">
                      <Zap size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Aucune arrivée détectée</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls & Quick Info */}
              <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Activity size={80} />
                </div>
                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Settings size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Configuration</p>
                      <p className="font-black text-lg">POSTE FIXE PRINCIPAL</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase">Synchronisation</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-xs font-black">CLOUD OK</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-indigo-400 uppercase">Latence</p>
                      <p className="text-xs font-black">12ms</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinishTerminalView;