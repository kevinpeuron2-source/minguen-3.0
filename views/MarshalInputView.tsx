import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, query, where, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { Race, Participant, Passage, GlobalCombinedPost } from '../types';
import { MapPin, Shield, Send, CheckCircle2, Layers, AlertCircle, ChevronRight, Lock, ArrowRight } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

const MarshalInputView: React.FC = () => {
  const { config } = useDatabase();
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCode, setAuthCode] = useState('');
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [marshalName, setMarshalName] = useState('');
  const [bibInput, setBibInput] = useState('');
  const [races, setRaces] = useState<Race[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [combinedPost, setCombinedPost] = useState<GlobalCombinedPost | null>(null);
  
  const raceId = searchParams.get('raceId') || '';
  const cpId = searchParams.get('cpId') || '';
  const combinedPostId = searchParams.get('combinedPostId') || '';
  
  const [activeRaceId, setActiveRaceId] = useState(raceId);
  const [activeCpId, setActiveCpId] = useState(cpId);
  const [lastValidation, setLastValidation] = useState<{name: string, bib: string} | null>(null);
  
  const marshalId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Charger les courses
    onSnapshot(collection(db, 'races'), snap => {
      setRaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as Race)));
    });

    // Gestion du mode Multi-Course
    if (combinedPostId) {
      const fetchGlobal = async () => {
        const docRef = doc(db, 'global_combined_posts', combinedPostId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as GlobalCombinedPost;
          setCombinedPost(data);
          setActiveRaceId(data.assignments[0].raceId);
          setActiveCpId(data.assignments[0].checkpointId);
          
          const raceIds = Array.from(new Set(data.assignments.map(a => a.raceId)));
          onSnapshot(query(collection(db, 'participants'), where('raceId', 'in', raceIds)), snap => {
            setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
          });
        }
      };
      fetchGlobal();
    } else if (raceId) {
      onSnapshot(query(collection(db, 'participants'), where('raceId', '==', raceId)), snap => {
        setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
      });
      setActiveRaceId(raceId);
      setActiveCpId(cpId);
    }
  }, [raceId, combinedPostId, cpId, isAuthenticated]);

  useEffect(() => {
    if (!isRegistered || !isAuthenticated) return;
    const interval = setInterval(async () => {
      const race = races.find(r => r.id === activeRaceId);
      const cp = race?.checkpoints.find(c => c.id === activeCpId);
      await setDoc(doc(db, 'active_marshals', marshalId.current), {
        id: marshalId.current,
        name: marshalName,
        stationName: cp?.name || (combinedPost?.name || 'Poste'),
        raceId: activeRaceId,
        checkpointId: activeCpId,
        lastActive: Date.now()
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [isRegistered, marshalName, activeRaceId, activeCpId, races, combinedPost, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode === config.marshalPassword) {
      setIsAuthenticated(true);
    } else {
      alert('Code Signaleur Incorrect');
    }
  };

  const handlePointage = async () => {
    if (!bibInput) return;
    let part = participants.find(p => p.bib === bibInput && p.raceId === activeRaceId);
    if (!part) part = participants.find(p => p.bib === bibInput);

    if (!part) {
      alert(`Dossard ${bibInput} non reconnu !`);
      setBibInput('');
      return;
    }

    const race = races.find(r => r.id === part?.raceId);
    if (!race) return;

    let targetCpId = activeCpId;
    let targetCpName = race.checkpoints.find(c => c.id === activeCpId)?.name || 'Point';

    if (combinedPost) {
      const assignment = combinedPost.assignments.find(a => a.raceId === part?.raceId);
      if (assignment) {
        targetCpId = assignment.checkpointId;
        targetCpName = assignment.checkpointName;
      }
    }

    const timestamp = Date.now();
    const netTime = timestamp - (part.startTime || race.startTime || timestamp);

    await addDoc(collection(db, 'passages'), {
      participantId: part.id,
      bib: part.bib,
      checkpointId: targetCpId,
      checkpointName: targetCpName,
      timestamp,
      netTime
    });

    setLastValidation({ name: `${part.lastName} ${part.firstName}`, bib: part.bib });
    setBibInput('');
    setTimeout(() => setLastValidation(null), 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-md text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl">
            <Shield size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">Pointage Terrain</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              placeholder="CODE" 
              className="w-full bg-slate-50 border-2 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-emerald-500"
              value={authCode}
              onChange={e => setAuthCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
              DÉMARRER <ArrowRight size={24} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Identification</h2>
          <p className="text-slate-500 mb-10 font-medium">Saisissez votre nom pour la supervision.</p>
          <input 
            type="text" 
            placeholder="Prénom / Nom"
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black mb-6 outline-none focus:border-blue-500 transition-all text-lg"
            value={marshalName}
            onChange={e => setMarshalName(e.target.value)}
          />
          <button 
            disabled={!marshalName}
            onClick={() => setIsRegistered(true)}
            className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            OUVRIR LE POSTE
          </button>
        </div>
      </div>
    );
  }

  const currentAssignment = combinedPost?.assignments.find(a => a.raceId === activeRaceId && a.checkpointId === activeCpId);

  return (
    <div className="fixed inset-0 bg-[#f8fafc] flex flex-col p-6 overflow-hidden select-none">
      <div className="max-w-md mx-auto w-full space-y-6">
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center animate-pulse">
               <CheckCircle2 size={24} />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Poste Actif</p>
               <p className="font-black text-slate-900 uppercase text-lg">{marshalName}</p>
             </div>
           </div>
        </div>

        {combinedPost && (
          <div className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
              <Layers size={14} /> Multi-course activé
            </div>
            <div className="grid grid-cols-1 gap-2">
              {combinedPost.assignments.map((as, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveRaceId(as.raceId); setActiveCpId(as.checkpointId); }}
                  className={`flex flex-col p-4 rounded-2xl font-black uppercase text-left transition-all border-2 ${
                    activeRaceId === as.raceId && activeCpId === as.checkpointId
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' 
                    : 'bg-white text-emerald-600 border-emerald-100'
                  }`}
                >
                  <span className="text-[10px] opacity-60 mb-0.5">{as.raceName}</span>
                  <span className="text-sm">{as.checkpointName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl text-center relative overflow-hidden flex-1">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
           
           <div className="relative z-10 h-full flex flex-col justify-center">
             <div className="flex flex-col items-center mb-10">
                <MapPin size={24} className="text-blue-500 mb-2" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Point de pointage</span>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  {currentAssignment ? currentAssignment.checkpointName : (races.find(r => r.id === raceId)?.checkpoints.find(c => c.id === cpId)?.name || '---')}
                </h3>
             </div>

             <div className="relative mb-10">
               <input 
                 type="number" 
                 className="w-full bg-transparent text-center text-9xl font-black mono outline-none border-b-2 border-white/10 focus:border-blue-500 pb-6 transition-all placeholder:text-white/5"
                 value={bibInput}
                 onChange={e => setBibInput(e.target.value)}
                 placeholder="000"
                 onKeyDown={e => e.key === 'Enter' && handlePointage()}
                 autoFocus
               />
               {lastValidation && (
                 <div className="absolute inset-x-0 -bottom-6 flex justify-center animate-in slide-in-from-bottom-2">
                   <div className="bg-emerald-500 px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase flex items-center gap-2 shadow-xl">
                     <CheckCircle2 size={12} /> {lastValidation.bib} VALIDÉ
                   </div>
                 </div>
               )}
             </div>

             <button 
              onClick={handlePointage}
              className="w-full bg-blue-600 text-white py-8 rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
             >
               VALIDER <Send size={28} />
             </button>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
           <AlertCircle className="text-blue-500 shrink-0" size={20} />
           <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-tight">
             Le dossard sera associé à sa course. Vérifiez le point de passage sélectionné.
           </p>
        </div>
      </div>
    </div>
  );
};

export default MarshalInputView;