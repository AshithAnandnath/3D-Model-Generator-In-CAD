import React, { useState, useCallback, useRef, useEffect } from 'react';
import InputPanel from './components/InputPanel';
import Viewer3D from './components/Viewer3D';
import SceneGraph from './components/SceneGraph';
import Dashboard from './components/Dashboard';
import { generate3DModel } from './services/geminiService';
import { saveAsPart, saveAsSTL } from './services/exportService';
import { logGeneration } from './services/trackingService';
import { GeneratedModel, GenerationState } from './types';
import { TriangleAlert, Cpu, Share2, Menu, FileJson, FileBox, HelpCircle, Save, FolderOpen, Trash2, Copy, Eye, Info, CheckCircle, Database } from 'lucide-react';

interface Notification {
  type: 'error' | 'success' | 'info';
  message: string;
}

const App: React.FC = () => {
  // --- ROUTING STATE ---
  const [currentRoute, setCurrentRoute] = useState<'APP' | 'DASHBOARD'>('APP');

  useEffect(() => {
    // Simple Hash Router
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#dashboard' || hash === '#admin') {
        setCurrentRoute('DASHBOARD');
      } else {
        setCurrentRoute('APP');
      }
    };
    
    // Check initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    window.location.hash = route;
  };

  const [model, setModel] = useState<GeneratedModel | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    status: 'IDLE'
  });
  
  const [viewState, setViewState] = useState({ mode: 'ISO', t: Date.now() });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [buildingSpeed, setBuildingSpeed] = useState(150);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (type: 'error' | 'success' | 'info', message: string) => {
    setNotification({ type, message });
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleGenerate = useCallback(async (prompt: string) => {
    setNotification(null);
    setGenerationState({
      isGenerating: true,
      progress: 0,
      status: 'INITIALIZING GENERATOR...'
    });
    setModel(null);

    const steps = [
      { pct: 15, msg: 'ANALYZING REQUIREMENTS...' },
      { pct: 35, msg: 'DECOMPOSING GEOMETRY...' },
      { pct: 55, msg: 'CALCULATING DIMENSIONS...' },
      { pct: 85, msg: 'ASSEMBLING PARTS...' },
    ];
    
    let stepIdx = 0;
    
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      if (stepIdx < steps.length) {
          const step = steps[stepIdx];
          setGenerationState(prev => ({ 
              ...prev, 
              progress: step.pct, 
              status: step.msg 
          }));
          stepIdx++;
      }
    }, 600);

    try {
      const generatedData = await generate3DModel(prompt);
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      setGenerationState({ isGenerating: false, progress: 100, status: 'RENDER COMPLETE' });
      
      const partCount = generatedData.parts.length || 1;
      const speed = partCount === 1 ? 100 : Math.min(500, 2000 / partCount);
      
      setBuildingSpeed(Math.floor(speed));
      setModel(generatedData);

      // --- SILENT TRACKING ---
      // Log the successful generation to the database
      logGeneration(prompt, generatedData.name, partCount);

    } catch (err: any) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      console.error(err);
      showNotification('error', err.message || "GENERATION FAILED");
      setGenerationState({
        isGenerating: false,
        progress: 0,
        status: 'ERROR'
      });
    }
  }, []);

  // --- ACTIONS ---

  const handleSavePart = () => {
    if (!model) {
      showNotification('error', "NO MODEL TO SAVE");
      return;
    }
    saveAsPart(model);
    setActiveMenu(null);
    showNotification('success', "Project saved successfully");
  };

  const handleExportSTL = () => {
    if (!model) {
      showNotification('error', "NO MODEL TO EXPORT");
      return;
    }
    const prevStatus = generationState.status;
    setGenerationState(prev => ({ ...prev, status: 'EXPORTING STL...' }));
    
    setTimeout(() => {
      saveAsSTL(model);
      setGenerationState(prev => ({ ...prev, status: prevStatus }));
      setActiveMenu(null);
      showNotification('success', "STL file exported");
    }, 100);
  };

  const handleClearScene = () => {
    setModel(null);
    setActiveMenu(null);
    setGenerationState({ isGenerating: false, progress: 0, status: 'IDLE' });
    showNotification('info', "Scene cleared");
  };

  const handleCopyConfig = () => {
    if (!model) {
        showNotification('error', "No model data to copy");
        return;
    }
    navigator.clipboard.writeText(JSON.stringify(model, null, 2));
    setActiveMenu(null);
    showNotification('success', "Model JSON copied to clipboard");
  };

  const handleViewChange = (viewMode: string) => {
    setViewState({ mode: viewMode, t: Date.now() });
    setActiveMenu(null);
  };

  const handleShowAbout = () => {
    setActiveMenu(null);
    showNotification('info', "Complex 3D Model Generator v2.5 | Powered by Gemini");
  };

  const handleOpenDashboard = () => {
    navigateTo('dashboard');
    setActiveMenu(null);
  };

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const menuBtnClass = (isActive: boolean) => 
    `flex items-center gap-1 px-3 py-1 rounded hover:bg-cad-700 hover:text-white transition-colors select-none ${isActive ? 'bg-cad-700 text-white' : ''}`;

  const menuItemClass = "px-4 py-2 text-left hover:bg-cad-600 text-gray-200 flex items-center gap-2 w-full text-xs font-mono";

  // --- RENDER ---

  if (currentRoute === 'DASHBOARD') {
    return <Dashboard onExit={() => navigateTo('')} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-cad-900 text-gray-200 overflow-hidden font-sans">
      
      {/* Top Menu Bar */}
      <header className="h-10 bg-cad-800 border-b border-cad-600 flex items-center px-4 justify-between flex-shrink-0 z-30" ref={menuRef}>
        
        {/* Left: Title */}
        <div className="flex items-center gap-3 mr-8">
          <Cpu className="w-5 h-5 text-cad-accent" />
          <h1 className="font-bold tracking-wider text-sm whitespace-nowrap">COMPLEX 3D MODEL GENERATOR <span className="text-xs font-normal text-gray-500 ml-2">v2.5</span></h1>
        </div>

        {/* Center: Menus */}
        <div className="flex gap-1 text-xs font-mono text-gray-400 flex-1">
           
           {/* FILE MENU */}
           <div className="relative">
             <button onClick={() => toggleMenu('file')} className={menuBtnClass(activeMenu === 'file')}>
                <Menu className="w-3 h-3"/> FILE
             </button>
             {activeMenu === 'file' && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-cad-800 border border-cad-600 shadow-xl rounded-b overflow-hidden flex flex-col z-50">
                    <button onClick={handleSavePart} className={menuItemClass}>
                        <Save className="w-3 h-3 text-cad-accent" /> Save Project (.part)
                    </button>
                    <button className={`${menuItemClass} opacity-50 cursor-not-allowed`}>
                        <FolderOpen className="w-3 h-3" /> Open Project...
                    </button>
                </div>
             )}
           </div>

           {/* EDIT MENU */}
           <div className="relative">
             <button onClick={() => toggleMenu('edit')} className={menuBtnClass(activeMenu === 'edit')}>
                EDIT
             </button>
             {activeMenu === 'edit' && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-cad-800 border border-cad-600 shadow-xl rounded-b overflow-hidden flex flex-col z-50">
                     <button onClick={handleCopyConfig} className={menuItemClass}>
                        <Copy className="w-3 h-3 text-blue-400" /> Copy Configuration
                    </button>
                    <div className="border-t border-cad-600 my-1"></div>
                    <button onClick={handleClearScene} className={`${menuItemClass} text-red-400 hover:text-red-300`}>
                        <Trash2 className="w-3 h-3" /> Clear Scene
                    </button>
                </div>
             )}
           </div>

           {/* VIEW MENU */}
           <div className="relative">
             <button onClick={() => toggleMenu('view')} className={menuBtnClass(activeMenu === 'view')}>
                VIEW
             </button>
             {activeMenu === 'view' && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-cad-800 border border-cad-600 shadow-xl rounded-b overflow-hidden flex flex-col z-50">
                    <button onClick={() => handleViewChange('ISO')} className={menuItemClass}>
                        <Eye className="w-3 h-3" /> Isometric
                    </button>
                    <button onClick={() => handleViewChange('TOP')} className={menuItemClass}>
                        <span className="w-3 text-center font-bold">T</span> Top View
                    </button>
                     <button onClick={() => handleViewChange('BOTTOM')} className={menuItemClass}>
                        <span className="w-3 text-center font-bold">B</span> Bottom View
                    </button>
                    <button onClick={() => handleViewChange('FRONT')} className={menuItemClass}>
                        <span className="w-3 text-center font-bold">F</span> Front View
                    </button>
                    <button onClick={() => handleViewChange('SIDE')} className={menuItemClass}>
                        <span className="w-3 text-center font-bold">S</span> Side View
                    </button>
                </div>
             )}
           </div>

           {/* EXPORT MENU */}
           <div className="relative">
             <button onClick={() => toggleMenu('export')} className={menuBtnClass(activeMenu === 'export')}>
                <Share2 className="w-3 h-3"/> EXPORT
             </button>
             {activeMenu === 'export' && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-cad-800 border border-cad-600 shadow-xl rounded-b overflow-hidden flex flex-col z-50">
                    <button onClick={handleExportSTL} className={menuItemClass}>
                        <FileBox className="w-3 h-3 text-green-400" /> Export as .STL
                    </button>
                    <button className={`${menuItemClass} opacity-50 cursor-not-allowed`}>
                        <FileJson className="w-3 h-3" /> Export as .OBJ
                    </button>
                </div>
             )}
           </div>

           {/* HELP MENU */}
           <div className="relative">
             <button onClick={() => toggleMenu('help')} className={menuBtnClass(activeMenu === 'help')}>
                HELP
             </button>
             {activeMenu === 'help' && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-cad-800 border border-cad-600 shadow-xl rounded-b overflow-hidden flex flex-col z-50">
                    <button onClick={handleShowAbout} className={menuItemClass}>
                        <Info className="w-3 h-3 text-cad-accent" /> About
                    </button>
                    <button onClick={() => window.open('https://github.com', '_blank')} className={menuItemClass}>
                        <HelpCircle className="w-3 h-3" /> Documentation
                    </button>
                    <div className="border-t border-cad-600 my-1"></div>
                    <button onClick={handleOpenDashboard} className={`${menuItemClass} text-yellow-500 hover:text-yellow-300`}>
                        <Database className="w-3 h-3" /> System Logs (Admin)
                    </button>
                </div>
             )}
           </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left/Center: Viewport */}
        <div className="flex-1 relative bg-black flex flex-col">
          <div className="flex-1 relative">
             <Viewer3D 
                model={model} 
                buildingSpeed={buildingSpeed} 
                viewState={viewState}
                onViewChange={handleViewChange}
             />
             
             {/* Notification Toast */}
             {notification && (
                <div className={`absolute top-4 right-4 border px-4 py-3 rounded shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 z-50 max-w-sm
                    ${notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : 
                      notification.type === 'success' ? 'bg-green-900/90 border-green-500 text-white' : 
                      'bg-cad-800/90 border-cad-600 text-cad-accent'}`}>
                  
                  {notification.type === 'error' ? <TriangleAlert className="w-5 h-5 flex-shrink-0" /> :
                   notification.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
                   <Info className="w-5 h-5 flex-shrink-0" />}
                  
                  <div>
                    <p className="font-bold text-xs font-mono uppercase">{notification.type === 'info' ? 'INFORMATION' : notification.type}</p>
                    <p className="text-xs opacity-90">{notification.message}</p>
                  </div>
                  <button onClick={() => setNotification(null)} className="ml-auto hover:bg-white/10 p-1 rounded">✕</button>
                </div>
              )}
          </div>
          
          {/* Bottom Command Bar */}
          <div className="flex-shrink-0 z-10">
            <InputPanel onGenerate={handleGenerate} generationState={generationState} />
          </div>
        </div>

        {/* Right: Scene Graph */}
        <SceneGraph model={model} />
      </div>
    </div>
  );
};

export default App;
