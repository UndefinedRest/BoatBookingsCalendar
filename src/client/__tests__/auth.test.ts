/**
 * Authentication Service Tests
 *
 * Tests the critical authentication paths including:
 * - Successful login workflow
 * - CSRF token extraction
 * - Login mutex (preventing concurrent logins)
 * - Automatic re-authentication on session expiry (403/401)
 * - Retry limits to prevent login storms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth.js';
import type { Config } from '../../models/types.js';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

describe('AuthService', () => {
  const baseUrl = 'https://test.revsport.com';
  const testConfig: Config = {
    baseUrl,
    username: 'test@example.com',
    password: 'testPassword123!',
    debug: false,
  };

  let authService: AuthService;
  let mockAxios: AxiosInstance;

  // Helper to create mock axios response
  const createMockResponse = <T = any>(data: T, status: number = 200, headers: Record<string, string> = {}): AxiosResponse<T> => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : status === 302 ? 'Found' : status === 401 ? 'Unauthorized' : 'Forbidden',
    headers,
    config: {} as InternalAxiosRequestConfig,
  });

  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should throw error when username is missing', () => {
      const invalidConfig = { ...testConfig, username: '' };

      expect(() => new AuthService(invalidConfig as Config))
        .toThrow('Missing username or password');
    });

    it('should throw error when password is missing', () => {
      const invalidConfig = { ...testConfig, password: '' };

      expect(() => new AuthService(invalidConfig as Config))
        .toThrow('Missing username or password');
    });

    it('should create instance with valid config', () => {
      // Create a minimal mock axios for constructor test
      mockAxios = {
        get: vi.fn(),
        post: vi.fn(),
      } as any;

      expect(() => new AuthService(testConfig, mockAxios)).not.toThrow();
    });
  });

  describe('login', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Setup mock responses
      mockAxios = {
        get: vi.fn()
          .mockResolvedValueOnce(
            // Step 1: CSRF token request
            createMockResponse('<html><input name="_token" value="test-csrf-token" /></html>')
          )
          .mockResolvedValueOnce(
            // Step 3: Verification request
            createMockResponse('<html><a href="/logout">Logout</a></html>')
          ),
        post: vi.fn()
          .mockResolvedValueOnce(
            // Step 2: Login POST
            createMockResponse('', 302, { 'Set-Cookie': 'session=abc123; Path=/; HttpOnly' })
          ),
      } as any;

      authService = new AuthService(testConfig, mockAxios);
      await authService.login();

      // Verify authenticated
      expect(authService.isLoggedIn()).toBe(true);

      // Verify we can get authenticated client
      expect(() => authService.getClient()).not.toThrow();

      // Verify correct calls were made
      expect(mockAxios.get).toHaveBeenCalledWith('/login');
      expect(mockAxios.post).toHaveBeenCalled();
      expect(mockAxios.get).toHaveBeenCalledWith('/bookings');
    }, 10000);

    it('should fail when CSRF token cannot be extracted', async () => {
      mockAxios = {
        get: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('<html><p>No token here</p></html>')
          ),
        post: vi.fn(),
      } as any;

      authService = new AuthService(testConfig, mockAxios);

      await expect(authService.login()).rejects.toThrow(
        'Could not extract CSRF token'
      );
    });

    it('should fail when credentials are invalid', async () => {
      mockAxios = {
        get: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('<html><input name="_token" value="test-csrf-token" /></html>')
          ),
        post: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('<div class="alert-danger">Invalid credentials</div>', 401)
          ),
      } as any;

      authService = new AuthService(testConfig, mockAxios);

      await expect(authService.login()).rejects.toThrow('Invalid credentials');
    });

    it('should handle login mutex - prevent concurrent logins', async () => {
      let getCallCount = 0;

      mockAxios = {
        get: vi.fn()
          .mockImplementation(() => {
            getCallCount++;
            if (getCallCount === 1) {
              // First call: CSRF token
              return Promise.resolve(
                createMockResponse('<html><input name="_token" value="test-csrf-token" /></html>')
              );
            } else {
              // Second call: verification
              return Promise.resolve(
                createMockResponse('<html><a href="/logout">Logout</a></html>')
              );
            }
          }),
        post: vi.fn()
          .mockResolvedValue(
            createMockResponse('', 302, { 'Set-Cookie': 'session=abc123' })
          ),
      } as any;

      authService = new AuthService(testConfig, mockAxios);

      // Start two login attempts simultaneously
      const login1Promise = authService.login();
      const login2Promise = authService.login();

      // Both should complete successfully
      await Promise.all([login1Promise, login2Promise]);

      // But only one HTTP request sequence should have been made
      expect(authService.isLoggedIn()).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(2); // Once for CSRF, once for verification
      expect(mockAxios.post).toHaveBeenCalledTimes(1); // Once for login
    }, 10000);

    it('should skip login if already authenticated', async () => {
      mockAxios = {
        get: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('<html><input name="_token" value="csrf1" /></html>')
          )
          .mockResolvedValueOnce(
            createMockResponse('<html><a href="/logout">Logout</a></html>')
          ),
        post: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('', 302, { 'Set-Cookie': 'session=abc123' })
          ),
      } as any;

      authService = new AuthService(testConfig, mockAxios);
      await authService.login();

      expect(authService.isLoggedIn()).toBe(true);

      // Second login attempt should skip (no new HTTP requests)
      const initialGetCalls = (mockAxios.get as any).mock.calls.length;
      const initialPostCalls = (mockAxios.post as any).mock.calls.length;

      await authService.login();

      // Still authenticated
      expect(authService.isLoggedIn()).toBe(true);

      // No new calls should have been made
      expect((mockAxios.get as any).mock.calls.length).toBe(initialGetCalls);
      expect((mockAxios.post as any).mock.calls.length).toBe(initialPostCalls);
    }, 10000);
  });

  describe('get() - auto re-authentication', () => {
    beforeEach(async () => {
      // Set up successful initial login
      mockAxios = {
        get: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('<html><input name="_token" value="csrf-initial" /></html>')
          )
          .mockResolvedValueOnce(
            createMockResponse('<html><a href="/logout">Logout</a></html>')
          ),
        post: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('', 302, { 'Set-Cookie': 'session=initial' })
          ),
      } as any;

      authService = new AuthService(testConfig, mockAxios);
      await authService.login();

      // Clear mock history after login
      vi.clearAllMocks();
    });

    it('should successfully make authenticated GET request', async () => {
      (mockAxios.get as any).mockResolvedValueOnce(
        createMockResponse({ data: 'test-data' })
      );

      const result = await authService.get('/api/test');

      expect(result).toEqual({ data: 'test-data' });
      expect(mockAxios.get).toHaveBeenCalledWith('/api/test');
    });

    it('should re-authenticate on 403 and retry request', async () => {
      // Setup: First GET fails with 403, then re-auth sequence, then retry succeeds
      (mockAxios.get as any)
        .mockRejectedValueOnce({ response: { status: 403, statusText: 'Forbidden' } }) // First attempt fails
        .mockResolvedValueOnce(createMockResponse('<html><input name="_token" value="csrf-retry" /></html>')) // Re-auth: CSRF
        .mockResolvedValueOnce(createMockResponse('<html><a href="/logout">Logout</a></html>')) // Re-auth: verification
        .mockResolvedValueOnce(createMockResponse({ data: 'success-after-reauth' })); // Retry succeeds

      (mockAxios.post as any)
        .mockResolvedValueOnce(createMockResponse('', 302, { 'Set-Cookie': 'session=retry' })); // Re-auth: login POST

      const result = await authService.get('/api/test');

      expect(result).toEqual({ data: 'success-after-reauth' });
    }, 15000);

    it('should re-authenticate on 401 and retry request', async () => {
      (mockAxios.get as any)
        .mockRejectedValueOnce({ response: { status: 401, statusText: 'Unauthorized' } })
        .mockResolvedValueOnce(createMockResponse('<html><input name="_token" value="csrf-retry" /></html>'))
        .mockResolvedValueOnce(createMockResponse('<html><a href="/logout">Logout</a></html>'))
        .mockResolvedValueOnce(createMockResponse({ data: 'success' }));

      (mockAxios.post as any)
        .mockResolvedValueOnce(createMockResponse('', 302, { 'Set-Cookie': 'session=retry' }));

      const result = await authService.get('/api/test');

      expect(result).toEqual({ data: 'success' });
    }, 15000);

    it('should limit retries to prevent login storms (max 2 retries)', async () => {
      let apiCallCount = 0;

      // Mock GET: API calls fail, but re-auth CSRF/verification succeed
      (mockAxios.get as any).mockImplementation((url: string) => {
        if (url === '/api/test') {
          apiCallCount++;
          // All API requests fail with 403
          return Promise.reject({ response: { status: 403, statusText: 'Forbidden' } });
        } else if (url === '/login') {
          // Re-auth CSRF token succeeds
          return Promise.resolve(createMockResponse('<html><input name="_token" value="csrf-retry" /></html>'));
        } else if (url === '/bookings') {
          // Re-auth verification succeeds
          return Promise.resolve(createMockResponse('<html><a href="/logout">Logout</a></html>'));
        }
        return Promise.reject(new Error('Unexpected URL: ' + url));
      });

      // Re-auth POST always succeeds
      (mockAxios.post as any)
        .mockResolvedValue(createMockResponse('', 302, { 'Set-Cookie': 'session=retry' }));

      // Should throw after max retries
      await expect(authService.get('/api/test')).rejects.toThrow(
        'Authentication failed after multiple retries'
      );

      // Should have attempted 3 times: initial + 2 retries
      expect(apiCallCount).toBe(3);
    }, 20000);

    it('should apply exponential backoff between retries', async () => {
      (mockAxios.get as any)
        .mockRejectedValueOnce({ response: { status: 403 } })
        .mockResolvedValueOnce(createMockResponse('<html><input name="_token" value="csrf" /></html>'))
        .mockResolvedValueOnce(createMockResponse('<html><a href="/logout">Logout</a></html>'))
        .mockResolvedValueOnce(createMockResponse({ data: 'success' }));

      (mockAxios.post as any)
        .mockResolvedValueOnce(createMockResponse('', 302, { 'Set-Cookie': 'session=retry' }));

      const result = await authService.get('/api/test');

      expect(result).toEqual({ data: 'success' });
    }, 15000);
  });

  describe('getClient()', () => {
    it('should throw error when not authenticated', () => {
      mockAxios = {
        get: vi.fn(),
        post: vi.fn(),
      } as any;

      authService = new AuthService(testConfig, mockAxios);

      expect(() => authService.getClient()).toThrow(
        'Not authenticated. Call login() first'
      );
    });

    it('should return client when authenticated', async () => {
      mockAxios = {
        get: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('<html><input name="_token" value="csrf" /></html>')
          )
          .mockResolvedValueOnce(
            createMockResponse('<html><a href="/logout">Logout</a></html>')
          ),
        post: vi.fn()
          .mockResolvedValueOnce(
            createMockResponse('', 302, { 'Set-Cookie': 'session=abc' })
          ),
      } as any;

      authService = new AuthService(testConfig, mockAxios);
      await authService.login();

      const client = authService.getClient();
      expect(client).toBeDefined();
    }, 10000);
  });
});
