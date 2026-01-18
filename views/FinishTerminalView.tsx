import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, ParticipantStatus, RaceStatus } from '../types';
import { formatDuration } from '../utils/time';
import { 
  CheckCircle2, 
  History, 
  Undo2, 
  Timer, 
  Zap,
  Activity,
  UserCheck,
  Lock,
  ArrowRight,
  Focus,
  X,
  AlertTriangle
} from 'lucide-react';

const FinishTerminalView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bibInput, setBibInput] = useState<string>('');
  const [waitingPile, setWaitingPile] = useState<{timestamp: number, id: string}[]>([]);
  const [recentPassages, setRecentPassages] = useState<Passage[]>([]);
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(true);
  const [lastValidation, setLastValidation] = useState<{bib: string, name: string} | null>(null);
  const [, setTick] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubRaces = onSnapshot(collection(db, 'races'), snap => {
      setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Race)));
    });
    const unsubParts = onSnapshot(collection(db, 'participants'), snap => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });
    const q = query(
      collection(db, 'passages'), 
      where('checkpointId', '==', 'finish'),
      orderBy('timestamp', 'desc'), 
      limit(10)
    );
    const unsubPassages = onSnapshot(q, snap => {
      setRecentPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
    });
    return () => { unsubRaces(); unsubParts(); unsubPassages(); };
  }, []);

  useEffect(() => {
    if (isFocusLocked) {
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
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
      alert(`Dossard ${bib} introuvable dans la base !`);
      setBibInput('');
      return;
    }

    const race = races.find(r => r.id === runner.raceId);
    if (!race || race.status !== RaceStatus.RUNNING) {
      alert("La course n'est pas active.");
      setBibInput('');
      return;
    }

    let timestamp = Date.now();
    // LOGIQUE HYBRIDE : Si pile d'attente, on prend le plus ancien timestamp
    if (waitingPile.length > 0) {
      timestamp = waitingPile[0].timestamp;
      setWaitingPile(prev => prev.slice(1));
    }

    const netTime = timestamp - (runner.startTime || race.startTime || timestamp);

    try {
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
    } catch (err) { console.error(err); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // TAB = Créer un timestamp fantôme
      const now = Date.now();
      setWaitingPile(prev => [...prev, { timestamp: now, id: crypto.randomUUID() }]);
      setBibInput('');
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      processPassage(bibInput);
    }
  };

  const cancelArrival = async (passage: Passage) => {
    if (!confirm(`Annuler l'arrivée du dossard ${passage.bib} ?`)) return;
    await deleteDoc(doc(db, 'passages', passage.id));
    await updateDoc(doc(db, 'participants', passage.participantId), { status: ParticipantStatus.STARTED });
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden select-none">
      <header className="bg-slate-900 border-b border-white/5 px-10 py-6 flex justify-between items-center z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
            <Timer size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">Terminal<span className="text-indigo-500">Arrivées</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">Saisie Hybride Directe & Pile</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <button 
            onClick={() => setIsFocusLocked(!isFocusLocked)}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all ${
              isFocusLocked ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 border border-white/5'
            }`}
          >
            <Focus size={16} /> {isFocusLocked ? 'Capture ON' : 'Capture OFF'}
          </button>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-12 flex flex-col items-center justify-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>
          
          <div className="w-full max-w-4xl space-y-12 relative z-10 text-center">
            {waitingPile.length > 0 && (
              <div className="bg-amber-500/10 border-2 border-amber-500/20 p-8 rounded-[3rem] animate-in zoom-in-95 flex flex-col items-center">
                <div className="flex items-center gap-4 text-amber-500 font-black uppercase text-xs tracking-[0.2em] mb-4">
                  <Zap size={20} className="animate-pulse" /> Pile d'attente active ({waitingPile.length} temps enregistrés)
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {waitingPile.map(item => (
                    <div key={item.id} className="bg-amber-500 text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-3">
                      {new Date(item.timestamp).toLocaleTimeString()}
                      <X size={14} className="cursor-pointer hover:scale-125" onClick={() => setWaitingPile(p => p.filter(x => x.id !== item.id))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={e => e.preventDefault()}>
              <span className="text-sm font-black text-slate-500 uppercase tracking-[0.8em] mb-4 block">Saisir Dossard</span>
              <input
                ref={inputRef}
                type="number"
                className="w-full bg-transparent text-center text-[16rem] md:text-[20rem] font-black mono outline-none text-white placeholder:text-white/[0.02] leading-none"
                placeholder="000"
                value={bibInput}
                onChange={e => setBibInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </form>

            {lastValidation && (
              <div className="bg-emerald-500 px-12 py-8 rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 flex items-center gap-8 border border-emerald-400/50 mx-auto w-fit">
                <UserCheck size={56} className="text-white" />
                <div className="text-left">
                  <p className="text-6xl font-black uppercase tracking-tight">#{lastValidation.bib} OK</p>
                  <p className="text-lg font-bold opacity-80 uppercase tracking-widest">{lastValidation.name}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 mt-12">
               <div className="bg-white/5 p-6 rounded-3xl text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Temps seul</p>
                  <p className="text-xl font-black text-amber-500 mt-1 uppercase tracking-tighter">Touche TAB</p>
               </div>
               <div className="bg-white/5 p-6 rounded-3xl text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valider Dossard</p>
                  <p className="text-xl font-black text-indigo-500 mt-1 uppercase tracking-tighter">Touche ENTRÉE</p>
               </div>
            </div>
          </div>
        </div>

        <aside className="w-[400px] bg-slate-900/50 border-l border-white/5 flex flex-col backdrop-blur-md">
           <div className="p-10 border-b border-white/5">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-4">
                <History size={18} className="text-indigo-500" /> DERNIERS PASSAGES
              </h3>
           </div>
           <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide">
             {recentPassages.map((p) => {
               const runner = participants.find(part => part.id === p.participantId);
               return (
                 <div key={p.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/5 text-indigo-400 rounded-2xl flex items-center justify-center font-black text-xl mono">
                        {p.bib}
                      </div>
                      <div className="truncate">
                        <p className="font-black text-base text-white uppercase truncate w-40">{runner?.lastName || '---'}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase">{formatDuration(p.netTime).split('.')[0]}</p>
                      </div>
                    </div>
                    <button onClick={() => cancelArrival(p)} className="p-4 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Undo2 size={24} /></button>
                 </div>
               );
             })}
           </div>
           <div className="p-10 bg-black/20 text-center">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">Terminal V4.0 Stable</p>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default FinishTerminalView;