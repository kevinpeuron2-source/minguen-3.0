import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, limit, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, ParticipantStatus } from '../types';
import { formatDuration } from '../utils/time';
import { Timer, History, Undo2, CheckCircle2, Zap, ArrowLeft, Target } from 'lucide-react';

const RemoteFinishView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [recentPassages, setRecentPassages] = useState<Passage[]>([]);
  const [bibInput, setBibInput] = useState('');
  const [activeRaceId, setActiveRaceId] = useState('');
  const [lastLogged, setLastLogged] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSnapshot(collection(db, 'races'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      if (list.length > 0 && !activeRaceId) setActiveRaceId(list[0].id);
    });
    onSnapshot(collection(db, 'participants'), snap => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });
    const q = query(collection(db, 'passages'), where('checkpointId', '==', 'finish'), orderBy('timestamp', 'desc'), limit(15));
    onSnapshot(q, snap => {
      setRecentPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
    });
  }, [activeRaceId]);

  const activeRace = races.find(r => r.id === activeRaceId);

  const handleValidation = async () => {
    const bib = bibInput.trim();
    if (!bib) return;
    
    const part = participants.find(p => p.bib === bib);
    if (!part || !activeRace) {
      alert("Invalid Bib or No Active Race");
      return;
    }

    const timestamp = Date.now();
    const netTime = timestamp - (part.startTime || activeRace.startTime || timestamp);

    await addDoc(collection(db, 'passages'), {
      participantId: part.id,
      bib: part.bib,
      checkpointId: 'finish',
      checkpointName: 'ARRIVÉE',
      timestamp,
      netTime
    });
    await updateDoc(doc(db, 'participants', part.id), { status: ParticipantStatus.FINISHED });
    
    setLastLogged(bib);
    setBibInput('');
    setTimeout(() => setLastLogged(null), 2000);
    inputRef.current?.focus();
  };

  const deletePassage = async (passage: Passage) => {
    if (confirm("Cancel this arrival and put runner back on track?")) {
      await deleteDoc(doc(db, 'passages', passage.id));
      await updateDoc(doc(db, 'participants', passage.participantId), { status: ParticipantStatus.STARTED });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      {/* Handheld Device Header */}
      <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0a0f1e] sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-600/20">
            <Target size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">REMOTE<br/><span className="text-blue-500">CAPTURE</span></h1>
          </div>
        </div>
        
        <div className="text-right">
           <p className="text-4xl font-black mono text-emerald-400 leading-none">
             {activeRace?.startTime ? formatDuration(Date.now() - activeRace.startTime).split('.')[0] : '00:00:00'}
           </p>
           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">{activeRace?.name || 'Waiting for Race...'}</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Input Center */}
        <div className="flex-1 p-8 lg:p-20 flex flex-col justify-center items-center relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80%] bg-blue-600/5 blur-[100px] pointer-events-none rounded-full"></div>
           
           <div className="w-full max-w-2xl space-y-12 relative z-10">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Target Race</span>
                 <select 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-black text-xs uppercase tracking-widest text-blue-400 outline-none focus:border-blue-500 transition-all"
                    value={activeRaceId}
                    onChange={e => setActiveRaceId(e.target.value)}
                  >
                    {races.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
                  </select>
              </div>

              <div className="relative">
                <input 
                  ref={inputRef}
                  type="number"
                  className="w-full text-center text-[12rem] md:text-[16rem] font-black mono py-10 rounded-[3rem] bg-black/40 border border-white/10 focus:border-blue-600 outline-none transition-all placeholder:text-white/[0.02]"
                  value={bibInput}
                  onChange={e => setBibInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleValidation()}
                  placeholder="000"
                  autoFocus
                />
                
                {lastLogged && (
                  <div className="absolute inset-x-0 -bottom-10 flex justify-center animate-in slide-in-from-bottom-4">
                    <div className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-lg shadow-2xl flex items-center gap-3">
                      <CheckCircle2 /> RECORDED #{lastLogged}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleValidation}
                className="w-full bg-blue-600 text-white py-12 rounded-[3.5rem] font-black text-4xl shadow-2xl shadow-blue-600/20 active:scale-[0.98] transition-all hover:bg-blue-700 uppercase flex items-center justify-center gap-6"
              >
                LOG ARRIVAL <Zap size={40} />
              </button>
           </div>
        </div>

        {/* Side History for Desktop / Bottom for Mobile */}
        <div className="w-full lg:w-96 bg-[#0a0f1e] border-l border-white/5 flex flex-col">
           <div className="p-8 border-b border-white/5">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <History size={16} /> Recent Captures
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {recentPassages.map((p, i) => {
                const runner = participants.find(part => part.id === p.participantId);
                return (
                  <div key={p.id} className="bg-white/[0.02] p-5 rounded-3xl border border-white/[0.05] flex items-center justify-between group animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 50}ms` }}>
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center font-black text-xl mono">
                         {p.bib}
                       </div>
                       <div className="min-w-0">
                         <p className="font-black text-[11px] text-white uppercase truncate w-32 tracking-tight">{runner?.lastName || 'UNKNOWN'}</p>
                         <p className="text-[10px] font-black text-slate-500 mono mt-1">{formatDuration(p.netTime).split('.')[0]}</p>
                       </div>
                     </div>
                     <button 
                      onClick={() => deletePassage(p)}
                      className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                     >
                       <Undo2 size={18} />
                     </button>
                  </div>
                );
              })}
              {recentPassages.length === 0 && (
                <div className="py-20 text-center opacity-10">
                  <History size={48} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Buffer Empty</p>
                </div>
              )}
           </div>
           
           <div className="p-8 bg-black/40 text-center">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                MINGUEN PRO SERIES • HIGH LATENCY TOLERANT ENGINE
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteFinishView;