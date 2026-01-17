import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Race, Participant, Passage, RenderReadyResult, ParticipantStatus } from '../types';
import { Trophy, Printer, FileSpreadsheet, Filter, ChevronDown, ChevronUp, Activity, MapPin, Search } from 'lucide-react';
import { formatMsToDisplay, calculateSpeed } from '../utils/formatters';
import { generateResultsCSV } from '../services/exportEngine';

const ResultsView: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allPassages, setAllPassages] = useState<Passage[]>([]);
  const [expandedBibs, setExpandedBibs] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<'all' | 'scratch' | 'category' | 'podium'>('all');
  const [selectedCat, setSelectedCat] = useState('all');

  useEffect(() => {
    onSnapshot(collection(db, 'races'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Race));
      setRaces(list);
      if (list.length > 0 && !selectedRaceId) setSelectedRaceId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedRaceId) return;
    onSnapshot(query(collection(db, 'participants'), where('raceId', '==', selectedRaceId)), snap => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    });
    onSnapshot(query(collection(db, 'passages'), orderBy('timestamp', 'asc')), snap => {
      setAllPassages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Passage)));
    });
  }, [selectedRaceId]);

  const activeRace = races.find(r => r.id === selectedRaceId);
  const categories = useMemo(() => Array.from(new Set(participants.map(p => p.category))), [participants]);

  // Correction TS7034: Typage strict RenderReadyResult[]
  const processedResults = useMemo<RenderReadyResult[]>(() => {
    if (!activeRace) return [];

    const results: RenderReadyResult[] = allPassages
      .filter(p => p.checkpointId === 'finish' && participants.some(part => part.id === p.participantId))
      .map((p) => {
        const participant = participants.find(part => part.id === p.participantId);
        if (!participant) return null;
        
        return {
          id: participant.id,
          bib: participant.bib,
          fullName: `${participant.lastName.toUpperCase()} ${participant.firstName}`,
          firstName: participant.firstName,
          lastName: participant.lastName,
          category: participant.category,
          gender: participant.gender,
          club: participant.club || 'Individuel',
          status: participant.status,
          netTimeMs: p.netTime,
          displayTime: formatMsToDisplay(p.netTime),
          displaySpeed: calculateSpeed(activeRace.distance, p.netTime),
          lastCheckpointName: 'ARRIVÉE',
          rank: 0,
          progress: 100
        } as RenderReadyResult;
      })
      .filter((r): r is RenderReadyResult => r !== null)
      .sort((a, b) => a.netTimeMs - b.netTimeMs)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    let filtered = results;
    if (viewMode === 'category' && selectedCat !== 'all') {
      filtered = results.filter(f => f.category === selectedCat);
    } else if (viewMode === 'podium') {
      filtered = results.slice(0, 3);
    }

    return filtered;
  }, [allPassages, participants, activeRace, viewMode, selectedCat]);

  const toggleExpand = (bib: string) => {
    setExpandedBibs(prev => prev.includes(bib) ? prev.filter(b => b !== bib) : [...prev, bib]);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header fixe et moderne */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-soft">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Tableau des Leaders</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Édition & Export des résultats officiels</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => generateResultsCSV(processedResults, activeRace?.name || 'Resultats')} 
            className="flex-1 md:flex-none bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-black text-xs uppercase text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={18} className="text-emerald-500" /> Export CSV
          </button>
          <button onClick={() => window.print()} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:scale-105 transition-transform">
            <Printer size={18} /> Imprimer
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Panneau de configuration épuré */}
        <aside className="lg:w-80 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-soft space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Filter size={14} /> Filtres d'affichage
              </h3>
              <div className="space-y-2">
                {(['all', 'scratch', 'category', 'podium'] as const).map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`w-full text-left px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                      viewMode === mode 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                  >
                    {mode === 'all' ? 'Tous les classés' : mode === 'scratch' ? 'Classement Scratch' : mode === 'category' ? 'Par catégorie' : 'Top 3 Podium'}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === 'category' && (
              <div className="animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Choisir Catégorie</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                  value={selectedCat}
                  onChange={e => setSelectedCat(e.target.value)}
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        </aside>

        {/* Table des résultats épurée */}
        <div className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <select 
              className="text-xl font-black text-slate-900 bg-transparent outline-none cursor-pointer border-none"
              value={selectedRaceId}
              onChange={e => setSelectedRaceId(e.target.value)}
             >
               {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
             </select>
             <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase">
               <Trophy size={18} className="text-amber-500" /> {processedResults.length} Athlètes classés
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border-b border-slate-100">
                  <th className="py-6 px-4"></th>
                  <th className="py-6 px-4">Rang</th>
                  <th className="py-6 px-4">Dos.</th>
                  <th className="py-6 px-6">Concurrent</th>
                  <th className="py-6 px-6">Catégorie</th>
                  <th className="py-6 px-6 text-right">Temps</th>
                  <th className="py-6 px-6 text-right">Vitesse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedResults.map((f, i) => {
                  const isExpanded = expandedBibs.includes(f.bib);
                  return (
                    <React.Fragment key={f.id}>
                      <tr 
                        className={`group cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}
                        onClick={() => toggleExpand(f.bib)}
                      >
                        <td className="py-6 px-4 text-center">
                          {isExpanded ? <ChevronUp size={16} className="text-indigo-600 mx-auto" /> : <ChevronDown size={16} className="text-slate-200 mx-auto" />}
                        </td>
                        <td className="py-6 px-4">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                            i < 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-6 px-4 font-black mono text-indigo-600 text-lg">#{f.bib}</td>
                        <td className="py-6 px-6">
                          <div className="font-black text-slate-900 uppercase leading-none mb-1">{f.lastName} {f.firstName}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{f.club}</div>
                        </td>
                        <td className="py-6 px-6">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg uppercase">{f.category}</span>
                        </td>
                        <td className="py-6 px-6 font-black mono text-slate-900 text-right text-lg">{f.displayTime}</td>
                        <td className="py-6 px-6 font-black text-indigo-600 mono text-sm text-right">{f.displaySpeed} <span className="text-[10px] opacity-40">km/h</span></td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-12 py-10">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                  <MapPin size={24} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Final</p>
                                  <p className="font-black text-slate-900 uppercase">Parcours validé à 100%</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Signature Chrono</p>
                                <p className="text-xs font-mono text-slate-300">UID-{f.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {processedResults.length === 0 && (
              <div className="py-40 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                   <Activity size={40} />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">En attente des premières arrivées officielles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;