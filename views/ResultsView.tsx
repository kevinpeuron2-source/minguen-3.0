import React, { useState, useMemo } from 'react';
import { useRaceKernel } from '../hooks/useRaceKernel';
import { generateResultsCSV } from '../services/exportEngine';
import { 
  Trophy, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Medal, 
  Settings2, 
  User, 
  MapPin, 
  Building2,
  Check,
  TrendingUp,
  Activity,
  Wind
} from 'lucide-react';
import { RenderReadyResult, ParticipantStatus } from '../types';

const ResultsView: React.FC = () => {
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [expandedBibs, setExpandedBibs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'category' | 'podium'>('all');
  const [selectedCat, setSelectedCat] = useState('all');

  const [visibleCols, setVisibleCols] = useState({
    rank: true,
    rankGender: true,
    rankCategory: true,
    bib: true,
    name: true,
    category: true,
    gender: true,
    club: true,
    city: true,
    time: true,
    speed: true,
    segments: false
  });

  const { kernelResults, races } = useRaceKernel(selectedRaceId);

  if (!selectedRaceId && races.length > 0) {
    setSelectedRaceId(races[0].id);
  }

  const activeRace = races.find(r => r.id === selectedRaceId);
  const categories = useMemo(() => Array.from(new Set(kernelResults.map(p => p.category))), [kernelResults]);

  const displayResults = useMemo(() => {
    let filtered = kernelResults.filter(r => r.status === ParticipantStatus.FINISHED);
    if (viewMode === 'category' && selectedCat !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCat);
    } else if (viewMode === 'podium') {
      filtered = filtered.slice(0, 3);
    }
    return filtered;
  }, [kernelResults, viewMode, selectedCat]);

  const podiumH = useMemo(() => kernelResults.filter(r => r.gender === 'M' && r.status === ParticipantStatus.FINISHED).slice(0, 4), [kernelResults]);
  const podiumF = useMemo(() => kernelResults.filter(r => r.gender === 'F' && r.status === ParticipantStatus.FINISHED).slice(0, 4), [kernelResults]);

  const toggleExpand = (bib: string) => {
    setExpandedBibs(prev => prev.includes(bib) ? prev.filter(b => b !== bib) : [...prev, bib]);
  };

  const toggleCol = (key: keyof typeof visibleCols) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-500">
      <header className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-soft flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-100">
            <Trophy size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Palmarès Officiel</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Homologation des temps et tronçons</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="flex-1 md:w-64 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-50 cursor-pointer transition-all"
            value={selectedRaceId}
            onChange={e => setSelectedRaceId(e.target.value)}
          >
            {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button 
            onClick={() => generateResultsCSV(kernelResults, activeRace?.name || 'Resultats')}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-3 shadow-lg hover:bg-indigo-600 transition-all active:scale-95"
          >
            <FileSpreadsheet size={18} /> CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PodiumBlock title="Podium Hommes" runners={podiumH} accent="indigo" />
        <PodiumBlock title="Podium Femmes" runners={podiumF} accent="rose" />
      </div>

      <div className="flex flex-col xl:flex-row gap-10">
        <aside className="xl:w-80 space-y-8 shrink-0">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-soft space-y-10">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Filter size={14} /> Filtres Rapides
              </h3>
              <div className="space-y-2">
                {(['all', 'category', 'podium'] as const).map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`w-full text-left px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                      viewMode === mode 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                  >
                    {mode === 'all' ? 'Classement Général' : mode === 'category' ? 'Par Catégorie' : 'Top 3 Overall'}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === 'category' && (
              <div className="animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Catégorie cible</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                  value={selectedCat}
                  onChange={e => setSelectedCat(e.target.value)}
                >
                  <option value="all">Toutes</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings2 size={14} /> Colonnes dynamiques
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(visibleCols).map(([key, isVisible]) => (
                  <label 
                    key={key} 
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isVisible ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700' : 'border-slate-50 text-slate-300 opacity-50'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      {key === 'rank' ? 'Rang' : 
                       key === 'rankGender' ? 'Rang H/F' : 
                       key === 'rankCategory' ? 'Rang Caté' : 
                       key === 'bib' ? 'Dossard' : 
                       key === 'name' ? 'Athlète' : 
                       key === 'category' ? 'Catégorie' : 
                       key === 'gender' ? 'Sexe' : 
                       key === 'club' ? 'Club' : 
                       key === 'city' ? 'Ville' : 
                       key === 'time' ? 'Temps' : 
                       key === 'speed' ? 'Vitesse' : 'Tronçons'}
                    </span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isVisible} 
                      onChange={() => toggleCol(key as keyof typeof visibleCols)} 
                    />
                    {isVisible && <Check size={14} />}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-6 px-4"></th>
                  {visibleCols.rank && <th className="py-6 px-4">Rang</th>}
                  {visibleCols.rankGender && <th className="py-6 px-4">H/F</th>}
                  {visibleCols.rankCategory && <th className="py-6 px-4">Caté</th>}
                  {visibleCols.bib && <th className="py-6 px-4">Dos.</th>}
                  {visibleCols.name && <th className="py-6 px-6">Nom</th>}
                  {visibleCols.category && <th className="py-6 px-4">Caté.</th>}
                  {visibleCols.gender && <th className="py-6 px-4">Sexe</th>}
                  {visibleCols.club && <th className="py-6 px-6">Club</th>}
                  {visibleCols.city && <th className="py-6 px-6">Ville</th>}
                  {visibleCols.time && <th className="py-6 px-6 text-right">Temps</th>}
                  {visibleCols.speed && <th className="py-6 px-6 text-right">Vitesse</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayResults.map((r) => {
                  const isExpanded = expandedBibs.includes(r.bib);
                  return (
                    <React.Fragment key={r.id}>
                      <tr 
                        className={`group cursor-pointer hover:bg-indigo-50/20 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => toggleExpand(r.bib)}
                      >
                        <td className="py-6 px-4 text-center">
                          {isExpanded ? <ChevronUp size={16} className="text-indigo-600 mx-auto" /> : <ChevronDown size={16} className="text-slate-200 mx-auto" />}
                        </td>
                        {visibleCols.rank && (
                          <td className="py-6 px-4 font-black">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.rank <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                              {r.rank}
                            </span>
                          </td>
                        )}
                        {visibleCols.rankGender && (
                          <td className="py-6 px-4">
                            <span className="text-[11px] font-black text-slate-400">#{r.rankGender}</span>
                          </td>
                        )}
                        {visibleCols.rankCategory && (
                          <td className="py-6 px-4">
                             <span className="text-[11px] font-black text-slate-400">#{r.rankCategory}</span>
                          </td>
                        )}
                        {visibleCols.bib && <td className="py-6 px-4 font-black mono text-indigo-600 text-lg">#{r.bib}</td>}
                        {visibleCols.name && (
                          <td className="py-6 px-6">
                            <div className="font-black text-slate-900 uppercase tracking-tight">{r.fullName}</div>
                          </td>
                        )}
                        {visibleCols.category && <td className="py-6 px-4 text-[11px] font-black text-slate-400">{r.category}</td>}
                        {visibleCols.gender && <td className="py-6 px-4 font-black text-slate-400">{r.gender}</td>}
                        {visibleCols.club && <td className="py-6 px-6 text-xs font-bold text-slate-400 uppercase truncate max-w-[120px]">{r.club}</td>}
                        {visibleCols.city && <td className="py-6 px-6 text-xs font-bold text-slate-400 uppercase">{r.city}</td>}
                        {visibleCols.time && <td className="py-6 px-6 font-black mono text-slate-900 text-right text-lg">{r.displayTime}</td>}
                        {visibleCols.speed && <td className="py-6 px-6 font-black text-indigo-600 mono text-sm text-right">{r.displaySpeed} <span className="text-[10px] opacity-40">km/h</span></td>}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={12} className="px-10 py-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4">
                              {r.splits.map((split, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-indigo-500 transition-all relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-3 opacity-5">
                                      <TrendingUp size={40} />
                                  </div>
                                  <div className="flex justify-between items-start mb-4">
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{split.label}</span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase">#{split.rankOnSegment}</span>
                                  </div>
                                  <p className="text-xl font-black text-slate-900 mono mb-2">{split.duration}</p>
                                  <div className="flex items-center gap-2 text-slate-400">
                                      <Wind size={12} />
                                      <span className="text-[10px] font-bold">{split.speed} km/h</span>
                                  </div>
                                </div>
                              ))}
                              {r.splits.length === 0 && (
                                <p className="col-span-full py-6 text-center text-slate-400 italic text-xs">Aucune donnée de tronçon disponible.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {displayResults.length === 0 && (
              <div className="py-32 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                <Trophy size={48} className="text-slate-200" />
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">En attente des premières homologations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PodiumBlock: React.FC<{ title: string, runners: RenderReadyResult[], accent: 'indigo' | 'rose' }> = ({ title, runners, accent }) => {
  const bgColors = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-900',
    rose: 'bg-rose-50 border-rose-100 text-rose-900'
  };

  return (
    <div className={`p-8 rounded-[3rem] border-2 shadow-soft relative overflow-hidden ${bgColors[accent]}`}>
      <div className="absolute top-0 right-0 p-6 opacity-5">
        <Medal size={80} />
      </div>
      <h2 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
        <Medal size={24} /> {title}
      </h2>
      <div className="space-y-4">
        {runners.map((runner, i) => (
          <div key={runner.id} className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-black/5 hover:translate-x-2 transition-transform">
            <div className="flex items-center gap-5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                i === 0 ? 'bg-amber-100 text-amber-600' : 
                i === 1 ? 'bg-slate-100 text-slate-500' : 
                i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
              }`}>
                {i + 1}
              </div>
              <div>
                <p className="font-black uppercase tracking-tight text-slate-900 leading-none">{runner.fullName}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{runner.club} • {runner.city}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black mono text-slate-900 text-lg leading-none">{runner.displayTime.split('.')[0]}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{runner.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsView;