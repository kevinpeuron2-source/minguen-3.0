import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, RaceStatus, ParticipantStatus, Passage } from '../types';
import { formatDuration } from '../utils/time';
import { Focus, Timer, CheckCircle2, ListFilter, X, MapPin, AlertTriangle, Zap, Terminal, Activity } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const TimingView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [activeRaceId, setActiveRaceId] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allPassages, setAllPassages] = useState<Passage[]>([]);
  const [waitingPile, setWaitingPile] = useState<{timestamp: number, id: string}[]>([]);
  const [bibInput, setBibInput] = useState<string>('');
  const [dnfInput, setDnfInput] = useState<string>('');
  const [isFocusLocked, setIsFocusLocked] = useState<boolean>(true);
  const [lastValidation, setLastValidation] = useState<{bib: string, status: 'ok' | 'missing', name: string} | null>(null);
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
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      if (!activeRaceId && list.length > 0) setActiveRaceId(list[0].id);
    }, handleError);

    const unsubParts = onSnapshot(collection(db, 'participants'), (snap) => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    }, handleError);

    const unsubPassages = onSnapshot(collection(db, 'passages'), (snap) => {
      setAllPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
    }, handleError);

    return () => { unsubRaces(); unsubParts(); unsubPassages(); };
  }, [activeRaceId, handleError]);

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

  const checkMandatoryPoints = (participantId: string, raceId: string) => {
    const race = races.find(r => r.id === raceId);
    if (!race) return true;
    const mandatoryCps = race.checkpoints.filter(cp => cp.isMandatory);
    if (mandatoryCps.length === 0) return true;

    const participantPassages = allPassages.filter(pas => pas.participantId === participantId);
    const passedCpIds = new Set(participantPassages.map(p => p.checkpointId));

    return mandatoryCps.every(cp => passedCpIds.has(cp.id));
  };

  const processPassage = async (bib: string, isDNF: boolean = false) => {
    if (!bib) return;
    
    const participant = participants.find(p => p.bib === bib);
    if (!participant) {
      alert(`Dossard ${bib} inconnu !`);
      return;
    }

    const race = races.find(r => r.id === participant.raceId);
    if (!race || race.status !== RaceStatus.RUNNING) {
      alert(`La course ${race?.name || ''} n'est pas lancée !`);
      return;
    }

    if (isDNF) {
      await updateDoc(doc(db, 'participants', participant.id), { status: ParticipantStatus.DNF });
      setDnfInput('');
      return;
    }

    const hasAllPoints = checkMandatoryPoints(participant.id, race.id);

    let timestamp = Date.now();
    if (waitingPile.length > 0) {
      timestamp = waitingPile[0].timestamp;
      setWaitingPile(prev => prev.slice(1));
    }

    const netTime = timestamp - (participant.startTime || race.startTime || timestamp);

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
      status: hasAllPoints ? 'ok' : 'missing'
    });

    setBibInput('');
    setTimeout(() => setLastValidation(null), 5000);
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
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      {/* Race Timer Header Row */}
      <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide">
        {races.filter(r => r.status === RaceStatus.RUNNING).map(race => (
          <div key={race.id} className="flex-none bg-[#0f172a] p-8 rounded-[2.5rem] border-t-4 border-blue-500 shadow-2xl min-w-[300px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 group-hover:text-blue-500 transition-all">
               <Activity size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{race.name}</p>
            <p className="text-4xl font-black text-white mono mt-2">
              {formatDuration(Date.now() - (race.startTime || 0)).split('.')[0]}
            </p>
          </div>
        ))}
      </div>

      {/* Main Recording Console */}
      <div className="bg-[#0f172a] rounded-[5rem] p-16 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Glow Layer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100%] h-full bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Dynamic Status Overlay */}
        {lastValidation && (
          <div className={`absolute inset-x-0 top-0 p-10 text-center font-black animate-in slide-in-from-top-full duration-700 z-30 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${
            lastValidation.status === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'
          }`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-4 text-3xl tracking-tighter uppercase">
                {lastValidation.status === 'ok' ? <CheckCircle2 size={40}/> : <AlertTriangle size={40}/>}
                #{lastValidation.bib} • {lastValidation.name}
              </div>
              <p className="text-xs tracking-[0.4em] opacity-80 mt-2">
                {lastValidation.status === 'ok' ? 'PARCOURS INTÉGRALEMENT VALIDÉ' : 'ALERTE : POINTS DE CONTRÔLE MANQUANTS !'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-16 relative z-10">
          <div>
            <h2 className="text-5xl font-black text-white flex items-center gap-5 tracking-tighter">
              <Terminal className="text-blue-500" size={48} /> ARRIVAL<span className="text-blue-500">ENGINE</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> High-Frequency Input Mode Active
            </p>
          </div>
          <button 
            onClick={() => setIsFocusLocked(!isFocusLocked)}
            className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-4 transition-all ${
              isFocusLocked ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/20 active:scale-95' : 'bg-white/5 text-slate-500 border border-white/5'
            }`}
          >
            <Focus size={20} /> {isFocusLocked ? 'Capture Focus On' : 'Unlock Capture'}
          </button>
        </div>

        {/* Huge Bib Input */}
        <div className="relative mb-20">
          <input
            ref={inputRef}
            type="text"
            className="w-full text-center text-[18rem] font-black mono py-10 rounded-[4rem] bg-black/40 border border-white/5 focus:border-blue-500/50 outline-none transition-all placeholder:text-white/[0.02] shadow-inner relative z-10 text-white"
            placeholder="000"
            value={bibInput}
            onChange={(e) => setBibInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute top-1/2 left-10 -translate-y-1/2 text-slate-800 font-black text-[2rem] uppercase tracking-widest pointer-events-none hidden lg:block">Input_Buf</div>
          <div className="absolute top-1/2 right-10 -translate-y-1/2 text-slate-800 font-black text-[2rem] uppercase tracking-widest pointer-events-none hidden lg:block">Bib_Cap</div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <button 
            onClick={() => { const now = Date.now(); setWaitingPile(p => [...p, {timestamp: now, id: crypto.randomUUID()}])}} 
            className="group bg-white/5 hover:bg-white/10 text-white py-12 rounded-[3.5rem] font-black text-3xl flex items-center justify-center gap-6 border border-white/10 shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Timer size={40} />
            </div>
            <span>MARK TOP</span>
            <span className="text-[10px] px-4 py-2 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">TAB</span>
          </button>
          
          <button 
            onClick={() => processPassage(bibInput)} 
            className="group bg-blue-600 text-white py-12 rounded-[3.5rem] font-black text-3xl flex items-center justify-center gap-6 shadow-2xl shadow-blue-600/20 transition-all active:scale-[0.98] hover:bg-blue-700"
          >
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 size={40} />
            </div>
            <span>CONFIRM</span>
            <span className="text-[10px] px-4 py-2 bg-white/20 rounded-full border border-white/20">ENTER</span>
          </button>
        </div>
      </div>

      {/* Secondary Tools Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Waiting Pile / Buffer */}
        <div className="lg:col-span-2 bg-[#0f172a] rounded-[4rem] p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mb-32 -mr-32 blur-3xl"></div>
          <h3 className="text-xs font-black text-slate-500 uppercase mb-10 flex items-center gap-4 tracking-[0.3em] relative z-10">
            <Zap size={20} className="text-amber-500" /> Pending Timestamp Buffer ({waitingPile.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
            {waitingPile.map((item) => (
              <div key={item.id} className="group bg-white/[0.02] p-8 rounded-3xl border border-white/[0.05] flex items-center justify-between hover:bg-white/[0.05] hover:border-amber-500/30 transition-all animate-in zoom-in-95">
                <span className="font-black text-white mono text-2xl group-hover:text-amber-400 transition-colors">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <button 
                  onClick={() => setWaitingPile(p => p.filter(x => x.id !== item.id))} 
                  className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
            {waitingPile.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <p className="text-slate-700 font-black uppercase tracking-widest text-[10px] italic">Buffer empty. Awaiting top signal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick DNF Input */}
        <div className="bg-[#1e1e1e] rounded-[4rem] p-12 border border-rose-500/10 shadow-2xl">
          <h3 className="text-xs font-black text-rose-500 uppercase mb-10 flex items-center gap-4 tracking-[0.3em]">
            <AlertTriangle size={20} /> DNF DECLARATION
          </h3>
          <div className="space-y-8">
            <div className="relative">
               <Terminal className="absolute left-8 top-1/2 -translate-y-1/2 text-rose-500/30" size={32} />
               <input 
                type="text" 
                placeholder="Bib No."
                className="w-full bg-black/40 border border-white/5 rounded-[2rem] pl-20 pr-8 py-8 font-black text-5xl text-rose-500 mono outline-none focus:border-rose-500 transition-all placeholder:text-rose-900/20"
                value={dnfInput}
                onChange={e => setDnfInput(e.target.value)}
              />
            </div>
            <button 
              onClick={() => processPassage(dnfInput, true)}
              className="w-full bg-rose-600 text-white py-8 rounded-[2rem] font-black text-xl shadow-2xl shadow-rose-900 active:scale-95 transition-all uppercase tracking-widest hover:bg-rose-700"
            >
              RECORD DNF
            </button>
            <p className="text-[9px] font-black text-slate-600 text-center uppercase tracking-widest px-4">
              Recording a DNF will immediately remove the athlete from active telemetry for this race.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimingView;