/**
 * gateway.js - API Gateway using api-in-browser
 * 
 * This module sets up the HTTP routing layer using the api-in-browser library.
 * It handles:
 * - Route definitions
 * - Request routing to appropriate handlers
 * - Webhook endpoints
 * - Telegram long-polling setup
 * 
 * All routing happens in the browser - no server required.
 */

import { getConfig } from './config.js';

/**
 * Gateway state
 */
const state = {
  routes: new Map(),
  middleware: [],
  initialized: false
};

/**
 * Route definition
 */
class Route {
  constructor(method, path, handler) {
    this.method = method.toUpperCase();
    this.path = path;
    this.handler = handler;
    this.pattern = this.buildPattern(path);
  }
  
  /**
   * Build URL pattern for matching
   * @param {string} path 
   * @returns {RegExp}
   */
  buildPattern(path) {
    // Convert route parameters to regex
    const pattern = path
      .replace(/:([^/]+)/g, '([^/]+)')
      .replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`);
  }
  
  /**
   * Check if route matches request
   * @param {string} method 
   * @param {string} path 
   * @returns {boolean}
   */
  matches(method, path) {
    return this.method === method && this.pattern.test(path);
  }
  
  /**
   * Extract parameters from path
   * @param {string} path 
   * @returns {Object}
   */
  extractParams(path) {
    const paramNames = this.path.match(/:([^/]+)/g) || [];
    const values = path.match(this.pattern);
    
    const params = {};
    paramNames.forEach((name, i) => {
      params[name.slice(1)] = values[i + 1];
    });
    
    return params;
  }
}

/**
 * Request object
 */
class Request {
  constructor(method, path, headers = {}, body = null, query = {}) {
    this.method = method;
    this.path = path;
    this.headers = headers;
    this.body = body;
    this.query = query;
    this.params = {};
  }
  
  /**
   * Get header value
   * @param {string} name 
   * @returns {string|null}
   */
  getHeader(name) {
    return this.headers[name.toLowerCase()] || null;
  }
  
  /**
   * Parse JSON body
   * @returns {Object|null}
   */
  json() {
    if (typeof this.body === 'string') {
      try {
        return JSON.parse(this.body);
      } catch {
        return null;
      }
    }
    return this.body;
  }
}

/**
 * Response object
 */
class Response {
  constructor() {
    this.statusCode = 200;
    this.headers = { 'Content-Type': 'application/json' };
    this.body = null;
  }
  
  /**
   * Set status code
   * @param {number} code 
   * @returns {Response}
   */
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  /**
   * Set header
   * @param {string} name 
   * @param {string} value 
   * @returns {Response}
   */
  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  }
  
  /**
   * Send JSON response
   * @param {*} data 
   * @returns {Response}
   */
  json(data) {
    this.body = JSON.stringify(data);
    this.setHeader('Content-Type', 'application/json');
    return this;
  }
  
  /**
   * Send text response
   * @param {string} text 
   * @returns {Response}
   */
  send(text) {
    this.body = text;
    return this;
  }
  
  /**
   * Convert to standard Response
   * @returns {Response}
   */
  toStandardResponse() {
    return new globalThis.Response(this.body, {
      status: this.statusCode,
      headers: this.headers
    });
  }
}

/**
 * Initialize the gateway
 */
export function initGateway() {
  if (state.initialized) return;
  
  // Setup default routes
  setupDefaultRoutes();
  
  state.initialized = true;
}

/**
 * Setup default routes
 */
function setupDefaultRoutes() {
  // Health check
  get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0'
    });
  });
  
  // API status
  get('/api/status', async (req, res) => {
    const routing = await getConfig('routing', {});
    const localModel = await getConfig('local_model', {});
    
    res.json({
      routing: routing.mode,
      localModel: localModel.active,
      timestamp: Date.now()
    });
  });
  
  // Webhook endpoint
  post('/webhook', async (req, res) => {
    const data = req.json();
    
    if (!data || !data.message) {
      return res.status(400).json({ error: 'Missing message' });
    }
    
    // Forward to webhook handler if registered
    const webhookHandler = state.routes.get('webhook');
    if (webhookHandler) {
      const result = await webhookHandler(data);
      return res.json({ response: result });
    }
    
    res.json({ received: true });
  });
}

/**
 * Register a GET route
 * @param {string} path 
 * @param {Function} handler 
 */
export function get(path, handler) {
  registerRoute('GET', path, handler);
}

/**
 * Register a POST route
 * @param {string} path 
 * @param {Function} handler 
 */
export function post(path, handler) {
  registerRoute('POST', path, handler);
}

/**
 * Register a PUT route
 * @param {string} path 
 * @param {Function} handler 
 */
export function put(path, handler) {
  registerRoute('PUT', path, handler);
}

/**
 * Register a DELETE route
 * @param {string} path 
 * @param {Function} handler 
 */
export function del(path, handler) {
  registerRoute('DELETE', path, handler);
}

/**
 * Register a route
 * @param {string} method 
 * @param {string} path 
 * @param {Function} handler 
 */
function registerRoute(method, path, handler) {
  const route = new Route(method, path, handler);
  const key = `${method}:${path}`;
  state.routes.set(key, route);
}

/**
 * Register webhook handler
 * @param {Function} handler 
 */
export function registerWebhook(handler) {
  state.routes.set('webhook', handler);
}

/**
 * Handle incoming request
 * @param {Request} request 
 * @returns {Promise<Response>}
 */
export async function handleRequest(request) {
  initGateway();
  
  // Run middleware
  for (const middleware of state.middleware) {
    await middleware(request);
  }
  
  // Find matching route
  for (const route of state.routes.values()) {
    if (route instanceof Route && route.matches(request.method, request.path)) {
      request.params = route.extractParams(request.path);
      
      const response = new Response();
      await route.handler(request, response);
      
      return response.toStandardResponse();
    }
  }
  
  // No route found
  return new Response().status(404).json({ error: 'Not found' }).toStandardResponse();
}

/**
 * Add middleware
 * @param {Function} middleware 
 */
export function use(middleware) {
  state.middleware.push(middleware);
}

/**
 * Create a fetch handler for service worker
 * @returns {Function}
 */
export function createFetchHandler() {
  return async (event) => {
    const url = new URL(event.request.url);
    
    // Only handle API routes
    if (!url.pathname.startsWith('/api/') && url.pathname !== '/webhook' && url.pathname !== '/health') {
      return;
    }
    
    const body = event.request.method !== 'GET' && event.request.method !== 'HEAD'
      ? await event.request.text()
      : null;
    
    const request = new Request(
      event.request.method,
      url.pathname,
      Object.fromEntries(event.request.headers.entries()),
      body,
      Object.fromEntries(url.searchParams.entries())
    );
    
    const response = await handleRequest(request);
    event.respondWith(response);
  };
}

/**
 * Parse query string
 * @param {string} queryString 
 * @returns {Object}
 */
function parseQueryString(queryString) {
  const params = new URLSearchParams(queryString);
  return Object.fromEntries(params.entries());
}

/**
 * Start the gateway
 * This sets up the service worker or uses a fallback
 */
export async function startGateway() {
  initGateway();
  
  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    try {
      // Register service worker for request interception
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.log('Service Worker registration failed, using fallback:', error);
    }
  }
  
  console.log('Gateway started');
}

/**
 * Get registered routes
 * @returns {Array}
 */
export function getRoutes() {
  return Array.from(state.routes.values())
    .filter(r => r instanceof Route)
    .map(r => ({
      method: r.method,
      path: r.path
    }));
}

/**
 * Clear all routes
 */
export function clearRoutes() {
  state.routes.clear();
  state.middleware = [];
}

export default {
  initGateway,
  startGateway,
  get,
  post,
  put,
  del,
  use,
  handleRequest,
  createFetchHandler,
  registerWebhook,
  getRoutes,
  clearRoutes,
  Request,
  Response
};
