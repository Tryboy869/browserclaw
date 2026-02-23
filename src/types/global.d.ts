// Global type declarations for BrowserClaw

declare module '*.js' {
  const content: any;
  export default content;
  export = content;
}

declare module '*.jsx' {
  const content: any;
  export default content;
}

declare module '../core/config.js' {
  export function initDB(): Promise<IDBDatabase>;
  export function getConfig(key: string, defaultValue?: any): Promise<any>;
  export function setConfig(key: string, value: any): Promise<void>;
  export function isFirstLaunch(): Promise<boolean>;
  export const STORES: Record<string, string>;
  export const DEFAULTS: Record<string, any>;
}

declare module '../core/gateway.js' {
  export function initGateway(): void;
  export function startGateway(): Promise<void>;
}

declare module '../memory/rag-booster.js' {
  export class RAGBooster {
    init(): Promise<void>;
    getStats(): Promise<any>;
  }
  export function getRAGBooster(): RAGBooster;
}

declare module '../i18n/index.js' {
  export function t(key: string, params?: Record<string, any>): string;
  export function setLanguage(lang: string): void;
  export function getCurrentLanguage(): string;
  export const AVAILABLE_LANGUAGES: Record<string, string>;
}

declare module './pages/Dashboard' {
  const Dashboard: React.FC<any>;
  export default Dashboard;
}

declare module './pages/Chat' {
  const Chat: React.FC<any>;
  export default Chat;
}

declare module './pages/Models' {
  const Models: React.FC<any>;
  export default Models;
}

declare module './pages/Config' {
  const Config: React.FC<any>;
  export default Config;
}

declare module './pages/Integrations' {
  const Integrations: React.FC<any>;
  export default Integrations;
}

// Worker types
declare module '../workers/task-router.js' {
  // Worker script
}

declare module '../workers/inference.js' {
  // Worker script
}
