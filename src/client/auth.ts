/**
 * Authentication service for RevSport
 * Based on the working prototype auth implementation
 */

import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { Logger } from '../utils/logger.js';
import type { Config } from '../models/types.js';

export class AuthService {
  private client: AxiosInstance;
  private cookieJar: CookieJar;
  private isAuthenticated: boolean = false;
  private csrfToken: string | null = null;
  private logger: Logger;
  private loginPromise: Promise<void> | null = null; // Mutex to prevent concurrent logins

  constructor(private config: Config) {
    this.logger = new Logger('AuthService', config.debug);

    // Validate credentials at startup
    if (!config.username || !config.password) {
      throw new Error('Missing username or password in configuration');
    }

    // Log password characteristics (NOT the password itself!)
    this.logger.debug('Credentials loaded', {
      usernameLength: config.username.length,
      passwordLength: config.password.length,
      hasSpecialChars: /[^a-zA-Z0-9]/.test(config.password),
    });

    this.cookieJar = new CookieJar();

    this.client = wrapper(
      axios.create({
        baseURL: config.baseUrl,
        jar: this.cookieJar,
        withCredentials: true,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
      })
    );
  }

  /**
   * Perform complete login workflow (with mutex to prevent concurrent logins)
   */
  async login(): Promise<void> {
    // If login already in progress, wait for it
    if (this.loginPromise) {
      this.logger.debug('Login already in progress, waiting...');
      return this.loginPromise;
    }

    // If already authenticated, skip
    if (this.isAuthenticated) {
      this.logger.debug('Already authenticated, skipping login');
      return;
    }

    // Start new login
    this.loginPromise = this._doLogin();

    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  /**
   * Internal login implementation
   */
  private async _doLogin(): Promise<void> {
    this.logger.info('🔐 Starting authentication...');

    // Step 1: Fetch login page and extract CSRF token
    await this.fetchLoginPage();
    this.logger.success('CSRF token extracted');

    // Step 2: Submit login credentials
    await this.submitLogin();
    this.logger.success('Login submitted');

    // Step 3: Verify authentication
    await this.delay(1000); // Small delay for session to establish
    await this.verifyAuthentication();
    this.logger.success('Authentication successful');
  }

  /**
   * Get the authenticated HTTP client
   */
  getClient(): AxiosInstance {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }
    return this.client;
  }

  /**
   * Check if currently authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Step 1: Fetch login page and extract CSRF token
   */
  private async fetchLoginPage(): Promise<void> {
    try {
      this.logger.debug('Fetching login page...');

      const response = await this.client.get('/login');
      const $ = cheerio.load(response.data);

      // Extract CSRF token - try multiple selectors
      this.csrfToken =
        $('input[name="_token"]').val() as string ||
        $('meta[name="csrf-token"]').attr('content') ||
        $('meta[name="X-CSRF-TOKEN"]').attr('content') ||
        null;

      if (!this.csrfToken) {
        throw new Error('Could not extract CSRF token from login page');
      }

      this.logger.debug('CSRF token found', {
        token: this.csrfToken.substring(0, 10) + '...',
      });
    } catch (error) {
      this.logger.error('Failed to fetch login page', error);
      throw new Error(`Failed to fetch login page: ${(error as Error).message}`);
    }
  }

  /**
   * Step 2: Submit login credentials
   */
  private async submitLogin(): Promise<void> {
    try {
      this.logger.debug('Submitting login credentials...');

      // Create form data with explicit encoding
      const loginData = new URLSearchParams();
      loginData.append('_token', this.csrfToken!);
      loginData.append('username', this.config.username);
      loginData.append('password', this.config.password);
      loginData.append('remember', 'on');

      // Log encoded data length for debugging (NOT the actual password!)
      this.logger.debug('Form data prepared', {
        tokenLength: this.csrfToken!.length,
        usernameLength: this.config.username.length,
        passwordLength: this.config.password.length,
        encodedLength: loginData.toString().length,
      });

      const response = await this.client.post('/login', loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${this.config.baseUrl}/login`,
          'Origin': this.config.baseUrl,
        },
        validateStatus: (_status) => true, // Accept all status codes
      });

      const cookieCount = this.cookieJar.getCookiesSync(this.config.baseUrl).length;

      this.logger.debug('Login response received', {
        status: response.status,
        cookies: cookieCount,
        statusText: response.statusText,
      });

      // 🚨 PROMINENT 403 ERROR LOGGING
      if (response.status === 403) {
        this.logger.error('🚫 403 FORBIDDEN during login - possible Cloudflare block!');
        this.logger.error('Login response details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          headers: response.headers,
        });
      }

      // Log if we got rate limiting
      if (response.status === 429) {
        this.logger.error('🚫 429 TOO MANY REQUESTS during login - rate limited!');
        this.logger.error('Login response details:', {
          status: response.status,
          statusText: response.statusText,
          retryAfter: response.headers['retry-after'],
        });
      }

      // RevSport sometimes returns 500 but still sets cookies and auth works
      // So we'll let verification step determine if auth actually succeeded
      if (response.status >= 400) {
        this.logger.debug('Non-200 response, but will proceed to verification');
        this.logger.debug('Error response data type:', typeof response.data);

        // Check if we got cookies despite error status
        if (cookieCount === 0) {
          // No cookies = real failure
          if (typeof response.data === 'string') {
            const $ = cheerio.load(response.data);
            const errorMsg =
              $('.alert-danger').text().trim() || $('.error').text().trim();

            throw new Error(errorMsg || `Login failed with status ${response.status}`);
          } else {
            throw new Error(
              `Login failed with status ${response.status}: ${JSON.stringify(response.data)}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Login submission failed', error);
      throw new Error(`Login submission failed: ${(error as Error).message}`);
    }
  }

  /**
   * Step 3: Verify authentication was successful
   */
  private async verifyAuthentication(): Promise<void> {
    try {
      this.logger.debug('Verifying authentication...');

      const response = await this.client.get('/bookings');
      const $ = cheerio.load(response.data);

      const hasLogoutButton =
        $('a[href*="logout"]').length > 0 || $('form[action*="logout"]').length > 0;
      const hasLoginForm =
        $('form[action*="login"]').length > 0 || $('input[name="password"]').length > 0;

      this.isAuthenticated = hasLogoutButton && !hasLoginForm;

      this.logger.debug('Authentication verification', {
        hasLogoutButton,
        hasLoginForm,
        isAuthenticated: this.isAuthenticated,
      });

      if (!this.isAuthenticated) {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      this.logger.error('Authentication verification failed', error);
      throw new Error(`Authentication verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Make authenticated GET request with auto-retry on session expiry
   * Includes exponential backoff and limits retries to prevent login storms
   */
  async get<T = any>(url: string, retryCount: number = 0): Promise<T> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }

    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      // Check if session expired or forbidden
      if (error.response?.status === 401 || error.response?.status === 403) {
        // 🚨 PROMINENT 403 ERROR LOGGING
        if (error.response?.status === 403) {
          this.logger.error('🚫 403 FORBIDDEN ERROR DETECTED');
          this.logger.error('Request URL:', url);
          this.logger.error('This may indicate:');
          this.logger.error('  - Cloudflare rate limiting');
          this.logger.error('  - IP blocked by Cloudflare');
          this.logger.error('  - Session expired');
          this.logger.error('Error details:', {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
          });
        }

        // Limit retries to prevent login storms
        if (retryCount >= 2) {
          this.logger.error('❌ Max auth retries exceeded (2 attempts)');
          this.logger.error('Giving up on URL:', url);
          throw new Error('Authentication failed after multiple retries');
        }

        this.logger.warn(`Session expired (retry ${retryCount + 1}/2), re-authenticating...`);
        this.isAuthenticated = false;

        // Exponential backoff: 1s, 2s
        const backoffMs = Math.pow(2, retryCount) * 1000;
        this.logger.debug(`Waiting ${backoffMs}ms before retry...`);
        await this.delay(backoffMs);

        // Login with mutex (prevents concurrent logins from multiple 403s)
        await this.login();

        // Retry request with incremented counter
        this.logger.debug(`Retrying request (attempt ${retryCount + 2}): ${url}`);
        return this.get<T>(url, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Delay utility
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
