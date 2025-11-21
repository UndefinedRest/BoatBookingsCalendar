// Test setup file
// This file runs before all tests

import { beforeAll, afterEach, afterAll } from 'vitest';

// Setup runs before all tests
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks or test data
});

// Cleanup after all tests
afterAll(() => {
  // Final cleanup
});
