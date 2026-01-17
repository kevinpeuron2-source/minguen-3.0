
import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Participant, Race, ParticipantStatus, RaceType, RaceStatus } from '../types';
import { Users, Search, Filter, Trash2, Edit2, UserPlus, X, CheckCircle2, AlertCircle, FileUp, ArrowRight, Settings2, Sparkles } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { parseCSV } from '../utils/csv';

const ParticipantsView: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const { setDbError } = useDatabase();

  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importLoading, setImportLoading] = useState(false);

  const [newPart, setNewPart] = useState<Partial<Participant>>({
    bib: '', firstName: '', lastName: '', gender: 'M', category: 'SENIOR', club: '', status: ParticipantStatus.REGISTERED, raceId: ''
  });

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setCsvHeaders(headers);
        setCsvData(data);
        setMapping({});
        setShowMappingModal(true);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // Fix: Defined openEditModal to handle editing an existing participant
  const openEditModal = (p: Participant) => {
    setEditingId(p.id);
    setNewPart({ ...p });
    setShowAddModal(true);
  };

  const executeImport = async () => {
    setImportLoading(true);
    try {
      const batch = writeBatch(db);
      for (const row of csvData) {
        const pRef = doc(collection(db, 'participants'));
        batch.set(pRef, {
          bib: String(row[mapping.bib] || ''),
          lastName: String(row[mapping.lastName] || '').toUpperCase(),
          firstName: String(row[mapping.firstName] || ''),
          gender: String(row[mapping.gender] || 'M').toUpperCase().startsWith('F') ? 'F' : 'M',
          category: String(row[mapping.category] || 'SENIOR').toUpperCase(),
          club: String(row[mapping.club] || ''),
          raceId: races.find(r => r.name.toLowerCase() === String(row[mapping.race] || '').toLowerCase())?.id || (races.length > 0 ? races[0].id : ''),
          status: ParticipantStatus.REGISTERED
        });
      }
      await batch.commit();
      setShowMappingModal(false);
      alert(`${csvData.length} participants importés !`);
    } catch (err: any) { alert(err.message); } finally { setImportLoading(false); }
  };

  const handleSave = async () => {
    if (!newPart.bib || !newPart.lastName || !newPart.raceId) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'participants', editingId), { ...newPart, lastName: newPart.lastName?.toUpperCase() });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'participants'), { ...newPart, lastName: newPart.lastName?.toUpperCase(), status: ParticipantStatus.REGISTERED });
      }
      setShowAddModal(false);
      setNewPart({ bib: '', firstName: '', lastName: '', gender: 'M', category: 'SENIOR', club: '', status: ParticipantStatus.REGISTERED, raceId: '' });
    } catch (err: any) { alert(err.message); }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = `${p.firstName} ${p.lastName} ${p.bib}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (selectedRaceId === 'all' || p.raceId === selectedRaceId);
  }).sort((a, b) => (parseInt(a.bib) || 0) - (parseInt(b.bib) || 0));

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Gestion des Participants</h1>
          <p className="text-slate-500 font-medium">Contrôle de la base de données du système</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-initial bg-white border-2 border-slate-100 text-slate-600 px-6 py-4 rounded-[2rem] font-black flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
            <FileUp size={20} /> Importer CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={() => { setEditingId(null); setShowAddModal(true); }} className="flex-1 md:flex-initial bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-transform"><UserPlus size={24} /> Ajouter</button>
        </div>
      </header>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input type="text" placeholder="Rechercher un participant..." className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-900 outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <select className="bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:border-blue-500" value={selectedRaceId} onChange={e => setSelectedRaceId(e.target.value)}>
          <option value="all">Toutes les épreuves</option>
          {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
              <th className="py-6 px-8">Dossard</th>
              <th className="py-6 px-6">Concurrent</th>
              <th className="py-6 px-6">Épreuve</th>
              <th className="py-6 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredParticipants.map(p => (
              <tr key={p.id} className="group hover:bg-slate-50/50">
                <td className="py-6 px-8 text-2xl font-black mono text-blue-600">#{p.bib}</td>
                <td className="py-6 px-6 font-black text-slate-900 uppercase">{p.lastName} {p.firstName}</td>
                <td className="py-6 px-6"><span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{races.find(r => r.id === p.raceId)?.name || 'N/A'}</span></td>
                <td className="py-6 px-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { openEditModal(p); }} className="p-3 bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl mr-2"><Edit2 size={18} /></button>
                  <button onClick={() => deleteDoc(doc(db, 'participants', p.id))} className="p-3 bg-slate-100 text-slate-400 hover:text-red-500 rounded-xl"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl">
            <h2 className="text-3xl font-black mb-8">{editingId ? 'Modifier' : 'Nouveau Participant'}</h2>
            <div className="grid grid-cols-2 gap-6">
              <input type="text" className="bg-slate-50 border-2 rounded-2xl p-6 font-black" value={newPart.bib} onChange={e => setNewPart({...newPart, bib: e.target.value})} placeholder="Dossard"/>
              <select className="bg-slate-50 border-2 rounded-2xl p-6 font-black" value={newPart.raceId} onChange={e => setNewPart({...newPart, raceId: e.target.value})}>
                <option value="">Choisir course...</option>
                {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input type="text" className="bg-slate-50 border-2 rounded-2xl p-6 font-black uppercase" value={newPart.lastName} onChange={e => setNewPart({...newPart, lastName: e.target.value})} placeholder="NOM"/>
              <input type="text" className="bg-slate-50 border-2 rounded-2xl p-6 font-black" value={newPart.firstName} onChange={e => setNewPart({...newPart, firstName: e.target.value})} placeholder="Prénom"/>
            </div>
            <div className="flex gap-4 pt-10">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 font-black text-slate-400">Annuler</button>
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
      
      {showMappingModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-4xl shadow-2xl">
            <h2 className="text-4xl font-black mb-10 flex items-center gap-4"><Sparkles className="text-blue-500"/> Import Intelligent</h2>
            <div className="grid grid-cols-2 gap-6">
              {['bib', 'lastName', 'firstName', 'gender', 'category', 'club', 'race'].map(field => (
                <select key={field} className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-black" value={mapping[field] || ''} onChange={e => setMapping({...mapping, [field]: e.target.value})}>
                  <option value="">Lier {field}...</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              ))}
            </div>
            <div className="flex gap-6 mt-12">
              <button onClick={() => setShowMappingModal(false)} className="flex-1 py-6 font-black text-slate-400">Annuler</button>
              <button onClick={executeImport} disabled={importLoading} className="flex-2 bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl disabled:opacity-30">Lancer l'importation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantsView;
