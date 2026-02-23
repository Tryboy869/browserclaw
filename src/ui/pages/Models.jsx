/**
 * Models.jsx - Model Browser and Download Manager
 * 
 * Features three tabs:
 * 1. Local Models (HuggingFace) - Browse and download curated models
 * 2. Cloud Providers - Live fetch from configured providers
 * 3. HuggingFace API - Use HF Inference API without downloading
 */

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Check, 
  X, 
  Cpu, 
  Cloud, 
  HardDrive,
  Search,
  ExternalLink,
  Star,
  Zap,
  Globe
} from 'lucide-react';
import { t } from '../../i18n/index.js';
import { 
  MODEL_REGISTRY, 
  MODEL_CATEGORIES,
  getModelsByCategory,
  getRecommendedModels,
  getModelById,
  getModelCardUrl
} from '../../models/model-registry.js';
import { 
  getModelManager, 
  DOWNLOAD_STATUS 
} from '../../models/model-manager.js';
import { listModels, getConfiguredProviders } from '../../integrations/providers.js';
import { getConfig } from '../../core/config.js';

function Models({ darkMode }) {
  const [activeTab, setActiveTab] = useState('local');
  const [models, setModels] = useState([]);
  const [cloudModels, setCloudModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeModel, setActiveModel] = useState(null);
  const [hfModelId, setHfModelId] = useState('');
  const [hfModelInfo, setHfModelInfo] = useState(null);
  
  const modelManager = getModelManager();
  
  useEffect(() => {
    loadModels();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'cloud') {
      loadCloudModels();
    }
  }, [activeTab]);
  
  const loadModels = async () => {
    try {
      await modelManager.init();
      const allModels = await modelManager.getAllModels();
      setModels(allModels);
      
      const active = await modelManager.getActiveModel();
      setActiveModel(active?.id);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCloudModels = async () => {
    setLoading(true);
    try {
      const providers = await getConfiguredProviders();
      const allCloudModels = [];
      
      for (const provider of providers) {
        try {
          const apiKeys = await getConfig('api_keys', {});
          const models = await listModels(provider.id, apiKeys[provider.id]);
          allCloudModels.push(...models.map(m => ({ ...m, provider: provider.name })));
        } catch (error) {
          console.error(`Failed to load models from ${provider.id}:`, error);
        }
      }
      
      setCloudModels(allCloudModels);
    } catch (error) {
      console.error('Failed to load cloud models:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async (modelId) => {
    setDownloading(prev => ({ ...prev, [modelId]: true }));
    
    try {
      await modelManager.downloadModel(modelId, {
        onProgress: (progress) => {
          console.log(`Download progress for ${modelId}:`, progress);
        },
        onComplete: () => {
          loadModels();
          setDownloading(prev => ({ ...prev, [modelId]: false }));
        },
        onError: (error) => {
          console.error(`Download error for ${modelId}:`, error);
          setDownloading(prev => ({ ...prev, [modelId]: false }));
        }
      });
    } catch (error) {
      console.error('Download failed:', error);
      setDownloading(prev => ({ ...prev, [modelId]: false }));
    }
  };
  
  const handleSetActive = async (modelId) => {
    try {
      await modelManager.setActiveModel(modelId);
      setActiveModel(modelId);
    } catch (error) {
      console.error('Failed to set active model:', error);
    }
  };
  
  const handleDelete = async (modelId) => {
    if (confirm(t('models.confirmDelete'))) {
      try {
        await modelManager.deleteModel(modelId);
        loadModels();
      } catch (error) {
        console.error('Failed to delete model:', error);
      }
    }
  };
  
  const handleFetchHFModel = async () => {
    if (!hfModelId.trim()) return;
    
    setLoading(true);
    try {
      const apiKeys = await getConfig('api_keys', {});
      const response = await fetch(`https://huggingface.co/api/models/${hfModelId}`, {
        headers: apiKeys.huggingface ? {
          'Authorization': `Bearer ${apiKeys.huggingface}`
        } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        setHfModelInfo(data);
      } else {
        alert(t('models.modelNotFound'));
      }
    } catch (error) {
      console.error('Failed to fetch model info:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const renderModelCard = (model) => {
    const isDownloading = downloading[model.id];
    const isDownloaded = model.downloadStatus === DOWNLOAD_STATUS.COMPLETED;
    const isActive = model.id === activeModel;
    
    return (
      <div
        key={model.id}
        className={`
          p-4 rounded-xl border transition-all
          ${darkMode 
            ? 'bg-[#16213E] border-gray-700 hover:border-gray-600' 
            : 'bg-white border-gray-200 hover:border-gray-300'
          }
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{model.name}</h3>
            {model.recommended && (
              <Star size={16} className="text-yellow-500" />
            )}
          </div>
          <span className={`
            px-2 py-1 rounded text-xs
            ${model.category === MODEL_CATEGORIES.LLM 
              ? 'bg-blue-600' 
              : 'bg-green-600'
            }
          `}>
            {model.category}
          </span>
        </div>
        
        <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {model.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`
            px-2 py-1 rounded text-xs
            ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}
          `}>
            {model.size}
          </span>
          <span className={`
            px-2 py-1 rounded text-xs
            ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}
          `}>
            {model.vramGB}GB VRAM
          </span>
          {model.contextWindow && (
            <span className={`
              px-2 py-1 rounded text-xs
              ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}
            `}>
              {model.contextWindow.toLocaleString()} ctx
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!isDownloaded ? (
              <button
                onClick={() => handleDownload(model.id)}
                disabled={isDownloading}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  ${isDownloading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }
                  text-white text-sm
                `}
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('models.downloading')}
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    {t('models.download')}
                  </>
                )}
              </button>
            ) : (
              <>
                {!isActive ? (
                  <button
                    onClick={() => handleSetActive(model.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm"
                  >
                    <Zap size={16} />
                    {t('models.setActive')}
                  </button>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg text-white text-sm">
                    <Check size={16} />
                    {t('models.active')}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(model.id)}
                  className={`
                    p-2 rounded-lg
                    ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                  `}
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
          
          <a
            href={getModelCardUrl(model.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              p-2 rounded-lg
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            `}
          >
            <ExternalLink size={16} />
          </a>
        </div>
        
        {isDownloading && (
          <div className="mt-3">
            <div className={`
              h-2 rounded-full overflow-hidden
              ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}
            `}>
              <div 
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${model.downloadProgress || 0}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-center">
              {model.downloadProgress || 0}%
            </p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('models.title')}</h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('models.subtitle')}
        </p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        {[
          { id: 'local', label: t('models.tabs.local'), icon: HardDrive },
          { id: 'cloud', label: t('models.tabs.cloud'), icon: Cloud },
          { id: 'hfapi', label: t('models.tabs.hfapi'), icon: Globe }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
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
      
      {/* Local Models Tab */}
      {activeTab === 'local' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}>
                <Search size={18} className="opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('models.search')}
                  className="bg-transparent flex-1 outline-none"
                />
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`
                px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            >
              <option value="all">{t('models.categories.all')}</option>
              <option value={MODEL_CATEGORIES.LLM}>{t('models.categories.llm')}</option>
              <option value={MODEL_CATEGORIES.WHISPER}>{t('models.categories.whisper')}</option>
            </select>
          </div>
          
          {/* Models Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map(renderModelCard)}
            </div>
          )}
        </>
      )}
      
      {/* Cloud Providers Tab */}
      {activeTab === 'cloud' && (
        <div>
          {cloudModels.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Cloud size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{t('models.noCloudProviders')}</h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('models.configureProviders')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cloudModels.map((model, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-xl border
                    ${darkMode 
                      ? 'bg-[#16213E] border-gray-700' 
                      : 'bg-white border-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{model.name || model.id}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-purple-600">
                      {model.provider}
                    </span>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {model.contextWindow?.toLocaleString()} context
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* HF API Tab */}
      {activeTab === 'hfapi' && (
        <div className="max-w-2xl">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={hfModelId}
              onChange={(e) => setHfModelId(e.target.value)}
              placeholder="e.g., mistralai/Mistral-7B-Instruct-v0.3"
              className={`
                flex-1 px-4 py-2 rounded-lg
                ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
                border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
              `}
            />
            <button
              onClick={handleFetchHFModel}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {t('models.fetch')}
            </button>
          </div>
          
          {hfModelInfo && (
            <div className={`
              p-6 rounded-xl border
              ${darkMode 
                ? 'bg-[#16213E] border-gray-700' 
                : 'bg-white border-gray-200'
              }
            `}>
              <h3 className="text-xl font-semibold mb-2">{hfModelInfo.id}</h3>
              <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {hfModelInfo.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 rounded bg-gray-700 text-sm">
                  {hfModelInfo.tags?.length || 0} tags
                </span>
                <span className="px-2 py-1 rounded bg-gray-700 text-sm">
                  {hfModelInfo.downloads?.toLocaleString()} downloads
                </span>
                <span className="px-2 py-1 rounded bg-gray-700 text-sm">
                  {hfModelInfo.likes?.toLocaleString()} likes
                </span>
              </div>
              <a
                href={`https://huggingface.co/${hfModelInfo.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400"
              >
                <ExternalLink size={16} />
                {t('models.viewOnHF')}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Models;
