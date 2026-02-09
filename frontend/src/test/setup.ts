/**
 * Test Setup File
 * 
 * This file runs before each test file and sets up the testing environment.
 * It configures mocking for external dependencies and initializes the
 * MSW (Mock Service Worker) server for API mocking.
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding Vitest test configuration
 * 2. Setting up MSW for API mocking in tests
 * 3. Mocking external modules with vi.mock()
 * 4. Managing mock data state between tests
 * 
 * WHAT IS MSW?
 * Mock Service Worker (MSW) intercepts network requests at the network level
 * using Service Workers. This means your tests make real HTTP requests that
 * get intercepted and mocked, providing the most realistic testing environment.
 * 
 * STATE MANAGEMENT IN TESTS:
 * We use resetMockData() before each test to ensure mock data (like items
 * and reservations) starts fresh. This prevents test pollution where one
 * test's mutations (e.g., creating a reservation) affect another test.
 * 
 * ALTERNATIVE: You could mock the fetch function directly, but MSW provides:
 * - More realistic request/response flow
 * - Better debugging with request logging
 * - Reusable mocks between tests and development
 * 
 * @module test/setup
 * @see {@link https://vitest.dev/config/#setupfiles} Vitest Setup Files
 * @see {@link https://mswjs.io/docs/getting-started/mocks} MSW Documentation
 */

// ============================================
// Testing Library Setup
// ============================================

/**
 * Import jest-dom matchers for DOM assertions.
 * 
 * This adds custom matchers like:
 * - expect(element).toBeInTheDocument()
 * - expect(element).toHaveClass('active')
 * - expect(input).toHaveValue('test')
 * 
 * These make tests more readable and provide better error messages.
 */
import '@testing-library/jest-dom';

// ============================================
// Vitest Imports
// ============================================

/**
 * Import Vitest's vi object for mocking and lifecycle hooks.
 * 
 * vi is Vitest's equivalent of Jest's jest object.
 * It provides mocking, spying, and lifecycle functionality.
 */
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ============================================
// MSW Setup
// ============================================

/**
 * Import the MSW server from our mocks.
 * 
 * This server is configured in mocks/server.ts with all our API handlers.
 * It intercepts HTTP requests during tests and returns mock responses.
 */
import { server } from './mocks/server';

/**
 * Import mock data reset function.
 * 
 * resetMockData() reinitializes all mock data (items, reservations, etc.)
 * to their default state. This is crucial for test isolation.
 */
import { resetMockData } from './mocks/handlers';

/**
 * Start the MSW server before all tests run.
 * 
 * This creates the interception layer that catches all outgoing HTTP requests.
 * The 'error' strategy means unhandled requests will throw errors, helping us
 * catch missing mocks.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

/**
 * Reset handlers and mock data after each test.
 * 
 * This ensures that:
 * 1. Any one-time handler overrides (server.use()) don't leak between tests
 * 2. Mock data (items, reservations) is reset to initial state
 * 3. Each test starts with a clean slate
 * 
 * WHY BOTH RESETS?
 * - server.resetHandlers() clears handler overrides
 * - resetMockData() clears mutated data state
 * 
 * Example of mutation that needs resetting:
 * Test 1: Creates reservation → mockReservations has 4 items
 * Test 2: Expects 3 reservations → FAILS without reset
 */
afterEach(() => {
  server.resetHandlers();
  resetMockData();
});

/**
 * Close the MSW server after all tests complete.
 * 
 * This cleans up the interception layer and prevents memory leaks.
 */
afterAll(() => server.close());

// ============================================
// Module Mocking
// ============================================

/**
 * Mock Next.js navigation hooks.
 * 
 * We mock these because:
 * 1. They rely on Next.js router context that's not available in tests
 * 2. We want to control their return values in tests
 * 3. Testing actual navigation is an integration/E2E concern
 * 
 * The mock returns functions that do nothing (vi.fn()) or simple values.
 * Tests can override these with specific values as needed.
 */
vi.mock('next/navigation', () => ({
  /**
   * useParams returns URL parameters like { id: 'item_1' }
   * In tests, we can override this with vi.mocked(useParams).mockReturnValue({ id: 'test' })
   */
  useParams: vi.fn(),
  
  /**
   * usePathname returns the current URL path like '/items/item_1'
   * Used for active navigation highlighting
   */
  usePathname: vi.fn(),
  
  /**
   * useRouter provides navigation functions
   * We mock these to prevent actual navigation in tests
   */
  useRouter: vi.fn(() => ({
    push: vi.fn(),      // Programmatic navigation
    replace: vi.fn(),   // Replace current history entry
    refresh: vi.fn(),   // Refresh page data
    back: vi.fn(),      // Go back in history
  })),
}));

/**
 * Mock sonner toast notifications.
 * 
 * We mock these because:
 * 1. Toast notifications are UI side effects we don't need to test
 * 2. They can cause act() warnings in React Testing Library
 * 3. We can assert they were called without rendering actual toasts
 * 
 * Tests can check if toast.success/error was called with expected messages.
 */
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  /**
   * Toaster component is mocked to render nothing.
   * We don't need to test the actual toast UI in unit tests.
   */
  Toaster: () => null,
}));

// ============================================
// Environment Setup
// ============================================

/**
 * Set environment variables for testing.
 * 
 * These are normally loaded from .env.local in development/production.
 * In tests, we set them explicitly to ensure consistency.
 * 
 * NOTE: This must be set before any modules that read process.env are imported.
 */
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';

// ============================================
// Cleanup Setup
// ============================================

/**
 * Import cleanup function from testing-library.
 * 
 * This removes any DOM elements created during tests, preventing
 * test pollution (where one test affects another).
 */
import { cleanup } from '@testing-library/react';

/**
 * Run cleanup after each test.
 * 
 * This ensures each test starts with a clean DOM.
 * While React Testing Library does this automatically in most cases,
 * explicit cleanup is good practice for edge cases.
 */
afterEach(() => {
  cleanup();
  /**
   * Clear all mock call history.
   * 
   * This resets vi.fn() call counts and arguments so each test
   * starts with fresh mock state.
   */
  vi.clearAllMocks();
});
