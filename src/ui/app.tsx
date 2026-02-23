/**
 * app.tsx - Root React Component for BrowserClaw
 * 
 * Main application component that handles:
 * - Routing between pages
 * - Theme management (dark/light mode)
 * - Language/i18n management
 * - Worker initialization
 * - Global state management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal, 
  Home, 
  MessageSquare, 
  Bot, 
  Plug, 
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  Globe
} from 'lucide-react';

// Import pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Models from './pages/Models';
import Config from './pages/Config';
import Integrations from './pages/Integrations';
import Logs from './pages/Logs';

// Import core modules
import { Terminal, initDB, isFirstLaunch } from '../core/config.js';
import { Terminal, initGateway } from '../core/gateway.js';
import { Terminal, getRAGBooster } from '../memory/rag-booster.js';

// Import i18n
import { Terminal, t, setLanguage, getCurrentLanguage, AVAILABLE_LANGUAGES } from '../i18n/index.js';

// Navigation items
const NAV_ITEMS = [
  { id: 'dashboard', icon: Home, label: 'nav.dashboard' },
  { id: 'chat', icon: MessageSquare, label: 'nav.chat' },
  { id: 'models', icon: Bot, label: 'nav.models' },
  { id: 'integrations', icon: Plug, label: 'nav.integrations' },
  { id: 'config', icon: Settings, label: 'nav.config' },
  { id: 'logs', icon: Terminal, label: 'nav.logs' }
];

/**
 * Main App Component
 */
function App() {
  // State
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguageState] = useState('fr');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [workersReady, setWorkersReady] = useState(false);
  
  // Refs
  const taskRouterRef = useRef<Worker | null>(null);
  const inferenceWorkerRef = useRef<Worker | null>(null);
  
  /**
   * Initialize the application
   */
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize IndexedDB
        await initDB();
        
        // Initialize gateway
        initGateway();
        
        // Initialize RAG Booster
        const rag = getRAGBooster();
        await rag.init();
        
        // Check if first launch
        const firstLaunch = await isFirstLaunch();
        if (firstLaunch) {
          setShowOnboarding(true);
        }
        
        // Initialize workers
        await initWorkers();
        
        // Load saved preferences
        const savedLang = localStorage.getItem('browserclaw-language');
        if (savedLang) {
          setLanguageState(savedLang);
          setLanguage(savedLang);
        }
        
        const savedTheme = localStorage.getItem('browserclaw-theme');
        if (savedTheme) {
          setDarkMode(savedTheme === 'dark');
        }
        
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
    
    // Cleanup workers on unmount
    return () => {
      if (taskRouterRef.current) {
        taskRouterRef.current.terminate();
      }
      if (inferenceWorkerRef.current) {
        inferenceWorkerRef.current.terminate();
      }
    };
  }, []);
  
  /**
   * Initialize Web Workers
   */
  const initWorkers = async () => {
    try {
      // Create Task Router Worker
      const taskRouter = new Worker(
        new URL('../workers/task-router.js', import.meta.url),
        { type: 'module' }
      );
      
      taskRouter.onmessage = (e) => {
        handleWorkerMessage('task-router', e.data);
      };
      
      taskRouter.onerror = (error) => {
        console.error('Task Router error:', error);
      };
      
      taskRouterRef.current = taskRouter;
      
      // Create Inference Worker
      const inferenceWorker = new Worker(
        new URL('../workers/inference.js', import.meta.url),
        { type: 'module' }
      );
      
      inferenceWorker.onmessage = (e) => {
        handleWorkerMessage('inference', e.data);
      };
      
      inferenceWorker.onerror = (error) => {
        console.error('Inference Worker error:', error);
      };
      
      inferenceWorkerRef.current = inferenceWorker;
      
      setWorkersReady(true);
      
    } catch (error) {
      console.error('Worker initialization error:', error);
    }
  };
  
  /**
   * Handle messages from workers
   */
  const handleWorkerMessage = (worker: string, data: any) => {
    console.log(`Message from ${worker}:`, data);
    
    // Handle different message types
    switch (data.type) {
      case 'READY':
        console.log(`${worker} is ready`);
        break;
      case 'ROUTED':
        // Task was routed, forward to appropriate executor
        if (data.payload.route === 'LOCAL') {
          inferenceWorkerRef.current?.postMessage({
            type: 'INFERENCE',
            payload: {
              taskId: data.payload.taskId,
              message: data.payload.context
            }
          });
        }
        break;
      case 'STREAM':
        // Streaming token received
        break;
      case 'COMPLETE':
        // Task completed
        break;
      case 'ERROR':
        console.error('Worker error:', data.payload);
        break;
    }
  };
  
  /**
   * Toggle dark mode
   */
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('browserclaw-theme', newMode ? 'dark' : 'light');
  };
  
  /**
   * Change language
   */
  const changeLanguage = (lang: string) => {
    setLanguageState(lang);
    setLanguage(lang);
    localStorage.setItem('browserclaw-language', lang);
  };
  
  /**
   * Handle message from user (for routing)
   */
  const handleUserMessage = useCallback(async (messageData: any) => {
    if (!taskRouterRef.current) {
      throw new Error('Task Router not ready');
    }
    
    const taskId = `task_${Date.now()}`;
    
    taskRouterRef.current.postMessage({
      type: 'TASK',
      payload: {
        id: taskId,
        message: messageData.message,
        channel: messageData.channel,
        userId: messageData.userId,
        metadata: messageData.metadata || {}
      }
    });
    
    return taskId;
  }, []);
  
  /**
   * Render current page
   */
  const renderPage = () => {
    const props = {
      darkMode,
      onMessage: handleUserMessage,
      workersReady
    };
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'chat':
        return <Chat {...props} />;
      case 'models':
        return <Models {...props} />;
      case 'integrations':
        return <Integrations {...props} />;
      case 'logs':
        return <Logs {...props} />;
      case 'config':
        return <Config {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };
  
  // Show loading screen
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#1A1A2E] text-white' : 'bg-white text-gray-900'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold">BrowserClaw</h1>
          <p className="text-gray-500 mt-2">{t('app.loading')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#1A1A2E] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦞</span>
          <span className="font-bold text-lg">BrowserClaw</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-700"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={`
            fixed lg:static inset-y-0 left-0 z-50 w-64 
            ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
            border-r border-gray-700
            transform transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo */}
          <div className="p-4 border-b border-gray-700 hidden lg:flex items-center gap-2">
            <span className="text-2xl">🦞</span>
            <span className="font-bold text-lg">BrowserClaw</span>
          </div>
          
          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : `hover:bg-gray-700 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{t(item.label)}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Bottom actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              {/* Language selector */}
              <div className="relative group">
                <button className="p-2 rounded-lg hover:bg-gray-700">
                  <Globe size={20} />
                </button>
                <div className={`
                  absolute bottom-full left-0 mb-2 py-2 rounded-lg shadow-lg
                  ${darkMode ? 'bg-[#1A1A2E]' : 'bg-white'}
                  border border-gray-700
                  hidden group-hover:block
                  min-w-[150px]
                `}>
                  {Object.entries(AVAILABLE_LANGUAGES).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => changeLanguage(code)}
                      className={`
                        w-full px-4 py-2 text-left
                        ${language === code ? 'bg-blue-600' : 'hover:bg-gray-700'}
                      `}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-700"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </aside>
        
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main content */}
        <main className="flex-1 min-h-screen overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
