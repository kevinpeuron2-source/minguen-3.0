import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import TimingView from './views/TimingView';
import RacesView from './views/RacesView';
import ParticipantsView from './views/ParticipantsView';
import ResultsView from './views/ResultsView';
import AdminView from './views/AdminView';
import SignaleurView from './views/SignaleurView';
import LiveView from './views/LiveView';
import MarshalInputView from './views/MarshalInputView';
import RemoteFinishView from './views/RemoteFinishView';
import FinishTerminalView from './views/FinishTerminalView';
import SpeakerView from './views/SpeakerView';

// Garde de sécurité Logiciel Global (HQ + Alain)
const SoftwareGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useDatabase();
  // Si pas connecté au logiciel, on renvoie vers l'AdminView qui sert de page de garde.
  if (!isAdmin) {
    return <AdminView />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <DatabaseProvider>
      <Router>
        <Routes>
          {/* Bornes & Outils Découplés (Fullscreen / target="_blank") */}
          <Route path="/live" element={<LiveView />} />
          <Route path="/speaker" element={<SoftwareGuard><SpeakerView /></SoftwareGuard>} />
          <Route path="/finish-terminal" element={<FinishTerminalView />} />
          <Route path="/signaleur-terrain" element={<MarshalInputView />} />
          <Route path="/remote-finish" element={<RemoteFinishView />} />
          
          {/* Logiciel QG - Protégé et Intégré au Layout */}
          <Route path="/*" element={
            <SoftwareGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/timing" element={<TimingView />} />
                  <Route path="/races" element={<RacesView />} />
                  <Route path="/participants" element={<ParticipantsView />} />
                  <Route path="/results" element={<ResultsView />} />
                  <Route path="/admin" element={<AdminView />} />
                  <Route path="/signaleur" element={<SignaleurView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </SoftwareGuard>
          } />
        </Routes>
      </Router>
    </DatabaseProvider>
  );
};

export default App;