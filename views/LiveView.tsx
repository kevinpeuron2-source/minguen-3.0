import React, { useState, useMemo } from 'react';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { generateResultsCSV } from '../services/exportEngine';
import { 
  Trophy, 
  Search, 
  FileSpreadsheet, 
  Activity, 
  Users, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Loader2,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { ParticipantStatus, RenderReadyResult } from '../types';

const LiveView: React.FC = () => {
  const [selectedRaceId, setSelectedRaceId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');

  const { kernelResults, stats, races, isSyncing } = useRaceKernel(selectedRaceId);

  // Auto-sélection de la première course si rien n'est choisi
  if (!selectedRaceId && races.length > 0) {
    setSelectedRaceId(races[0].id);
  }

  const activeRace = races.find(r => r.id === selectedRaceId);

  // Correction TS7034: Typage explicite du useMemo
  const filteredResults = useMemo<RenderReadyResult[]>(() => {
    return kernelResults.filter(r => {
      const matchesSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || r.bib.includes(searchTerm);
      const matchesGender = genderFilter === 'ALL' || r.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [kernelResults, searchTerm, genderFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header épuré */}
      <header className="sticky top-0 z-[50] bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">DIRECT<span className="text-indigo-600 uppercase font-black ml-1">Live</span></h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Minguen OS 4.0 Telemetry</p>
            </div>
          </div>

          <div className="flex flex-1 max-w-2xl w-full gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher par dossard ou nom..."
                className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 cursor-pointer transition-all"
              value={selectedRaceId}
              onChange={e => setSelectedRaceId(e.target.value)}
            >
              {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <button 
            onClick={() => generateResultsCSV(kernelResults, activeRace?.name || 'Course')}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-10">
        {/* Stats Grid - Nouveau Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Engagés" value={stats.totalEngaged} color="indigo" />
          <StatCard icon={CheckCircle2} label="Arrivés" value={stats.finishedCount} color="emerald" />
          <StatCard icon={Activity} label="En Course" value={stats.onTrackCount} color="amber" />
          <StatCard icon={AlertTriangle} label="Abandons" value={stats.dnfCount} color="rose" />
        </div>

        {/* Classement Table - Design épuré */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-soft overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <Trophy className="text-indigo-600" size={24} />
              <h2 className="text-xl font-black text-slate-900 uppercase">Classement en temps réel</h2>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {(['ALL', 'M', 'F'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${
                    genderFilter === g 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {g === 'ALL' ? 'Tous' : g}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80">
                  <th className="py-6 px-8 sticky left-0 bg-white">Rang</th>
                  <th className="py-6 px-4">Dossard</th>
                  <th className="py-6 px-6">Athlète</th>
                  <th className="py-6 px-6">Catégorie</th>
                  <th className="py-6 px-6">Localisation</th>
                  <th className="py-6 px-6">Temps Officiel</th>
                  <th className="py-6 px-6">Vitesse</th>
                  <th className="py-6 px-8 text-right">Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((r, i) => (
                  <tr key={r.id} className="group hover:bg-indigo-50/30 transition-colors animate-in fade-in duration-300">
                    <td className="py-6 px-8 sticky left-0 bg-white group-hover:bg-indigo-50/30">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 ${
                        r.rank === 1 ? 'bg-amber-100 text-amber-600' : 
                        r.rank === 2 ? 'bg-slate-100 text-slate-500' : 
                        r.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {r.rank}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <span className="text-lg font-black mono text-indigo-600 tracking-tighter">#{r.bib}</span>
                    </td>
                    <td className="py-6 px-6">
                      <div className="font-black text-slate-900 uppercase tracking-tight">{r.fullName}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{r.club}</div>
                    </td>
                    <td className="py-6 px-6">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 uppercase">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase">
                        <MapPin size={14} className="text-indigo-500" /> {r.lastCheckpointName}
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="text-lg font-black mono text-slate-900">{r.displayTime}</div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="text-sm font-black mono text-indigo-500/80">{r.displaySpeed} <span className="text-[9px] uppercase opacity-50">km/h</span></div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-black uppercase ${
                          r.status === ParticipantStatus.FINISHED ? 'text-emerald-600' : 
                          r.status === ParticipantStatus.DNF ? 'text-rose-500' : 'text-indigo-600'
                        }`}>
                          {r.status === ParticipantStatus.FINISHED ? 'Arrivé' : r.status === ParticipantStatus.DNF ? 'Abandon' : `${r.progress}%`}
                        </span>
                        <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              r.status === ParticipantStatus.FINISHED ? 'bg-emerald-500' : 
                              r.status === ParticipantStatus.DNF ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${r.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredResults.length === 0 && !isSyncing && (
              <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-soft flex items-center justify-center text-slate-200">
                   <Search size={40} />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Aucun concurrent trouvé</p>
              </div>
            )}

            {isSyncing && (
              <div className="py-40 text-center flex flex-col items-center justify-center gap-6">
                <Loader2 className="text-indigo-600 animate-spin" size={48} />
                <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Chargement de la base...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: number, color: string }> = ({ icon: Icon, label, value, color }) => {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100"
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-md cursor-default group`}>
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${colorMap[color]} transition-colors group-hover:bg-indigo-600 group-hover:text-white`}>
          <Icon size={24} />
        </div>
        <TrendingUp size={20} className="text-slate-100" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-4xl font-black tracking-tighter text-slate-900 mono">{value}</p>
    </div>
  );
};

export default LiveView;