/**
 * Integrations.jsx - External API Integrations Panel
 * 
 * Shows all configurable integrations grouped by category.
 * Each integration shows:
 * - Name and icon
 * - Status (active/inactive)
 * - API key field (masked)
 * - Test connection button
 * - Description of capabilities
 */

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  ExternalLink, 
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  ToggleLeft,
  ToggleRight,
  Plug
} from 'lucide-react';
import { t } from '../../i18n/index.js';
import { 
  INTEGRATION_REGISTRY, 
  INTEGRATION_CATEGORIES,
  getIntegrationsByCategory,
  getIntegrationStatus,
  setIntegrationConfig,
  testIntegration,
  getAllIntegrationsWithStatus,
  toggleIntegration
} from '../../integrations/api-registry.js';

function Integrations({ darkMode }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showKeys, setShowKeys] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  
  useEffect(() => {
    loadIntegrations();
  }, []);
  
  const loadIntegrations = async () => {
    try {
      const allIntegrations = await getAllIntegrationsWithStatus();
      setIntegrations(allIntegrations);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateConfig = async (integrationId, config) => {
    try {
      await setIntegrationConfig(integrationId, config);
      loadIntegrations();
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };
  
  const handleToggle = async (integrationId) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      await toggleIntegration(integrationId, !integration.active);
      loadIntegrations();
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };
  
  const handleTest = async (integrationId) => {
    setTesting(prev => ({ ...prev, [integrationId]: true }));
    setTestResults(prev => ({ ...prev, [integrationId]: null }));
    
    try {
      const result = await testIntegration(integrationId);
      setTestResults(prev => ({ ...prev, [integrationId]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [integrationId]: false }));
    } finally {
      setTesting(prev => ({ ...prev, [integrationId]: false }));
    }
  };
  
  const toggleShowKey = (integrationId, field) => {
    const key = `${integrationId}_${field}`;
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const getCategoryIcon = (category) => {
    const icons = {
      [INTEGRATION_CATEGORIES.CHANNEL]: 'message-circle',
      [INTEGRATION_CATEGORIES.DEV_TOOLS]: 'code',
      [INTEGRATION_CATEGORIES.KNOWLEDGE]: 'book',
      [INTEGRATION_CATEGORIES.DATA]: 'database',
      [INTEGRATION_CATEGORIES.PRODUCTIVITY]: 'calendar',
      [INTEGRATION_CATEGORIES.PROJECT]: 'check-square',
      [INTEGRATION_CATEGORIES.PAYMENTS]: 'credit-card',
      [INTEGRATION_CATEGORIES.COMMUNICATION]: 'phone',
      [INTEGRATION_CATEGORIES.AUDIO]: 'volume-2',
      [INTEGRATION_CATEGORIES.SEARCH]: 'search',
      [INTEGRATION_CATEGORIES.INFORMATION]: 'info'
    };
    return icons[category] || 'plug';
  };
  
  const getCategoryLabel = (category) => {
    const labels = {
      [INTEGRATION_CATEGORIES.CHANNEL]: t('integrations.categories.channel'),
      [INTEGRATION_CATEGORIES.DEV_TOOLS]: t('integrations.categories.dev'),
      [INTEGRATION_CATEGORIES.KNOWLEDGE]: t('integrations.categories.knowledge'),
      [INTEGRATION_CATEGORIES.DATA]: t('integrations.categories.data'),
      [INTEGRATION_CATEGORIES.PRODUCTIVITY]: t('integrations.categories.productivity'),
      [INTEGRATION_CATEGORIES.PROJECT]: t('integrations.categories.project'),
      [INTEGRATION_CATEGORIES.PAYMENTS]: t('integrations.categories.payments'),
      [INTEGRATION_CATEGORIES.COMMUNICATION]: t('integrations.categories.communication'),
      [INTEGRATION_CATEGORIES.AUDIO]: t('integrations.categories.audio'),
      [INTEGRATION_CATEGORIES.SEARCH]: t('integrations.categories.search'),
      [INTEGRATION_CATEGORIES.INFORMATION]: t('integrations.categories.information')
    };
    return labels[category] || category;
  };
  
  const renderIntegrationCard = (integration) => {
    const isExpanded = expandedCategory === integration.id;
    const isTesting = testing[integration.id];
    const testResult = testResults[integration.id];
    
    return (
      <div
        key={integration.id}
        className={`
          p-4 rounded-xl border transition-all
          ${darkMode 
            ? 'bg-[#16213E] border-gray-700' 
            : 'bg-white border-gray-200'
          }
          ${integration.active ? 'border-green-600' : ''}
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${integration.active ? 'bg-green-600' : 'bg-gray-700'}
            `}>
              <Plug size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{integration.name}</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {integration.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <span className={`
              px-2 py-1 rounded text-xs
              ${integration.active 
                ? 'bg-green-600' 
                : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }
            `}>
              {integration.active ? t('integrations.active') : t('integrations.inactive')}
            </span>
            
            {/* Toggle button */}
            <button
              onClick={() => handleToggle(integration.id)}
              disabled={!integration.configured}
              className={`
                p-2 rounded-lg transition-colors
                ${integration.active 
                  ? 'text-green-500' 
                  : 'text-gray-500'
                }
                ${!integration.configured && 'opacity-50 cursor-not-allowed'}
              `}
            >
              {integration.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>
        </div>
        
        {/* Capabilities */}
        <div className="mb-4">
          <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('integrations.capabilities')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {integration.capabilities.map((cap, idx) => (
              <span
                key={idx}
                className={`
                  px-2 py-1 rounded text-xs
                  ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}
                `}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
        
        {/* Configuration */}
        <div className="space-y-3">
          {integration.requiredCredentials.map(field => (
            <div key={field}>
              <label className="block text-sm mb-1 capitalize">
                {field}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys[`${integration.id}_${field}`] ? 'text' : 'password'}
                  value={integration[field] || ''}
                  onChange={(e) => handleUpdateConfig(integration.id, { [field]: e.target.value })}
                  placeholder={`Enter ${field}`}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-sm
                    ${darkMode ? 'bg-[#1A1A2E]' : 'bg-gray-50'}
                    border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
                  `}
                />
                <button
                  onClick={() => toggleShowKey(integration.id, field)}
                  className="px-2 py-2 rounded-lg bg-gray-700"
                >
                  {showKeys[`${integration.id}_${field}`] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          
          {integration.optionalCredentials.map(field => (
            <div key={field}>
              <label className="block text-sm mb-1 capitalize">{field}</label>
              <input
                type="text"
                value={integration[field] || ''}
                onChange={(e) => handleUpdateConfig(integration.id, { [field]: e.target.value })}
                placeholder={`Enter ${field} (optional)`}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm
                  ${darkMode ? 'bg-[#1A1A2E]' : 'bg-gray-50'}
                  border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
                `}
              />
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handleTest(integration.id)}
            disabled={isTesting || !integration.configured}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm
              ${isTesting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('integrations.testing')}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {t('integrations.test')}
              </>
            )}
          </button>
          
          {testResult !== null && (
            <span className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm
              ${testResult ? 'bg-green-600' : 'bg-red-600'}
            `}>
              {testResult ? <Check size={16} /> : <X size={16} />}
              {testResult ? t('integrations.success') : t('integrations.failed')}
            </span>
          )}
          
          <a
            href={integration.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm ml-auto
              ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
            `}
          >
            <ExternalLink size={16} />
            {t('integrations.docs')}
          </a>
        </div>
      </div>
    );
  };
  
  // Group integrations by category
  const groupedIntegrations = Object.values(INTEGRATION_CATEGORIES).map(category => ({
    category,
    items: integrations.filter(i => i.category === category)
  })).filter(g => g.items.length > 0);
  
  if (loading) {
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
        <h1 className="text-3xl font-bold mb-2">{t('integrations.title')}</h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('integrations.subtitle')}
        </p>
      </div>
      
      {/* Active integrations summary */}
      <div className="mb-6">
        <div className={`
          p-4 rounded-xl
          ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
          border border-gray-700
        `}>
          <div className="flex items-center justify-between">
            <span>{t('integrations.activeCount')}</span>
            <span className="text-2xl font-bold text-green-500">
              {integrations.filter(i => i.active).length}
            </span>
          </div>
        </div>
      </div>
      
      {/* Integrations by category */}
      <div className="space-y-8">
        {groupedIntegrations.map(({ category, items }) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="capitalize">{getCategoryLabel(category)}</span>
              <span className="text-sm font-normal opacity-50">({items.length})</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map(renderIntegrationCard)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Integrations;
