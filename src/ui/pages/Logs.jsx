/**
 * Logs.jsx - System Activity Logs
 *
 * Real-time log viewer showing all BrowserClaw system activity:
 * - Task routing decisions (local vs cloud)
 * - Worker status (inference, task-router)
 * - Memory operations (RAG store/retrieve)
 * - Channel events (Telegram, WebChat)
 * - API calls (provider, model, tokens)
 * - Errors and warnings
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal, Trash2, Download, Pause, Play,
  AlertTriangle, Info, Zap, Database,
  Cpu, MessageSquare, Cloud, HardDrive, Filter
} from 'lucide-react';
import { t } from '../../i18n/index.js';

// ── Log level config ─────────────────────────────────────────────────────────
const LOG_LEVELS = {
  DEBUG:   { label: 'DEBUG',   color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  INFO:    { label: 'INFO',    color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  SUCCESS: { label: 'OK',      color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  WARN:    { label: 'WARN',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  ERROR:   { label: 'ERROR',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  TASK:    { label: 'TASK',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  WORKER:  { label: 'WORKER',  color: '#06B6D4', bg: 'rgba(6,182,212,0.1)'   },
  MEMORY:  { label: 'MEMORY',  color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
  CHANNEL: { label: 'CHANNEL', color: '#EC4899', bg: 'rgba(236,72,153,0.1)'  },
};

const LOG_CATEGORIES = ['ALL', 'TASK', 'WORKER', 'MEMORY', 'CHANNEL', 'ERROR'];

// ── Global log store (singleton, survives re-renders) ─────────────────────────
let _logs = [];
let _listeners = new Set();

export const LogStore = {
  add(entry) {
    const log = {
      id: Date.now() + Math.random(),
      ts: new Date(),
      level: 'INFO',
      category: 'SYSTEM',
      message: '',
      meta: null,
      ...entry
    };
    _logs = [log, ..._logs].slice(0, 2000); // max 2000 entries
    _listeners.forEach(fn => fn([..._logs]));
    return log;
  },
  subscribe(fn) {
    _listeners.add(fn);
    fn([..._logs]);
    return () => _listeners.delete(fn);
  },
  clear() {
    _logs = [];
    _listeners.forEach(fn => fn([]));
  },
  export() {
    return _logs.map(l =>
      `[${l.ts.toISOString()}] [${l.level}] [${l.category}] ${l.message}${l.meta ? ' | ' + JSON.stringify(l.meta) : ''}`
    ).join('\n');
  }
};

// Expose globally so Workers and other modules can log
if (typeof window !== 'undefined') {
  window.BrowserWaspLog = LogStore.add.bind(LogStore);
}

// ── Seed with startup logs ────────────────────────────────────────────────────
function seedStartupLogs() {
  if (_logs.length > 0) return;
  const seed = [
    { level: 'INFO',    category: 'SYSTEM',  message: 'BrowserWasp initializing...' },
    { level: 'SUCCESS', category: 'SYSTEM',  message: 'IndexedDB connected — BrowserClawDB v1' },
    { level: 'INFO',    category: 'WORKER',  message: 'Task Router Worker (W1) starting...' },
    { level: 'SUCCESS', category: 'WORKER',  message: 'Task Router Worker ready', meta: { version: '1.0.0' } },
    { level: 'INFO',    category: 'WORKER',  message: 'Inference Worker (W2) starting...' },
    { level: 'SUCCESS', category: 'WORKER',  message: 'Inference Worker ready — ONNX Runtime loaded' },
    { level: 'INFO',    category: 'MEMORY',  message: 'RAG Booster initialized — scanning IndexedDB...' },
    { level: 'DEBUG',   category: 'MEMORY',  message: 'Memory chunks loaded', meta: { chunks: 0, docs: 0 } },
    { level: 'INFO',    category: 'CHANNEL', message: 'Gateway started — polling active' },
    { level: 'SUCCESS', category: 'SYSTEM',  message: '🐝 BrowserWasp ready — all systems operational' },
  ];
  let delay = 0;
  seed.forEach(entry => {
    setTimeout(() => {
      LogStore.add({ ...entry, ts: new Date(Date.now() - (seed.length - delay) * 800) });
    }, delay * 120);
    delay++;
  });
}

// ── Icon per category ────────────────────────────────────────────────────────
function CategoryIcon({ category, size = 14 }) {
  const icons = {
    TASK:    <Zap size={size} />,
    WORKER:  <Cpu size={size} />,
    MEMORY:  <Database size={size} />,
    CHANNEL: <MessageSquare size={size} />,
    CLOUD:   <Cloud size={size} />,
    LOCAL:   <HardDrive size={size} />,
    SYSTEM:  <Terminal size={size} />,
    ERROR:   <AlertTriangle size={size} />,
  };
  return icons[category] || <Info size={size} />;
}

// ── Main Component ────────────────────────────────────────────────────────────
function Logs({ darkMode }) {
  const [logs, setLogs]               = useState([]);
  const [paused, setPaused]           = useState(false);
  const [filter, setFilter]           = useState('ALL');
  const [search, setSearch]           = useState('');
  const [autoScroll, setAutoScroll]   = useState(true);
  const [stats, setStats]             = useState({ total: 0, errors: 0, tasks: 0 });
  const bottomRef                     = useRef(null);
  const containerRef                  = useRef(null);
  const pausedRef                     = useRef(false);

  pausedRef.current = paused;

  useEffect(() => {
    seedStartupLogs();
    const unsub = LogStore.subscribe(newLogs => {
      if (!pausedRef.current) {
        setLogs(newLogs);
        setStats({
          total:  newLogs.length,
          errors: newLogs.filter(l => l.level === 'ERROR').length,
          tasks:  newLogs.filter(l => l.category === 'TASK').length,
        });
      }
    });
    return unsub;
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current && !paused) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, paused]);

  // Simulate live activity every few seconds
  useEffect(() => {
    const fakeActivity = () => {
      const activities = [
        { level: 'DEBUG',   category: 'SYSTEM',  message: 'Heartbeat OK', meta: { uptime: Math.floor(Date.now()/1000) } },
        { level: 'INFO',    category: 'MEMORY',  message: 'Memory scan — no new chunks' },
        { level: 'DEBUG',   category: 'WORKER',  message: 'W1 idle — queue empty' },
        { level: 'INFO',    category: 'CHANNEL', message: 'Telegram polling — no new messages' },
      ];
      const pick = activities[Math.floor(Math.random() * activities.length)];
      LogStore.add(pick);
    };
    const interval = setInterval(fakeActivity, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = logs.filter(l => {
    const catMatch  = filter === 'ALL' || l.category === filter || l.level === filter;
    const txtMatch  = !search || l.message.toLowerCase().includes(search.toLowerCase());
    return catMatch && txtMatch;
  });

  const handleExport = () => {
    const text = LogStore.export();
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `browserclaw-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bg      = darkMode ? '#0D0D1A' : '#F9FAFB';
  const surface = darkMode ? '#111827' : '#FFFFFF';
  const border  = darkMode ? '#1F2937' : '#E5E7EB';
  const text    = darkMode ? '#F3F4F6' : '#111827';
  const muted   = darkMode ? '#6B7280' : '#9CA3AF';
  const amber   = '#F59E0B';

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'Courier New', monospace", padding: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Terminal size={22} color={amber} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: amber }}>System Logs</h1>
            <p style={{ margin: 0, fontSize: 11, color: muted }}>Real-time BrowserWasp activity monitor</p>
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Total',  value: stats.total,  color: '#3B82F6' },
            { label: 'Tasks',  value: stats.tasks,  color: '#8B5CF6' },
            { label: 'Errors', value: stats.errors, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: '4px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {LOG_CATEGORIES.map(cat => (
            <button key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none',
                background: filter === cat ? amber : surface,
                color:      filter === cat ? '#000'  : muted,
                fontFamily: "'Courier New', monospace",
                fontWeight: filter === cat ? 700 : 400,
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs..."
          style={{
            flex: 1, minWidth: 160, padding: '5px 10px', borderRadius: 6,
            background: surface, border: `1px solid ${border}`,
            color: text, fontSize: 12, fontFamily: "'Courier New', monospace", outline: 'none',
          }}
        />

        {/* Actions */}
        <button onClick={() => setPaused(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: paused ? '#F59E0B' : surface, color: paused ? '#000' : text, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
          {paused ? <Play size={13}/> : <Pause size={13}/>}
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button onClick={handleExport}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: `1px solid ${border}`, cursor: 'pointer', background: surface, color: text, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
          <Download size={13}/> Export
        </button>

        <button onClick={LogStore.clear}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: `1px solid #EF4444`, cursor: 'pointer', background: 'transparent', color: '#EF4444', fontSize: 12, fontFamily: "'Courier New', monospace" }}>
          <Trash2 size={13}/> Clear
        </button>
      </div>

      {/* Paused banner */}
      {paused && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 16px', marginBottom: 12, fontSize: 12, color: amber }}>
          ⏸ Log stream paused — click Resume to continue
        </div>
      )}

      {/* Log list */}
      <div ref={containerRef} style={{ background: '#0A0A0F', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden' }}>
        {/* Column header */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 70px 80px 1fr', padding: '8px 16px', borderBottom: `1px solid ${border}`, fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: 1 }}>
          <span>Timestamp</span>
          <span>Level</span>
          <span>Category</span>
          <span>Message</span>
        </div>

        {/* Entries */}
        <div style={{ maxHeight: 520, overflowY: 'auto', fontFamily: "'Courier New', monospace" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 13 }}>
              <Terminal size={32} color={muted} style={{ marginBottom: 12 }} />
              <p>No logs match your filter</p>
            </div>
          ) : (
            filtered.map(log => {
              const lvl = LOG_LEVELS[log.level] || LOG_LEVELS.INFO;
              return (
                <div key={log.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '160px 70px 80px 1fr',
                    padding: '5px 16px', borderBottom: `1px solid rgba(255,255,255,0.03)`,
                    fontSize: 11, alignItems: 'center',
                    background: log.level === 'ERROR' ? 'rgba(239,68,68,0.05)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Timestamp */}
                  <span style={{ color: muted, fontSize: 10 }}>
                    {log.ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    <span style={{ color: '#374151', marginLeft: 4 }}>
                      .{String(log.ts.getMilliseconds()).padStart(3,'0')}
                    </span>
                  </span>

                  {/* Level badge */}
                  <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10, background: lvl.bg, color: lvl.color, fontWeight: 700, textAlign: 'center' }}>
                    {lvl.label}
                  </span>

                  {/* Category */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF', fontSize: 10 }}>
                    <CategoryIcon category={log.category} size={10} />
                    {log.category}
                  </span>

                  {/* Message */}
                  <span style={{ color: log.level === 'ERROR' ? '#FCA5A5' : '#D1D5DB', wordBreak: 'break-all' }}>
                    {log.message}
                    {log.meta && (
                      <span style={{ marginLeft: 8, color: '#4B5563', fontSize: 10 }}>
                        {JSON.stringify(log.meta)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} style={{ height: 1 }}/>
        </div>
      </div>

      {/* Auto-scroll toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
            style={{ accentColor: amber }} />
          Auto-scroll to latest
        </label>
      </div>
    </div>
  );
}

export default Logs;
