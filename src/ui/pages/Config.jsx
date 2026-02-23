/**
 * Config.jsx - Settings and Configuration
 * 
 * Features:
 * - Soul editor (name, personality, goals, skills)
 * - API keys management
 * - Routing configuration
 * - Privacy mode toggle
 * - Data encryption settings
 * - Wipe all data
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Key, 
  Route, 
  Shield, 
  Lock, 
  Trash2,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import { t } from '../../i18n/index.js';
import { 
  getSoul, 
  updateSoul, 
  resetSoul,
  AVAILABLE_LANGUAGES,
  AVAILABLE_SKILLS,
  AVAILABLE_VALUES,
  PERSONALITY_PRESETS
} from '../../core/soul.js';
import { 
  getConfig, 
  setConfig, 
  getApiKeys, 
  setApiKeys,
  wipeAllData,
  exportAllData,
  importAllData
} from '../../core/config.js';
import { PROVIDERS } from '../../integrations/providers.js';

function Config({ darkMode }) {
  const [activeTab, setActiveTab] = useState('soul');
  const [soul, setSoul] = useState(null);
  const [apiKeys, setApiKeysState] = useState({});
  const [routing, setRouting] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [encryptionPassphrase, setEncryptionPassphrase] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  const loadConfig = async () => {
    try {
      const [soulData, keys, routingData] = await Promise.all([
        getSoul(),
        getApiKeys(),
        getConfig('routing', {})
      ]);
      
      setSoul(soulData);
      setApiKeysState(keys);
      setRouting(routingData);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveSoul = async () => {
    try {
      await updateSoul(soul);
      showSaveStatus(t('config.saved'));
    } catch (error) {
      console.error('Failed to save soul:', error);
      showSaveStatus(t('config.saveError'));
    }
  };
  
  const handleSaveApiKeys = async () => {
    try {
      await setApiKeys(apiKeys, encryptionPassphrase || null);
      showSaveStatus(t('config.saved'));
    } catch (error) {
      console.error('Failed to save API keys:', error);
      showSaveStatus(t('config.saveError'));
    }
  };
  
  const handleSaveRouting = async () => {
    try {
      await setConfig('routing', routing);
      showSaveStatus(t('config.saved'));
    } catch (error) {
      console.error('Failed to save routing:', error);
      showSaveStatus(t('config.saveError'));
    }
  };
  
  const showSaveStatus = (message) => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), 3000);
  };
  
  const handleWipeData = async () => {
    if (confirm(t('config.confirmWipe'))) {
      try {
        await wipeAllData();
        alert(t('config.dataWiped'));
        window.location.reload();
      } catch (error) {
        console.error('Failed to wipe data:', error);
        alert(t('config.wipeError'));
      }
    }
  };
  
  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `browserclaw-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };
  
  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      alert(t('config.dataImported'));
      window.location.reload();
    } catch (error) {
      console.error('Failed to import data:', error);
      alert(t('config.importError'));
    }
  };
  
  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  if (loading || !soul) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('config.title')}</h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('config.subtitle')}
        </p>
      </div>
      
      {/* Save status */}
      {saveStatus && (
        <div className="mb-4 p-3 bg-green-600 rounded-lg text-center">
          {saveStatus}
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700 overflow-x-auto">
        {[
          { id: 'soul', label: t('config.tabs.soul'), icon: User },
          { id: 'apikeys', label: t('config.tabs.apikeys'), icon: Key },
          { id: 'routing', label: t('config.tabs.routing'), icon: Route },
          { id: 'privacy', label: t('config.tabs.privacy'), icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-500'
                  : 'border-transparent hover:text-blue-400'
                }
              `}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Soul Tab */}
      {activeTab === 'soul' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <label className="block mb-2">{t('config.soul.name')}</label>
            <input
              type="text"
              value={soul.name}
              onChange={(e) => setSoul({ ...soul, name: e.target.value })}
              className={`
                w-full px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            />
          </div>
          
          <div>
            <label className="block mb-2">{t('config.soul.language')}</label>
            <select
              value={soul.language}
              onChange={(e) => setSoul({ ...soul, language: e.target.value })}
              className={`
                w-full px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            >
              {Object.entries(AVAILABLE_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block mb-2">{t('config.soul.personality')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(PERSONALITY_PRESETS).map(([key, desc]) => (
                <button
                  key={key}
                  onClick={() => setSoul({ ...soul, personality: desc })}
                  className={`
                    px-3 py-1 rounded text-sm
                    ${soul.personality === desc
                      ? 'bg-blue-600'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }
                  `}
                >
                  {key}
                </button>
              ))}
            </div>
            <textarea
              value={soul.personality}
              onChange={(e) => setSoul({ ...soul, personality: e.target.value })}
              rows={3}
              className={`
                w-full px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            />
          </div>
          
          <div>
            <label className="block mb-2">{t('config.soul.goals')}</label>
            <div className="space-y-2">
              {soul.goals.map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => {
                      const newGoals = [...soul.goals];
                      newGoals[index] = e.target.value;
                      setSoul({ ...soul, goals: newGoals });
                    }}
                    className={`
                      flex-1 px-4 py-2 rounded-lg
                      ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                      border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
                    `}
                  />
                  <button
                    onClick={() => {
                      const newGoals = soul.goals.filter((_, i) => i !== index);
                      setSoul({ ...soul, goals: newGoals });
                    }}
                    className="px-3 py-2 bg-red-600 rounded-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setSoul({ ...soul, goals: [...soul.goals, ''] })}
                className="px-4 py-2 bg-blue-600 rounded-lg"
              >
                + {t('config.soul.addGoal')}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block mb-2">{t('config.soul.skills')}</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SKILLS.map(skill => (
                <button
                  key={skill}
                  onClick={() => {
                    const hasSkill = soul.skills.includes(skill);
                    setSoul({
                      ...soul,
                      skills: hasSkill
                        ? soul.skills.filter(s => s !== skill)
                        : [...soul.skills, skill]
                    });
                  }}
                  className={`
                    px-3 py-1 rounded text-sm capitalize
                    ${soul.skills.includes(skill)
                      ? 'bg-blue-600'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }
                  `}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleSaveSoul}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Save size={18} />
              {t('config.save')}
            </button>
            <button
              onClick={async () => {
                await resetSoul();
                loadConfig();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw size={18} />
              {t('config.reset')}
            </button>
          </div>
        </div>
      )}
      
      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <div className="max-w-2xl space-y-6">
          {Object.entries(PROVIDERS).map(([id, provider]) => (
            <div key={id}>
              <label className="block mb-2">{provider.name}</label>
              <div className="flex gap-2">
                <input
                  type={showKeys[id] ? 'text' : 'password'}
                  value={apiKeys[id] || ''}
                  onChange={(e) => setApiKeysState({ ...apiKeys, [id]: e.target.value })}
                  placeholder={`${provider.name} API Key`}
                  className={`
                    flex-1 px-4 py-2 rounded-lg
                    ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                    border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
                  `}
                />
                <button
                  onClick={() => toggleShowKey(id)}
                  className="px-3 py-2 rounded-lg bg-gray-700"
                >
                  {showKeys[id] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}
          
          <div>
            <label className="block mb-2">{t('config.apikeys.encryption')}</label>
            <input
              type="password"
              value={encryptionPassphrase}
              onChange={(e) => setEncryptionPassphrase(e.target.value)}
              placeholder={t('config.apikeys.passphrase')}
              className={`
                w-full px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            />
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('config.apikeys.encryptionHelp')}
            </p>
          </div>
          
          <button
            onClick={handleSaveApiKeys}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Save size={18} />
            {t('config.save')}
          </button>
        </div>
      )}
      
      {/* Routing Tab */}
      {activeTab === 'routing' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <label className="block mb-2">{t('config.routing.mode')}</label>
            <select
              value={routing.mode || 'auto'}
              onChange={(e) => setRouting({ ...routing, mode: e.target.value })}
              className={`
                w-full px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            >
              <option value="auto">{t('config.routing.auto')}</option>
              <option value="local">{t('config.routing.local')}</option>
              <option value="cloud">{t('config.routing.cloud')}</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2">
              {t('config.routing.threshold')}: {routing.threshold || 6}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={routing.threshold || 6}
              onChange={(e) => setRouting({ ...routing, threshold: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('config.routing.thresholdHelp')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="privacyMode"
              checked={routing.privacyMode || false}
              onChange={(e) => setRouting({ ...routing, privacyMode: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="privacyMode">{t('config.routing.privacyMode')}</label>
          </div>
          
          <button
            onClick={handleSaveRouting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Save size={18} />
            {t('config.save')}
          </button>
        </div>
      )}
      
      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="max-w-2xl space-y-6">
          <div className={`
            p-6 rounded-xl border
            ${darkMode ? 'bg-[#16213E] border-gray-700' : 'bg-white border-gray-200'}
          `}>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Download size={20} />
              {t('config.privacy.backup')}
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('config.privacy.backupDesc')}
            </p>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Download size={18} />
              {t('config.privacy.export')}
            </button>
          </div>
          
          <div className={`
            p-6 rounded-xl border
            ${darkMode ? 'bg-[#16213E] border-gray-700' : 'bg-white border-gray-200'}
          `}>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload size={20} />
              {t('config.privacy.restore')}
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('config.privacy.restoreDesc')}
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>
          
          <div className={`
            p-6 rounded-xl border border-red-600
            ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
          `}>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-500">
              <Trash2 size={20} />
              {t('config.privacy.wipe')}
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('config.privacy.wipeDesc')}
            </p>
            <button
              onClick={handleWipeData}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              <Trash2 size={18} />
              {t('config.privacy.wipeButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Config;
