import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Terminal,
  AlertTriangle,
  X
} from 'lucide-react';

const FinishTerminalView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bibInput, setBibInput] = useState<string>('');
  const [waitingPile, setWaitingPile] = useState<{timestamp: number, id: string}[]>([]);
  const [recentPassages, setRecentPassages] = useState<Passage[]>([]);
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(true);
  const [lastValidation, setLastValidation] = useState<{bib: string, status: 'ok' | 'missing', name: string} | null>(null);
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
    
    const participant = participants.find(p => p.bib === bib);
    if (!participant) {
      alert(`Dossard ${bib} inconnu dans la base globale !`);
      setBibInput('');
      return;
    }

    const race = races.find(r => r.id === participant.raceId);
    if (!race || race.status !== RaceStatus.RUNNING) {
      alert(`Course "${race?.name || ''}" non lancée.`);
      setBibInput('');
      return;
    }

    let timestamp = Date.now();
    if (waitingPile.length > 0) {
      timestamp = waitingPile[0].timestamp;
      setWaitingPile(prev => prev.slice(1));
    }

    const netTime = timestamp - (participant.startTime || race.startTime || timestamp);

    try {
      await addDoc(collection(db, 'passages'), {
        participantId: participant.id,
        bib: participant.bib,
        checkpointId: 'finish',
        checkpointName: 'ARRIVÉE',
        timestamp,
        netTime
      });
      await updateDoc(doc(db, 'participants', participant.id), { status: ParticipantStatus.FINISHED });
      
      setLastValidation({
        bib: participant.bib,
        name: `${participant.lastName} ${participant.firstName}`,
        status: 'ok'
      });
      setBibInput('');
      setTimeout(() => setLastValidation(null), 3000);
    } catch (err) { console.error(err); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
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
            <h1 className="text-xl font-black tracking-tighter">TERMINAL<span className="text-indigo-500">ARRIVÉE</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">Saisie Dossard Multi-Course</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <button 
            onClick={() => setIsFocusLocked(!isFocusLocked)}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all ${
              isFocusLocked ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 border border-white/5'
            }`}
          >
            <Focus size={16} /> {isFocusLocked ? 'Autofocus ON' : 'Autofocus OFF'}
          </button>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* CONSOLE DE SAISIE (COPIE timingView) */}
        <div className="flex-1 p-12 flex flex-col items-center justify-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>
          
          <div className="w-full max-w-4xl space-y-12 relative z-10 text-center">
            {lastValidation && (
              <div className={`absolute inset-x-0 -top-40 p-8 rounded-[3rem] text-center font-black animate-in slide-in-from-top-full duration-500 z-30 shadow-2xl ${
                lastValidation.status === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'
              }`}>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-4 text-4xl tracking-tighter uppercase">
                    {lastValidation.status === 'ok' ? <UserCheck size={48}/> : <AlertTriangle size={48}/>}
                    #{lastValidation.bib} • {lastValidation.name}
                  </div>
                  <p className="text-[10px] tracking-[0.4em] opacity-80 mt-2 uppercase font-black">Passage enregistré avec succès</p>
                </div>
              </div>
            )}

            <form onSubmit={e => e.preventDefault()} className="space-y-4">
              <span className="text-sm font-black text-slate-500 uppercase tracking-[0.8em] mb-4 block">Saisir Dossard Arrivant</span>
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

            <div className="grid grid-cols-2 gap-8">
              <button 
                onClick={() => { const now = Date.now(); setWaitingPile(p => [...p, {timestamp: now, id: crypto.randomUUID()}])}} 
                className="bg-white/5 hover:bg-white/10 text-white py-10 rounded-[3rem] font-black text-2xl flex items-center justify-center gap-6 border border-white/10 transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                  <Timer size={28} />
                </div>
                <span>TOP TEMPS (TAB)</span>
              </button>
              
              <button 
                onClick={() => processPassage(bibInput)} 
                className="bg-indigo-600 text-white py-10 rounded-[3rem] font-black text-2xl flex items-center justify-center gap-6 shadow-2xl shadow-indigo-600/20 transition-all active:scale-[0.98] hover:bg-indigo-700"
              >
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={28} />
                </div>
                <span>CONFIRMER (ENTRÉE)</span>
              </button>
            </div>

            {waitingPile.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-10">
                {waitingPile.map(item => (
                   <div key={item.id} className="bg-amber-500 text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-3 animate-in zoom-in">
                     <Zap size={14} /> {new Date(item.timestamp).toLocaleTimeString()}
                     <X size={14} className="cursor-pointer hover:scale-125" onClick={() => setWaitingPile(p => p.filter(x => x.id !== item.id))} />
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HISTORIQUE LATÉRAL */}
        <aside className="w-[400px] bg-slate-900/50 border-l border-white/5 flex flex-col backdrop-blur-md">
           <div className="p-8 border-b border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-4">
                <History size={16} className="text-indigo-500" /> DERNIERS ENREGISTREMENTS
              </h3>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
             {recentPassages.map((p) => {
               const runner = participants.find(part => part.id === p.participantId);
               return (
                 <div key={p.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center font-black text-xl mono border border-indigo-500/20">
                        {p.bib}
                      </div>
                      <div className="truncate">
                        <p className="font-black text-sm text-white uppercase truncate w-40">{runner?.lastName || '---'}</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{races.find(r => r.id === runner?.raceId)?.name || 'Course'}</p>
                      </div>
                    </div>
                    <button onClick={() => cancelArrival(p)} className="p-3 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Undo2 size={18} /></button>
                 </div>
               );
             })}
           </div>
           <div className="p-8 bg-black/20 text-center">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">Mode Terminal v4.0</p>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default FinishTerminalView;