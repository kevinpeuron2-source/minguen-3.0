import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Flag, 
  Users, 
  Timer, 
  Trophy, 
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  Activity,
  ExternalLink
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/races', icon: Flag, label: 'Épreuves' },
    { path: '/participants', icon: Users, label: 'Engagés' },
    { path: '/timing', icon: Timer, label: 'Chronométrage' },
    { path: '/results', icon: Trophy, label: 'Leaders' },
    { path: '/signaleur', icon: ShieldCheck, label: 'Signaleurs' },
    { path: '/admin', icon: Settings, label: 'Administration' },
  ];

  return (
    <aside 
      className={`sidebar-transition fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-[60] flex flex-col shadow-soft ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Brand Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100 overflow-hidden shrink-0">
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
            <Zap size={20} className="text-white fill-white" />
          </div>
          <div className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">MINGUEN<br/><span className="text-indigo-600">CHRONO</span></h1>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl font-bold transition-all relative group ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <Icon size={22} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400'}`} />
              <span className={`transition-opacity duration-300 whitespace-nowrap text-sm ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}>
                {item.label}
              </span>
              {!isExpanded && (
                <div className="absolute left-16 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                  {item.label}
                </div>
              )}
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Links */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <Link
          to="/live"
          target="_blank"
          className="flex items-center gap-4 px-3 py-3 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all font-bold group overflow-hidden"
        >
          <Activity size={22} className="shrink-0" />
          <span className={`transition-opacity duration-300 whitespace-nowrap text-sm ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            Live Public
          </span>
        </Link>
        <div className="flex justify-center py-2">
          {isExpanded ? (
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OS 4.0 Stable</div>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Toggle Button Hint */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-slate-200 p-1 rounded-full shadow-md text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        {isExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </div>
    </aside>
  );
};

export default Sidebar;