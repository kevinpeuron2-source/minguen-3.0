import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AppConfig {
  softwarePassword: string;
  marshalPassword: string;
  terminalPassword: string;
}

interface DatabaseContextType {
  dbError: string | null;
  setDbError: (error: string | null) => void;
  isPermissionDenied: boolean;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  isTerminalAuth: boolean;
  setIsTerminalAuth: (val: boolean) => void;
  isMarshalAuth: boolean;
  setIsMarshalAuth: (val: boolean) => void;
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbError, setDbError] = useState<string | null>(null);
  
  // États d'authentification persistants
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('minguen_software_auth') === 'true');
  const [isTerminalAuth, setIsTerminalAuth] = useState(() => localStorage.getItem('minguen_terminal_auth') === 'true');
  const [isMarshalAuth, setIsMarshalAuth] = useState(() => localStorage.getItem('minguen_marshal_auth') === 'true');

  const [config, setConfig] = useState<AppConfig>({
    softwarePassword: '1805',
    marshalPassword: '2211',
    terminalPassword: '1234'
  });

  useEffect(() => {
    localStorage.setItem('minguen_software_auth', isAdmin.toString());
  }, [isAdmin]);

  useEffect(() => {
    localStorage.setItem('minguen_terminal_auth', isTerminalAuth.toString());
  }, [isTerminalAuth]);

  useEffect(() => {
    localStorage.setItem('minguen_marshal_auth', isMarshalAuth.toString());
  }, [isMarshalAuth]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'security'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppConfig;
        setConfig({
          softwarePassword: data.softwarePassword || '1805',
          marshalPassword: data.marshalPassword || '2211',
          terminalPassword: data.terminalPassword || '1234'
        });
      }
    });
    return () => unsub();
  }, []);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    try {
      await setDoc(doc(db, 'settings', 'security'), { ...config, ...newConfig }, { merge: true });
    } catch (err: any) {
      setDbError(err.message);
    }
  };

  const handleSetError = useCallback((error: string | null) => {
    setDbError(error);
  }, []);

  const isPermissionDenied = !!dbError && dbError.toLowerCase().includes('permission');

  return (
    <DatabaseContext.Provider value={{ 
      dbError, 
      setDbError: handleSetError, 
      isPermissionDenied, 
      isAdmin, 
      setIsAdmin,
      isTerminalAuth,
      setIsTerminalAuth,
      isMarshalAuth,
      setIsMarshalAuth,
      config, 
      updateConfig 
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};