import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, RaceStatus, ParticipantStatus, Passage } from '../types';
import { formatDuration } from '../utils/time';
import { Focus, Timer, CheckCircle2, ListFilter, X, MapPin, AlertTriangle, Zap, Terminal, Activity, History } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const TimingView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingPile, setWaitingPile] = useState<{timestamp: number, id: string}[]>([]);
  const [bibInput, setBibInput] = useState<string>('');
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(true);
  const [lastValidation, setLastValidation] = useState<{bib: string, name: string, status: 'ok' | 'missing'} | null>(null);
  const [, setTick] = useState(0);
  const { setDbError } = useDatabase();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const handleError = useCallback((err: any) => {
    setDbError(err.message);
  }, [setDbError]);

  useEffect(() => {
    const unsubRaces = onSnapshot(collection(db, 'races'), (snap) => {
      setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Race)));
    }, handleError);
    const unsubParts = onSnapshot(collection(db, 'participants'), (snap) => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    }, handleError);
    return () => { unsubRaces(); unsubParts(); };
  }, [handleError]);

  useEffect(() => {
    if (isFocusLocked) {
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current && !document.querySelector('.modal')) {
          inputRef.current?.focus();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isFocusLocked]);

  const processPassage = async (bib: string) => {
    if (!bib) return;
    
    const runner = participants.find(p => p.bib === bib);
    if (!runner) {
      alert(`Dossard ${bib} inconnu !`);
      setBibInput('');
      return;
    }

    const race = races.find(r => r.id === runner.raceId);
    if (!race || race.status !== RaceStatus.RUNNING) {
      alert(`Course non lancée !`);
      setBibInput('');
      return;
    }

    let timestamp = Date.now();
    if (waitingPile.length > 0) {
      timestamp = waitingPile[0].timestamp;
      setWaitingPile(prev => prev.slice(1));
    }

    const netTime = timestamp - (runner.startTime || race.startTime || timestamp);

    await addDoc(collection(db, 'passages'), {
      participantId: runner.id,
      bib: runner.bib,
      checkpointId: 'finish',
      checkpointName: 'ARRIVÉE',
      timestamp,
      netTime
    });

    await updateDoc(doc(db, 'participants', runner.id), { status: ParticipantStatus.FINISHED });
    
    setLastValidation({
      bib: runner.bib,
      name: `${runner.lastName} ${runner.firstName}`,
      status: 'ok'
    });

    setBibInput('');
    setTimeout(() => setLastValidation(null), 4000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const now = Date.now();
      setWaitingPile(prev => [...prev, { timestamp: now, id: crypto.randomUUID() }]);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      processPassage(bibInput);
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in">
      <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
        {races.filter(r => r.status === RaceStatus.RUNNING).map(race => (
          <div key={race.id} className="flex-none bg-[#0f172a] p-8 rounded-[2.5rem] border-t-4 border-indigo-500 shadow-2xl min-w-[300px]">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{race.name}</p>
            <p className="text-4xl font-black text-white mono mt-2">
              {formatDuration(Date.now() - (race.startTime || 0)).split('.')[0]}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-[#0f172a] rounded-[5rem] p-16 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Waiting Pile Buffer */}
        {waitingPile.length > 0 && (
          <div className="absolute top-10 right-16 z-20 flex flex-col items-end gap-3 max-w-xs">
            <div className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-3 animate-bounce shadow-xl">
              <History size={16} /> PILE D'ATTENTE : {waitingPile.length}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
               {waitingPile.slice(0, 5).map(item => (
                 <div key={item.id} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg font-black text-[10px] text-slate-400 flex items-center gap-2">
                   {new Date(item.timestamp).toLocaleTimeString()}
                   <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setWaitingPile(p => p.filter(x => x.id !== item.id))} />
                 </div>
               ))}
               {waitingPile.length > 5 && <span className="text-[10px] font-black text-slate-600">+{waitingPile.length - 5} de plus...</span>}
            </div>
          </div>
        )}

        {lastValidation && (
          <div className={`absolute inset-x-0 top-0 p-10 text-center font-black animate-in slide-in-from-top-full duration-700 z-30 shadow-2xl ${
            lastValidation.status === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'
          }`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-4 text-3xl tracking-tighter uppercase">
                {lastValidation.status === 'ok' ? <CheckCircle2 size={40}/> : <AlertTriangle size={40}/>}
                #{lastValidation.bib} • {lastValidation.name}
              </div>
              <p className="text-xs tracking-[0.4em] opacity-80 mt-2 uppercase font-black">Passage enregistré</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16 relative z-10">
          <div>
            <h2 className="text-5xl font-black text-white flex items-center gap-5 tracking-tighter">
              ARRIVÉE<span className="text-indigo-500">MÉTIER</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Mode Saisie Hybride Actif
            </p>
          </div>
          <button 
            onClick={() => setIsFocusLocked(!isFocusLocked)}
            className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-4 transition-all ${
              isFocusLocked ? 'bg-indigo-600 text-white shadow-2xl active:scale-95' : 'bg-white/5 text-slate-500 border border-white/5'
            }`}
          >
            <Focus size={20} /> {isFocusLocked ? 'Capture Focus ON' : 'Déverrouillé'}
          </button>
        </div>

        <div className="relative mb-20">
          <input
            ref={inputRef}
            type="number"
            className="w-full text-center text-[18rem] font-black mono py-10 rounded-[4rem] bg-black/40 border border-white/5 focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/[0.02] shadow-inner relative z-10 text-white"
            placeholder="000"
            value={bibInput}
            onChange={(e) => setBibInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <button 
            onClick={() => { const now = Date.now(); setWaitingPile(p => [...p, {timestamp: now, id: crypto.randomUUID()}])}} 
            className="group bg-white/5 hover:bg-white/10 text-white py-12 rounded-[3.5rem] font-black text-3xl flex items-center justify-center gap-6 border border-white/10 shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Timer size={40} />
            </div>
            <span>MARQUER TEMPS (TAB)</span>
          </button>
          <button 
            onClick={() => processPassage(bibInput)} 
            className="group bg-indigo-600 text-white py-12 rounded-[3.5rem] font-black text-3xl flex items-center justify-center gap-6 shadow-2xl transition-all active:scale-[0.98] hover:bg-indigo-700"
          >
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 size={40} />
            </div>
            <span>CONFIRMER (ENTRÉE)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimingView;