import React from 'react';
import Sidebar from './Sidebar';
import { useDatabase } from '../context/DatabaseContext';
import FirebaseErrorBanner from './FirebaseErrorBanner';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dbError } = useDatabase();

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="transition-all duration-300 ml-20">
        <div className="max-w-7xl mx-auto p-8 md:p-12 lg:p-16">
          <FirebaseErrorBanner error={dbError} />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;