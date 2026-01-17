import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, ParticipantStatus, RaceStatus } from '../types';
import { formatDuration } from '../utils/time';
import { 
  CheckCircle2, 
  History, 
  Undo2, 
  Timer, 
  ArrowLeft,
  Zap,
  Activity,
  UserCheck
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
      limit(5)
    );
    const unsubPassages = onSnapshot(q, snap => {
      setRecentPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
    });

    return () => { unsubRaces(); unsubParts(); unsubPassages(); };
  }, [selectedRaceId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const activeRace = useMemo(() => races.find(r => r.id === selectedRaceId), [races, selectedRaceId]);

  const handleBibEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const bib = bibInput.trim();
    if (!bib) return;

    const runner = participants.find(p => p.bib === bib && p.raceId === selectedRaceId);
    
    if (!runner) {
      alert(`Dossard ${bib} introuvable pour cette course.`);
      setBibInput('');
      return;
    }

    if (!activeRace || activeRace.status !== RaceStatus.RUNNING) {
      alert("La course n'est pas lancée.");
      setBibInput('');
      return;
    }

    const timestamp = Date.now();
    const netTime = timestamp - (runner.startTime || activeRace.startTime || timestamp);

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
      setTimeout(() => setLastValidation(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelArrival = async (passage: Passage) => {
    if (!confirm(`Annuler l'arrivée du dossard ${passage.bib} ?`)) return;
    await deleteDoc(doc(db, 'passages', passage.id));
    await updateDoc(doc(db, 'participants', passage.participantId), { status: ParticipantStatus.STARTED });
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans overflow-hidden">
      {/* Top Bar Navigation */}
      <header className="bg-slate-900/50 border-b border-white/5 px-10 py-6 flex justify-between items-center z-20 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-3 bg-white/5 text-slate-400 hover:text-indigo-400 rounded-2xl transition-all border border-white/5">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tighter flex items-center gap-3">
              <Timer className="text-indigo-500" size={24} /> ARRIVAL<span className="text-indigo-500">TERMINAL</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">High-Frequency Entry Station</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Chrono Course</p>
            <p className="text-3xl font-black text-emerald-500 mono leading-none">
              {activeRace?.startTime ? formatDuration(Date.now() - activeRace.startTime).split('.')[0] : '00:00:00'}
            </p>
          </div>
          <select 
            className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-sm text-indigo-400 outline-none focus:ring-4 focus:ring-indigo-500/20 cursor-pointer"
            value={selectedRaceId}
            onChange={e => setSelectedRaceId(e.target.value)}
          >
            {races.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
          </select>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-12 relative">
        {/* Giant Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-5xl space-y-12 relative z-10">
          
          {/* Active Entry Zone */}
          <form onSubmit={handleBibEntry} className="flex flex-col items-center gap-10">
            <div className="text-center space-y-4">
              <span className="text-sm font-black text-slate-500 uppercase tracking-[0.5em]">Input Bib Number</span>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="number"
                  className="w-full bg-transparent text-center text-[18rem] md:text-[24rem] font-black mono outline-none text-white placeholder:text-white/[0.02]"
                  placeholder="000"
                  value={bibInput}
                  onChange={e => setBibInput(e.target.value)}
                  autoFocus
                />
                <div className="absolute inset-x-0 bottom-10 h-2 bg-indigo-500/20 rounded-full blur-sm"></div>
              </div>
            </div>

            {lastValidation ? (
              <div className="bg-emerald-500 px-12 py-6 rounded-[2.5rem] shadow-2xl shadow-emerald-500/20 animate-in zoom-in duration-300 flex items-center gap-6 border border-emerald-400/50">
                <UserCheck size={48} className="text-white" />
                <div>
                  <p className="text-5xl font-black uppercase tracking-tight">#{lastValidation.bib} RECORDED</p>
                  <p className="text-sm font-bold opacity-80 uppercase tracking-widest">{lastValidation.name}</p>
                </div>
              </div>
            ) : (
              <div className="h-[120px]"></div>
            )}
          </form>
        </div>
      </div>

      {/* Footer / Side History */}
      <footer className="bg-slate-900/50 border-t border-white/5 p-8 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <History size={16} /> RECENT PASSAGES
            </h3>
            <div className="flex gap-4">
              {recentPassages.map((p, i) => (
                <div key={p.id} className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex items-center gap-4 group hover:bg-white/10 transition-all">
                  <span className="text-2xl font-black mono text-indigo-400">#{p.bib}</span>
                  <div className="h-8 w-px bg-white/10"></div>
                  <button onClick={() => cancelArrival(p)} className="text-slate-500 hover:text-rose-500 transition-colors">
                    <Undo2 size={18} />
                  </button>
                </div>
              ))}
              {recentPassages.length === 0 && (
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Waiting for arrivals...</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
             <Zap size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">Minguen Pro Station v4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FinishTerminalView;