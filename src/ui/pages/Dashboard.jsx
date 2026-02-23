/**
 * Dashboard.jsx - Agent Dashboard
 * 
 * Shows:
 * - Agent status and current state
 * - Live activity feed
 * - Quick stats (tasks today, memory size, uptime)
 * - Quick actions
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Database, 
  Clock, 
  MessageSquare, 
  Bot,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { t } from '../../i18n/index.js';
import { getConfig } from '../../core/config.js';
import { getRAGBooster } from '../../memory/rag-booster.js';
import { getModelManager } from '../../models/model-manager.js';

function Dashboard({ darkMode }) {
  const [stats, setStats] = useState({
    tasksToday: 0,
    memorySize: 0,
    uptime: 0,
    activeModel: null,
    routingMode: 'auto',
    privacyMode: false
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
    
    // Update stats every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadDashboardData = async () => {
    try {
      // Get routing config
      const routing = await getConfig('routing', {});
      const localModel = await getConfig('local_model', {});
      
      // Get RAG stats
      const rag = getRAGBooster();
      const ragStats = await rag.getStats();
      
      // Get active model info
      const modelManager = getModelManager();
      const activeModel = await modelManager.getActiveModel();
      
      setStats({
        tasksToday: Math.floor(Math.random() * 50) + 10, // Placeholder
        memorySize: ragStats.totalChunks || 0,
        uptime: Math.floor(Date.now() / 1000) % 86400, // Placeholder
        activeModel: activeModel?.name || localModel.active || t('dashboard.noModel'),
        routingMode: routing.mode || 'auto',
        privacyMode: routing.privacyMode || false
      });
      
      // Load recent activities
      loadActivities();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadActivities = () => {
    // Placeholder activities - in production, these would come from a log
    const recentActivities = [
      { type: 'message', text: t('dashboard.activity.message'), time: '2 min ago' },
      { type: 'model', text: t('dashboard.activity.modelLoaded'), time: '15 min ago' },
      { type: 'task', text: t('dashboard.activity.taskCompleted'), time: '1 hour ago' },
      { type: 'memory', text: t('dashboard.activity.memoryUpdated'), time: '2 hours ago' }
    ];
    setActivities(recentActivities);
  };
  
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };
  
  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className={`
      p-6 rounded-xl
      ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
      border border-gray-700
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
  
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
        <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('dashboard.subtitle')}
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Activity}
          label={t('dashboard.stats.tasks')}
          value={stats.tasksToday}
          color="bg-blue-500"
        />
        <StatCard
          icon={Database}
          label={t('dashboard.stats.memory')}
          value={`${stats.memorySize} chunks`}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          label={t('dashboard.stats.uptime')}
          value={formatUptime(stats.uptime)}
          color="bg-purple-500"
        />
        <StatCard
          icon={Bot}
          label={t('dashboard.stats.model')}
          value={stats.activeModel}
          color="bg-orange-500"
        />
      </div>
      
      {/* Status and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Panel */}
        <div className={`
          p-6 rounded-xl
          ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
          border border-gray-700
        `}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            {t('dashboard.status.title')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('dashboard.status.routing')}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-600 text-sm capitalize">
                {stats.routingMode}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('dashboard.status.privacy')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                stats.privacyMode 
                  ? 'bg-green-600' 
                  : 'bg-gray-600'
              }`}>
                {stats.privacyMode ? t('common.on') : t('common.off')}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('dashboard.status.workers')}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {t('dashboard.status.running')}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('dashboard.status.database')}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {t('dashboard.status.connected')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Activity Feed */}
        <div className={`
          p-6 rounded-xl
          ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
          border border-gray-700
        `}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            {t('dashboard.activity.title')}
          </h2>
          
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div 
                key={index}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${darkMode ? 'bg-[#1A1A2E]' : 'bg-gray-50'}
                `}
              >
                <div className={`
                  w-2 h-2 rounded-full
                  ${activity.type === 'message' ? 'bg-blue-500' : ''}
                  ${activity.type === 'model' ? 'bg-green-500' : ''}
                  ${activity.type === 'task' ? 'bg-purple-500' : ''}
                  ${activity.type === 'memory' ? 'bg-orange-500' : ''}
                `}></div>
                <div className="flex-1">
                  <p className="text-sm">{activity.text}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => window.location.hash = 'chat'}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <MessageSquare size={20} />
            {t('dashboard.actions.startChat')}
          </button>
          <button
            onClick={() => window.location.hash = 'models'}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Cpu size={20} />
            {t('dashboard.actions.downloadModel')}
          </button>
          <button
            onClick={() => window.location.hash = 'config'}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <Shield size={20} />
            {t('dashboard.actions.configure')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
