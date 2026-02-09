/**
 * MSW Server Setup
 * 
 * This file creates and configures the Mock Service Worker server for Node.js.
 * MSW uses different implementations for browser (service worker) vs Node (interceptor).
 * This file is for Node.js environments (tests running in Node).
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding MSW's dual-environment architecture
 * 2. Setting up MSW for Node.js (test) environments
 * 3. Using server.use() for one-time handler overrides
 * 
 * MSW ARCHITECTURE:
 * MSW has two main implementations:
 * - Browser: Uses Service Workers to intercept requests
 * - Node: Uses @mswjs/interceptors to intercept requests
 * 
 * They share the same handler syntax but different setup methods.
 * This file uses setupServer() for Node environments.
 * 
 * @module test/mocks/server
 * @see {@link https://mswjs.io/docs/getting-started/integrate/node} MSW Node Integration
 */

// ============================================
// MSW Imports
// ============================================

/**
 * setupServer creates an MSW server for Node.js environments.
 * 
 * Use this in:
 * - Vitest/Jest tests
 * - Node.js scripts
 * - Server-side rendering tests
 * 
 * For browser environments, use setupWorker() instead.
 */
import { setupServer } from 'msw/node';

/**
 * Import all the HTTP handlers that define mock responses.
 * These handlers are shared between browser and Node environments.
 */
import { handlers } from './handlers';

// ============================================
// Server Instance
// ============================================

/**
 * Create and configure the MSW server.
 * 
 * This server intercepts all HTTP requests made during tests
 * and responds according to the handlers defined in handlers.ts.
 * 
 * EXAMPLE USAGE in tests:
 * ```typescript
 * import { server } from './mocks/server';
 * 
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const server = setupServer(...handlers);

// ============================================
// Server API Overview
// ============================================

/**
 * server.listen(): Start request interception
 * - Must be called before any requests are made
 * - Usually in beforeAll() at test suite level
 * 
 * server.resetHandlers(): Reset to initial handlers
 * - Clears any one-time overrides added with server.use()
 * - Usually in afterEach() to ensure test isolation
 * 
 * server.close(): Stop request interception
 * - Cleans up resources
 * - Usually in afterAll()
 * 
 * server.use(...handlers): Add one-time handlers
 * - Overrides existing handlers for specific test cases
 * - Reset by server.resetHandlers()
 * 
 * Example of one-time override:
 * ```typescript
 * test('handles network error', () => {
 *   server.use(
 *     http.get('/api/items', () => {
 *       return new HttpResponse(null, { status: 500 });
 *     })
 *   );
 *   // ... test code
 * });
 * ```
 */
