import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Flag, 
  Users, 
  Timer, 
  Trophy, 
  Settings,
  ShieldCheck,
  ExternalLink,
  Menu,
  X,
  Zap,
  Activity
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import FirebaseErrorBanner from './FirebaseErrorBanner';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { dbError } = useDatabase();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Cockpit' },
    { path: '/races', icon: Flag, label: 'Épreuves' },
    { path: '/participants', icon: Users, label: 'Engagés' },
    { path: '/timing', icon: Timer, label: 'Chrono Direct' },
    { path: '/results', icon: Trophy, label: 'Leaders' },
    { path: '/signaleur', icon: ShieldCheck, label: 'Réseau Terrain' },
    { path: '/admin', icon: Settings, label: 'Système' },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[40] lg:hidden transition-opacity duration-500"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Floating Toggle for Mobile */}
      <div className="lg:hidden fixed top-6 right-6 z-[60]">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-4 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Professional Sidebar */}
      <aside className={`
        fixed h-full w-72 bg-[#020617] border-r border-white/5 flex flex-col z-[50] 
        transition-all duration-500 ease-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg rotate-[-5deg]">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white leading-none">
                MINGUEN<br/><span className="text-blue-500">CHRONO</span>
              </h1>
              <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-[0.4em] font-black italic">PRO SERIES 3.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">System Online</span>
          </div>
        </div>
        
        {/* Navigation Grid */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold transition-all duration-300 relative ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-2' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                <Icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`} />
                <span className="text-sm tracking-tight">{item.label}</span>
                {isActive && (
                   <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>
                )}
              </Link>
            );
          })}

          <div className="pt-8 mt-6 border-t border-white/5 space-y-2 pb-8">
            <Link
              to="/live"
              target="_blank"
              className="flex items-center justify-between px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all group"
            >
              <span className="flex items-center gap-2"><Activity size={14}/> Public Live</span>
              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              to="/remote-finish"
              target="_blank"
              className="flex items-center justify-between px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-amber-400 bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-all group"
            >
              <span className="flex items-center gap-2"><Zap size={14}/> Terminal Saisie</span>
              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </nav>
        
        {/* Footer Credit */}
        <div className="p-8 pt-0">
          <div className="p-5 rounded-3xl bg-white/5 border border-white/5 text-center group transition-colors hover:border-blue-500/20">
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Developer Engine</p>
             <p className="text-xs font-black text-white italic">by K. PEURON</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`
        flex-1 transition-all duration-500 min-h-screen
        ${isMobileMenuOpen ? 'blur-md opacity-50' : 'opacity-100'}
        lg:ml-72
      `}>
        <div className="max-w-7xl mx-auto p-6 md:p-12 lg:p-16">
          <FirebaseErrorBanner error={dbError} />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;