import React, { useState, useEffect } from 'react';
import { auth, isMissingConfig } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { fetchSystemLogs, LogEntry } from '../services/trackingService';
import { Shield, Lock, LogOut, RefreshCw, Terminal, Clock, Box, Database, AlertTriangle, Check, ExternalLink } from 'lucide-react';

const Dashboard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) loadLogs();
        });
        return () => unsubscribe();
    }
  }, []);

  const loadLogs = async () => {
    setRefreshing(true);
    try {
      const data = await fetchSystemLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("ACCESS DENIED: Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  // --- SETUP REQUIRED VIEW (Missing Config) ---
  if (isMissingConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-cad-900 text-gray-300 font-mono p-8 overflow-y-auto">
         <div className="max-w-2xl w-full bg-cad-800 border border-cad-600 rounded-lg shadow-2xl p-8">
            <div className="flex items-center gap-3 text-yellow-500 mb-6 border-b border-cad-600 pb-4">
                <AlertTriangle className="w-8 h-8" />
                <h1 className="text-xl font-bold">DATABASE CONFIGURATION REQUIRED</h1>
            </div>

            <p className="mb-6">
                To enable the Admin Dashboard and User Tracking, you need to connect this application to a 
                <span className="text-white font-bold"> Firebase</span> project. This ensures your data is secure and only viewable by you.
            </p>

            <div className="space-y-4 bg-cad-900 p-6 rounded border border-cad-700">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-cad-accent" /> SETUP INSTRUCTIONS
                </h3>
                
                <ol className="list-decimal list-inside space-y-3 text-sm text-gray-400">
                    <li>
                        Go to <a href="https://console.firebase.google.com" target="_blank" className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3"/></a> and create a project.
                    </li>
                    <li>
                        Enable <strong>Firestore Database</strong> (Start in Test Mode).
                    </li>
                    <li>
                        Enable <strong>Authentication</strong> (Sign-in method &rarr; Email/Password).
                    </li>
                    <li>
                        Go to <strong>Project Settings</strong> &rarr; <strong>General</strong> &rarr; <strong>Your apps</strong> &rarr; <strong>Web</strong>.
                    </li>
                    <li>
                        Register the app and copy the <code className="bg-black px-1 py-0.5 rounded text-green-400">const firebaseConfig = &#123;...&#125;</code> object.
                    </li>
                    <li>
                        Open <code className="bg-black px-1 py-0.5 rounded text-yellow-400">firebaseConfig.ts</code> in the code editor and paste your keys.
                    </li>
                </ol>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={onExit} className="px-6 py-2 bg-cad-700 hover:bg-cad-600 text-white rounded font-bold transition-colors">
                    Back to Generator
                </button>
            </div>
         </div>
      </div>
    );
  }

  // --- LOGIN VIEW ---
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-cad-900 text-cad-accent font-mono p-4">
        <div className="w-full max-w-md bg-cad-800 border border-cad-600 rounded-lg shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <Shield className="w-12 h-12 mb-2 text-cad-accent" />
            <h2 className="text-xl font-bold tracking-widest uppercase">Restricted Access</h2>
            <p className="text-xs text-gray-500 mt-1">SYSTEM ADMINISTRATOR ONLY</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Identity</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-cad-900 border border-cad-600 rounded p-2 text-white focus:outline-none focus:border-cad-accent"
                placeholder="admin@system.local"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Passcode</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-cad-900 border border-cad-600 rounded p-2 text-white focus:outline-none focus:border-cad-accent"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="text-red-400 text-xs border border-red-900 bg-red-900/20 p-2 rounded">{error}</div>}
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-cad-700 hover:bg-cad-600 text-white font-bold py-2 px-4 rounded transition-colors flex justify-center items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Lock className="w-4 h-4" />}
              AUTHENTICATE
            </button>
          </form>

          <button onClick={onExit} className="mt-6 text-xs text-gray-500 hover:text-white w-full text-center">
            &larr; Return to Generator
          </button>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="flex flex-col h-full w-full bg-cad-900 text-gray-300 font-mono">
      {/* Header */}
      <div className="h-14 bg-cad-800 border-b border-cad-600 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-green-400" />
          <h1 className="text-lg font-bold text-white tracking-wider">SYSTEM LOGS <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded ml-2">ONLINE</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{user.email}</span>
          <button onClick={loadLogs} className="p-2 hover:bg-cad-700 rounded text-cad-accent" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1.5 rounded text-xs border border-red-800 transition-colors">
            <LogOut className="w-3 h-3" /> LOGOUT
          </button>
          <button onClick={onExit} className="text-xs text-gray-400 hover:text-white ml-2">
            EXIT
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {logs.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <div className="text-4xl mb-4">∅</div>
              <p>NO ACTIVITY LOGS FOUND</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-cad-800 border border-cad-600 rounded p-4 flex items-start justify-between hover:bg-cad-700/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-cad-accent bg-cad-900 px-2 py-0.5 rounded border border-cad-600">
                        {log.modelName || 'UNTITLED'}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.timestamp?.toDate().toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white text-sm bg-cad-900/50 p-3 rounded font-sans border-l-2 border-cad-600 italic">
                      "{log.prompt}"
                    </p>
                  </div>
                  <div className="ml-6 flex flex-col items-end gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1" title="Part Count">
                      <Box className="w-3 h-3" /> {log.partCount} Parts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;